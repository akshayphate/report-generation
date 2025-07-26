// genereate_report.ts
// Mock report generation service
export interface ReportItem {
    id: string;
    question: string;
    answer: 'YES' | 'NO' | 'PARTIAL';
    quality: 'ADEQUATE' | 'INADEQUATE' | 'NEEDS_REVIEW';
    source: string;
    summary: string;
    reference: string;
}


// Mock data based on the UI requirements
export const generateMockReport = async (): Promise<ReportItem[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));


    return [
        {
            id: "BCP-001",
            question: "Business continuity planning and disaster recovery (BCP/DR) policy, procedure, or standard for all in-scope facility locations (e.g., offices and datacenters) that collect, store, process, handle, or transfer client data",
            answer: "YES",
            quality: "ADEQUATE",
            source: "This section defines the functional responsibilities of each recovery team.",
            summary: "The document outlines the roles and responsibilities for various teams involved in disaster recovery.",
            reference: "SUNDAYSKY - Policy - 2023 - Business Continuity Plan.PDF, Page 5, Section 3"
        },
        {
            id: "BCP-002",
            question: " Business continuity planning and disaster recovery (BCP/DR) policy, procedure, or standard for all in-scope facility locations (e.g., offices and datacenters) that collect, store, process, handle, or transfer client data with the following design element: Team roles and responsibilities for all in-scope facility locations (e.g., offices and datacenters) that collect, store, process, handle, or transfer client data",
            answer: "YES",
            quality: "ADEQUATE",
            source: "This Plan must be kept up to date and is subject to at least an annual review and testing of the Plan for completeness and effectiveness. The Plan will also be reviewed and tested upon significant system changes within 90 days. Plan reviews are conducted by senior management in relevant departments",
            summary: "The plan is reviewed annually and tested, with additional reviews and testing within 90 days of significant system changes. Senior management ",
            reference: "SUNDAYSKY - Policy - 2023 - Business Continuity Plan.PDF, Page 2, Section 1.2"
        },
        {
            id: "BCP-003",
            question: " Business continuity planning and disaster recovery (BCP/DR) policy, procedure, or standard for all in-scope facility locations (e.g., offices and datacenters) that collect, store, process, handle, or transfer client data with the following design element: Business impact analysis that is reviewed and approved by senior management at least every 12 months and after any significant changes",
            answer: "YES",
            quality: "ADEQUATE",
            source: "During those reviews, all elements necessary to resume operations are identified and assessed for risks. The recovery time of each element will be considered to ensure the applicable RTO and RPO are achievable.",
            summary: "The plan includes identifying necessary elements for resuming operations, assessing risks, and considering recovery time objectives (RTOs) and recovery point objectives (RPOs).",
            reference: "SUNDAYSKY - Policy - 2023 - Business Continuity Plan.PDF, Page 2, Section 1.2"
        },
        {
            id: "IAM-001",
            question: " Identity and access management policy with the following design element: Multi-factor authentication requirements for privileged accounts",
            answer: "PARTIAL",
            quality: "NEEDS_REVIEW",
            source: "IAM Policy Document v1.8",
            summary: "MFA is implemented for most privileged accounts but some legacy systems still require single-factor authentication.",
            reference: "IAM Policy Section 3.4, Page 12"
        },
        {
            id: "SEC-001",
            question: " Does your organization have a business continuity planning and disaster recovery (BCP/DR) policy, procedure, or standard for all in-scope facility locations (e.g., offices and datacenters) that collect, store, process, handle, or transfer client data with following policy feature: List of technology dependencies impacting business restoration for all in-scope facility locations?",
            answer: "NO",
            quality: "INADEQUATE",
            source: " N/A",
            summary: "The document does not explicitly list technology dependencies.",
            reference: "N/A"
        }
    ];
};


// Wells Fargo color theme configuration
export const wellsFargoTheme = {
    colors: {
        primary: '#D71E2B',      // Wells Fargo Red
        secondary: '#FFCD41',    // Wells Fargo Gold
        success: '#00A651',      // Green for adequate
        warning: '#FF8C00',      // Orange for needs review
        danger: '#D71E2B',       // Red for inadequate
        background: '#F8F9FA',   // Light background
        text: '#333333',         // Dark text
        border: '#E5E5E5'        // Light border
    },
    qualityColors: {
        'ADEQUATE': '#00A651',
        'NEEDS_REVIEW': '#FF8C00',
        'INADEQUATE': '#D71E2B'
    },
    answerColors: {
        'YES': '#00A651',
        'PARTIAL': '#FF8C00',
        'NO': '#D71E2B'
    }
}; 