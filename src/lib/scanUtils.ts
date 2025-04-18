
import { delay } from './utils'; // Import the delay utility

// Enhanced subdomain wordlist with more comprehensive prefixes
export const COMPREHENSIVE_SUBDOMAIN_WORDLIST = [
  // Google services
  'www', 'mail', 'drive', 'docs', 'sheets', 'slides', 'photos', 'calendar', 
  'meet', 'chat', 'classroom', 'maps', 'translate', 'cloud', 
  
  // Microsoft services
  'office', 'teams', 'onedrive', 'outlook', 'azure', 'sharepoint', 
  
  // Common infrastructure
  'admin', 'dev', 'test', 'staging', 'beta', 'internal', 'vpn', 'remote', 
  'support', 'help', 'blog', 'cdn', 'static', 'api', 'service', 'gateway',
  
  // Security and monitoring
  'security', 'monitoring', 'logs', 'metrics', 'status', 'healthcheck',
  
  // Development and CI/CD
  'git', 'svn', 'jenkins', 'gitlab', 'bitbucket', 'ci', 'cd', 'build',
  
  // Database and backend
  'db', 'database', 'sql', 'mysql', 'postgres', 'mongodb', 'redis', 
  'backend', 'server', 'proxy', 'cache',
  
  // Uncommon but possible
  'intranet', 'extranet', 'portal', 'dashboard', 'panel', 'login', 
  'auth', 'sso', 'marketplace', 'store', 'billing', 'crm', 'erp'
];

// Enhanced directory scanning wordlist
export const ADVANCED_PATH_WORDLIST = [
  // Administrative and management
  'admin', 'dashboard', 'control', 'management', 'panel', 'settings',
  
  // API and development
  'api', 'v1', 'v2', 'graphql', 'rest', 'swagger', 'openapi', 
  
  // Security and sensitive areas
  '.env', 'config', 'credentials', 'secrets', 'keys', 'tokens',
  
  // Logs and debugging
  'logs', 'debug', 'trace', 'metrics', 'monitoring', 'status',
  
  // File and asset management
  'uploads', 'files', 'assets', 'media', 'static', 'public', 
  'images', 'documents', 'downloads',
  
  // Development and deployment
  'dev', 'staging', 'test', 'beta', 'backup', 'archive', 
  '.git', '.svn', 'vendor', 'node_modules',
  
  // Web application specifics
  'wp-admin', 'wp-content', 'admin.php', 'login', 'signin', 
  'phpmyadmin', 'cpanel', 'webmail',
  
  // Additional paths
  'internal', 'private', 'restricted', 'system', 'tools'
];

// Export the extractDomain function from utils directly
export { extractDomain } from './utils';

// Function to fetch subdomains using multiple techniques
export async function fetchSubdomains(domain: string): Promise<string[]> {
  try {
    console.log("Fetching subdomains for domain:", domain);
    const subdomains = new Set<string>();
    
    // Add basic domain
    subdomains.add(domain);
    
    // Add www subdomain if not already the base domain
    if (!domain.startsWith('www.')) {
      subdomains.add(`www.${domain}`);
    }
    
    // 1. Try certificate transparency logs (passive)
    try {
      console.log("Fetching from certificate transparency logs");
      const response = await fetch(`https://crt.sh/?q=%.${domain}&output=json`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Extract unique subdomains
        const allNames = data.map((entry: {name_value: string}) => 
          entry.name_value.split('\n')
        ).flat();
        
        // Remove wildcard domains and duplicates
        allNames.filter((name: string) => 
          !name.includes('*') && 
          name.includes(domain) &&
          !name.includes('--') && // Filter out invalid subdomain formats
          !name.includes('..') &&
          !name.includes('\\')
        ).forEach((name: string) => subdomains.add(name));
      }
    } catch (error) {
      console.error("Error with certificate transparency check:", error);
    }
    
    // 2. Try wordlist-based subdomain enumeration (active but light)
    await tryWordlistSubdomains(domain, subdomains);
    
    // Clean and return results
    return Array.from(subdomains).filter(subdomain => 
      subdomain && 
      subdomain.includes('.') && 
      !subdomain.includes('--') &&
      !subdomain.includes('..') &&
      !subdomain.includes('\\') &&
      !subdomain.includes('---') &&
      subdomain.match(/^[a-zA-Z0-9.-]+$/) // Only allow alphanumeric, dots and hyphens
    );
  } catch (error) {
    console.error('Error in subdomain enumeration:', error);
    return [];
  }
}

// Helper function for wordlist-based subdomain discovery
async function tryWordlistSubdomains(domain: string, results: Set<string>): Promise<void> {
  // Select domain-specific wordlist (like FFuF does)
  let wordlist = [...COMPREHENSIVE_SUBDOMAIN_WORDLIST];
  
  // Add domain-specific prefixes based on the TLD
  if (domain.includes('google.com')) {
    wordlist.push('drive', 'maps', 'photos', 'calendar', 'meet', 'chat', 'classroom', 'cloud');
  } else if (domain.includes('microsoft.com')) {
    wordlist.push('office', 'teams', 'onedrive', 'outlook', 'azure', 'sharepoint');
  } else if (domain.includes('github.com')) {
    wordlist.push('gist', 'raw', 'pages', 'wiki', 'status', 'training');
  }
  
  // Deduplicate wordlist
  wordlist = [...new Set(wordlist)];
  
  // Check for common subdomain patterns (like FFuF fuzzing)
  const batchSize = 5; // Process in small batches to avoid overwhelming resources
  
  for (let i = 0; i < wordlist.length; i += batchSize) {
    const batch = wordlist.slice(i, i + batchSize);
    const promises = batch.map(async (prefix) => {
      const subdomain = `${prefix}.${domain}`;
      try {
        // Use fetch with no-cors mode to check if subdomain exists
        await fetch(`https://${subdomain}`, { method: 'HEAD', mode: 'no-cors' });
        results.add(subdomain);
      } catch {
        // Silently ignore errors for non-existent subdomains
      }
    });
    
    await Promise.all(promises);
    await delay(300); // Rate limiting to avoid being blocked
  }
}

// Path/directory scanning function
export async function scanPaths(domain: string): Promise<string[]> {
  const results: string[] = [];
  
  // Use advanced path wordlist for directory fuzzing (like FFuF)
  for (const path of ADVANCED_PATH_WORDLIST) {
    const url = `https://${domain}/${path}`;
    
    try {
      // Check if path exists using HEAD request with no-cors mode
      const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
      results.push(url);
    } catch {
      // Silently handle inaccessible paths
    }
    
    // Rate limiting
    await delay(100);
  }
  
  return results;
}
