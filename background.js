
// Background service worker for Site Sleuth Recon
console.log("Site Sleuth Recon background service worker initialized");

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
    const totalSources = 2; // Currently using 2 sources
    
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
          !name.includes('*') && name.includes(domain)
        ).forEach(name => subdomains.add(name));
        
        console.log(`Found ${subdomains.size} subdomains from crt.sh`);
      } else {
        console.warn("crt.sh response not OK:", response.status);
      }
    } catch (error) {
      console.error("Error with crt.sh:", error);
    }
    
    completedSources++;
    
    // 2. Try common subdomain enumeration (basic)
    try {
      console.log("Using common subdomain wordlist");
      const commonSubdomains = [
        "www", "mail", "remote", "blog", "webmail", "server", "ns1", "ns2", 
        "smtp", "secure", "vpn", "m", "shop", "ftp", "mail2", "test", "portal", 
        "dns", "host", "mail1", "mx", "email", "cloud", "api", "exchange", 
        "app", "staging", "proxy", "backup", "dev", "web", "admin", "cdn", 
        "login", "store", "beta", "support", "search", "mobile", "forum", "images", 
        "news", "docs", "status", "help", "intranet", "media", "static", "db",
        "demo", "dashboard", "go", "wiki", "internal", "design", "training", "svn",
        "git", "jenkins", "team", "chat", "labs", "hr", "crm", "sonarqube",
        "confluence", "analytics", "jira", "graphql", "monitoring", "docker", "billing"
      ];
      
      for (const sub of commonSubdomains) {
        const url = `https://${sub}.${domain}`;
        try {
          await fetch(url, { mode: 'no-cors', method: 'HEAD' });
          // If no error thrown, add it to our results
          subdomains.add(`${sub}.${domain}`);
        } catch (e) {
          // Ignore errors - just means this subdomain doesn't exist or can't be accessed
        }
      }
      
      console.log(`Found ${subdomains.size} subdomains total after wordlist check`);
    } catch (error) {
      console.error("Error with subdomain wordlist check:", error);
    }
    
    completedSources++;
    
    return [...subdomains];
  } catch (error) {
    console.error('Error in subdomain fetching:', error);
    throw error;
  }
}
