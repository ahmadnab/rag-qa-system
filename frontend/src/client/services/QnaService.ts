/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Question } from '../models/Question';
import type { Response } from '../models/Response';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class QnaService {

    /**
     * Get Answer
     * @param requestBody
     * @returns Response Successful Response
     * @throws ApiError
     */
    public static getAnswerQnaPost(
        requestBody: Question,
    ): CancelablePromise<Response> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/qna/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

}
