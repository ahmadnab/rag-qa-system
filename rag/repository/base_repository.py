from typing import TypeVar, Generic, List, Optional, Type, Dict

from pymongo import MongoClient, ReturnDocument
from pymongo.errors import DuplicateKeyError

from rag.utils import time_now, flatten_dict, ObjectId, BaseModel
from rag.utils.config import Settings

__all__ = ["BaseRepository"]


T = TypeVar("T", bound=BaseModel)


class BaseRepository(Generic[T]):
    def __init__(self, client: MongoClient, settings: Settings, collection_name: str, entity: Type[T]):
        self.collection = client[settings.MONGO_DATABASE_NAME][collection_name]
        self.entity = entity
        self.fields = list(self.entity.__fields__)

    def query_dict(self, query: Dict) -> Dict:
        if "deleted" in self.fields:
            return {**query, "deleted": False}
        return query

    def update_dict(self, update: Dict, flatten=True, unflatten=None) -> Dict:
        if flatten:
            update = flatten_dict(update, unflatten)
        if any(key not in self.fields for key in filter(lambda _: "." not in _ and "$" not in _, update)):
            raise ValueError("Invalid fields")
        if "updated_at" in self.fields:
            update["updated_at"] = time_now()
        return update

    def create(self, item: T) -> T:
        try:
            self.collection.insert_one({"_id": item.id, **item.dict()})
            return item
        except DuplicateKeyError:
            raise ValueError("Item with id {} already exists".format(item.id))

    def create_multi(self, items: List[T]) -> None:
        try:
            self.collection.insert_many([{"_id": item.id, **item.dict()} for item in items])
        except DuplicateKeyError:
            raise ValueError("Duplicates found in items")

    def get_by_id(self, id_: ObjectId, other_query: Dict = None) -> Optional[T]:
        data = self.collection.find_one(self.query_dict({"_id": str(id_), **(other_query or {})}))
        return self.entity(**data) if data is not None else None

    def get_by_ids(self, ids: List[ObjectId], *, other_query: Dict = None) -> Dict[ObjectId, Optional[T]]:
        _map = {_["_id"]: _ for _ in self.collection.find(
            self.query_dict({"_id": {"$in": ids}, **(other_query or {})})
        )}
        return {
            id_: self.entity(**_map[id_]) if id_ in _map else None for id_ in ids
        }

    def get_all(self, other_query: Dict = None) -> List[T]:
        return [self.entity(**_) for _ in self.collection.find(self.query_dict(other_query or {}))]

    def update(self, id_: ObjectId, update: Dict, *, flatten=True, unflatten=None, other_query: Dict = None) -> T:
        document = self.collection.find_one_and_update(
            {"_id": str(id_), **(other_query or {})},
            {"$set": self.update_dict(update, flatten, unflatten)},
            return_document=ReturnDocument.AFTER
        )
        if document is None:
            raise ValueError("Item with id {} and query {} does not exist".format(id_, other_query))
        return self.entity(**document)

    def upsert(self, id_: ObjectId, update: Dict, *, flatten=True, unflatten=None, other_query: Dict = None) -> T:
        document = self.collection.find_one_and_update(
            {"_id": str(id_), **(other_query or {})},
            {"$set": self.update_dict(update, flatten, unflatten)},
            upsert=True, return_document=ReturnDocument.AFTER
        )
        return self.entity(**document)

    def delete(self, id_: ObjectId, *, hard: bool = False, other_query: Dict = None) -> None:
        if hard or "deleted" not in self.fields:
            document = self.collection.find_one_and_delete({"_id": str(id_), **(other_query or {})})
        else:
            document = self.collection.find_one_and_update(
                {"_id": str(id_), **(other_query or {})},
                {"$set": self.update_dict({"deleted": True})},
                return_document=ReturnDocument.AFTER
            )
        if document is None:
            raise ValueError("Item with id {} and query {} does not exist".format(id_, other_query))
