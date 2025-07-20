from injector import inject, singleton

from rag.core import VectorStore, WorkflowEngine
from rag.core.workflow.models import Answer
from rag.domain.models import Response, ReferenceLinks
from rag.repository import DocumentRepository
from rag.utils import ObjectId
from rag.core.document_store import DocumentStore

__all__ = ["QNAService"]


@singleton
class QNAService:

    @inject
    def __init__(
        self,
        document_store: DocumentStore,
        vector_store: VectorStore,
        document_repository: DocumentRepository
    ):
        self._document_store = document_store
        self._vector_store = vector_store
        self._document_repository = document_repository

    def get_answer(self, question: str) -> Response:
        retriever = self._vector_store.get().as_retriever()
        workflow = WorkflowEngine(retriever)
        workflow.build_workflow()
        answer = workflow.run(question)

        return self._convert_response(answer)

    def _convert_response(self, answer: Answer):
        response = Response(answer=answer.message, reference_links=[])
        if not answer.references:
            return response

        document_ids = {ref.document_id for ref in answer.references.values()}
        documents = self._document_repository.get_by_ids([ObjectId(id) for id in document_ids])
        links = {
            _id: self._document_store.get_public_url(_id) for _id in document_ids
        }
        for ref in answer.references.values():
            ref_links = ReferenceLinks(
                filename=documents[ObjectId(ref.document_id)].filename,
                link=links[ref.document_id],
                page=ref.page,
                chunks=ref.chunks
            )
            response.reference_links.append(ref_links)

        return response
