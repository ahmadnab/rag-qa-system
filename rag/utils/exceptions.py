from typing import Union, Optional
from http import HTTPStatus

from fastapi.exceptions import RequestValidationError
from fastapi.openapi.constants import REF_PREFIX
from fastapi.openapi.utils import validation_error_response_definition
from pydantic import ValidationError
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.status import (
    HTTP_422_UNPROCESSABLE_ENTITY,
    HTTP_400_BAD_REQUEST,
)
from rag.utils import BaseModel

__all__ = [
    "ClientError",
    "ClientException",
    "HTTPException",
    "InternalException",
    "client_error_handler",
    "http_error_handler",
    "http422_error_handler",
]


class ClientError(BaseModel):
    message: str
    status_code: int = HTTP_400_BAD_REQUEST
    error_code: Optional[str] = None

    @property
    def response(self) -> JSONResponse:
        return JSONResponse(status_code=self.status_code, content={
            "error_code": self.error_code or self.__class__.__name__,
            "message": self.message,
        })


class ClientException(Exception):
    def __init__(
        self,
        message: str,
        error_code: Optional[str] = None,
        status_code: int = HTTP_400_BAD_REQUEST
    ):
        self.error = ClientError(message=message, error_code=error_code, status_code=status_code)


class HTTPException(Exception):
    def __init__(self, status_code: int):
        self.status_code = status_code


class InternalException(Exception):
    def __init__(self, status_code: int = HTTP_400_BAD_REQUEST):
        self.status_code = status_code


async def client_error_handler(_: Request, exc: ClientException) -> JSONResponse:
    return exc.error.response


async def http_error_handler(_: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        {"error": {"code": HTTPStatus(exc.status_code).name}}, status_code=exc.status_code
    )


async def http422_error_handler(
    _: Request,
    exc: Union[RequestValidationError, ValidationError],
) -> JSONResponse:
    return JSONResponse(
        {"errors": exc.errors()},
        status_code=HTTP_422_UNPROCESSABLE_ENTITY,
    )


validation_error_response_definition["properties"] = {
    "errors": {
        "title": "Errors",
        "type": "array",
        "items": {"$ref": "{0}ValidationError".format(REF_PREFIX)},
    },
}
