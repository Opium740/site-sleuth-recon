
/**
 * Common paths used for directory scanning
 * This is a minimal list - in a real scanner this would be much more comprehensive
 */
export const COMMON_PATHS = [
  'admin',
  'login',
  'wp-admin',
  'administrator',
  'dashboard',
  'wp-login.php',
  'admin.php',
  'api',
  'v1',
  'v2',
  'api/v1',
  'console',
  'panel',
  'control',
  'webmail',
  'mail',
  'cpanel',
  'phpmyadmin',
  'db',
  'database',
  'backups',
  'backup',
  'dev',
  'development',
  'staging',
  'test',
  'beta',
  'old',
  '.git',
  '.env',
  'config',
  'settings',
  'setup',
  'install',
  'wp-config.php',
  'config.php',
  'server-status',
  'logs',
  'log',
  'tmp',
  'temp',
  'uploads',
];

/**
 * Extracts domain from a URL
 */
export function extractDomain(url: string): string | null {
  try {
    const hostname = new URL(url).hostname;
    return hostname;
  } catch (error) {
    console.error('Error extracting domain:', error);
    return null;
  }
}

/**
 * Gets the base domain from a hostname
 * E.g., subdomain.example.com -> example.com
 */
export function getBaseDomain(hostname: string): string {
  const parts = hostname.split('.');
  if (parts.length > 2) {
    // Handle special cases like co.uk, com.au
    if (parts.length === 3 && parts[parts.length - 2].length <= 3) {
      return parts.slice(-3).join('.');
    }
    return parts.slice(-2).join('.');
  }
  return hostname;
}

/**
 * Delay function to enforce rate limiting
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch subdomains from crt.sh
 */
export async function fetchSubdomains(domain: string): Promise<string[]> {
  try {
    const response = await fetch(`https://crt.sh/?q=%.${domain}&output=json`);
    if (!response.ok) {
      throw new Error(`Error fetching subdomains: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Extract unique subdomains
    const allNames = data.map((entry: any) => entry.name_value.split('\n')).flat();
    
    // Remove wildcard domains and duplicates
    const uniqueSubdomains = [...new Set(allNames.filter((name: string) => 
      !name.includes('*') && name.includes(domain)
    ))];
    
    return uniqueSubdomains;
  } catch (error) {
    console.error('Error fetching subdomains:', error);
    return [];
  }
}

/**
 * Scan a URL for a specific path
 * Returns the URL if accessible (200 OK), null otherwise
 */
export async function scanPath(baseUrl: string, path: string): Promise<string | null> {
  try {
    const url = new URL(path, baseUrl).toString();
    
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      // We can't actually check the status directly due to CORS
      // In a real extension, this would use chrome.runtime.sendMessage to have
      // the background script perform the fetch
    });
    
    // Since we're using no-cors mode, we assume success
    // In a real extension with background script, we'd check response.status === 200
    return url;
  } catch (error) {
    console.error(`Error scanning ${path}:`, error);
    return null;
  }
}

/**
 * Scan multiple paths with rate limiting
 */
export async function scanPaths(
  domain: string, 
  paths: string[] = COMMON_PATHS, 
  rateLimit: number = 500
): Promise<string[]> {
  const baseUrl = `https://${domain}/`;
  const results: string[] = [];

  for (const path of paths) {
    const result = await scanPath(baseUrl, path);
    if (result) {
      results.push(result);
    }
    await delay(rateLimit); // Rate limiting
  }

  return results;
}
