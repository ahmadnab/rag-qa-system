from abc import ABC, abstractmethod
from typing import List

from langchain_core.documents import Document
from langchain_core.vectorstores import VectorStore as VectorStore_

__all__ = ["VectorStore"]


class VectorStore(ABC):

    @abstractmethod
    def init(self):
        ...

    @abstractmethod
    def save(self, documents: List[Document]) -> VectorStore_:
        ...

    @abstractmethod
    def get(self) -> VectorStore_:
        ...

    @abstractmethod
    def delete_document(self, document_id: str):
        ...
