// State Management
let allReleaseBlocks = [];
let currentFilter = 'all';
let currentSearchQuery = '';

// DOM Elements
const loader = document.getElementById('loader');
const emptyState = document.getElementById('emptyState');
const timeline = document.getElementById('timeline');
const refreshBtn = document.getElementById('refreshBtn');
const refreshIcon = refreshBtn.querySelector('i');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const searchInput = document.getElementById('searchInput');
const updateStatus = document.getElementById('updateStatus');
const lastSyncedText = document.getElementById('lastSyncedText');

// Stats Elements
const statTotal = document.getElementById('statTotal');
const statFeatures = document.getElementById('statFeatures');
const statAnnouncements = document.getElementById('statAnnouncements');
const statIssues = document.getElementById('statIssues');

// Modal Elements
const shareModal = document.getElementById('shareModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelTweetBtn = document.getElementById('cancelTweetBtn');
const postTweetBtn = document.getElementById('postTweetBtn');
const tweetContent = document.getElementById('tweetContent');
const charCounter = document.getElementById('charCounter');
const previewDate = document.getElementById('previewDate');
const previewLink = document.getElementById('previewLink');

// Initialize Lucide Icons
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    fetchReleases();
    setupEventListeners();
});

// Event Listeners Configuration
function setupEventListeners() {
    // Refresh button
    refreshBtn.addEventListener('click', () => {
        fetchReleases(true);
    });

    // Export CSV button
    exportCsvBtn.addEventListener('click', exportToCsv);

    // Search input (with basic input listener)
    searchInput.addEventListener('input', (e) => {
        currentSearchQuery = e.target.value.toLowerCase().trim();
        renderTimeline();
    });

    // Filter pills
    const pills = document.querySelectorAll('.filter-pill');
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            pills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentFilter = pill.getAttribute('data-filter');
            renderTimeline();
        });
    });

    // Close Modal Events
    closeModalBtn.addEventListener('click', hideModal);
    cancelTweetBtn.addEventListener('click', hideModal);
    
    // Clicking outside modal content closes it
    shareModal.addEventListener('click', (e) => {
        if (e.target === shareModal) {
            hideModal();
        }
    });

    // Character counter check on compose
    tweetContent.addEventListener('input', updateCharCounter);
}

// Fetch Release Notes from backend API
async function fetchReleases(forceRefresh = false) {
    // Set UI loading states
    loader.classList.remove('hidden');
    timeline.innerHTML = '';
    emptyState.classList.add('hidden');
    refreshBtn.disabled = true;
    refreshIcon.classList.add('spinning');
    
    const indicator = updateStatus.querySelector('.status-indicator');
    const statusText = updateStatus.querySelector('.status-text');
    indicator.className = 'status-indicator loading';
    statusText.textContent = 'Syncing...';
    
    try {
        const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }

        // Process release entries and convert to sub-update blocks
        allReleaseBlocks = [];
        data.releases.forEach(entry => {
            const parsedBlocks = parseEntryToBlocks(entry);
            allReleaseBlocks.push(...parsedBlocks);
        });

        // Set Last Sync time display
        const syncTime = new Date(data.last_updated * 1000);
        lastSyncedText.textContent = syncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        indicator.className = 'status-indicator online';
        statusText.textContent = 'Synced';
        
        // Calculate Statistics
        updateStats();

        // Render timeline
        renderTimeline();

    } catch (error) {
        console.error('Error fetching release notes:', error);
        indicator.className = 'status-indicator';
        statusText.textContent = 'Offline / Error';
        
        timeline.innerHTML = `
            <div class="timeline-empty">
                <i data-lucide="alert-triangle" style="color: var(--color-issue);"></i>
                <h3>Sync Failed</h3>
                <p>Could not fetch BigQuery release notes. Details: ${error.message}</p>
                <button class="btn btn-secondary" onclick="fetchReleases(true)" style="margin-top: 1rem;">
                    <i data-lucide="refresh-cw"></i> Try Again
                </button>
            </div>
        `;
        lucide.createIcons();
    } finally {
        loader.classList.add('hidden');
        refreshBtn.disabled = false;
        refreshIcon.classList.remove('spinning');
    }
}

