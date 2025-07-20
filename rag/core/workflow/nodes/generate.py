from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from loguru import logger

from .base import BaseNode
from ..models import WorkflowState


class GenerateNode(BaseNode):
    def __init__(self, retriever, llm: ChatOpenAI):
        super().__init__(retriever, llm)
        human = """You are an assistant for question-answering tasks. Use the following pieces of retrieved context 
        to answer the question. If you don't know the answer, just say that you don't know. Use three sentences 
        maximum and keep the answer concise.\n Question: {question}\n Context: {context} Answer:"""
        rag_prompt = ChatPromptTemplate.from_messages(
            [
                ("human", human),
            ]
        )

        self.chain = rag_prompt | self.llm | StrOutputParser()

    def execute(self, state: WorkflowState) -> WorkflowState:
        logger.info("Initiating LLM generation for question: {}", state["question"])
        generation = self.chain.invoke({"context": state["documents"], "question": state["question"]})
        state["generation"] = generation
        logger.success("Generated answer for the question.")
        return state
