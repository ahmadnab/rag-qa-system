import os
import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from starlette.middleware.cors import CORSMiddleware

from rag.api import router as api_router
from rag.utils.config import Settings
from rag.utils.exceptions import (
    ClientException,
    HTTPException,
    http_error_handler,
    http422_error_handler,
    client_error_handler,
)
from rag.utils.injector import injector
from rag.utils.logging import initialise as initialise_logger

__all__ = [
    "get_application",
]

origins = ["*"]


def get_application() -> FastAPI:
    settings = injector.get(Settings)

    logging_level = logging.DEBUG if settings.DEBUG else logging.INFO
    loggers = ("uvicorn.asgi", "uvicorn.access")

    initialise_logger(loggers, logging_level)

    application = FastAPI(title=settings.PROJECT_NAME, debug=settings.DEBUG,)

    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(api_router)
    register_exception_handlers(application)

    return application


def register_exception_handlers(application: FastAPI):
    application.add_exception_handler(ClientException, client_error_handler)
    application.add_exception_handler(HTTPException, http_error_handler)
    application.add_exception_handler(RequestValidationError, http422_error_handler)
    application.add_exception_handler(RequestValidationError, http422_error_handler)
