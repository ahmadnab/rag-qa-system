from fastapi import UploadFile
from injector import inject, singleton

from rag.core import VectorStore, DocumentLoader
from rag.domain.models import UserDocuments
from rag.repository import DocumentRepository
from rag.utils import ObjectId
from rag.utils.exceptions import ClientException
from rag.core.document_store import DocumentStore

__all__ = ["DocumentService"]


@singleton
class DocumentService:

    @inject
    def __init__(
        self,
        document_store: DocumentStore,
        vector_store: VectorStore,
        document_repository: DocumentRepository,
    ):
        self._document_store = document_store
        self._vector_store = vector_store
        self._document_repository = document_repository

    def upload_document(self, file: UploadFile) -> UserDocuments:
        document = UserDocuments(filename=file.filename)

        if not document.is_format_supported:
            raise ClientException("Invalid file format")

        self._document_store.upload_file(document.id, file.file)
        try:
            return self._document_repository.create(document)
        except Exception as e:
            # Rollback S3 upload
            self._document_store.delete_file(str(document.id))
            raise e

    def process_document(self, document_id: ObjectId) -> UserDocuments:
        user_document = self._document_repository.get_by_id(document_id)
        if not user_document:
            raise ClientException("Document not found")
        if user_document.processed:
            raise ClientException("Document already processed")

        try:
            loader = DocumentLoader(user_document, self._document_store)
        except ValueError:
            raise ClientException("Unsupported file format")

        documents = loader.load()
        self._vector_store.save(documents)

        try:
            return self._document_repository.update(document_id, {"processed": True})
        except Exception as e:
            # Rollback vector store
            self._vector_store.delete_document(str(document_id))
            raise e

    def delete_document(self, document_id: ObjectId) -> None:
        self._vector_store.delete_document(str(document_id))
        self._document_repository.delete(document_id)
        self._document_store.delete_file(str(document_id))
