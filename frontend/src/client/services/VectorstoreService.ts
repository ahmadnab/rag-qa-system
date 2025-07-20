/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { VectorStoreData } from '../models/VectorStoreData';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class VectorstoreService {

    /**
     * Get Vectorstore
     * @returns VectorStoreData Successful Response
     * @throws ApiError
     */
    public static getVectorstoreVectorstoreGet(): CancelablePromise<Array<VectorStoreData>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/vectorstore/',
        });
    }

}
