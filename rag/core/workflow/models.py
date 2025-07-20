from typing import List, Optional, TypedDict, Dict

from langchain_core.documents import Document
from pydantic import BaseModel, Field

__all__ = [
    "WorkflowState",
    "GradeHallucinations",
    "GradeAnswer",
    "GradeDocuments",
    "Answer",
    "AnswerReferences",
]


class WorkflowState(TypedDict):
    question: str
    available_attempts: int
    generation: Optional[str]
    documents: List[Document]


class GradeHallucinations(BaseModel):
    binary_score: str = Field(
        description="Answer is grounded in the facts, 'yes' or 'no'"
    )


class GradeAnswer(BaseModel):
    binary_score: str = Field(
        description="Answer addresses the question, 'yes' or 'no'"
    )


class GradeDocuments(BaseModel):
    binary_score: str = Field(
        description="Documents are relevant to the question, 'yes' or 'no'"
    )


class AnswerReferences(BaseModel):
    document_id: str
    page: int
    chunks: List[str]


class Answer(BaseModel):
    message: str
    references: Optional[Dict[str, AnswerReferences]] = None
