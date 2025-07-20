from fastapi import APIRouter

from rag.domain.services import QNAService
from rag.domain.models import Response
from rag.utils import BaseModel
from rag.utils.injector import injector

router = APIRouter()


class Question(BaseModel):
    message: str


@router.post("/", response_model=Response)
def get_answer(question: Question):
    qna_service = injector.get(QNAService)

    return qna_service.get_answer(question.message)
