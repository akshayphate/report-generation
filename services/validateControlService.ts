import https from 'https';
import { OpenAI } from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { mongo } from '@ctip/toolkit';
import { ChatCompletionMessageParam } from 'openai/resources/chat';

const collection = mongo.collection;

export interface BatchDesignElement {
  id: string;
  prompt: string;
  question: string;
  subQuestion: string;
  designElement?: string;
}

export interface BatchRequest {
  controlId: string;
  designElements: BatchDesignElement[];
  evidences: Array<{ name: string; base64: string }>;
}

export interface BatchResponseItem {
  designElementId: string;
  designElement?: string;
  answer: string;
  status: 'success' | 'error';
  error?: string;
}

export interface BatchResponse {
  controlId: string;
  results: BatchResponseItem[];
}

function buildHeaders(token: string) {
  const HTTP_REQUEST_ID = uuidv4() as string;
  const UTC_TIME_STAMP = new Date().toISOString();
  const CORRELATION_ID = uuidv4() as string;
  const CLIENT_ID = process.env.CLIENT_ID;
  const TACHYON_API_KEY = process.env.TACHYON_API_KEY;
  const USECASE_ID = process.env.USECASE_ID;
  return {
    'x-request-id': HTTP_REQUEST_ID,
    'x-correlation-id': CORRELATION_ID,
    'x-wf-client-id': CLIENT_ID,
    'x-wf-request-date': UTC_TIME_STAMP,
    'Authorization': `Bearer ${token}`,
    'x-wf-api-key': `${TACHYON_API_KEY}`,
    'x-wf-usecase-id': `${USECASE_ID}`
  } as Record<string, string | undefined>;
}

export async function validateControlBatchCore(payload: BatchRequest, token: string): Promise<BatchResponse> {
  const { controlId, designElements, evidences } = payload;

  const LLM_API_BASE_URL = process.env.GENERATE_UAT_URL;
  const LLM_MODEL = process.env.LLM_MODEL;
  if (!LLM_API_BASE_URL || !LLM_MODEL) {
    throw new Error('Missing required environment variables');
  }

  const headers = buildHeaders(token);
  const client = new OpenAI({
    apiKey: token,
    baseURL: LLM_API_BASE_URL,
    httpAgent: new https.Agent({ rejectUnauthorized: false }),
    defaultHeaders: headers,
  });

  const system_prompt = await collection('Prompts').findOne({ Prompt_Name: 'System Prompt' });
  if (!system_prompt) {
    throw new Error('System prompt not found');
  }

  const results = await Promise.all(
    designElements.map(async (designElement) => {
      try {
        const contentArray: any[] = [
          { type: 'text', text: designElement.prompt },
          ...evidences.map(({ name }) => ({ type: 'text', text: `Evidence Name: ${name}` })),
          ...evidences.map(({ base64 }) => ({ type: 'image_url', image_url: { url: base64 } })),
          { type: 'text', text: designElement.question },
        ];

        const messages = [
          { role: 'system' as const, content: [{ type: 'text', text: system_prompt.Prompt }] },
          { role: 'user' as const, content: contentArray },
        ] as ChatCompletionMessageParam[];

        const completion = await client.chat.completions.create({
          model: LLM_MODEL,
          messages,
          temperature: 0,
          top_p: 1,
          max_tokens: 8192,
          seed: 42,
        });

        const answer = completion.choices[0]?.message?.content ?? '';
        return {
          designElementId: designElement.id,
          designElement: designElement.designElement,
          answer,
          status: 'success' as const,
        };
      } catch (error) {
        return {
          designElementId: designElement.id,
          designElement: designElement.designElement,
          answer: '',
          status: 'error' as const,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    })
  );

  return { controlId, results };
}


