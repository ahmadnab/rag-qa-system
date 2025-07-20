from typing import List

from pydantic import Field

from rag.utils import DeletableModel, TimestampModel, BaseModel, ObjectId

__all__ = [
    "UserDocuments",
    "VectorStoreData",
    "ReferenceLinks",
    "Response",
]


class UserDocuments(DeletableModel, TimestampModel):
    id: ObjectId = Field(default_factory=ObjectId.new)
    filename: str
    processed: bool = False

    @property
    def is_format_supported(self) -> bool:
        return self.format in ["pdf", "txt"]

    @property
    def format(self):
        return self.filename.split(".")[-1]


class VectorStoreData(BaseModel):
    _id: ObjectId
    text: str
    embedding: List[float]
    source: str
    page: int
    document_id: str

    @property
    def id(self) -> str:
        return self._id


class ReferenceLinks(BaseModel):
    filename: str
    link: str
    page: int
    chunks: List[str]


class Response(BaseModel):
    answer: str
    reference_links: List[ReferenceLinks]
