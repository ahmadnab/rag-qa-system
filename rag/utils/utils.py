import time
from datetime import datetime, timezone
from typing import Dict, List

from bson import ObjectId as BsonObjectId
from loguru import logger
from pydantic import BaseConfig, Field, BaseModel as PydanticBaseModel
from pydantic_core import core_schema

__all__ = [
    "filter_none_dict",
    "filter_none_list",
    "flatten_dict",
    "timeit",
    "serialize_time",
    "time_now",
    "ObjectId",
    "BaseModel",
    "DeletableModel",
    "TimestampModel",
]


def filter_none_dict(d: Dict):
    return {k: v for k, v in d.items() if v is not None}


def filter_none_list(lst: List):
    return [v for v in lst if v is not None]


def flatten_dict(d, unflatten=None, parent_key='', sep='.'):
    items = []
    unflatten = unflatten or []
    for k, v in d.items():
        new_key = parent_key + sep + k if parent_key else k
        if new_key in unflatten:
            items.append((new_key, v))
        elif isinstance(v, dict):
            items.extend(flatten_dict(v, unflatten, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)


def timeit(func):
    def wrapped(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        logger.info(
            "Function '{}' executed in {:f} ms",
            func.__name__,
            (time.time() - start) / 1000,
        )
        return result

    return wrapped


def serialize_time(dt: datetime) -> str:
    return dt.isoformat()


def time_now():
    return datetime.now(timezone.utc)


def check_object_id(value: str) -> BsonObjectId:
    if not BsonObjectId.is_valid(value):
        raise ValueError('Invalid ObjectId')
    return BsonObjectId(value)


class ObjectId(str):

    @classmethod
    def new(cls) -> "ObjectId":
        return cls(str(BsonObjectId()))

    @classmethod
    def __get_pydantic_core_schema__(
            cls, _source_type, _handler
    ) -> core_schema.CoreSchema:
        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.union_schema([
                core_schema.is_instance_schema(BsonObjectId),
                core_schema.chain_schema([
                    core_schema.str_schema(),
                    core_schema.no_info_plain_validator_function(cls.validate),
                ])
            ]),
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda x: str(x)
            ),
        )

    @classmethod
    def validate(cls, value) -> BsonObjectId:
        if not BsonObjectId.is_valid(value):
            raise ValueError("Invalid ObjectId")

        return BsonObjectId(value)


class BaseModel(PydanticBaseModel):

    def __hash__(self):
        return hash((type(self),) + tuple(self.__dict__.values()))

    class Config(BaseConfig):
        populate_by_name = True
        json_encoders = {ObjectId: str, BsonObjectId: str}
        # use_enum_values = True


class DeletableModel(BaseModel):
    deleted: bool = False


class TimestampModel(BaseModel):
    created_at: datetime = Field(default_factory=time_now)
    updated_at: datetime = Field(default_factory=time_now)
