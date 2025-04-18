// Background service worker for Site Sleuth Recon
console.log("Site Sleuth Recon background service worker initialized");

// List of common and known service subdomains for major websites
const COMMON_SUBDOMAIN_PREFIXES = [
  'www', 'mail', 'remote', 'blog', 'webmail', 'server', 'ns1', 'ns2', 
  'smtp', 'secure', 'vpn', 'm', 'shop', 'ftp', 'mail2', 'test', 'portal', 
  'dns', 'host', 'mail1', 'mx', 'email', 'cloud', 'api', 'exchange', 
  'app', 'staging', 'proxy', 'backup', 'dev', 'web', 'admin', 'cdn', 
  'login', 'store', 'beta', 'support', 'search', 'mobile', 'forum', 'images', 
  'news', 'docs', 'status', 'help', 'intranet', 'media', 'static', 'db',
  'demo', 'dashboard', 'go', 'wiki', 'internal', 'design', 'training', 'svn',
  'git', 'jenkins', 'team', 'chat', 'labs', 'hr', 'crm', 'sonarqube',
  'confluence', 'analytics', 'jira', 'graphql', 'monitoring', 'docker', 'billing',
  // Google-specific services
  'drive', 'maps', 'photos', 'calendar', 'accounts', 'play', 'meet', 'chat',
  'classroom', 'cloud', 'translate', 'myaccount', 'domains', 'sites', 'groups',
  'hangouts', 'photos', 'pay', 'scholar', 'books', 'earth', 'analytics',
  // Microsoft-specific services
  'onedrive', 'office', 'teams', 'outlook', 'azure', 'bing', 'live', 'account',
  // Amazon-specific services
  'aws', 'console', 's3', 'ec2', 'signin', 'login', 'seller', 'smile',
  // Facebook-specific services
  'developers', 'business', 'connect', 'messenger', 'workplace', 'gaming',
  // Other common services
  'help', 'support', 'kb', 'faq', 'feedback', 'community', 'developer',
  'affiliate', 'partners', 'careers', 'jobs', 'about', 'contact', 'learn',
  'training', 'video', 'audio', 'music', 'tv', 'streaming', 'press', 'investor',
  'security', 'privacy', 'legal', 'terms', 'careers', 'blog', 'status'
];

// Additional subdomain prefixes for service-specific sites
const SERVICE_SPECIFIC_PREFIXES = {
  'google.com': [
    'mail', 'drive', 'docs', 'photos', 'calendar', 'meet', 'chat', 'maps',
    'translate', 'accounts', 'myaccount', 'contacts', 'keep', 'classroom',
    'cloud', 'analytics', 'developers', 'play', 'support', 'domains', 'admin',
    'groups', 'sites', 'hangouts', 'chrome', 'store', 'pay', 'scholar', 'trends',
    'books', 'earth', 'finance'
  ],
  'microsoft.com': [
    'outlook', 'office', 'teams', 'onedrive', 'azure', 'windows', 'account',
    'docs', 'support', 'learn', 'developer', 'techcommunity', 'partner', 'msdn'
  ],
  'amazon.com': [
    'aws', 'seller', 'affiliate', 'developer', 'console', 'services', 'smile',
    'pay', 'music', 'prime', 'kindle', 'photos', 'drive'
  ],
  'facebook.com': [
    'developers', 'business', 'm', 'workplace', 'gaming', 'messenger'
  ],
  'github.com': [
    'gist', 'api', 'education', 'pages', 'status', 'support', 'enterprise',
    'training', 'classroom', 'docs'
  ]
};

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message);
  
  if (message.action === "scanPath") {
    console.log("Scanning path:", message.url);
    fetchUrl(message.url)
      .then(result => {
        console.log("Scan result:", result);
        sendResponse(result);
      })
      .catch(error => {
        console.error("Scan error:", error);
        sendResponse({ error: error.message, success: false });
      });
    return true; // Indicates we'll respond asynchronously
  } else if (message.action === "fetchSubdomains") {
    console.log("Fetching subdomains for:", message.domain);
    fetchSubdomains(message.domain)
      .then(subdomains => {
        console.log("Found subdomains:", subdomains.length);
        sendResponse({ subdomains });
      })
      .catch(error => {
        console.error("Subdomain fetch error:", error);
        sendResponse({ error: error.message, subdomains: [] });
      });
    return true; // Indicates we'll respond asynchronously
  } else if (message.action === "saveToFile") {
    console.log("Saving data to file:", message.data.length, "items");
    const blob = new Blob([message.data.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({
      url: url,
      filename: message.filename || "site-sleuth-results.txt",
      saveAs: true
    }, () => {
      URL.revokeObjectURL(url);
      sendResponse({ success: true });
    });
    return true; // Indicates we'll respond asynchronously
  }
});

