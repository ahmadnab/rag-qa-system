from typing import Optional, Dict

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.vectorstores import VectorStoreRetriever
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import StateGraph, END
from loguru import logger
from collections import defaultdict
from .models import WorkflowState, GradeHallucinations, Answer, AnswerReferences
from .nodes import RetrieveNode, GenerateNode, GradeDocumentsNode, RefineQueryNode

__all__ = ["WorkflowEngine"]


class WorkflowEngine:
    state: WorkflowState
    MEMORY_CONFIG = {"configurable": {'thread_id': '1'}}
    MAX_RETRIVAL_ATTEMPTS = 500

    _app = None

    def __init__(self, retriever: VectorStoreRetriever):
        self.retriever = retriever

        # Initialize LLM instance
        self.llm = ChatOpenAI(model="gpt-4o-mini", temperature=0, streaming=True)

        # Nodes
        self.retrieve_node = RetrieveNode(self.retriever, self.llm)
        self.generate_node = GenerateNode(self.retriever, self.llm)
        self.grade_documents_node = GradeDocumentsNode(self.retriever, self.llm)
        self.refine_query_node = RefineQueryNode(self.retriever, self.llm)

        structured_llm_grader = self.llm.with_structured_output(GradeHallucinations)

        system = """You are evaluating whether an LLM-generated response is based on or supported by a set of 
        retrieved facts. Assign a binary score of either 'yes' or 'no'. A 'yes' indicates that the answer is grounded 
        in or backed by the provided facts."""
        hallucination_prompt = ChatPromptTemplate.from_messages(
            [
                ("system", system),
                ("human", "Set of facts: \n\n {documents} \n\n LLM generation: {generation}"),
            ]
        )

        self.hallucination_grader_chain = hallucination_prompt | structured_llm_grader

    def determine_next_step(self, state: WorkflowState) -> Optional[str]:
        if state["available_attempts"] == 0:
            logger.error("Maximum attempts reached. Aborting.")
            return "limit_reached"

        # Decides whether to refine the query or generate an answer based on document relevance
        if not state["documents"]:
            logger.info("No relevant documents found, refining the query.")
            return "refine_query"
        else:
            logger.info("Relevant documents found. Proceeding to generate an answer.")
            return "generate_answer"

    def evaluate_answer(self, state: WorkflowState) -> str:
        if state["available_attempts"] == 0:
            logger.error("Maximum attempts reached. Aborting.")
            return "limit_reached"

        logger.info("Checking if the generated answer is grounded in the retrieved documents.")
        score = self.hallucination_grader_chain.invoke(
            {"documents": state["documents"], "generation": state["generation"]}
        )
        if score.binary_score == "yes":
            logger.success("Answer is grounded in the documents.")
            return "useful"
        else:
            logger.warning("Answer is not grounded. Re-trying generation.")
            return "not_supported"

    def build_workflow(self) -> None:
        workflow = StateGraph(WorkflowState)

        workflow.add_node("retrieve_documents", self.retrieve_node.execute)
        workflow.add_node("grade_documents", self.grade_documents_node.execute)
        workflow.add_node("generate_answer", self.generate_node.execute)
        workflow.add_node("refine_query", self.refine_query_node.execute)

        workflow.set_entry_point("retrieve_documents")

        workflow.add_edge("retrieve_documents", "grade_documents")
        workflow.add_conditional_edges(
            "grade_documents",
            self.determine_next_step,
            {
                "refine_query": "refine_query",
                "generate_answer": "generate_answer",
                "limit_reached": END,
            },
        )
        workflow.add_edge("refine_query", "retrieve_documents")
        workflow.add_conditional_edges(
            "generate_answer",
            self.evaluate_answer,
            {
                "not_supported": "generate_answer",
                "useful": END,
                "not_useful": "refine_query",
                "limit_reached": END,
            },
        )

        memory = MemorySaver()
        self._app = workflow.compile(checkpointer=memory)
        self._app.get_state(self.MEMORY_CONFIG)

    def run(self, input_query: str) -> Answer:
        logger.info("Starting workflow for query: {}", input_query)
        if not self._app:
            raise ValueError("Workflow not initialized.")

        state = {
            "question": input_query,
            "available_attempts": self.MAX_RETRIVAL_ATTEMPTS,
        }
        value: WorkflowState = {}
        for output in self._app.stream(state, self.MEMORY_CONFIG):
            for key, value in output.items():
                logger.info(f"Node '{key}' executed. Current state keys: {value}")
            logger.info("\n---\n")

        if not value or value["available_attempts"] == 0:
            logger.error("Maximum attempts reached. Aborting.")
            return Answer(message="Sorry, Question is not applicable to the documents submitted.")

        logger.success("Final generated answer: {}", value["generation"])

        references: Dict[str, AnswerReferences] = {}
        for document in value["documents"]:
            key = f"{document.metadata['document_id']}_{document.metadata['page']}"
            if not references.get(key):
                references[key] = AnswerReferences(
                    document_id=document.metadata["document_id"],
                    page=document.metadata["page"],
                    chunks=[document.page_content],
                )
            else:
                references[key].chunks.append(document.page_content)

        return Answer(message=value["generation"], references=references)
