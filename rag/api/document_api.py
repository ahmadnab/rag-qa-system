from typing import List

from fastapi import APIRouter
from fastapi import File, UploadFile

from rag.domain.models import UserDocuments
from rag.domain.services import DocumentService
from rag.repository import DocumentRepository, VectorStoreRepository
from rag.utils import ObjectId
from rag.utils.injector import injector
from rag.core.document_store import S3DocumentStore

router = APIRouter()


@router.delete("/clear_all", response_model=None)
def clear_all():
    # Note: Testing API Do not use for production

    injector.get(DocumentRepository).collection.drop()
    injector.get(VectorStoreRepository).collection.drop()
    injector.get(S3DocumentStore).clear()


@router.get("/", response_model=List[UserDocuments])
def get_documents():
    document_repo = injector.get(DocumentRepository)
    return document_repo.get_all()


@router.get("/{document_id}", response_model=UserDocuments)
def get_document(document_id: ObjectId):
    document_repo = injector.get(DocumentRepository)
    return document_repo.get_by_id(document_id)


@router.post("/upload/", response_model=UserDocuments)
async def upload_document(file: UploadFile = File(...)):
    document_service = injector.get(DocumentService)
    return document_service.upload_document(file)


@router.post("/process/{document_id}", response_model=UserDocuments)
def process_document(document_id: ObjectId):
    document_service = injector.get(DocumentService)
    return document_service.process_document(document_id)


@router.delete("/{document_id}")
def delete_document(document_id: ObjectId):
    document_service = injector.get(DocumentService)
    return document_service.delete_document(document_id)
