from langchain_core.vectorstores import VectorStoreRetriever
from langchain_openai import ChatOpenAI

from ..models import WorkflowState


class BaseNode:
    def __init__(self, retriever: VectorStoreRetriever, llm: ChatOpenAI):
        self.retriever = retriever
        self.llm = llm

    def execute(self, state: WorkflowState) -> WorkflowState:
        raise NotImplementedError("Subclasses should implement the execute method")
