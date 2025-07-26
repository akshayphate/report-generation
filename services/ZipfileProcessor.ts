/**
* @file ZipfileProcessor.ts
* @description 
* @author Damodar Perumalla
* @created July 22, 2025
*/


import JSZip from 'jszip';
import rawDomainListData from '../data/domain_list.json';


interface Entry {
    name: string;
    dir: boolean;
    async<T>(type: string): Promise<T>;
}


export interface QuestionnaireFile {
    name: string;
    content: ArrayBuffer;
}


export interface ControlEvidence {
    cid: string;  // Domain_Id
    controlName: string;  // Domain_Name for display
    domainIds: string[];
    evidences: File[];
}


export interface ExtractedFile {
    name: string;
    size?: number;
}


export interface ProcessedZipResult {
    controls: ControlEvidence[];
    totalFiles: number;
    totalControls: number;
    errors: string[];
    questionnaireFile: { name: string; content: ArrayBuffer } | null;
}


/**
 * Type definitions for domain mapping
 */
interface DomainMapping {
    Domain_Id: string;
    Domain_Name: string;
}


/**
 * Normalizes the raw domain list data into a strongly-typed array
 */
const normalizeDomainList = (rawData: unknown): DomainMapping[] => {
    if (!Array.isArray(rawData)) {
        console.warn('Raw domain data is not an array:', rawData);
        return [];
    }


    return rawData
        .filter((item): item is { Domain_Id: string; Domain_Name: string } => {
            if (!item || typeof item !== 'object') {
                console.warn('Invalid domain item:', item);
                return false;
            }
            if (!('Domain_Id' in item) || !('Domain_Name' in item)) {
                console.warn('Missing Domain_Id or Domain_Name:', item);
                return false;
            }
            if (typeof item.Domain_Id !== 'string' || typeof item.Domain_Name !== 'string') {
                console.warn('Domain_Id or Domain_Name is not a string:', item);
                return false;
            }
            if (item.Domain_Id.length === 0 || item.Domain_Name.length === 0) {
                console.warn('Domain_Id or Domain_Name is empty:', item);
                return false;
            }
            return true;
        })
        .map(item => ({
            Domain_Id: item.Domain_Id,
            Domain_Name: item.Domain_Name
        }));
};


// Normalize the domain list once at module level
const domainList: DomainMapping[] = normalizeDomainList(rawDomainListData);


/**
 * Normalizes a string by trimming and converting to lowercase
 */
const normalizeName = (name: string): string => name.trim().toLowerCase();


/**
 * Maps folder names to all their associated Domain IDs from the domain list.
 */
const createDomainNameToIdsMap = (domains: DomainMapping[]): Map<string, string[]> => {
    const domainNameToIdsMap: Map<string, string[]> = new Map();
    for (const item of domains) {
        const name = item.Domain_Name.trim().toLowerCase();
        if (!domainNameToIdsMap.has(name)) {
            domainNameToIdsMap.set(name, []);
        }
        domainNameToIdsMap.get(name)?.push(item.Domain_Id);
    }
    return domainNameToIdsMap;
};


/**
 * Maps a folder name to a domain
 */
const mapFolderToDomain = (folderName: string, domains: DomainMapping[]): { domain_id: string; domain_name: string } | null => {
    const normalizedFolderName = normalizeName(folderName);
    const matchingDomain = domains.find(domain => normalizeName(domain.Domain_Name) === normalizedFolderName);


    if (!matchingDomain) {
        return null;
    }


    return {
        domain_id: matchingDomain.Domain_Id,
        domain_name: matchingDomain.Domain_Name
    };
};


/**
 * Normalizes file paths to use forward slashes consistently
 */
function normalizePath(path: string): string {
    return path.replace(/[\\/]+/g, '/').trim();
}


/**
 * Safely extracts folder name from a path
 */
function getFolderName(path: string): string {
    const normalized = normalizePath(path);
    const parts = normalized.split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
}


/**
 * Gets the root folder name from a ZIP file
 */
