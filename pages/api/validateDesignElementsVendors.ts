
/**
* @file validateDesignElementsVendors.ts
* @description 
* @author Damodar Perumalla
* @created July 22, 2025
*/


import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import { v4 as uuidv4 } from 'uuid';
import https from 'https';
import { mongo, logger } from '@ctip/toolkit';
import { ChatCompletionMessageParam } from 'openai/resources/chat';
const collection = mongo.collection;


export const config = {
    api: {
        bodyParser: {
            sizeLimit: '30mb',
        },
    },
};


const getHeaders = (token) => {
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


export default async function validateDesignElementHandler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }


    const { controlId, designElementId, prompt, question, designElement, evidences } = req.body;


    if (
        typeof controlId !== 'string' ||
        typeof prompt !== 'string' ||
        typeof question !== 'string' ||
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
            httpAgent: new https.Agent({ rejectUnauthorized: false }),
            defaultHeaders: headers,
        });
        const system_prompt = await collection('Prompts').findOne({ Prompt_Name: "System Prompt" });
        console.log("system prompt is : ",system_prompt);


        const contentArray: any[] = [
            {
                type: 'text',
                text: prompt,
            },
            ...evidences.map(({ name, base64 }: { name: string; base64: string }) => ({
                type: 'text',
                text: `Evidence Name: ${name}`, // Include the evidence name
            })),
            ...evidences.map(({ base64 }: { name: string; base64: string }) => ({
                type: 'image_url',
                image_url: {
                    url: base64, // Include the base64 data
                },
            })),
            {
                type: 'text',
                text: question,
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
        console.log("content array : ", contentArray)


        const completion = await client.chat.completions.create({
            model: LLM_MODEL,
            messages,
            temperature: 0,
            top_p: 1,
            max_tokens: 8192,
            seed: 42
        });


        const answer = completion.choices[0]?.message?.content ?? '';
        return res.status(200).json({ 
            controlId, 
            designElementId,
            designElement, // Pass the designElement through in the response 
            answer 
        });
    } catch (error) {
        console.error('validateDesignElement error:', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'LLM request failed',
        });
    }
}