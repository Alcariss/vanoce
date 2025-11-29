// Configuration
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby222lTYp_b7pU9S2Oxnn9mpBrwl9xhS_fVR4rgAwmrqGrvxInnJONbjDQoVGGz1ZevzQ/exec'
// DOM Elements
const giftsContainer = document.getElementById('gifts-container');
const loading = document.getElementById('loading');
const errorElement = document.getElementById('error');
const filtersContainer = document.getElementById('filters-container');
const filtersElement = document.getElementById('filters');

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
    
    // Get unique values from Kdo column
    const uniqueKdo = [...new Set(gifts.map(gift => gift.kdo).filter(kdo => kdo && kdo.trim()))];
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
                    <div class="recipient-name">${escapeHtml(gift.kdo)}</div>
                    ${gift.odKoho ? `<div class="gift-from">od: ${escapeHtml(gift.odKoho)}</div>` : ''}
                </div>
                <div class="gift-status status-${getStatusClass(gift.status)}">${escapeHtml(gift.status)}</div>
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
    switch (status.toLowerCase()) {
        case 'hotovo':
        case 'koupeno':
            return 'bought';
        case 'zabaleno':
            return 'wrapped';
        case 'darováno':
            return 'given';
        case 'poslat tip':
        case 'nepořízeno':
        default:
            return 'pending';
    }
}

// Get next status text for button
function getNextStatusText(currentStatus) {
    switch (currentStatus) {
        case 'Nepořízeno':
            return '✅ Označit jako koupeno';
        case 'Koupeno':
            return '📦 Označit jako zabaleno';
        case 'Zabaleno':
            return '🎁 Označit jako darováno';
        case 'Darováno':
            return '🔄 Označit jako nepořízeno';
        default:
            return '✅ Označit jako koupeno';
    }
}

// Get next status
function getNextStatus(currentStatus) {
    switch (currentStatus) {
        case 'Nepořízeno':
            return 'Koupeno';
        case 'Koupeno':
            return 'Zabaleno';
        case 'Zabaleno':
            return 'Darováno';
        case 'Darováno':
            return 'Nepořízeno';
        default:
            return 'Koupeno';
    }
}

// Toggle gift status
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
    const odkaz = formData.get('odkaz');
    const status = formData.get('status');
    
    try {
        const url = `${SCRIPT_URL}?action=save&kdo=${encodeURIComponent(kdo)}&odKoho=${encodeURIComponent(odKoho)}&co=${encodeURIComponent(co)}&odkaz=${encodeURIComponent(odkaz)}&status=${encodeURIComponent(status)}`;
        
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        showSuccess('Dárek byl úspěšně přidán!');
        hideAddForm();
        event.target.reset();
        loadGifts(); // Reload to show new gift
        
    } catch (error) {
        console.error('Error adding gift:', error);
        showError('Chyba při přidávání dárku: ' + error.message);
    }
}

// Update statistics
function updateStats(giftsToCount = gifts) {
    const total = giftsToCount.length;
    const bought = giftsToCount.filter(g => 
        ['hotovo', 'koupeno', 'zabaleno', 'darováno'].includes(g.status.toLowerCase())
    ).length;
    const pending = giftsToCount.filter(g => 
        ['poslat tip', 'nepořízeno', ''].includes(g.status.toLowerCase())
    ).length;
    
    totalGiftsElement.textContent = total;
    boughtGiftsElement.textContent = bought;
    pendingGiftsElement.textContent = pending;
}

// Show/Hide functions
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