// Convert XML entry HTML into structured blocks grouped by type headings
function parseEntryToBlocks(entry) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(entry.content, 'text/html');
    const children = Array.from(doc.body.children);
    
    const blocks = [];
    let currentBlock = null;
    
    children.forEach(child => {
        if (child.tagName === 'H3') {
            if (currentBlock) {
                blocks.push(currentBlock);
            }
            
            const headingText = child.textContent.trim();
            let type = 'other';
            let label = headingText;
            
            const lowerHeading = headingText.toLowerCase();
            if (lowerHeading.includes('feature')) {
                type = 'feature';
                label = 'Feature';
            } else if (lowerHeading.includes('announcement') || lowerHeading.includes('notice')) {
                type = 'announcement';
                label = 'Announcement';
            } else if (lowerHeading.includes('issue') || lowerHeading.includes('bug') || lowerHeading.includes('fix') || lowerHeading.includes('resolve') || lowerHeading.includes('known problem')) {
                type = 'issue';
                label = 'Issue / Fix';
            } else if (lowerHeading.includes('deprecat') || lowerHeading.includes('disable') || lowerHeading.includes('remove') || lowerHeading.includes('support')) {
                type = 'deprecation';
                label = 'Deprecation';
            }
            
            currentBlock = {
                id: entry.id + '-' + Math.random().toString(36).substring(2, 11),
                parentTitle: entry.title, // e.g. "June 17, 2026"
                parentLink: entry.link,
                parentUpdated: entry.updated,
                type: type,
                label: label,
                htmlContent: ''
            };
        } else {
            if (!currentBlock) {
                // Sibling text/paragraphs before any H3
                currentBlock = {
                    id: entry.id + '-' + Math.random().toString(36).substring(2, 11),
                    parentTitle: entry.title,
                    parentLink: entry.link,
                    parentUpdated: entry.updated,
                    type: 'other',
                    label: 'Update',
                    htmlContent: ''
                };
            }
            currentBlock.htmlContent += child.outerHTML;
        }
    });
    
    if (currentBlock) {
        blocks.push(currentBlock);
    }
    
    return blocks;
}

// Calculate Statistics for Sidebar
function updateStats() {
    statTotal.textContent = allReleaseBlocks.length;
    statFeatures.textContent = allReleaseBlocks.filter(b => b.type === 'feature').length;
    statAnnouncements.textContent = allReleaseBlocks.filter(b => b.type === 'announcement').length;
    statIssues.textContent = allReleaseBlocks.filter(b => b.type === 'issue').length;
}

// Helper to strip HTML tags to get pure text content for searches & tweets
function getPlainText(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Replace custom elements like code blocks with clean spaces
    const codeElements = tempDiv.querySelectorAll('code');
    codeElements.forEach(code => {
        code.textContent = ` \`${code.textContent}\` `;
    });
    
    return tempDiv.textContent || tempDiv.innerText || '';
}

