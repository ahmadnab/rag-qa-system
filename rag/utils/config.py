from typing import Optional
from enum import Enum

from pydantic.v1 import BaseSettings


class Environment(str, Enum):
    PRODUCTION = "PRODUCTION"
    STAGING = "STAGING"
    LOCAL = "LOCAL"
    TEST = "TEST"


class Settings(BaseSettings):
    ENV: Environment = Environment.PRODUCTION
    PROJECT_NAME: str = "rag"
    MONGO_URI: Optional[str] = None
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_DEFAULT_REGION: Optional[str] = None
    S3_ENDPOINT_URL: Optional[str] = None
    S3_BUCKET_NAME: str = "qna-documents"

    MONGO_DATABASE_NAME: str = "qna-documents"
    MONGO_VECTOR_STORE_COLLECTION: str = "vector_store"
    MONGO_VECTOR_STORE_INDEX: str = "vector_index"

    @property
    def DEBUG(self):
        return self.ENV == Environment.TEST
