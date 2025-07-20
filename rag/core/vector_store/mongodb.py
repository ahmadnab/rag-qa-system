from typing import List

from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
from langchain_mongodb.vectorstores import MongoDBAtlasVectorSearch
from loguru import logger
from pymongo import MongoClient
from pymongo.operations import SearchIndexModel

from rag.repository import VectorStoreRepository
from .base import VectorStore

__all__ = ["MongoDBVectorStore"]


class MongoDBVectorStore(VectorStore):

    def __init__(
        self,
        embedding_function: Embeddings,
        client: MongoClient,
        vector_store_repository: VectorStoreRepository,
        database_name: str,
        collection_name: str,
        index_name: str,
    ):
        self._client = client
        self._database_name = database_name
        self._vector_store_repository = vector_store_repository
        self._collection_name = collection_name
        self._embedding_function = embedding_function
        self._index_name = index_name

    @property
    def _db(self):
        return self._client[self._database_name]

    @property
    def _collection(self):
        return self._db[self._collection_name]

    def init(self):
        if self._collection_name not in self._db.list_collection_names():
            self._db.create_collection(self._collection_name)
            logger.info(f"Collection '{self._collection_name}' created.")
        else:
            logger.info(f"Collection '{self._collection_name}' already exists.")

        try:
            existing_indexes = self._collection.list_search_indexes()
            index_exists = any(index.get('name') == self._index_name for index in existing_indexes)

            if not index_exists:
                search_index_model = SearchIndexModel(
                    definition={
                        # ToDo: remove hard-coded values
                        "fields": [
                            {
                                "type": "vector",
                                "path": "embedding",
                                "numDimensions": 1536,
                                "similarity": "cosine"
                            }
                        ]
                    },
                    name=self._index_name,
                    type="vectorSearch"
                )
                self._collection.create_search_index(model=search_index_model)
                logger.info(f"Index '{self._index_name}' created.")
            else:
                logger.info(f"Index '{self._index_name}' already exists.")
        except Exception as e:
            logger.warning(f"Search index operations not supported in local environment: {e}")
            logger.info("Continuing without search index - using fallback vector search")

    def save(self, documents: List[Document]):
        return MongoDBAtlasVectorSearch.from_documents(
            documents=documents,
            collection=self._collection,
            embedding=self._embedding_function,
            index_name=self._index_name,
            relevance_score_fn="cosine",
        )

    def get(self):
        return MongoDBAtlasVectorSearch(
            collection=self._collection,
            embedding=self._embedding_function,
            index_name=self._index_name,
            relevance_score_fn="cosine",
        )

    def delete_document(self, document_id: str):
        self._vector_store_repository.delete_by_document_id(document_id)
