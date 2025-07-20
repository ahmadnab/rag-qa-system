from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from loguru import logger

from .base import BaseNode
from ..models import WorkflowState


class RefineQueryNode(BaseNode):
    def __init__(self, retriever, llm: ChatOpenAI):
        super().__init__(retriever, llm)
        system = """You are a question rewriter that improves an input question for web search while preserving its 
        underlying semantic intent. Carefully analyze the input and ensure the transformed question retains the same 
        meaning."""
        refine_prompt = ChatPromptTemplate.from_messages(
            [
                ("system", system),
                ("human", "Original question: {question} \n\n Rewrite the question for better document retrieval."),
            ]
        )
        self.chain = refine_prompt | self.llm | StrOutputParser()

    def execute(self, state: WorkflowState) -> WorkflowState:
        logger.info("Refining the query for better retrieval: {}", state["question"])
        refined_question = self.chain.invoke({"question": state["question"]})
        state["question"] = refined_question
        logger.success("Refined question: {}", refined_question)
        return state
