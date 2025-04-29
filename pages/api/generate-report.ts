import type { NextApiRequest, NextApiResponse } from 'next';
import { GenerateReportResponse } from '../../types/report';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GenerateReportResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed', data: [] });
  }

  try {
    const { questionnaire, evidence } = req.body;

    // Mock data with the new structure
    const mockReport = [
      {
        prompt: "What are the vendor's security certifications and compliance standards?",
        response: {
          "Answer": "The vendor holds SOC 2 Type II, ISO 27001, and PCI DSS certifications.",
          "Answer Quality": "High",
          "Answer Source": "Security Documentation",
          "Summary": "Multiple industry-standard security certifications are maintained.",
          "Reference": "Security Compliance Report, Page 12"
        }
      },
      {
        prompt: "How does the vendor handle data encryption and protection?",
        response: {
          "Answer": "AES-256 encryption for data at rest and TLS 1.3 for data in transit.",
          "Answer Quality": "Medium",
          "Answer Source": "Technical Documentation",
          "Summary": "Industry-standard encryption protocols are implemented.",
          "Reference": "Technical Specifications, Section 3.4"
        }
      },
      {
        prompt: "What is the vendor's incident response plan?",
        response: {
          "Answer": "24/7 SOC team with defined incident response procedures and SLAs.",
          "Answer Quality": "High",
          "Answer Source": "Operational Procedures",
          "Summary": "Comprehensive incident response framework is in place.",
          "Reference": "Security Policies, Chapter 5"
        }
      }
    ];

    return res.status(200).json({ 
      message: 'Report generated successfully',
      data: mockReport 
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return res.status(500).json({ 
      message: 'Error generating report',
      error: 'Internal server error',
      data: [] 
    });
  }
} 