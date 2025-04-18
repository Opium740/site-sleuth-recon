
// Background service worker for Site Sleuth Recon
console.log("Site Sleuth Recon background service worker initialized");

// Enhanced wordlist with Google-specific services - similar to FFuF wordlists
const COMPREHENSIVE_WORDLIST = [
  // Google-specific services
  'drive', 'mail', 'maps', 'photos', 'calendar', 'accounts', 'play', 'meet', 'chat',
  'classroom', 'cloud', 'translate', 'myaccount', 'domains', 'sites', 'groups',
  'hangouts', 'pay', 'scholar', 'books', 'earth', 'analytics',
  
  // Microsoft-specific services
  'onedrive', 'office', 'teams', 'outlook', 'azure', 'bing', 'live', 'account',
  
  // Common infrastructure
  'www', 'admin', 'dev', 'test', 'staging', 'beta', 'internal', 'vpn', 'remote', 
  'support', 'help', 'blog', 'cdn', 'static', 'api', 'service', 'gateway',
  
  // Security and monitoring
  'security', 'monitoring', 'logs', 'metrics', 'status', 'healthcheck',
  
  // Development and CI/CD
  'git', 'svn', 'jenkins', 'gitlab', 'bitbucket', 'ci', 'cd', 'build',
  
  // Database and backend
  'db', 'database', 'sql', 'mysql', 'postgres', 'mongodb', 'redis', 
  'backend', 'server', 'proxy', 'cache',
  
  // Common subdomains
  'intranet', 'extranet', 'portal', 'dashboard', 'panel', 'login', 
  'auth', 'sso', 'marketplace', 'store', 'billing', 'crm', 'erp',
  'help', 'support', 'kb', 'faq', 'feedback', 'community', 'developer',
  'affiliate', 'partners', 'careers', 'jobs', 'about', 'contact', 'learn',
  'training', 'video', 'audio', 'music', 'tv', 'streaming', 'press', 'investor',
  'security', 'privacy', 'legal', 'terms', 'careers', 'blog', 'status'
];

// Service-specific subdomain prefixes (like Amass configuration)
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
  'github.com': [
    'gist', 'api', 'education', 'pages', 'status', 'support', 'enterprise',
    'training', 'classroom', 'docs'
  ]
};

// Path wordlist for directory fuzzing (like FFuF paths.txt)
const COMMON_PATHS = [
  'admin', 'login', 'wp-admin', 'administrator', 'dashboard', 'wp-login.php',
  'admin.php', 'api', 'v1', 'v2', 'api/v1', 'console', 'panel', 'control',
  'webmail', 'mail', 'cpanel', 'phpmyadmin', 'db', 'database', 'backups',
  'backup', 'dev', 'development', 'staging', 'test', 'beta', 'old', '.git',
  '.env', 'config', 'settings', 'setup', 'install', 'wp-config.php', 'config.php',
  'server-status', 'logs', 'log', 'tmp', 'temp', 'uploads', 'download', 'public',
  'private', 'wp-content', 'wp-includes', 'images', 'img', 'js', 'css', 'assets',
  'plugins', 'themes', 'files', 'docs', 'documentation', 'forum', 'forums',
  'blog', 'blogs', 'shop', 'store', 'cart', 'checkout', 'account', 'members',
  'member', 'user', 'users', 'profile', 'billing', 'payment', 'payments',
  'order', 'orders', 'product', 'products', 'category', 'categories', 'tag',
  'tags', 'comment', 'comments', 'search', 'wp-json', 'api/graphql', 'graphql',
  'wp', 'wordpress', 'joomla', 'drupal', 'magento', 'index.php', 'home', 'site',
  'local', 'media', 'news', 'archive', 'old-site', 'new-site', 'test-site',
  'demo', 'rss', 'xml', 'sitemap', 'sitemap.xml', 'robots.txt', 'license',
  'CHANGELOG', 'README', '.htaccess', '.svn', 'vendor', 'node_modules',
  'composer.json', 'package.json', '.DS_Store', 'cgi-bin', 'services', 'editor',
  'auth', 'sign-in', 'login.php', 'signin', 'signup', 'register', 'forgotten-password',
  'reset-password', 'password-reset', 'recover', 'recovery'
];

// Utility function for rate-limited fetching
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

// Function to fetch subdomains from multiple sources - inspired by Amass approach
async function fetchSubdomains(domain) {
  try {
    console.log("Fetching from multiple sources for domain:", domain);
    const subdomains = new Set();
    
    // 1. Try certificate transparency logs (passive, similar to Amass passive collection)
    try {
      console.log("Fetching from certificate transparency logs (crt.sh)");
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
        
        console.log(`Found ${subdomains.size} subdomains from certificate transparency`);
      } else {
        console.warn("Certificate transparency response not OK:", response.status);
      }
    } catch (error) {
      console.error("Error with certificate transparency:", error);
    }
    
    // 2. FFuF-style subdomain enumeration with adaptive wordlists
    try {
      console.log("Using adaptive wordlist for subdomain fuzzing");
      let subdomainPrefixes = [...COMPREHENSIVE_WORDLIST];
      
      // Add service-specific prefixes if we know the domain (similar to FFuF custom wordlists)
      for (const [serviceDomain, prefixes] of Object.entries(SERVICE_SPECIFIC_PREFIXES)) {
        if (domain.includes(serviceDomain)) {
          console.log(`Adding ${prefixes.length} service-specific prefixes for ${serviceDomain}`);
          subdomainPrefixes = [...subdomainPrefixes, ...prefixes];
        }
      }
      
      // Remove duplicates from the prefixes
      subdomainPrefixes = [...new Set(subdomainPrefixes)];
      
      // Process in batches with rate limiting (like FFuF's rate limiting)
      const batchSize = 5;
      for (let i = 0; i < subdomainPrefixes.length; i += batchSize) {
        const batch = subdomainPrefixes.slice(i, i + batchSize);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (prefix) => {
          const subdomain = `${prefix}.${domain}`;
          try {
            await fetch(`https://${subdomain}`, { mode: 'no-cors', method: 'HEAD' });
            // If no error thrown, add it to our results
            subdomains.add(subdomain);
          } catch (e) {
            // Ignore errors - just means this subdomain doesn't exist or can't be accessed
          }
        });
        
        await Promise.all(batchPromises);
        await delay(300); // Rate limiting between batches
      }
      
      console.log(`Found ${subdomains.size} subdomains total after wordlist fuzzing`);
    } catch (error) {
      console.error("Error with subdomain wordlist fuzzing:", error);
    }
    
    // 3. Add base domain itself
    subdomains.add(domain);
    
    // 4. Add www if it's not already the base domain
    if (!domain.startsWith('www.')) {
      subdomains.add(`www.${domain}`);
    }
    
    // Clean any potentially invalid subdomains before returning
    const cleanedSubdomains = [...subdomains].filter(subdomain => {
      // Basic validation to avoid obviously incorrect subdomains
      return subdomain && 
        subdomain.includes('.') && 
        !subdomain.includes('--') &&
        !subdomain.includes('..') &&
        !subdomain.includes('\\') &&
        !subdomain.includes('---') &&
        !subdomain.match(/[^a-zA-Z0-9.-]/); // Only allow alphanumeric, dots and hyphens
    });
    
    return cleanedSubdomains;
  } catch (error) {
    console.error('Error in subdomain fetching:', error);
    throw error;
  }
}
