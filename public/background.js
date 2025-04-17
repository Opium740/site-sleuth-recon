
// Background service worker for Site Sleuth Recon
console.log("Site Sleuth Recon background service worker initialized");

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "scanPath") {
    fetchUrl(message.url)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Indicates we'll respond asynchronously
  } else if (message.action === "fetchSubdomains") {
    fetchSubdomains(message.domain)
      .then(subdomains => sendResponse({ subdomains }))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Indicates we'll respond asynchronously
  }
});

// Function to fetch a URL and check its status
async function fetchUrl(url) {
  try {
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
