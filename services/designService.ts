// designService.ts
// src/services/designService.ts


import axios from 'axios';
import { getToken } from './getToken';
import mammoth from 'mammoth';
import jsPDF from 'jspdf';


const baseURL = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '';
const appURL = baseURL.includes('localhost') || baseURL.includes('clvrw99a1065') ? '' : '/tprss';



async function fileToBase64(file: File): Promise<string> {
    return new Promise(async (resolve, reject) => {
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        console.log('Processing file:', file.name, 'Extension:', fileExtension);
        if (fileExtension === 'docx' || fileExtension === 'doc') {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const { value: text } = await mammoth.extractRawText({ arrayBuffer });
                const pdf = new jsPDF();
                pdf.text(text, 10, 10);
                const pdfBlob = pdf.output('blob');
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve(reader.result as string);
                };
                reader.onerror = reject;
                reader.readAsDataURL(pdfBlob);
            } catch (err) {
                reject('Error converting DOCX to PDF: ' + err);
            }
        } else {
            const reader = new FileReader();
            reader.onload = () => {
                resolve(reader.result as string);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);    
        }
    });
}


async function fileToBase64WithFileName(file: File): Promise<{ name: string; base64: string }> {
    return new Promise(async (resolve, reject) => {
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        console.log('Processing file:', file.name, 'Extension:', fileExtension);
        if (fileExtension === 'docx' || fileExtension === 'doc') {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const { value: text } = await mammoth.extractRawText({ arrayBuffer });
                const pdf = new jsPDF();
                pdf.text(text, 10, 10);
                const pdfBlob = pdf.output('blob');
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve({ name: file.name, base64: reader.result as string });
                };
                reader.onerror = reject;
                reader.readAsDataURL(pdfBlob);
            } catch (err) {
                reject('Error converting DOCX to PDF: ' + err);
            }
        } else {
            const reader = new FileReader();
            reader.onload = () => {
                resolve({ name: file.name, base64: reader.result as string });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        }
    });
}


export interface DesignElementResult {
    controlId: string;
    designElementId: string;
    prompt: string;
    question: string;
    answer: string;
    status: 'success' | 'error';
}


export async function processDesignElements(
    controlId: string,
    idPrompts: { id: string; prompt: string; question: string, de: string }[],
    files: File[]
): Promise<DesignElementResult[]> {
    const evidences = await Promise.all(files.map(fileToBase64WithFileName));
    const token = await getToken();


    const promises = idPrompts.map(async ({ id: designElementId, prompt, question, de }) => {
        try {
            console.log('Payload sent:', { controlId, designElementId, prompt, question, evidences });
            const { data } = await axios.post<Omit<DesignElementResult, 'status'>>(
                `${appURL}/api/validateDesignElements`,
                { controlId, designElementId, prompt, question, evidences },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            console.log('Response received:', data);
            console.log(`Validated element ${designElementId}:`, data);
            return { ...data, status: 'success' as const , de: de, id: designElementId};
        } catch (error) {
            console.error(`Error validating element ${designElementId}`, error);
            return { controlId, designElementId, prompt, question, answer: '', status: 'error' as const };
        }
    });


    return Promise.all(promises);
}