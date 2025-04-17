
// Common paths used for directory scanning
const COMMON_PATHS = [
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

// Function to show a toast notification
function showToast(title, message, type = 'info') {
  console.log(`${title}: ${message}`);
  // Since we're in a simple extension, we'll just use console.log for now
  // In a more complex extension, we'd implement a visual toast notification
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

// Function to update results UI
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
    
    // If result is a full URL, make it clickable
    if (result.startsWith('http')) {
      const link = document.createElement('a');
      link.href = result;
      link.textContent = result;
      link.target = '_blank';
      item.appendChild(link);
    } else {
      item.textContent = result;
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
        const results = response.subdomains;
        console.log(`Found ${results.length} subdomains`);
        updateResults('subdomain-results', 'subdomain-count', results);
        
        if (results.length > 0) {
          showToast("Scan Complete", `Found ${results.length} subdomains`);
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
  
  // Store found directories
  const foundDirectories = [];
  let completedScans = 0;
  
  // Scan each path
  COMMON_PATHS.forEach(path => {
    const url = `https://${currentDomain}/${path}`;
    
    chrome.runtime.sendMessage(
      { action: 'scanPath', url },
      (response) => {
        completedScans++;
        
        if (chrome.runtime.lastError) {
          console.error('Chrome runtime error:', chrome.runtime.lastError);
          // Continue with other scans
        } else if (response && response.success) {
          foundDirectories.push(url);
        }
        
        // Check if all scans are complete
        if (completedScans === COMMON_PATHS.length) {
          console.log(`Found ${foundDirectories.length} accessible directories`);
          updateResults('directory-results', 'directory-count', foundDirectories);
          
          if (foundDirectories.length > 0) {
            showToast("Scan Complete", `Found ${foundDirectories.length} accessible directories`);
          } else {
            showToast("No Results", "No accessible directories found");
          }
          
          setLoading('directories', false);
        }
      }
    );
  });
}

// Initialize the extension
document.addEventListener('DOMContentLoaded', () => {
  console.log("Site Sleuth Recon extension initialized");
  
  // Disable buttons by default
  fetchSubdomainsButton.disabled = true;
  directoryScanButton.disabled = true;
  
  // Set up event listeners
  fetchSubdomainsButton.addEventListener('click', handleSubdomainScan);
  directoryScanButton.addEventListener('click', handleDirectoryScan);
  
  // Setup tabs
  setupTabs();
  
  // Get the current domain
  getCurrentDomain();
});
