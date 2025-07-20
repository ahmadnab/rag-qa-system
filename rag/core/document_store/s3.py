from typing import BinaryIO, Optional

from botocore.exceptions import ClientError
from loguru import logger

from rag.utils.config import Settings
from .base import DocumentStore

__all__ = ["S3DocumentStore"]


class S3DocumentStore(DocumentStore):
    def __init__(self, s3_client, settings: Settings):
        self.s3_client = s3_client
        self._bucket_name = settings.S3_BUCKET_NAME

    def upload_file(self, filename: str, file: BinaryIO):
        self.s3_client.upload_fileobj(file, self._bucket_name, filename)

    def delete_file(self, filename: str):
        try:
            self.s3_client.delete_object(Bucket=self._bucket_name, Key=filename)
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'NoSuchKey':
                logger.error(f"File {filename} does not exist.")
            else:
                raise

    def download_file(self, filename: str, download_path: str):
        self.s3_client.download_file(self._bucket_name, filename, download_path)

    def clear(self):
        response = self.s3_client.list_objects_v2(Bucket=self._bucket_name)

        if 'Contents' not in response:
            return None

        objects_to_delete = [{'Key': obj['Key']} for obj in response['Contents']]
        self.s3_client.delete_objects(
            Bucket=self._bucket_name,
            Delete={
                'Objects': objects_to_delete
            }
        )
        while response.get('IsTruncated'):
            continuation_token = response.get('NextContinuationToken')
            response = self.s3_client.list_objects_v2(Bucket=self._bucket_name, ContinuationToken=continuation_token)
            if 'Contents' in response:
                objects_to_delete = [{'Key': obj['Key']} for obj in response['Contents']]
                self.s3_client.delete_objects(
                    Bucket=self._bucket_name,
                    Delete={
                        'Objects': objects_to_delete
                    }
                )

    def get_public_url(self, filename: str, expiration: int = 3600) -> Optional[str]:
        try:
            return self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self._bucket_name, 'Key': filename},
                ExpiresIn=expiration
            )
        except ClientError as e:
            logger.error(f"Error generating presigned URL: {e}")
            return None