// Filter and render timeline
function renderTimeline() {
    timeline.innerHTML = '';
    
    // Apply filters
    const filtered = getFilteredBlocks();

    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');

    // Group the filtered blocks by date to show a chronological feed
    const groupedByDate = {};
    filtered.forEach(block => {
        const dateStr = block.parentTitle;
        if (!groupedByDate[dateStr]) {
            groupedByDate[dateStr] = [];
        }
        groupedByDate[dateStr].push(block);
    });

    // Create cards for each date group
    Object.keys(groupedByDate).forEach((dateStr, index) => {
        const blocks = groupedByDate[dateStr];
        
        const dateCard = document.createElement('div');
        dateCard.className = 'date-card';
        dateCard.style.animationDelay = `${index * 0.05}s`;
        
        // Date Header
        const dateHeader = document.createElement('div');
        dateHeader.className = 'date-header';
        dateHeader.innerHTML = `
            <i data-lucide="calendar"></i>
            <h2>${dateStr}</h2>
        `;
        dateCard.appendChild(dateHeader);
        
        // Add each update sub-card under this date
        blocks.forEach(block => {
            const releaseBlock = document.createElement('div');
            releaseBlock.className = `release-block type-${block.type}`;
            
            // Header Row of the card
            const headerRow = document.createElement('div');
            headerRow.className = 'card-header-row';
            headerRow.innerHTML = `
                <span class="type-pill type-${block.type}">${block.label}</span>
                <div class="card-actions">
                    <button class="card-action-btn copy-action-btn" data-id="${block.id}" title="Copy this update text to clipboard">
                        <i data-lucide="copy"></i>
                        <span>Copy</span>
                    </button>
                    <button class="card-action-btn tweet-action-btn" data-id="${block.id}" title="Share this specific update on X/Twitter">
                        <i data-lucide="twitter"></i>
                        <span>Tweet</span>
                    </button>
                </div>
            `;
            releaseBlock.appendChild(headerRow);
            
            // Body Content of the card
            const bodyContent = document.createElement('div');
            bodyContent.className = 'card-body-content';
            bodyContent.innerHTML = block.htmlContent;
            releaseBlock.appendChild(bodyContent);
            
            // Footer details (Link back to google cloud release notes)
            const footerRow = document.createElement('div');
            footerRow.className = 'card-footer-row';
            footerRow.innerHTML = `
                <a href="${block.parentLink}" target="_blank" rel="noopener noreferrer" class="feed-source-link">
                    <span>View in Official Docs</span>
                    <i data-lucide="external-link"></i>
                </a>
            `;
            releaseBlock.appendChild(footerRow);
            
            dateCard.appendChild(releaseBlock);
        });
        
        timeline.appendChild(dateCard);
    });
    
    // Setup listener on dynamic Tweet buttons
    const tweetButtons = timeline.querySelectorAll('.tweet-action-btn');
    tweetButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const blockId = btn.getAttribute('data-id');
            const targetBlock = allReleaseBlocks.find(b => b.id === blockId);
            if (targetBlock) {
                openTweetComposer(targetBlock);
            }
        });
    });

    // Setup listener on dynamic Copy buttons
    const copyButtons = timeline.querySelectorAll('.copy-action-btn');
    copyButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const blockId = btn.getAttribute('data-id');
            const targetBlock = allReleaseBlocks.find(b => b.id === blockId);
            if (targetBlock) {
                copyBlockToClipboard(btn, targetBlock);
            }
        });
    });

    lucide.createIcons();
}

// Open the Tweet Composer Modal with dynamically formatted tweet text
function openTweetComposer(block) {
    const dateStr = block.parentTitle;
    const label = block.label;
    const linkStr = block.parentLink;
    
    // Construct formatting details
    const headerText = `BigQuery Update (${dateStr}) - ${label}:\n\n`;
    const footerText = `\n\nRead more: `;
    const hashtags = `\n#GoogleCloud #BigQuery`;
    
    // URL counts as 23 characters on Twitter (X)
    const twitterUrlLength = 23;
    
    // Calculate character allocations
    const fixedContentLength = headerText.length + footerText.length + twitterUrlLength + hashtags.length;
    const availableSpace = 280 - fixedContentLength - 3; // 3 characters buffer
    
    // Strip HTML content and clean double whitespaces
    let updateText = getPlainText(block.htmlContent).replace(/\s+/g, ' ').trim();
    
    if (updateText.length > availableSpace) {
        updateText = updateText.substring(0, availableSpace) + '...';
    }
    
    // Pre-fill modal field with complete text
    const fullTweetText = `${headerText}${updateText}${footerText}${linkStr}${hashtags}`;
    
    tweetContent.value = fullTweetText;
    
    // Set previews
    previewDate.textContent = dateStr;
    previewLink.textContent = linkStr;
    
    // Show modal overlay
    shareModal.classList.remove('hidden');
    updateCharCounter();
    
    // Trigger focus
    tweetContent.focus();
    
    // Set click handler for tweet submission
    postTweetBtn.onclick = () => {
        const textToTweet = encodeURIComponent(tweetContent.value);
        const twitterUrl = `https://twitter.com/intent/tweet?text=${textToTweet}`;
        window.open(twitterUrl, '_blank', 'noopener,noreferrer');
        hideModal();
    };
}