function getRootFolderName(zipContent: JSZip): string | null {
    const paths = Object.keys(zipContent.files);
    const rootFolders = paths
        .filter(path => {
            const parts = path.split('/').filter(Boolean);
            return parts.length === 1 && zipContent.files[path].dir;
        })
        .map(path => path.replace('/', ''));


    return rootFolders.length > 0 ? rootFolders[0] : null;
}


/**
 * Gets subfolder name from a path, ignoring the root folder
 */
function getSubfolderName(path: string, rootFolder: string | null): string {
    const normalized = normalizePath(path);
    const parts = normalized.split('/').filter(Boolean);


    if (rootFolder && parts[0] === rootFolder && parts.length > 1) {
        return parts[1];
    }
    return parts[0] || '';
}


/**
 * Determines file type based on extension
 */
function getMimeType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'pdf':
            return 'application/pdf';
        case 'jpg':
        case 'jpeg':
            return 'image/jpeg';
        case 'png':
            return 'image/png';
        case 'txt':
            return 'text/plain';
        default:
            return 'application/octet-stream';
    }
}


/**
 * Checks if a file is an Excel file
 */
function isExcelFile(fileName: string): boolean {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension === 'xlsx' || extension === 'xls' || extension === 'xlsm';
}


/**
 * Checks if a file is at root level (should be treated as questionnaire)
 */
function isRootLevelFile(filePath: string, rootFolder: string | null): boolean {
    const normalizedPath = normalizePath(filePath);
    const pathParts = normalizedPath.split('/').filter(Boolean);


    console.log(`Checking if file is at root level: "${filePath}" (rootFolder: "${rootFolder}")`);
    console.log(`  Normalized path: "${normalizedPath}"`);
    console.log(`  Path parts: [${pathParts.join(', ')}]`);


    if (rootFolder) {
        // Should be: rootFolder/filename.xlsx (2 parts total)
        const isRootLevel = pathParts.length === 2 && pathParts[0] === rootFolder;
        console.log(`  Root folder case: ${pathParts.length} === 2 && "${pathParts[0]}" === "${rootFolder}" = ${isRootLevel}`);
        return isRootLevel;
    } else {
        // Should be: filename.xlsx (1 part total)
        const isRootLevel = pathParts.length === 1;
        console.log(`  No root folder case: ${pathParts.length} === 1 = ${isRootLevel}`);
        return isRootLevel;
    }
}


/**
 * Processes a zip file and extracts control evidence
 * 
 * File Classification Rules:
 * - Excel files (.xlsx, .xls, .xlsm) at root level → Questionnaire file
 * - Excel files in subfolders → Evidence files (not questionnaire)
 * - All other files in subfolders → Evidence files
 */
