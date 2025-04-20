
// Background service worker for Site Sleuth Recon
console.log("Site Sleuth Recon background service worker initialized");

// Utility function for rate-limited fetching
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to load wordlists from files
async function loadWordlist(filename) {
  try {
    const response = await fetch(chrome.runtime.getURL(`wordlists/${filename}`));
    if (!response.ok) {
      console.error(`Failed to load wordlist ${filename}: ${response.status}`);
      return [];
    }
    const text = await response.text();
    return text.split('\n').filter(line => 
      line && !line.startsWith('#') && line.trim()
    );
  } catch (error) {
    console.error(`Error loading wordlist ${filename}:`, error);
    return [];
  }
}

// Fallback wordlists if custom ones aren't available
const FALLBACK_SUBDOMAINS = [
  'www', 'mail', 'webmail', 'admin', 'intranet', 'vpn', 'test', 'dev',
  'staging', 'beta', 'api', 'cdn', 'shop', 'blog', 'support', 'secure',
  'portal', 'services', 'login', 'forum', 'help', 'app', 'docs'
];

const FALLBACK_DIRECTORIES = [
  'admin', 'login', 'wp-admin', 'dashboard', 'wp-login.php', 'upload',
  'api', 'backup', 'dev', 'test', 'staging', '.git', 'config', 'settings',
  'images', 'img', 'css', 'js', 'assets', 'files', 'docs'
];

// Function to fetch subdomains using external wordlists
async function fetchSubdomains(domain) {
  try {
    console.log("Fetching subdomains for domain:", domain);
    const subdomains = new Set();
    
    // Add the main domain
    subdomains.add(domain);
    
    // 1. Try certificate transparency logs
    try {
      console.log("Fetching from certificate transparency logs (crt.sh)");
      const response = await fetch(`https://crt.sh/?q=%.${domain}&output=json`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Received ${data.length} entries from crt.sh`);
        
        // Extract unique subdomains
        const allNames = data.map(entry => entry.name_value.split('\n')).flat();
        
        // Filter and add valid subdomains
        allNames.filter(name => 
          !name.includes('*') && 
          name.includes(domain) &&
          !name.includes('--') &&
          !name.includes('..') &&
          !name.includes('\\') &&
          name.match(/^[a-zA-Z0-9.-]+$/)
        ).forEach(name => subdomains.add(name));
        
        console.log(`Found ${subdomains.size} subdomains from certificate transparency`);
      } else {
        console.warn("Certificate transparency response not OK:", response.status);
      }
    } catch (error) {
      console.error("Error with certificate transparency:", error);
    }
    
    // 2. Custom wordlist approach (like dirbuster)
    const customWordlist = await loadWordlist('subdomains.txt');
    const wordlist = customWordlist.length > 0 ? customWordlist : FALLBACK_SUBDOMAINS;
    console.log(`Using wordlist with ${wordlist.length} entries for subdomain enumeration`);
    
    const batchSize = 5;
    for (let i = 0; i < wordlist.length; i += batchSize) {
      const batch = wordlist.slice(i, i + batchSize);
      const batchPromises = batch.map(async (prefix) => {
        try {
          const subdomain = `${prefix}.${domain}`;
          const url = `https://${subdomain}`;
          console.log(`Checking subdomain: ${subdomain}`);
          
          // Try to fetch the subdomain
          const response = await fetch(url, {
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-store',
            redirect: 'follow',
            referrerPolicy: 'no-referrer'
          });
          
          // If we reach here, the fetch didn't throw an error
          console.log(`Subdomain likely exists: ${subdomain}`);
          subdomains.add(subdomain);
        } catch (e) {
          // Subdomain likely doesn't exist or is blocked
          console.log(`Subdomain error or doesn't exist`);
        }
      });
      
      await Promise.all(batchPromises);
      await delay(300); // Rate limiting
    }
    
    // Return unique and valid subdomains
    const result = Array.from(subdomains).filter(subdomain => 
      subdomain && 
      subdomain.includes('.') && 
      !subdomain.match(/[^a-zA-Z0-9.-]/)
    );
    
    console.log(`Returning ${result.length} subdomains`);
    return result;
  } catch (error) {
    console.error('Error fetching subdomains:', error);
    throw error;
  }
}

// Function to scan directories and return only 200 and 302 responses with response length
async function scanDirectories(domain) {
  try {
    console.log(`Starting directory scan for domain: ${domain}`);
    const customPaths = await loadWordlist('directories.txt');
    const paths = customPaths.length > 0 ? customPaths : FALLBACK_DIRECTORIES;
    console.log(`Using wordlist with ${paths.length} entries for directory scanning`);
    
    const results = [];
    const batchSize = 5;
    
    for (let i = 0; i < paths.length; i += batchSize) {
      const batch = paths.slice(i, i + batchSize);
      const batchPromises = batch.map(async (path) => {
        const url = `https://${domain}/${path}`;
        console.log(`Checking path: ${url}`);
        
        try {
          // Use fetch with full response to get status code and length
          const response = await fetch(url, { 
            method: 'GET',
            cache: 'no-store',
            redirect: 'follow'
          });
          
          const status = response.status;
          console.log(`Path ${url} returned status: ${status}`);
          
          // Only include 200 OK and 302 Found responses
          if (status === 200 || status === 302) {
            const contentLength = response.headers.get('content-length') || '0';
            const text = await response.text();
            const actualLength = text.length;
            
            results.push({
              url,
              status,
              contentLength: contentLength !== '0' ? parseInt(contentLength) : actualLength
            });
            console.log(`Added path to results: ${url} (${status})`);
          }
        } catch (error) {
          // Path is likely inaccessible
          console.log(`Error checking path ${url}: ${error.message}`);
        }
      });
      
      await Promise.all(batchPromises);
      await delay(200); // Rate limiting
    }
    
    console.log(`Directory scan complete, found ${results.length} results`);
    return results;
  } catch (error) {
    console.error('Error scanning directories:', error);
    return [];
  }
}

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
