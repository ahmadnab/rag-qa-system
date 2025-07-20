from injector import singleton, inject
from pymongo import MongoClient

from rag.utils import ObjectId
from rag.domain.models import VectorStoreData
from rag.utils.config import Settings
from .base_repository import BaseRepository

__all__ = ["VectorStoreRepository"]


@singleton
class VectorStoreRepository(BaseRepository[VectorStoreData]):
    @inject
    def __init__(self, client: MongoClient, settings: Settings):
        super().__init__(client, settings, settings.MONGO_VECTOR_STORE_COLLECTION, VectorStoreData)

    def delete_by_document_id(self, document_id: str) -> None:
        self.collection.delete_many({"document_id": document_id})
