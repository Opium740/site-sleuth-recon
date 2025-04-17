
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
  }
});

// Function to fetch a URL and check its status
async function fetchUrl(url) {
  try {
    console.log("Fetching URL:", url);
    const response = await fetch(url, { method: 'HEAD' });
    return { 
      url, 
      status: response.status,
      success: response.status === 200
    };
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return { url, error: error.message, success: false };
  }
}

// Function to fetch subdomains from crt.sh
async function fetchSubdomains(domain) {
  try {
    console.log("Fetching from crt.sh for domain:", domain);
    const response = await fetch(`https://crt.sh/?q=%.${domain}&output=json`);
    if (!response.ok) {
      throw new Error(`Error fetching subdomains: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Extract unique subdomains
    const allNames = data.map(entry => entry.name_value.split('\n')).flat();
    
    // Remove wildcard domains and duplicates
    const uniqueSubdomains = [...new Set(allNames.filter(name => 
      !name.includes('*') && name.includes(domain)
    ))];
    
    return uniqueSubdomains;
  } catch (error) {
    console.error('Error fetching subdomains:', error);
    throw error;
  }
}
