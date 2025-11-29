// Configuration
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbym7YMvy50cL_B7rocGmrRWmWJanAJaBXPzApRrKJQQpyWXcHVIv96vjLgMaGVn1EWU7g/exec'
// DOM Elements
const giftsContainer = document.getElementById('gifts-container');
const loading = document.getElementById('loading');
const errorElement = document.getElementById('error');
const successElement = document.getElementById('success');
const filtersContainer = document.getElementById('filters-container');
const filtersElement = document.getElementById('filters');
const addForm = document.getElementById('add-form');

// Stats elements
const totalGiftsElement = document.getElementById('total-gifts');
const boughtGiftsElement = document.getElementById('bought-gifts');
const pendingGiftsElement = document.getElementById('pending-gifts');

// Global state
let gifts = [];
let currentFilter = 'all';

// Generate filter buttons based on unique Kdo values
function generateFilters() {
    if (gifts.length === 0) {
        filtersContainer.style.display = 'none';
        return;
    }
    
    // Get unique values from Kdo column with better normalization
    const kdoValues = gifts.map(gift => gift.kdo)
        .filter(kdo => kdo && kdo.trim()) // Remove empty/null values
        .map(kdo => kdo.trim()); // Trim whitespace
    
    const uniqueKdo = [...new Set(kdoValues)];
    uniqueKdo.sort(); // Sort alphabetically
    
    // Create filter buttons
    const filterButtons = [
        `<button class="filter-btn ${currentFilter === 'all' ? 'active' : ''}" onclick="filterByKdo('all')">Vše (${gifts.length})</button>`,
        ...uniqueKdo.map(kdo => {
            const count = gifts.filter(gift => gift.kdo === kdo).length;
            return `<button class="filter-btn ${currentFilter === kdo ? 'active' : ''}" onclick="filterByKdo('${escapeHtml(kdo)}')">${escapeHtml(kdo)} (${count})</button>`;
        })
    ];
    
    filtersElement.innerHTML = filterButtons.join('');
    filtersContainer.style.display = 'block';
}

