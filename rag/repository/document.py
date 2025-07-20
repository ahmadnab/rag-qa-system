from injector import singleton, inject
from pymongo import MongoClient

from rag.domain.models import UserDocuments
from rag.utils.config import Settings
from .base_repository import BaseRepository

__all__ = ["DocumentRepository"]


@singleton
class DocumentRepository(BaseRepository[UserDocuments]):
    @inject
    def __init__(self, client: MongoClient, settings: Settings):
        super().__init__(client, settings, "user_documents", UserDocuments)
