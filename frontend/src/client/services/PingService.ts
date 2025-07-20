/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class PingService {

    /**
     * Ping Post
     * @returns any Successful Response
     * @throws ApiError
     */
    public static post(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/',
        });
    }

    /**
     * Ping Health
     * @returns any Successful Response
     * @throws ApiError
     */
    public static health(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/health',
        });
    }

    /**
     * Test 500 Post
     * @returns any Successful Response
     * @throws ApiError
     */
    public static test500Post(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/500',
        });
    }

}
