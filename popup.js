
// DOM elements
const currentDomainElement = document.getElementById('current-domain');
const fetchSubdomainsButton = document.getElementById('fetch-subdomains');
const directoryScanButton = document.getElementById('directory-scan');
const subdomainResults = document.getElementById('subdomain-results');
const directoryResults = document.getElementById('directory-results');
const subdomainCount = document.getElementById('subdomain-count');
const directoryCount = document.getElementById('directory-count');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

// Variables to track state
let currentDomain = null;
let isLoading = false;
let activeOperation = null;
let scannedSubdomains = [];
let scannedDirectories = [];

// Setup save buttons
const saveSubdomainsButton = document.createElement('button');
saveSubdomainsButton.className = 'button save-button';
saveSubdomainsButton.textContent = 'Save to File';
saveSubdomainsButton.style.marginTop = '10px';
saveSubdomainsButton.style.backgroundColor = '#10b981';
saveSubdomainsButton.disabled = true;

const saveDirectoriesButton = document.createElement('button');
saveDirectoriesButton.className = 'button save-button';
saveDirectoriesButton.textContent = 'Save to File';
saveDirectoriesButton.style.marginTop = '10px';
saveDirectoriesButton.style.backgroundColor = '#10b981';
saveDirectoriesButton.disabled = true;

// Function to show a toast notification
function showToast(title, message, type = 'info') {
  console.log(`${title}: ${message}`);
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.backgroundColor = type === 'error' ? '#ef4444' : '#10b981';
  toast.style.color = 'white';
  toast.style.padding = '10px 20px';
  toast.style.borderRadius = '5px';
  toast.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.25)';
  toast.style.zIndex = '1000';
  toast.style.transition = 'opacity 0.3s ease-in-out';
  toast.textContent = `${title}: ${message}`;
  
  // Add to DOM
  document.body.appendChild(toast);
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}

// Function to extract domain from a URL
function extractDomain(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname;
  } catch (error) {
    console.error('Error extracting domain:', error);
    return null;
  }
}

// Function to update UI to show loading state
function setLoading(operation, loading) {
  isLoading = loading;
  activeOperation = loading ? operation : null;
  
  fetchSubdomainsButton.disabled = loading;
  directoryScanButton.disabled = loading;
  
  if (operation === 'subdomains') {
    if (loading) {
      fetchSubdomainsButton.innerHTML = '<span class="spinner"></span> Scanning...';
    } else {
      fetchSubdomainsButton.textContent = 'Fetch Subdomains';
    }
  } else if (operation === 'directories') {
    if (loading) {
      directoryScanButton.innerHTML = '<span class="spinner"></span> Scanning...';
    } else {
      directoryScanButton.textContent = 'Start Directory Scan';
    }
  }
}

// Function to update results UI with clickable links and additional information
function updateResults(elementId, countId, results) {
  const container = document.getElementById(elementId);
  const countElement = document.getElementById(countId);
  
  container.innerHTML = '';
  countElement.textContent = results.length;
  
  if (results.length === 0) {
    container.innerHTML = '<div class="result-item">No results found</div>';
    return;
  }
  
  results.forEach(result => {
    const item = document.createElement('div');
    item.className = 'result-item';
    
    // For directory results with status and length information
    if (typeof result === 'object' && result.url) {
      const link = document.createElement('a');
      link.href = result.url;
      link.textContent = result.url;
      link.target = '_blank';
      link.style.color = '#4f46e5';
      link.style.textDecoration = 'none';
      
      // Create status code and length badges
      const statusBadge = document.createElement('span');
      statusBadge.className = 'status-badge';
      statusBadge.textContent = `Status: ${result.status}`;
      statusBadge.style.backgroundColor = result.status === 200 ? '#10b981' : '#f59e0b';
      statusBadge.style.color = 'white';
      statusBadge.style.padding = '2px 6px';
      statusBadge.style.borderRadius = '4px';
      statusBadge.style.fontSize = '10px';
      statusBadge.style.marginLeft = '8px';
      
      const lengthBadge = document.createElement('span');
      lengthBadge.className = 'length-badge';
      lengthBadge.textContent = `Length: ${result.contentLength}`;
      lengthBadge.style.backgroundColor = '#6b7280';
      lengthBadge.style.color = 'white';
      lengthBadge.style.padding = '2px 6px';
      lengthBadge.style.borderRadius = '4px';
      lengthBadge.style.fontSize = '10px';
      lengthBadge.style.marginLeft = '4px';
      
      item.appendChild(link);
      item.appendChild(statusBadge);
      item.appendChild(lengthBadge);
    } else {
      // Simple string result (subdomains)
      const link = document.createElement('a');
      
      // If result doesn't start with http, add the protocol
      let url = result;
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      
      link.href = url;
      link.textContent = result;
      link.target = '_blank';
      link.style.color = '#4f46e5';
      link.style.textDecoration = 'none';
      link.style.display = 'block';
      link.style.width = '100%';
      
      item.appendChild(link);
    }
    
    container.appendChild(item);
  });
}

