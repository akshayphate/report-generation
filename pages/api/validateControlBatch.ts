/**
* @file validateControlBatch.ts
* @description Batch API endpoint to process all design elements for a single control
* @author Akshay Phate
* @created July 22, 2025
*/

import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { validateControlBatchCore, BatchRequest } from '../../services/validateControlService';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '50mb', // Increased for batch processing
        },
    },
};

const getHeaders = (token: string) => {
    const HTTP_REQUEST_ID = uuidv4() as string;
    const UTC_TIME_STAMP = new Date().toISOString();
    const CORRELATION_ID = uuidv4() as string;
    const CLIENT_ID = process.env.CLIENT_ID;
    const TACHYON_API_KEY = process.env.TACHYON_API_KEY;
    const USECASE_ID = process.env.USECASE_ID;
    const outheaders = {
        'x-request-id': HTTP_REQUEST_ID,
        'x-correlation-id': CORRELATION_ID,
        'x-wf-client-id': CLIENT_ID,
        'x-wf-request-date': UTC_TIME_STAMP,
        'Authorization': `Bearer ${token}`,
        'x-wf-api-key': `${TACHYON_API_KEY}`,
        'x-wf-usecase-id': `${USECASE_ID}`
    };
    return outheaders;
}

interface BatchResponse {
    controlId: string;
    results: Array<{
        designElementId: string;
        designElement?: string;
        answer: string;
        status: 'success' | 'error';
        error?: string;
    }>;
}

export default async function validateControlBatchHandler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    const { controlId, designElements, evidences }: BatchRequest = req.body;

    if (
        typeof controlId !== 'string' ||
        !Array.isArray(designElements) ||
        !Array.isArray(evidences) ||
        !evidences.every(evidence => typeof evidence.name === 'string' && typeof evidence.base64 === 'string')
    ) {
        return res.status(400).json({ error: 'Invalid request payload' });
    }

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid Authorization header' });
        }
        const token = authHeader.split(' ')[1];
        const response = await validateControlBatchCore({ controlId, designElements, evidences }, token);
        return res.status(200).json(response);
    } catch (error) {
        console.error('validateControlBatch error:', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'LLM request failed',
        });
    }
} 