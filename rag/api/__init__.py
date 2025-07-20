from fastapi import APIRouter

from rag.api import ping_api
from rag.api import document_api
from rag.api import qna_api
from rag.api import vectorstore_api


__all__ = [
    "router"
]

router = APIRouter()

router.include_router(ping_api.router, prefix="/ping", tags=["ping"])
router.include_router(document_api.router, prefix="/documents", tags=["documents"])
router.include_router(vectorstore_api.router, prefix="/vectorstore", tags=["vectorstore"])
router.include_router(qna_api.router, prefix="/qna", tags=["qna"])
