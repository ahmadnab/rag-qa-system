/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_upload_document_documents_upload__post } from '../models/Body_upload_document_documents_upload__post';
import type { UserDocuments } from '../models/UserDocuments';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class DocumentsService {

    /**
     * Clear All
     * @returns any Successful Response
     * @throws ApiError
     */
    public static clearAllDocumentsClearAllDelete(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/documents/clear_all',
        });
    }

    /**
     * Get Documents
     * @returns UserDocuments Successful Response
     * @throws ApiError
     */
    public static getDocumentsDocumentsGet(): CancelablePromise<Array<UserDocuments>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/documents/',
        });
    }

    /**
     * Get Document
     * @param documentId
     * @returns UserDocuments Successful Response
     * @throws ApiError
     */
    public static getDocumentDocumentsDocumentIdGet(
        documentId: string,
    ): CancelablePromise<UserDocuments> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/documents/{document_id}',
            path: {
                'document_id': documentId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Delete Document
     * @param documentId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteDocumentDocumentsDocumentIdDelete(
        documentId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/documents/{document_id}',
            path: {
                'document_id': documentId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Upload Document
     * @param formData
     * @returns UserDocuments Successful Response
     * @throws ApiError
     */
    public static uploadDocumentDocumentsUploadPost(
        formData: Body_upload_document_documents_upload__post,
    ): CancelablePromise<UserDocuments> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/documents/upload/',
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Process Document
     * @param documentId
     * @returns UserDocuments Successful Response
     * @throws ApiError
     */
    public static processDocumentDocumentsProcessDocumentIdPost(
        documentId: string,
    ): CancelablePromise<UserDocuments> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/documents/process/{document_id}',
            path: {
                'document_id': documentId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

}