// Function to handle tab clicking
function setupTabs() {
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs and contents
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding content
      tab.classList.add('active');
      const tabId = tab.getAttribute('data-tab');
      document.getElementById(`${tabId}-tab`).classList.add('active');
    });
  });
}

// Function to save results to file
function saveToFile(data, filename) {
  if (!data || data.length === 0) {
    showToast("Error", "No data to save", "error");
    return;
  }
  
  chrome.runtime.sendMessage(
    { 
      action: 'saveToFile', 
      data: data,
      filename: filename
    },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error saving file:', chrome.runtime.lastError);
        showToast("Error", "Failed to save file: " + chrome.runtime.lastError.message, "error");
      } else if (response && response.success) {
        showToast("Success", "File saved successfully");
      }
    }
  );
}

// Function to get the current tab's domain
function getCurrentDomain() {
  try {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]?.url) {
        const domain = extractDomain(tabs[0].url);
        console.log("Current domain:", domain);
        currentDomain = domain;
        currentDomainElement.textContent = domain || 'Unable to detect domain';
        
        // Enable buttons if domain is detected
        if (domain) {
          fetchSubdomainsButton.disabled = false;
          directoryScanButton.disabled = false;
          
          // Load any saved results for this domain
          loadStateFromChromeStorage(domain);
        } else {
          showToast("Error", "Could not detect a valid domain", "error");
        }
      } else {
        console.log("No URL found in current tab");
        currentDomainElement.textContent = 'No URL detected';
        showToast("Error", "Could not detect the current website URL. Please try again.", "error");
      }
    });
  } catch (error) {
    console.error("Error getting current domain:", error);
    currentDomainElement.textContent = 'Error detecting domain';
    showToast("Error", "Failed to detect domain: " + error.message, "error");
  }
}

// Function to fetch subdomains
function handleSubdomainScan() {
  if (!currentDomain) {
    showToast("Error", "No domain detected to scan", "error");
    return;
  }
  
  setLoading('subdomains', true);
  console.log(`Scanning subdomains for: ${currentDomain}`);
  
  chrome.runtime.sendMessage(
    { action: 'fetchSubdomains', domain: currentDomain },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error('Chrome runtime error:', chrome.runtime.lastError);
        showToast("Error", "Extension error: " + chrome.runtime.lastError.message, "error");
        setLoading('subdomains', false);
        return;
      }
      
      if (response && response.error) {
        console.error("Error during subdomain scan:", response.error);
        showToast("Scan Failed", "Error scanning subdomains: " + response.error, "error");
      } else if (response && response.subdomains) {
        scannedSubdomains = response.subdomains;
        console.log(`Found ${scannedSubdomains.length} subdomains`);
        updateResults('subdomain-results', 'subdomain-count', scannedSubdomains);
        
        // Enable save button if results found
        saveSubdomainsButton.disabled = scannedSubdomains.length === 0;
        
        // Save the results to Chrome storage
        saveStateToChromeStorage();
        
        if (scannedSubdomains.length > 0) {
          showToast("Scan Complete", `Found ${scannedSubdomains.length} subdomains`);
        } else {
          showToast("No Results", "No subdomains found");
        }
      }
      
      setLoading('subdomains', false);
    }
  );
}

