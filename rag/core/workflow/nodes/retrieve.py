from langchain_openai import ChatOpenAI
from loguru import logger

from .base import BaseNode
from ..models import WorkflowState


class RetrieveNode(BaseNode):
    def __init__(self, retriever, llm: ChatOpenAI):
        super().__init__(retriever, llm)

    def execute(self, state: WorkflowState) -> WorkflowState:

        logger.info("Starting document retrieval for question: {}", state["question"])
        documents = self.retriever.invoke(state["question"])
        state["documents"] = documents
        logger.success("Retrieved {} documents for the question.", len(documents))

        state["available_attempts"] -= 1

        return state
