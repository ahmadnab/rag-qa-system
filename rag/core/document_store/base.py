from abc import ABC, abstractmethod
from typing import BinaryIO, Optional

__all__ = ["DocumentStore"]


class DocumentStore(ABC):

    @abstractmethod
    def upload_file(self, filename: str, file: BinaryIO):
        ...

    @abstractmethod
    def delete_file(self, filename: str):
        ...

    @abstractmethod
    def download_file(self, filename: str, download_path: str):
        ...

    @abstractmethod
    def clear(self):
        ...

    @abstractmethod
    def get_public_url(self, filename: str, expiration: int = 3600) -> Optional[str]:
        ...