// Function to scan directories
function handleDirectoryScan() {
  if (!currentDomain) {
    showToast("Error", "No domain detected to scan", "error");
    return;
  }
  
  setLoading('directories', true);
  console.log(`Scanning directories for: ${currentDomain}`);
  
  chrome.runtime.sendMessage(
    { action: 'scanDirectories', domain: currentDomain },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error('Chrome runtime error:', chrome.runtime.lastError);
        showToast("Error", "Extension error: " + chrome.runtime.lastError.message, "error");
        setLoading('directories', false);
        return;
      }
      
      if (response && response.error) {
        console.error("Error during directory scan:", response.error);
        showToast("Scan Failed", "Error scanning directories: " + response.error, "error");
      } else if (response && response.directories) {
        scannedDirectories = response.directories;
        console.log(`Found ${scannedDirectories.length} accessible directories`);
        updateResults('directory-results', 'directory-count', scannedDirectories);
        
        // Enable save button if results found
        saveDirectoriesButton.disabled = scannedDirectories.length === 0;
        
        // Save the results to Chrome storage
        saveStateToChromeStorage();
        
        if (scannedDirectories.length > 0) {
          showToast("Scan Complete", `Found ${scannedDirectories.length} accessible directories`);
        } else {
          showToast("No Results", "No accessible directories found");
        }
      }
      
      setLoading('directories', false);
    }
  );
}

// Function to save results between extension sessions
function saveStateToChromeStorage() {
  if (!currentDomain) return;
  
  chrome.storage.local.set({
    [`${currentDomain}_subdomains`]: scannedSubdomains,
    [`${currentDomain}_directories`]: scannedDirectories
  }, () => {
    console.log('Results saved to Chrome storage');
  });
}

// Function to load results from previous sessions
function loadStateFromChromeStorage(domain) {
  chrome.storage.local.get([
    `${domain}_subdomains`, 
    `${domain}_directories`
  ], (result) => {
    if (result[`${domain}_subdomains`]) {
      scannedSubdomains = result[`${domain}_subdomains`];
      updateResults('subdomain-results', 'subdomain-count', scannedSubdomains);
      saveSubdomainsButton.disabled = scannedSubdomains.length === 0;
    }
    
    if (result[`${domain}_directories`]) {
      scannedDirectories = result[`${domain}_directories`];
      updateResults('directory-results', 'directory-count', scannedDirectories);
      saveDirectoriesButton.disabled = scannedDirectories.length === 0;
    }
  });
}

// Initialize the extension
document.addEventListener('DOMContentLoaded', () => {
  console.log("Site Sleuth Recon extension initialized");
  
  // Disable buttons by default
  fetchSubdomainsButton.disabled = true;
  directoryScanButton.disabled = true;
  
  // Add save buttons to the DOM
  document.getElementById('subdomains-tab')
    .querySelector('.result-list')
    .appendChild(saveSubdomainsButton);
  
  document.getElementById('directories-tab')
    .querySelector('.result-list')
    .appendChild(saveDirectoriesButton);
  
  // Set up event listeners
  fetchSubdomainsButton.addEventListener('click', handleSubdomainScan);
  directoryScanButton.addEventListener('click', handleDirectoryScan);
  saveSubdomainsButton.addEventListener('click', () => 
    saveToFile(scannedSubdomains, `${currentDomain}-subdomains.txt`)
  );
  saveDirectoriesButton.addEventListener('click', () => 
    saveToFile(scannedDirectories.map(d => d.url), `${currentDomain}-directories.txt`)
  );
  
  // Setup tabs
  setupTabs();
  
  // Get the current domain
  getCurrentDomain();
  
  // Save state when popup is closed
  window.addEventListener('beforeunload', saveStateToChromeStorage);
});
