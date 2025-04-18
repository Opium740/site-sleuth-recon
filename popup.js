
// Common paths used for directory scanning - enhanced wordlist
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
const saveSubdomainsButton = document.createElement('button');
const saveDirectoriesButton = document.createElement('button');

// Variables to track state
let currentDomain = null;
let isLoading = false;
let activeOperation = null;
let scannedSubdomains = [];
let scannedDirectories = [];

// Setup save buttons
function setupSaveButtons() {
  // Configure subdomain save button
  saveSubdomainsButton.className = 'button save-button';
  saveSubdomainsButton.textContent = 'Save to File';
  saveSubdomainsButton.style.marginTop = '10px';
  saveSubdomainsButton.style.backgroundColor = '#10b981';
  saveSubdomainsButton.disabled = true;
  
  // Configure directory save button
  saveDirectoriesButton.className = 'button save-button';
  saveDirectoriesButton.textContent = 'Save to File';
  saveDirectoriesButton.style.marginTop = '10px';
  saveDirectoriesButton.style.backgroundColor = '#10b981';
  saveDirectoriesButton.disabled = true;
  
  // Add them to the DOM after the results sections
  const subdomainTab = document.getElementById('subdomains-tab');
  const directoryTab = document.getElementById('directories-tab');
  
  subdomainTab.querySelector('.result-list').appendChild(saveSubdomainsButton);
  directoryTab.querySelector('.result-list').appendChild(saveDirectoriesButton);
  
  // Add event listeners
  saveSubdomainsButton.addEventListener('click', () => saveToFile(scannedSubdomains, `${currentDomain}-subdomains.txt`));
  saveDirectoriesButton.addEventListener('click', () => saveToFile(scannedDirectories, `${currentDomain}-directories.txt`));
}

// Function to save results to a file
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

// Function to update results UI with clickable links
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
    
    // Make all results clickable
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
        scannedSubdomains = response.subdomains;
        console.log(`Found ${scannedSubdomains.length} subdomains`);
        updateResults('subdomain-results', 'subdomain-count', scannedSubdomains);
        
        // Enable save button if results found
        saveSubdomainsButton.disabled = scannedSubdomains.length === 0;
        
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
  
  // Store found directories
  scannedDirectories = [];
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
          scannedDirectories.push(url);
        }
        
        // Check if all scans are complete
        if (completedScans === COMMON_PATHS.length) {
          console.log(`Found ${scannedDirectories.length} accessible directories`);
          updateResults('directory-results', 'directory-count', scannedDirectories);
          
          // Enable save button if results found
          saveDirectoriesButton.disabled = scannedDirectories.length === 0;
          
          if (scannedDirectories.length > 0) {
            showToast("Scan Complete", `Found ${scannedDirectories.length} accessible directories`);
          } else {
            showToast("No Results", "No accessible directories found");
          }
          
          setLoading('directories', false);
        }
      }
    );
  });
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
  
  // Set up UI elements
  setupSaveButtons();
  
  // Set up event listeners
  fetchSubdomainsButton.addEventListener('click', handleSubdomainScan);
  directoryScanButton.addEventListener('click', handleDirectoryScan);
  
  // Setup tabs
  setupTabs();
  
  // Get the current domain
  getCurrentDomain();
  
  // Save state when popup is closed
  window.addEventListener('beforeunload', saveStateToChromeStorage);
});

// When the domain is set, try to load previous results
function watchForDomainChanges() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'characterData' || mutation.type === 'childList') {
        if (currentDomain) {
          loadStateFromChromeStorage(currentDomain);
        }
      }
    });
  });
  
  observer.observe(currentDomainElement, { 
    characterData: true,
    childList: true,
    subtree: true
  });
}

// Start observing for domain changes
watchForDomainChanges();
