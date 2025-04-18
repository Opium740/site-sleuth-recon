
import { delay } from './utils'; // Assuming we have a utility file

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

// Advanced subdomain enumeration function
export async function advancedSubdomainEnumeration(domain: string): Promise<string[]> {
  const subdomains = new Set<string>();
  
  // Multiple techniques
  const techniques = [
    traditionalSubdomainBruteforce,
    // Add more techniques like DNS zone transfer, SRV record scanning
  ];
  
  for (const technique of techniques) {
    const results = await technique(domain);
    results.forEach(subdomain => subdomains.add(subdomain));
  }
  
  return Array.from(subdomains);
}

// Traditional subdomain bruteforce
async function traditionalSubdomainBruteforce(domain: string): Promise<string[]> {
  const results: string[] = [];
  
  for (const prefix of COMPREHENSIVE_SUBDOMAIN_WORDLIST) {
    const subdomain = `${prefix}.${domain}`;
    try {
      const response = await fetch(`https://${subdomain}`, { 
        method: 'HEAD', 
        mode: 'no-cors' 
      });
      results.push(subdomain);
    } catch {
      // Silently handle non-existent subdomains
    }
    
    // Rate limiting
    await delay(100);
  }
  
  return results;
}

// Enhanced directory scanning
export async function comprehensiveDirectoryScan(domain: string): Promise<string[]> {
  const results: string[] = [];
  
  for (const path of ADVANCED_PATH_WORDLIST) {
    const url = `https://${domain}/${path}`;
    
    try {
      const response = await fetch(url, { 
        method: 'HEAD', 
        mode: 'no-cors' 
      });
      results.push(url);
    } catch {
      // Silently handle inaccessible paths
    }
    
    // Rate limiting
    await delay(100);
  }
  
  return results;
}
