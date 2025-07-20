import os
from typing import List

from langchain_community.document_loaders import PyPDFLoader, TextLoader, UnstructuredCSVLoader
from langchain_community.document_loaders.base import BaseLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from rag.domain.models import UserDocuments

__all__ = ["DocumentLoader"]


class DocumentLoader:
    loader: BaseLoader
    _text_splitter = RecursiveCharacterTextSplitter(chunk_size=2048, chunk_overlap=100)

    def __init__(self, user_document: UserDocuments, _s3_client):
        self._user_document = user_document
        self._s3_client = _s3_client
        self.loader = self.get_loader()

    @property
    def _download_path(self):
        return f"/tmp/{self._user_document.id}"

    def get_loader(self):
        self._s3_client.download_file(str(self._user_document.id), self._download_path)
        if self._user_document.format == "pdf":
            return PyPDFLoader(self._download_path)
        if self._user_document.format == "csv":
            return UnstructuredCSVLoader(self._download_path)
        if self._user_document.format == "txt":
            return TextLoader(self._download_path)

        raise ValueError(f"Unsupported file format: {self._user_document.format}")

    def load(self) -> List[Document]:
        try:
            documents = self.loader.load_and_split(self._text_splitter)
        except Exception as e:
            os.remove(self._download_path)
            raise ValueError(f"Failed to load document: {e}")

        os.remove(self._download_path)
        for document in documents:
            document.metadata["page"] = document.metadata.get("page", 1)
            document.metadata["document_id"] = str(self._user_document.id)
            document.metadata["source"] = self._user_document.filename
        return documents
