
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

// Function to load wordlists from files
async function loadWordlist(filename) {
  try {
    const response = await fetch(chrome.runtime.getURL(`wordlists/${filename}`));
    if (!response.ok) throw new Error('Failed to load wordlist');
    const text = await response.text();
    return text.split('\n').filter(line => 
      line && !line.startsWith('#') && line.trim()
    );
  } catch (error) {
    console.error(`Error loading wordlist ${filename}:`, error);
    return [];
  }
}

// Modified fetchSubdomains function to use external wordlists
async function fetchSubdomains(domain) {
  try {
    console.log("Fetching from multiple sources for domain:", domain);
    const subdomains = new Set();
    
    // 1. Load and use custom wordlists
    const customWordlist = await loadWordlist('subdomains.txt');
    console.log(`Loaded ${customWordlist.length} entries from custom wordlist`);
    
    if (customWordlist.length > 0) {
      // Process custom wordlist entries
      const batchSize = 5;
      for (let i = 0; i < customWordlist.length; i += batchSize) {
        const batch = customWordlist.slice(i, i + batchSize);
        const batchPromises = batch.map(async (prefix) => {
          const subdomain = `${prefix}.${domain}`;
          try {
            await fetch(`https://${subdomain}`, { mode: 'no-cors', method: 'HEAD' });
            subdomains.add(subdomain);
          } catch (e) {
            // Subdomain not accessible
          }
        });
        
        await Promise.all(batchPromises);
        await delay(300); // Rate limiting
      }
    }
    
    // 2. Certificate transparency logs (keep this as backup)
    try {
      console.log("Fetching from certificate transparency logs");
      const response = await fetch(`https://crt.sh/?q=%.${domain}&output=json`, {
        mode: 'cors',
        cache: 'no-cache'
      });
      
      if (response.ok) {
        const data = await response.json();
        const allNames = data.map(entry => entry.name_value.split('\n')).flat();
        
        allNames.filter(name => 
          !name.includes('*') && 
          name.includes(domain) &&
          !name.includes('--') &&
          !name.includes('..') &&
          !name.includes('\\') &&
          name.match(/^[a-zA-Z0-9.-]+$/)
        ).forEach(name => subdomains.add(name));
      }
    } catch (error) {
      console.error("Error with certificate transparency:", error);
    }
    
    // Clean and return results
    return Array.from(subdomains).filter(subdomain => 
      subdomain && 
      subdomain.includes('.') && 
      !subdomain.includes('--') &&
      !subdomain.match(/[^a-zA-Z0-9.-]/)
    );
  } catch (error) {
    console.error('Error in subdomain fetching:', error);
    throw error;
  }
}

// Modified directory scanning to use custom wordlist and filter by status code
async function scanDirectories(domain) {
  try {
    const customPaths = await loadWordlist('directories.txt');
    const paths = customPaths.length > 0 ? customPaths : COMMON_PATHS;
    
    const results = [];
  
    // Use advanced path wordlist for directory fuzzing (like FFuF)
    for (const path of paths) {
      const url = `https://${domain}/${path}`;
      
      try {
        // Use fetch with full response to get status code and length
        const response = await fetch(url, { method: 'GET' });
        const status = response.status;
        const contentLength = response.headers.get('content-length') || '0';
        const text = await response.text();
        const actualLength = text.length;
        
        // Only include 200 OK and 302 Found responses
        if (status === 200 || status === 302) {
          results.push({
            url,
            status,
            contentLength: contentLength !== '0' ? parseInt(contentLength) : actualLength
          });
        }
      } catch (error) {
        // Silently handle inaccessible paths
      }
      
      // Rate limiting
      await delay(100);
    }
    
    return results;
  } catch (error) {
    console.error('Error loading directory wordlist:', error);
    return []; // Return empty results on error
  }
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
  } else if (message.action === "scanDirectories") {
    console.log("Scanning directories for:", message.domain);
    scanDirectories(message.domain)
      .then(directories => {
        console.log("Found directories:", directories.length);
        sendResponse({ directories });
      })
      .catch(error => {
        console.error("Directory scan error:", error);
        sendResponse({ error: error.message, directories: [] });
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
    const response = await fetch(url);
    
    // Get response status and length
    const status = response.status;
    const contentLength = response.headers.get('content-length') || '0';
    const text = await response.text();
    const actualLength = text.length;
    
    return { 
      url, 
      success: true,
      status,
      contentLength: contentLength !== '0' ? parseInt(contentLength) : actualLength
    };
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return { url, error: error.message, success: false };
  }
}