export async function processZipFile(zipFile: File): Promise<ProcessedZipResult> {
    const result: Omit<ProcessedZipResult, 'questionnaireFile'> = {
        controls: [],
        totalFiles: 0,
        totalControls: 0,
        errors: []
    };
    let questionnaireFile: { name: string; content: ArrayBuffer } | null = null;


    try {
        console.log('Starting ZIP file processing...');
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(zipFile);


        // Get the root folder name first (needed for questionnaire file detection)
        const rootFolder = getRootFolderName(zipContent);
        console.log('Root folder:', rootFolder);


        // Find and extract the Excel file's content first (only at root level)
        console.log('Searching for questionnaire file at root level...');
        const allExcelFiles = Object.values(zipContent.files).filter(file => !file.dir && isExcelFile(file.name));
        console.log('All Excel files found:', allExcelFiles.map(f => f.name));


        const excelFileEntry = allExcelFiles.find(
            file => isRootLevelFile(file.name, rootFolder)
        );


        if (excelFileEntry) {
            console.log(`Found questionnaire file at root level: ${excelFileEntry.name}`);
            const content = await excelFileEntry.async('arraybuffer');
            questionnaireFile = { name: excelFileEntry.name, content };
        } else {
            console.log('No questionnaire file found at root level');
        }


        // Verify domain list is available
        if (domainList.length === 0) {
            console.error('No valid domains found in domain list');
            throw new Error('Domain list is empty after normalization. Please check domain_list.json format.');
        }
        console.log('Using normalized domain list with', domainList.length, 'domains');


        const domainNameToIdsMap = createDomainNameToIdsMap(domainList);


        // Collect all valid subfolders
        const subfolders = new Set<string>();
        Object.entries(zipContent.files).forEach(([path, file]) => {
            if (file.dir) {
                const folderName = getSubfolderName(path, rootFolder);
                if (folderName && (!rootFolder || folderName !== rootFolder)) {
                    subfolders.add(folderName);
                }
            }
        });
        console.log('Found subfolders:', Array.from(subfolders));


        // Process each subfolder
        for (const folderName of subfolders) {
            const normalizedFolderName = normalizeName(folderName);
            const domainIds = domainNameToIdsMap.get(normalizedFolderName);


            if (!domainIds || domainIds.length === 0) {
                console.warn(`Could not map folder "${folderName}" to any Domain_Id`);
                result.errors.push(`Unmapped folder: ${folderName}`);
                continue;
            }
            console.log(`Mapped folder "${folderName}" to Domain IDs:`, domainIds);


            // Find all files in this folder - including Excel files
            const folderPrefix = rootFolder ? `${rootFolder}/${folderName}/` : `${folderName}/`;
            const folderFiles = Object.entries(zipContent.files)
                .filter(([path, file]) => !file.dir && path.startsWith(folderPrefix));


            const evidences: File[] = [];
            for (const [filePath, fileEntry] of folderFiles) {
                const content = await fileEntry.async('arraybuffer');
                const fileName = getFolderName(filePath);
                    const fileType = getMimeType(fileName);
                const fileSize = content.byteLength;


                // Log file classification for debugging
                if (isExcelFile(fileName)) {
                    console.log(`Found Excel file in subfolder "${folderName}": ${fileName} - treating as evidence file`);
                }


                // Create a File object with size information
                const file = new File([content], fileName, {
                    type: fileType,
                    lastModified: fileEntry.date.getTime()
                });


                // Add custom size property to the file object
                Object.defineProperty(file, 'size', {
                    value: fileSize,
                    writable: false
                });


                evidences.push(file);
            }


            // Add to controls array
                result.controls.push({
                cid: domainIds[0], // Use first matching Domain_Id
                    controlName: folderName,
                domainIds,
                    evidences
                });
                console.log(`Added control group "${folderName}" with ${evidences.length} evidence files`);
            }


        result.totalFiles = result.controls.reduce((sum, control) => sum + control.evidences.length, 0);
        result.totalControls = result.controls.length;


        console.log('ZIP processing complete:', {
            totalControls: result.totalControls,
            totalFiles: result.totalFiles,
            errors: result.errors,
            questionnaireFile
        });


        return { ...result, questionnaireFile };


    } catch (error) {
        console.error('Error processing ZIP file:', error);
        throw error;
    }
}


/**
 * Validates the structure of the zip file
 */