// Filter gifts by Kdo value
function filterByKdo(kdoValue) {
    currentFilter = kdoValue;
    
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`[onclick="filterByKdo('${kdoValue}')"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Filter and display gifts
    const filteredGifts = kdoValue === 'all' ? gifts : gifts.filter(gift => gift.kdo === kdoValue);
    displayGifts(filteredGifts);
    updateStats(filteredGifts);
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadGifts();
});

// Load gifts from Google Apps Script using JSONP
async function loadGifts() {
    showLoading();
    hideError();
    
    try {
        // Use JSONP to completely bypass CORS
        const callbackName = 'jsonp_' + Math.random().toString(36).substr(2, 9);
        const url = `${SCRIPT_URL}?action=fetch&callback=${callbackName}`;
        
        console.log('Loading from URL:', url);
        
        const data = await new Promise((resolve, reject) => {
            // Set up global callback
            window[callbackName] = function(response) {
                console.log('JSONP response:', response);
                resolve(response);
                // Cleanup
                delete window[callbackName];
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
            };
            
            // Create script tag
            const script = document.createElement('script');
            script.src = url;
            script.onerror = function() {
                reject(new Error('Failed to load data from Google Apps Script'));
                delete window[callbackName];
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
            };
            
            // Add timeout
            setTimeout(() => {
                if (window[callbackName]) {
                    reject(new Error('Request timeout'));
                    delete window[callbackName];
                    if (script.parentNode) {
                        script.parentNode.removeChild(script);
                    }
                }
            }, 10000);
            
            document.head.appendChild(script);
        });
        
        gifts = Array.isArray(data) ? data : [];
        console.log('Raw data from script:', data);
        console.log('Processed gifts:', gifts);
        console.log('Number of gifts:', gifts.length);
        
        // Debug: log each gift individually
        gifts.forEach((gift, index) => {
            console.log(`Gift ${index}:`, {
                kdo: gift.kdo,
                odKoho: gift.odKoho,
                co: gift.co,
                odkaz: gift.odkaz,
                status: gift.status
            });
        });
        
        displayGifts(gifts);
        updateStats(gifts);
        generateFilters();
        currentFilter = 'all';
        hideLoading();
        
    } catch (error) {
        console.error('Error loading gifts:', error);
        showError('Chyba při načítání dárků: ' + error.message);
        hideLoading();
    }
}

// Display gifts in the grid
function displayGifts(giftsToShow) {
    console.log('displayGifts called with:', giftsToShow);
    
    if (!Array.isArray(giftsToShow) || giftsToShow.length === 0) {
        giftsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎁</div>
                <h3>Žádné dárky zatím</h3>
                <p>Zatím nejsou v tabulce žádné dárky</p>
            </div>
        `;
        return;
    }
    
    // Filter out any invalid gifts
    const validGifts = giftsToShow.filter(gift => 
        gift && typeof gift === 'object' && gift.kdo && gift.co
    );
    
    console.log('Valid gifts after filtering:', validGifts);
    
    if (validGifts.length === 0) {
        giftsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h3>Neplatná data</h3>
                <p>Data ze tabulky nejsou ve správném formátu</p>
            </div>
        `;
        return;
    }
    
    giftsContainer.innerHTML = validGifts.map(gift => `
        <div class="gift-card ${getStatusClass(gift.status)}">
            <div class="gift-header">
                <div class="gift-recipient">
                    <span class="recipient-name">${escapeHtml(gift.kdo)}</span>
                    ${gift.odKoho ? `<span class="gift-from"> od: ${escapeHtml(gift.odKoho)}</span>` : ''}
                </div>
                <div class="gift-status-container">
                    <select class="status-select status-${getStatusClass(gift.status)}" 
                            onchange="changeStatus('${escapeHtml(gift.kdo)}', '${escapeHtml(gift.co)}', this.value)">
                        <option value="Vyjasnit" ${gift.status === 'Vyjasnit' ? 'selected' : ''}>Vyjasnit</option>
                        <option value="Objednano" ${gift.status === 'Objednano' ? 'selected' : ''}>Objednano</option>
                        <option value="Hotovo" ${gift.status === 'Hotovo' ? 'selected' : ''}>Hotovo</option>
                    </select>
                </div>
            </div>
            <div class="gift-item">${escapeHtml(gift.co)}</div>
            ${gift.odkaz ? `
                <div class="gift-link">
                    <a href="${escapeHtml(gift.odkaz)}" target="_blank" rel="noopener noreferrer">
                        🔗 Zobrazit odkaz
                    </a>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// Get status class for styling
function getStatusClass(status) {
    if (!status) return 'pending';
    
    switch (status.toLowerCase()) {
        case 'hotovo':
            return 'bought';
        case 'objednano':
            return 'wrapped';
        case 'vyjasnit':
        case 'vyjasnit':
        default:
            return 'pending';
    }
}



// Change gift status
async function changeStatus(kdo, co, newStatus) {
    // Find the gift and its details
    const gift = gifts.find(g => g.kdo === kdo && g.co === co);
    if (!gift) {
        showError('Dárek nebyl nalezen');
        return;
    }
    
    const odKoho = gift.odKoho || '';
    const odkaz = gift.odkaz || '';
    
    try {
        const url = `${SCRIPT_URL}?action=save&kdo=${encodeURIComponent(kdo)}&odKoho=${encodeURIComponent(odKoho)}&co=${encodeURIComponent(co)}&odkaz=${encodeURIComponent(odkaz)}&status=${encodeURIComponent(newStatus)}`;
        
        const response = await fetch(url, {
            method: 'GET',
            mode: 'no-cors'
        });
        
        // With no-cors mode, assume success if no error was thrown
        console.log('Status update request sent successfully');
        
        // Update the gift in local array
        gift.status = newStatus;
        
        // Re-render the current filtered view
        const filteredGifts = currentFilter === 'all' ? gifts : gifts.filter(g => g.kdo === currentFilter);
        displayGifts(filteredGifts);
        updateStats(filteredGifts);
        generateFilters();
        
        showSuccess(`Status dárku pro ${kdo} byl změněn na "${newStatus}"`);
        
    } catch (error) {
        console.error('Error updating status:', error);
        showError('Chyba při aktualizaci statusu: ' + error.message);
        // Reload to get fresh data in case of error
        loadGifts();
    }
}

// Toggle gift status (legacy function - keeping for compatibility)
async function toggleStatus(kdo, co, currentStatus) {
    const newStatus = getNextStatus(currentStatus);
    
    // Find the gift and its details
    const gift = gifts.find(g => g.kdo === kdo && g.co === co);
    const odKoho = gift ? gift.odKoho : '';
    const odkaz = gift ? gift.odkaz : '';
    
    try {
        const url = `${SCRIPT_URL}?action=save&kdo=${encodeURIComponent(kdo)}&odKoho=${encodeURIComponent(odKoho)}&co=${encodeURIComponent(co)}&odkaz=${encodeURIComponent(odkaz)}&status=${encodeURIComponent(newStatus)}`;
        
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        showSuccess(`Status dárku pro ${kdo} byl změněn na "${newStatus}"`);
        loadGifts(); // Reload to get fresh data
        
    } catch (error) {
        console.error('Error updating status:', error);
        showError('Chyba při aktualizaci statusu: ' + error.message);
    }
}

// Add new gift
async function addGift(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const kdo = formData.get('kdo');
    const odKoho = formData.get('odKoho') || '';
    const co = formData.get('co');
    const odkaz = formData.get('odkaz') || '';
    const status = formData.get('status');
    
    // Disable form during submission
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Ukládání...';
    submitBtn.disabled = true;
    
    try {
        const url = `${SCRIPT_URL}?action=save&kdo=${encodeURIComponent(kdo)}&odKoho=${encodeURIComponent(odKoho)}&co=${encodeURIComponent(co)}&odkaz=${encodeURIComponent(odkaz)}&status=${encodeURIComponent(status)}`;
        
        const response = await fetch(url, {
            method: 'GET',
            mode: 'no-cors'
        });
        
        // With no-cors mode, we can't read the response, but if no error was thrown, 
        // the request was sent successfully. We'll assume success and verify by reloading.
        console.log('Save request sent successfully');
        
        // Success - reset form and hide it
        event.target.reset();
        hideAddForm();
        showSuccess('Dárek byl úspěšně přidán do tabulky!');
        
        // Reload gifts to show the new addition and verify it was saved
        setTimeout(() => {
            loadGifts();
        }, 1000);
        
    } catch (error) {
        console.error('Error adding gift:', error);
        showError('Chyba při přidávání dárku: ' + error.message);
        
        // Re-enable form on error
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Update statistics
function updateStats(giftsToCount = gifts) {
    const total = giftsToCount.length;
    const bought = giftsToCount.filter(g => 
        g.status && g.status.toLowerCase() === 'hotovo'
    ).length;
    const pending = giftsToCount.filter(g => 
        !g.status || ['vyjasnit', 'objednano', ''].includes(g.status.toLowerCase())
    ).length;
    
    totalGiftsElement.textContent = total;
    boughtGiftsElement.textContent = bought;
    pendingGiftsElement.textContent = pending;
}

// Show/Hide functions
function toggleAddForm() {
    if (addForm.style.display === 'none' || addForm.style.display === '') {
        showAddForm();
    } else {
        hideAddForm();
    }
}

function showAddForm() {
    addForm.style.display = 'block';
    addForm.scrollIntoView({ behavior: 'smooth' });
}

function hideAddForm() {
    addForm.style.display = 'none';
}

function showLoading() {
    loading.style.display = 'flex';
}

function hideLoading() {
    loading.style.display = 'none';
}

function showError(message) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    setTimeout(() => hideError(), 5000);
}

function hideError() {
    errorElement.style.display = 'none';
}

function showSuccess(message) {
    successElement.textContent = message;
    successElement.style.display = 'block';
    setTimeout(() => hideSuccess(), 3000);
}

function hideSuccess() {
    successElement.style.display = 'none';
}

// Utility function to escape HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text ? text.replace(/[&<>"']/g, m => map[m]) : '';
}

// Filter functions (for future enhancement)
function filterByStatus(status) {
    const filteredGifts = status === 'all' ? gifts : gifts.filter(g => g.status === status);
    displayGifts(filteredGifts);
}

function searchGifts(query) {
    const filteredGifts = gifts.filter(g => 
        g.kdo.toLowerCase().includes(query.toLowerCase()) ||
        g.co.toLowerCase().includes(query.toLowerCase())
    );
    displayGifts(filteredGifts);
}

// Service Worker Registration and Version Management
let swRegistration = null;

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
                swRegistration = registration;
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    console.log('New service worker found!');
                });
                
                // Get version info from service worker
                getVersionInfo();
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Get version info from service worker
function getVersionInfo() {
    if (navigator.serviceWorker.controller) {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
            if (event.data.type === 'VERSION_INFO') {
                document.getElementById('app-version').textContent = event.data.version;
            }
        };
        navigator.serviceWorker.controller.postMessage(
            { type: 'GET_VERSION' },
            [messageChannel.port2]
        );
    }
}

// Force PWA update
function forceUpdate() {
    if (swRegistration) {
        showSuccessMessage('Kontroluji aktualizace...');
        
        // Check for updates
        swRegistration.update().then(() => {
            if (swRegistration.waiting) {
                // New service worker is waiting, activate it
                showSuccessMessage('Nová verze nalezena! Aktualizuji...');
                swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
                
                // Listen for controlling change
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    // Reload the page when new service worker takes control
                    window.location.reload();
                });
            } else {
                // Force check by unregistering and re-registering
                swRegistration.unregister().then(() => {
                    showSuccessMessage('Aktualizuji aplikaci...');
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                });
            }
        }).catch(error => {
            console.error('Update check failed:', error);
            showErrorMessage('Chyba při kontrole aktualizací');
        });
    } else {
        // Fallback - force reload with cache bypass
        showSuccessMessage('Obnovuji aplikaci...');
        setTimeout(() => {
            window.location.reload(true);
        }, 1000);
    }
}