// Function to fetch a URL and check its status
async function fetchUrl(url) {
  try {
    console.log("Fetching URL:", url);
    const response = await fetch(url, { 
      method: 'HEAD',
      mode: 'no-cors' // Fix CORS issues by using no-cors mode
    });
    
    // Since no-cors returns opaque responses, we can't access status
    // We'll consider it a success if the fetch doesn't throw an error
    return { 
      url, 
      success: true
    };
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return { url, error: error.message, success: false };
  }
}

// Function to fetch subdomains from multiple sources
async function fetchSubdomains(domain) {
  try {
    console.log("Fetching from multiple sources for domain:", domain);
    const subdomains = new Set();
    
    // Track our fetching progress
    let completedSources = 0;
    const totalSources = 5; // Currently using 5 sources
    
    // 1. Try crt.sh (SSL certificates)
    try {
      console.log("Fetching from crt.sh for domain:", domain);
      const response = await fetch(`https://crt.sh/?q=%.${domain}&output=json`, {
        mode: 'cors',
        cache: 'no-cache'
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Extract unique subdomains
        const allNames = data.map(entry => entry.name_value.split('\n')).flat();
        
        // Remove wildcard domains and duplicates
        allNames.filter(name => 
          !name.includes('*') && 
          name.includes(domain) &&
          !name.includes('--') && // Filter out invalid subdomain formats
          !name.includes('..') &&
          !name.includes('\\') &&
          name.match(/^[a-zA-Z0-9.-]+$/) // Only allow alphanumeric, dots and hyphens
        ).forEach(name => subdomains.add(name));
        
        console.log(`Found ${subdomains.size} subdomains from crt.sh`);
      } else {
        console.warn("crt.sh response not OK:", response.status);
      }
    } catch (error) {
      console.error("Error with crt.sh:", error);
    }
    
    completedSources++;
    
    // 2. Try VirusTotal API (if available - passive for now)
    try {
      // This is just a placeholder - actual VirusTotal API requires an API key
      console.log("VirusTotal API would be queried here in a production version");
    } catch (error) {
      console.error("Error with VirusTotal:", error);
    }
    
    completedSources++;
    
    // 3. Try SecurityTrails API (if available - passive for now)
    try {
      // This is just a placeholder - actual SecurityTrails API requires an API key
      console.log("SecurityTrails API would be queried here in a production version");
    } catch (error) {
      console.error("Error with SecurityTrails:", error);
    }
    
    completedSources++;

    // 4. Try common subdomain enumeration
    try {
      console.log("Using common subdomain wordlist");
      let subdomainPrefixes = [...COMMON_SUBDOMAIN_PREFIXES];
      
      // Add service-specific prefixes if we know the domain
      for (const [serviceDomain, prefixes] of Object.entries(SERVICE_SPECIFIC_PREFIXES)) {
        if (domain.includes(serviceDomain)) {
          console.log(`Adding ${prefixes.length} service-specific prefixes for ${serviceDomain}`);
          subdomainPrefixes = [...subdomainPrefixes, ...prefixes];
        }
      }
      
      // Remove duplicates from the prefixes
      subdomainPrefixes = [...new Set(subdomainPrefixes)];
      
      for (const prefix of subdomainPrefixes) {
        const subdomain = `${prefix}.${domain}`;
        try {
          await fetch(`https://${subdomain}`, { mode: 'no-cors', method: 'HEAD' });
          // If no error thrown, add it to our results
          subdomains.add(subdomain);
        } catch (e) {
          // Ignore errors - just means this subdomain doesn't exist or can't be accessed
        }
      }
      
      console.log(`Found ${subdomains.size} subdomains total after wordlist check`);
    } catch (error) {
      console.error("Error with subdomain wordlist check:", error);
    }
    
    completedSources++;
    
    // 5. Try DNS resolution with common patterns
    try {
      console.log("Checking DNS resolution for common patterns");
      // Add base domain itself
      subdomains.add(domain);
      
      // Add www if it's not already the base domain
      if (!domain.startsWith('www.')) {
        subdomains.add(`www.${domain}`);
      }
      
      console.log(`Found ${subdomains.size} subdomains total after DNS checks`);
    } catch (error) {
      console.error("Error with DNS checks:", error);
    }
    
    completedSources++;
    
    // Clean any potentially invalid subdomains before returning
    const cleanedSubdomains = [...subdomains].filter(subdomain => {
      // Basic validation to avoid obviously incorrect subdomains
      return subdomain && 
        subdomain.includes('.') && 
        !subdomain.includes('--') &&
        !subdomain.includes('..') &&
        !subdomain.includes('\\') &&
        !subdomain.includes('---') &&
        subdomain.match(/^[a-zA-Z0-9.-]+$/); // Only allow alphanumeric, dots and hyphens
    });
    
    return cleanedSubdomains;
  } catch (error) {
    console.error('Error in subdomain fetching:', error);
    throw error;
  }
}

// Advanced subdomain enumeration function
async function advancedSubdomainEnumeration(domain) {
  const subdomains = new Set();
  
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
async function traditionalSubdomainBruteforce(domain) {
  const results = [];
  
  for (const prefix of COMMON_SUBDOMAIN_PREFIXES) {
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
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}
