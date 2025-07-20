import sys

import boto3
from botocore.exceptions import NoCredentialsError
from injector import provider, singleton, Module, Injector
from langchain_core.embeddings import Embeddings
from langchain_openai import OpenAIEmbeddings
from loguru import logger
from mongomock import MongoClient as MockMongoClient
from pymongo import MongoClient

from rag.core.vector_store import VectorStore, MongoDBVectorStore
from rag.repository import VectorStoreRepository
from .config import Settings, Environment
from rag.core.document_store import S3DocumentStore, DocumentStore

__all__ = [
    "injector"
]


class InjectModule(Module):
    @singleton
    @provider
    def get_settings(self) -> Settings:
        return Settings()

    @singleton
    @provider
    def get_mongo(self, settings: Settings) -> MongoClient:
        if settings.ENV == Environment.TEST:
            return MockMongoClient("mongodb://dummy:dummy@localhost/test_db")

        if settings.MONGO_URI is None:
            sys.exit("MONGO_URI not in env")

        try:
            logger.info(f"Trying to connect DB client.server_info {settings.MONGO_URI}")
            client = MongoClient(settings.MONGO_URI)
            logger.info(client.server_info())
        except Exception as e:
            logger.error("Unable to connect with DB, so exiting", e)
            sys.exit("Unable to connect with DB, so exiting")

        logger.info("You are connected!")
        return client

    @singleton
    @provider
    def get_document_store(self, settings: Settings) -> DocumentStore:
        try:
            client = boto3.client(
                "s3",
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_DEFAULT_REGION,
                endpoint_url=settings.S3_ENDPOINT_URL
            )
            document_store = S3DocumentStore(s3_client=client, settings=settings)
            logger.info("S3DocumentStore successfully initialized")
            return document_store
        except NoCredentialsError:
            logger.error("AWS credentials not found, unable to initialize S3 client")
            sys.exit("AWS credentials not found")

    @singleton
    @provider
    def get_embeddings(self) -> Embeddings:
        return OpenAIEmbeddings()

    @singleton
    @provider
    def get_vector_store(
        self,
        embedding_function: Embeddings,
        vector_store_repository: VectorStoreRepository,
        client: MongoClient,
        settings: Settings,
    ) -> VectorStore:
        return MongoDBVectorStore(
            embedding_function=embedding_function,
            client=client,
            vector_store_repository=vector_store_repository,
            database_name=settings.MONGO_DATABASE_NAME,
            collection_name=settings.MONGO_VECTOR_STORE_COLLECTION,
            index_name=settings.MONGO_VECTOR_STORE_INDEX
        )


injector = Injector([InjectModule])
