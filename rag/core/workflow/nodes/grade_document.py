from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from loguru import logger

from .base import BaseNode
from ..models import WorkflowState, GradeDocuments


class GradeDocumentsNode(BaseNode):
    def __init__(self, retriever, llm: ChatOpenAI):
        super().__init__(retriever, llm)
        structured_llm_grader = self.llm.with_structured_output(GradeDocuments)
        system = """You are a Grader grading a FACTS. 
You will be given a QUESTION and a set of FACTS. 

Here is the grade criteria to follow:
(1) You goal is to identify FACTS that are completely unrelated to the QUESTION
(2) If the facts contain ANY keywords or semantic meaning related to the question, consider them relevant
(3) It is OK if the facts have SOME information that is unrelated to the question (2) is met 
(4) It is OK if the facts answers part of the question, as long as they are related to the question, 

Score:
A binary score of 'yes' means that the FACT contain ANY keywords or semantic meaning related to the QUESTION and are therefore relevant. This is the highest (best) score. 
A binary score of 'no' means that the FACTS are completely unrelated to the QUESTION. This is the lowest possible score you can give.
"""
        grade_prompt = ChatPromptTemplate.from_messages(
            [
                ("system", system),
                ("human", "FACTS: {document} \n\n Question: {question}"),
            ]
        )
        self.chain = grade_prompt | structured_llm_grader

    def execute(self, state: WorkflowState) -> WorkflowState:
        logger.info("Evaluating relevance of documents for question: {}", state["question"])
        relevant_docs = []
        for doc in state["documents"]:
            score = self.chain.invoke({"question": state["question"], "document": doc})
            if score.binary_score == "yes":
                relevant_docs.append(doc)
                logger.debug("Document marked as relevant.")
            else:
                logger.debug("Document marked as irrelevant.")
        state["documents"] = relevant_docs
        logger.success("Completed document evaluation. {} documents are relevant.", len(relevant_docs))
        return state