export async function validateZipStructure(zipFile: File): Promise<{ isValid: boolean; errors: string[]; unmappedFolders: string[]; excelFiles: {name: string, isQuestionnaire: boolean}[] }> {
    const errors: string[] = [];
    const unmappedFolders: string[] = [];
    const excelFiles: {name: string, isQuestionnaire: boolean}[] = [];


    try {
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(zipFile);


        const rootFolder = getRootFolderName(zipContent);


        // Find and log Excel files (both root level and in subfolders)
        Object.keys(zipContent.files).forEach(path => {
            if (!zipContent.files[path].dir) {
                const fileName = path.split('/').pop() || '';
                const extension = fileName.split('.').pop()?.toLowerCase();
                if (extension === 'xlsx' || extension === 'xls' || extension === 'xlsm') {
                    const isRootLevel = !path.includes('/') || 
                        (rootFolder && path.split('/').filter(p => p.length > 0).length === 1);
                    
                    excelFiles.push({
                        name: path, // Use full path for clarity
                        isQuestionnaire: !!isRootLevel // Ensure isRootLevel is explicitly converted to a boolean
                    });
                    
                    console.log(`Found Excel file: ${path} (${isRootLevel ? 'questionnaire' : 'evidence'})`);
                }
            }
        });


        // This set will contain the names of folders that contain files
        const foldersWithContent = new Set<string>();


        Object.keys(zipContent.files).forEach(path => {
            // We only care about files, as empty folders are not processed anyway.
            if (!zipContent.files[path].dir) {
                const normalizedPath = normalizePath(path);
                const parts = normalizedPath.split('/').filter(p => p.length > 0);


                // Determine the folder name based on whether there's a single root folder.
                let folderName: string | undefined;
                if (rootFolder && parts.length > 1 && parts[0] === rootFolder) {
                    // Path is like: root/control-folder/file.pdf -> we need 'control-folder'
                    folderName = parts[1];
                } else if (!rootFolder && parts.length > 1) {
                    // Path is like: control-folder/file.pdf -> we need 'control-folder'
                    folderName = parts[0];
                }


                if (folderName) {
                    foldersWithContent.add(folderName);
                }
            }
        });


        if (foldersWithContent.size === 0) {
            // This isn't an error, just means no controls will be processed.
            // The UI will show "0 controls found". We can let it pass validation.
        }


        const validDomainNames = new Set(domainList.map(d => normalizeName(d.Domain_Name)));


        foldersWithContent.forEach(folderName => {
            if (!validDomainNames.has(normalizeName(folderName))) {
                unmappedFolders.push(folderName);
            }
        });


    } catch (e) {
        errors.push('Failed to read or parse the ZIP file. It may be corrupted.');
        console.error('ZIP validation error:', e);
    }


    if (unmappedFolders.length > 0) {
        console.warn(`Unmapped folders found: ${unmappedFolders.join(', ')}`);
    }


    // A warning about unmapped folders doesn't make the ZIP invalid, so we check for hard errors.
    return { isValid: errors.length === 0, errors, unmappedFolders, excelFiles };
}


/**
 * Returns a mapping of normalized domain names to their Domain_Ids
 */
export function getAvailableControlMappings(): Record<string, string> {
    const record: Record<string, string> = {};
    domainList.forEach(domain => {
        record[normalizeName(domain.Domain_Name)] = domain.Domain_Id;
    });
    return record;
}


/**
 * Returns a list of expected folder names for each domain
 */
export function getExpectedFolderNames(): Array<{ domainCode: string, domainName: string, expectedFolderNames: string[] }> {
    return domainList.map(domain => ({
        domainCode: domain.Domain_Id,
        domainName: domain.Domain_Name,
        expectedFolderNames: [normalizeName(domain.Domain_Name)]
    }));
}



/**
 * Maps domains to their files in a ZIP file
 */
export async function mapDomainsToDomainIds(zipFile: File): Promise<{ mappings: Record<string, string[]>; unmappedDomains: string[]; errors: string[] }> {
    const result: { mappings: Record<string, string[]>; unmappedDomains: string[]; errors: string[] } = {
        mappings: {},
        unmappedDomains: [],
        errors: []
    };


    try {
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(zipFile);
        const foundFolders = new Set<string>();


        // Extract all folder names
        Object.keys(zipContent.files).forEach(path => {
            const file = zipContent.files[path];
            if (file.dir) {
                const folderName = getFolderName(path);
                if (folderName) foundFolders.add(folderName);
            }
        });


        // Process each folder
        for (const folderName of foundFolders) {
            const domainMapping = mapFolderToDomain(folderName, domainList);
            if (domainMapping) {
                // Get all files in this folder
                const domainFiles = Object.keys(zipContent.files)
                    .filter(path => {
                        const file = zipContent.files[path];
                        return !file.dir && path.includes(folderName);
                    });


                if (domainFiles.length > 0) {
                    result.mappings[domainMapping.domain_id] = domainFiles;
                    console.log(`Mapped domain "${folderName}" (${domainMapping.domain_id}) to ${domainFiles.length} files`);
                }
            } else {
                result.unmappedDomains.push(folderName);
                result.errors.push(`Could not map folder "${folderName}" to a domain`);
            }
        }


        return result;


    } catch (error) {
        console.error('Error mapping domains to files:', error);
        result.errors.push(`Failed to map domains: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return result;
    }
}


/**
 * Returns a list of all available domain mappings
 */
export function getAvailableDomainMappings(): DomainMapping[] {
    return [...domainList];
}

