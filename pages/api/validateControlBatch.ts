/**
* @file validateControlBatch.ts
* @description Batch API endpoint to process all design elements for a single control
* @author Damodar Perumalla
* @created July 22, 2025
*/

import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import { v4 as uuidv4 } from 'uuid';
import https from 'https';
import { ChatCompletionMessageParam } from 'openai/resources/chat';

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

interface BatchDesignElement {
    id: string;
    prompt: string;
    question: string;
    subQuestion: string;
    designElement?: string;
}

interface BatchRequest {
    controlId: string;
    designElements: BatchDesignElement[];
    evidences: Array<{ name: string; base64: string }>;
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

        const LLM_API_BASE_URL = process.env.GENERATE_UAT_URL;
        const LLM_MODEL = process.env.LLM_MODEL;

        if (!LLM_API_BASE_URL || !LLM_MODEL) {
            throw new Error('Missing required environment variables');
        }

        const headers = getHeaders(token);
        const client = new OpenAI({
            apiKey: token,
            baseURL: LLM_API_BASE_URL,
            defaultHeaders: headers,
        });

        // For now, use a default system prompt - you can replace this with your actual system prompt
        const system_prompt = { Prompt: "You are an AI assistant that analyzes vendor evidence against control requirements. Provide clear, concise assessments." };
        console.log("system prompt is : ", system_prompt);

        // Process each design element
        const results = await Promise.all(
            designElements.map(async (designElement) => {
                try {
                    const contentArray: any[] = [
                        {
                            type: 'text',
                            text: designElement.prompt,
                        },
                        ...evidences.map(({ name, base64 }: { name: string; base64: string }) => ({
                            type: 'text',
                            text: `Evidence Name: ${name}`,
                        })),
                        ...evidences.map(({ base64 }: { name: string; base64: string }) => ({
                            type: 'image_url',
                            image_url: {
                                url: base64,
                            },
                        })),
                        {
                            type: 'text',
                            text: designElement.question,
                        }
                    ];

                    const messages = [
                        {
                            role: 'system' as const,
                            content: [{ type: 'text', text: system_prompt.Prompt }],
                        },
                        {
                            role: 'user' as const,
                            content: contentArray
                        },
                    ] as ChatCompletionMessageParam[];

                    const completion = await client.chat.completions.create({
                        model: LLM_MODEL,
                        messages,
                        temperature: 0,
                        top_p: 1,
                        max_tokens: 8192,
                        seed: 42
                    });

                    const answer = completion.choices[0]?.message?.content ?? '';
                    
                    return {
                        designElementId: designElement.id,
                        designElement: designElement.designElement,
                        answer,
                        status: 'success' as const
                    };
                } catch (error) {
                    console.error(`Error processing design element ${designElement.id}:`, error);
                    return {
                        designElementId: designElement.id,
                        designElement: designElement.designElement,
                        answer: '',
                        status: 'error' as const,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    };
                }
            })
        );

        const response: BatchResponse = {
            controlId,
            results
        };

        return res.status(200).json(response);
    } catch (error) {
        console.error('validateControlBatch error:', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'LLM request failed',
        });
    }
} 