// Hide share modal
function hideModal() {
    shareModal.classList.add('hidden');
    tweetContent.value = '';
}

// Dynamically count character limits in Tweet composer
function updateCharCounter() {
    const content = tweetContent.value;
    
    // Twitter custom length calculation is complex (URLs are always 23 characters). Let's simulate it:
    // Regex to detect HTTP/HTTPS links
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = content.match(urlRegex) || [];
    
    let simulatedLength = content.replace(urlRegex, '').length;
    simulatedLength += (urls.length * 23);
    
    charCounter.textContent = `${simulatedLength} / 280`;
    
    // Color notifications
    if (simulatedLength > 280) {
        charCounter.className = 'char-counter danger';
        postTweetBtn.disabled = true;
    } else if (simulatedLength > 240) {
        charCounter.className = 'char-counter warning';
        postTweetBtn.disabled = false;
    } else {
        charCounter.className = 'char-counter';
        postTweetBtn.disabled = false;
    }
}

// Retrieve currently filtered blocks matching search and category selection
function getFilteredBlocks() {
    let filtered = allReleaseBlocks;
    
    if (currentFilter !== 'all') {
        filtered = filtered.filter(block => block.type === currentFilter);
    }
    
    if (currentSearchQuery) {
        filtered = filtered.filter(block => {
            const plainText = getPlainText(block.htmlContent).toLowerCase();
            const parentTitle = block.parentTitle.toLowerCase();
            const label = block.label.toLowerCase();
            return plainText.includes(currentSearchQuery) || 
                   parentTitle.includes(currentSearchQuery) || 
                   label.includes(currentSearchQuery);
        });
    }
    
    return filtered;
}

// Export currently filtered blocks as a downloaded CSV file
function exportToCsv() {
    const filtered = getFilteredBlocks();
    if (filtered.length === 0) {
        alert("No release notes available to export.");
        return;
    }
    
    const csvRows = [];
    
    // CSV Header row
    csvRows.push(['Date', 'Category', 'Link', 'Content'].map(h => `"${h.replace(/"/g, '""')}"`).join(','));
    
    // CSV Data rows
    filtered.forEach(block => {
        const date = block.parentTitle;
        const category = block.label;
        const link = block.parentLink;
        const content = getPlainText(block.htmlContent).trim();
        
        const row = [date, category, link, content].map(val => {
            const escaped = val.replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(row.join(','));
    });
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bigquery_releases_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Copy update details to clipboard with interactive checkmark feedback
async function copyBlockToClipboard(btn, block) {
    const dateStr = block.parentTitle;
    const label = block.label;
    const linkStr = block.parentLink;
    const updateText = getPlainText(block.htmlContent).replace(/\s+/g, ' ').trim();
    
    const formattedText = `BigQuery Release Update (${dateStr}) - ${label}:\n\n${updateText}\n\nRead more: ${linkStr}\n#GoogleCloud #BigQuery`;
    
    try {
        await navigator.clipboard.writeText(formattedText);
        
        // Show success state feedback
        const originalHTML = btn.innerHTML;
        btn.classList.add('success');
        btn.innerHTML = `<i data-lucide="check"></i> <span>Copied!</span>`;
        lucide.createIcons();
        
        setTimeout(() => {
            btn.classList.remove('success');
            btn.innerHTML = originalHTML;
            lucide.createIcons();
        }, 2000);
    } catch (err) {
        console.error('Failed to copy to clipboard:', err);
        alert('Failed to copy text. Please ensure clipboard permissions are enabled.');
    }
}
