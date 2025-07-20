from typing import List

from fastapi import APIRouter

from rag.domain.models import VectorStoreData
from rag.repository import VectorStoreRepository
from rag.utils.injector import injector

router = APIRouter()


@router.get("/", response_model=List[VectorStoreData])
def get_vectorstore():
    vector_store_repo = injector.get(VectorStoreRepository)
    return vector_store_repo.get_all()
