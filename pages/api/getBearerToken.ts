
/* eslint-disable react/destructuring-assignment */
/* eslint-disable camelcase */
import { NextApiRequest, NextApiResponse } from 'next';
import axios, { AxiosRequestConfig } from 'axios';
import https from 'https';




const getBearerToken = async (req: NextApiRequest, res: NextApiResponse) => {
  const APIGEE_NONPROD_LOGIN_URL = process.env.APIGEE_NONPROD_LOGIN_URL as string;
  const apigee_consumer_key = process.env.APIGEE_CONSUMER_KEY as string;
  const apigee_consumer_secret = process.env.APIGEE_CONSUMER_SECRET as string;
  const apigee_creds = `${apigee_consumer_key}:${apigee_consumer_secret}`;
  const apigee_cred_b64 = Buffer.from(apigee_creds, 'utf8').toString('base64');
  let results_list = [];
  try {
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      "Authorization": `Basic ${apigee_cred_b64}`
    };


    const config = {
      headers: headers
    };


    const data = {
      "grant_type": "client_credentials"
    };


    const axiosInstance = axios.create({
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
      })
    });
    
    const response = await axiosInstance.post(
      APIGEE_NONPROD_LOGIN_URL,
      data,
      config
    );


    const resp_dict = await response.data;
    const apigee_access_token = resp_dict["access_token"];


    res.status(200).json(apigee_access_token);
  } catch (error) {
    console.log("Results API Failure", results_list);
    res.status(500).send('Server error.');
  }
};


export default getBearerToken;