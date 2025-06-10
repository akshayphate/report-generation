import { OpenAI } from 'openai';

import { v4 as uuidv4 } from 'uuid';

import https from 'https';

import { NextApiRequest, NextApiResponse } from 'next';

import { mongo, logger } from '@ctip/toolkit';

import pdfParse from 'pdf-parse';



const collection = mongo.collection;



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

};



const processWithLLM = async (

 token: string,

 prompt: string,

 context: Record<string, string | string[]>,

 systemPrompt: string = "Please answer the following question based on the given context only. Just provide the exact answer in single line based on the context only. While matching texts ignore the case"

) => {

 try {

  const headers = getHeaders(token);

  const API_URL = process.env.GENERATE_UAT_URL as string;

  const model_name = process.env.LLM_MODEL as string;

   

  const client = new OpenAI({

   apiKey: token as unknown as string,

   baseURL: API_URL,

   httpAgent: new https.Agent({ rejectUnauthorized: false }),

   defaultHeaders: headers

  });



  // Build the context text from the provided context object

  let contextText = '';

  Object.entries(context).forEach(([key, value]) => {

   if (Array.isArray(value)) {

    contextText += `${key}: ${value.join(', ')}\n`;

   } else {

    contextText += `${key}: ${value}\n`;

   }

  });



  // Combine prompt and context

  const fullPrompt = `${prompt}\n\nContext:\n${contextText}`;



  const chatCompletion = await client.chat.completions.create({

   model: model_name,

   messages: [

    {

     "role": "system",

     "content": systemPrompt

    },

    {

     "role": "user",

     "content": [{

      "type": "text",

      "text": fullPrompt

     }]

    }

   ],

   temperature: 0,

   top_p: 1,

   presence_penalty: 1,

   frequency_penalty: 1.3,

   max_tokens: 8192,

   stop: "DONE",

   stream: false

  });



  return chatCompletion.choices[0].message.content;

 } catch (error) {

  console.log("error completing chat ", error);

  throw error;

 }

};



const myLLMHandler = async (req: NextApiRequest, res: NextApiResponse) => {

 try {

  const { token, prompt, context } = req.body;



  if (!token || !prompt) {

   return res.status(400).json({ error: "Missing required fields." });

  }



  const response = await processWithLLM(token, prompt, context || {});

   

  res.status(200).json({ response });

 } catch (error) {

  console.error(`Error: ${error}`);

  res.status(500).send('Server error.');

 }

};



export default myLLMHandler;