// WARI Research Platform Application
class WARIApp {
    constructor() {
        // Data will be loaded from JSON file
        this.occupations = [];
        this.filteredOccupations = [];
        this.currentFilters = {
            search: '',
            sector: 'all',
            risk: 'all'
        };
        this.currentSort = 'wari-desc';
        this.chart = null;
        
        // Pagination
        this.currentPage = 1;
        this.itemsPerPage = 50;
        
        this.init();
    }

    async init() {
        try {
            await this.loadData();
            this.populateSectorFilter();
            this.attachEventListeners();
            this.renderTable();
            this.createSectorChart();
            this.updateResultsCount();
            this.updateTotalCount();
        } catch (error) {
            console.error('Failed to initialize WARI app:', error);
            this.showError('Failed to load occupation data. Please try again later.');
        }
    }

    async loadData() {
        try {
            console.log('Loading occupation data...');
            const response = await fetch('https://ppl-ai-code-interpreter-files.s3.amazonaws.com/web/direct-files/5c22422f41748cdd80bcdc1e0e3d3eb7/d8bf0113-9bd3-4b57-9c7d-dcfcab3b3671/5bd30d03.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Process the data to ensure consistent format
            this.occupations = data.map(item => ({
                job: item.job || '',
                sector: item.sector || '',
                wari: parseFloat(item.wari) || 0,
                alpha: parseFloat(item.alpha) || 0,
                decline_2030: parseFloat(item.decline_2030) || 0,
                decline_2040: parseFloat(item.decline_2040) || 0,
                risk_level: item.risk_level || 'Unknown',
                notes: item.notes || ''
            }));
            
            this.filteredOccupations = [...this.occupations];
            console.log(`Loaded ${this.occupations.length} occupations`);
            
        } catch (error) {
            console.error('Error loading data:', error);
            // Fallback to sample data if loading fails
            this.occupations = this.getSampleData();
            this.filteredOccupations = [...this.occupations];
            throw error;
        }
    }

    getSampleData() {
        // Fallback data in case of loading failure
        return [
            {"job": "Data Entry Clerk", "sector": "Finance & Business Services", "wari": 74.2, "alpha": 0.74, "decline_2030": 19.3, "decline_2040": 68.4, "risk_level": "Very High", "notes": "Near-complete automation expected by 2030"},
            {"job": "Software Developer", "sector": "Technology & Engineering", "wari": 59.4, "alpha": 0.59, "decline_2030": 15.4, "decline_2040": 54.7, "risk_level": "Medium", "notes": "AI coding assistants enhancing productivity; core logic remains human"},
            {"job": "Registered Nurse", "sector": "Healthcare & Social", "wari": 38.9, "alpha": 0.39, "decline_2030": 10.1, "decline_2040": 35.8, "risk_level": "Low", "notes": "Patient care coordination and emotional support remain human-centered"},
            {"job": "Primary School Teacher", "sector": "Education", "wari": 41.5, "alpha": 0.42, "decline_2030": 10.8, "decline_2040": 38.2, "risk_level": "Low", "notes": "AI tutoring supplements but cannot replace human mentorship"}
        ];
    }

    updateTotalCount() {
        const totalCountElement = document.getElementById('totalCount');
        if (totalCountElement) {
            totalCountElement.textContent = this.occupations.length;
        }
    }

    showError(message) {
        const tbody = document.getElementById('occupationTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center" style="padding: var(--space-32);">
                        <div class="empty-state">
                            <h3>Error Loading Data</h3>
                            <p>${message}</p>
                            <button class="btn btn--primary" onclick="window.location.reload()">Retry</button>
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    populateSectorFilter() {
        const sectors = [...new Set(this.occupations.map(occ => occ.sector))].sort();
        const sectorSelect = document.getElementById('sectorFilter');
        
        if (sectorSelect) {
            // Clear existing options except "All Sectors"
            sectorSelect.innerHTML = '<option value="all">All Sectors</option>';
            
            sectors.forEach(sector => {
                const option = document.createElement('option');
                option.value = sector;
                option.textContent = sector;
                sectorSelect.appendChild(option);
            });
        }
    }

    attachEventListeners() {
        // Search input with debouncing
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.currentFilters.search = e.target.value.toLowerCase().trim();
                    this.currentPage = 1; // Reset to first page
                    this.filterAndRender();
                }, 300);
            });
        }

        // Filters
        const sectorFilter = document.getElementById('sectorFilter');
        if (sectorFilter) {
            sectorFilter.addEventListener('change', (e) => {
                this.currentFilters.sector = e.target.value;
                this.currentPage = 1; // Reset to first page
                this.filterAndRender();
            });
        }

        const riskFilter = document.getElementById('riskFilter');
        if (riskFilter) {
            riskFilter.addEventListener('change', (e) => {
                this.currentFilters.risk = e.target.value;
                this.currentPage = 1; // Reset to first page
                this.filterAndRender();
            });
        }

        // Sort select
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.sortAndRender();
            });
        }

        // Pagination controls
        const prevButton = document.getElementById('prevPage');
        const nextButton = document.getElementById('nextPage');
        
        if (prevButton) {
            prevButton.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.renderTable();
                    this.updatePaginationControls();
                }
            });
        }
        
        if (nextButton) {
            nextButton.addEventListener('click', () => {
                const maxPage = Math.ceil(this.filteredOccupations.length / this.itemsPerPage);
                if (this.currentPage < maxPage) {
                    this.currentPage++;
                    this.renderTable();
                    this.updatePaginationControls();
                }
            });
        }

        // Navigation links
        document.querySelectorAll('.nav__link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const href = link.getAttribute('href');
                if (href && href.startsWith('#')) {
                    const targetId = href.substring(1);
                    this.scrollToSection(targetId);
                }
            });
        });

        // Hero action buttons
        document.querySelectorAll('.hero__actions .btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const onclick = btn.getAttribute('onclick');
                if (onclick && onclick.includes('dashboard')) {
                    this.scrollToSection('dashboard');
                } else if (onclick && onclick.includes('api')) {
                    this.scrollToSection('api');
                }
            });
        });
    }

    filterOccupations() {
        this.filteredOccupations = this.occupations.filter(occupation => {
            // Search filter - search in job title and sector
            const matchesSearch = !this.currentFilters.search || 
                                occupation.job.toLowerCase().includes(this.currentFilters.search) ||
                                occupation.sector.toLowerCase().includes(this.currentFilters.search);
            
            // Sector filter
            const matchesSector = this.currentFilters.sector === 'all' || 
                                occupation.sector === this.currentFilters.sector;
            
            // Risk filter
            const matchesRisk = this.currentFilters.risk === 'all' || 
                              occupation.risk_level === this.currentFilters.risk;
            
            return matchesSearch && matchesSector && matchesRisk;
        });
    }

    sortOccupations() {
        this.filteredOccupations.sort((a, b) => {
            switch (this.currentSort) {
                case 'wari-desc':
                    return b.wari - a.wari;
                case 'wari-asc':
                    return a.wari - b.wari;
                case 'alpha':
                    return a.job.localeCompare(b.job);
                case 'sector':
                    return a.sector.localeCompare(b.sector) || a.job.localeCompare(b.job);
                default:
                    return 0;
            }
        });
    }

    filterAndRender() {
        this.filterOccupations();
        this.sortOccupations();
        this.renderTable();
        this.updateResultsCount();
        this.updatePaginationControls();
    }

    sortAndRender() {
        this.sortOccupations();
        this.renderTable();
        this.updatePaginationControls();
    }

    getRiskBadgeClass(riskLevel) {
        const mapping = {
            'Very Low': 'risk-very-low',
            'Low': 'risk-low',
            'Medium': 'risk-medium',
            'High': 'risk-high',
            'Very High': 'risk-very-high'
        };
        return mapping[riskLevel] || 'risk-medium';
    }

    getCurrentPageData() {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        return this.filteredOccupations.slice(startIndex, endIndex);
    }

    renderTable() {
        const tbody = document.getElementById('occupationTableBody');
        if (!tbody) return;

        if (this.filteredOccupations.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center" style="padding: var(--space-32);">
                        <div class="empty-state">
                            <h3>No occupations found</h3>
                            <p>Try adjusting your search criteria or filters.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        const pageData = this.getCurrentPageData();
        const rows = pageData.map(occupation => `
            <tr>
                <td><strong>${occupation.job}</strong></td>
                <td>${occupation.sector}</td>
                <td><strong>${occupation.wari.toFixed(1)}</strong></td>
                <td>${occupation.decline_2030.toFixed(1)}%</td>
                <td><span class="risk-badge ${this.getRiskBadgeClass(occupation.risk_level)}">${occupation.risk_level}</span></td>
            </tr>
        `).join('');

        tbody.innerHTML = rows;
    }

    updatePaginationControls() {
        const maxPage = Math.ceil(this.filteredOccupations.length / this.itemsPerPage);
        const prevButton = document.getElementById('prevPage');
        const nextButton = document.getElementById('nextPage');
        const paginationInfo = document.getElementById('paginationInfo');

        if (prevButton) {
            prevButton.disabled = this.currentPage <= 1;
        }

        if (nextButton) {
            nextButton.disabled = this.currentPage >= maxPage;
        }

        if (paginationInfo) {
            const startItem = Math.min((this.currentPage - 1) * this.itemsPerPage + 1, this.filteredOccupations.length);
            const endItem = Math.min(this.currentPage * this.itemsPerPage, this.filteredOccupations.length);
            paginationInfo.textContent = `Showing ${startItem}-${endItem} of ${this.filteredOccupations.length} occupations (Page ${this.currentPage} of ${maxPage || 1})`;
        }
    }

    updateResultsCount() {
        const countElement = document.getElementById('resultsCount');
        if (countElement) {
            const count = this.filteredOccupations.length;
            const total = this.occupations.length;
            countElement.textContent = `${count} of ${total} occupations`;
        }
        this.updatePaginationControls();
    }

    createSectorChart() {
        const canvas = document.getElementById('sectorChart');
        if (!canvas) return;

        // Calculate average WARI by sector
        const sectorData = {};
        this.occupations.forEach(occ => {
            if (!sectorData[occ.sector]) {
                sectorData[occ.sector] = { total: 0, count: 0 };
            }
            sectorData[occ.sector].total += occ.wari;
            sectorData[occ.sector].count += 1;
        });

        const chartData = Object.entries(sectorData)
            .map(([sector, data]) => ({
                sector: sector,
                average: data.total / data.count,
                count: data.count
            }))
            .sort((a, b) => b.average - a.average);

        const ctx = canvas.getContext('2d');
        
        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.map(d => d.sector),
                datasets: [{
                    label: 'Average WARI Score',
                    data: chartData.map(d => d.average),
                    backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C', '#964325'],
                    borderColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C', '#964325'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Average WARI Score by Sector',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const dataIndex = context.dataIndex;
                                const sectorInfo = chartData[dataIndex];
                                return [
                                    `Average WARI: ${context.parsed.y.toFixed(1)}`,
                                    `Occupations: ${sectorInfo.count}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 80,
                        title: {
                            display: true,
                            text: 'Average WARI Score'
                        },
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Sector'
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const sector = chartData[index].sector;
                        this.filterBySector(sector);
                    }
                }
            }
        });
    }

    filterBySector(sector) {
        const sectorSelect = document.getElementById('sectorFilter');
        if (sectorSelect) {
            sectorSelect.value = sector;
            this.currentFilters.sector = sector;
            this.currentPage = 1; // Reset to first page
            this.filterAndRender();
            this.scrollToSection('dashboard');
        }
    }

    scrollToSection(sectionId) {
        const element = document.getElementById(sectionId);
        if (element) {
            const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
            const elementPosition = element.offsetTop - headerHeight - 20;
            
            window.scrollTo({
                top: Math.max(0, elementPosition),
                behavior: 'smooth'
            });
        }
    }

    exportData() {
        const csv = this.generateCSV();
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Generate filename with current filters
        let filename = 'wari-data';
        if (this.currentFilters.sector !== 'all') {
            filename += `-${this.currentFilters.sector.replace(/\s+/g, '-').toLowerCase()}`;
        }
        if (this.currentFilters.risk !== 'all') {
            filename += `-${this.currentFilters.risk.replace(/\s+/g, '-').toLowerCase()}-risk`;
        }
        if (this.currentFilters.search) {
            filename += '-filtered';
        }
        filename += '.csv';
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    generateCSV() {
        const headers = ['Job', 'Sector', 'WARI Score', '2030 Decline (%)', 'Risk Level', 'Notes'];
        const rows = this.filteredOccupations.map(occ => [
            occ.job,
            occ.sector,
            occ.wari.toFixed(1),
            occ.decline_2030.toFixed(1),
            occ.risk_level,
            occ.notes || ''
        ]);
        
        return [headers, ...rows].map(row => 
            row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
        ).join('\n');
    }
}

// Global functions for HTML onclick handlers
window.scrollToSection = function(sectionId) {
    if (window.wariApp) {
        window.wariApp.scrollToSection(sectionId);
    }
};

window.sortTable = function(column) {
    if (!window.wariApp) return;
    
    const currentSort = window.wariApp.currentSort;
    let newSort;
    
    switch (column) {
        case 'job':
            newSort = 'alpha';
            break;
        case 'sector':
            newSort = 'sector';
            break;
        case 'wari':
            newSort = currentSort === 'wari-desc' ? 'wari-asc' : 'wari-desc';
            break;
        case 'decline_2030':
            newSort = 'wari-desc'; // Use WARI as proxy for decline
            break;
        default:
            return;
    }
    
    window.wariApp.currentSort = newSort;
    window.wariApp.sortAndRender();
    
    // Update sort select
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.value = newSort;
    }
};

window.exportData = function() {
    if (window.wariApp) {
        window.wariApp.exportData();
    }
};

window.openPartnershipModal = function() {
    const modal = document.getElementById('partnershipModal');
    if (modal) {
        modal.classList.remove('hidden');
        // Prevent body scrolling
        document.body.style.overflow = 'hidden';
    }
};

window.closePartnershipModal = function() {
    const modal = document.getElementById('partnershipModal');
    if (modal) {
        modal.classList.add('hidden');
        // Restore body scrolling
        document.body.style.overflow = '';
    }
};

window.submitPartnershipInquiry = function(event) {
    event.preventDefault();
    
    // Get form data
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);
    
    // Simulate form submission
    alert('Thank you for your interest in partnering with WARI research! We will contact you within 48 hours to discuss collaboration opportunities.');
    
    // Close modal and reset form
    window.closePartnershipModal();
    event.target.reset();
};

window.generateApiKey = function() {
    // Generate a mock API key
    const apiKey = 'wari_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Show the API key to user
    const message = `Your API Key: ${apiKey}\n\nSave this key securely. You can now make up to 1000 requests per month.\n\nExample usage:\ncurl -H "Authorization: Bearer ${apiKey}" https://api.wakel.io/v1/occupations`;
    
    // Create a modal-like alert with the API key
    if (navigator.clipboard) {
        navigator.clipboard.writeText(apiKey).then(() => {
            alert(message + '\n\nAPI key has been copied to your clipboard!');
        }).catch(() => {
            alert(message);
        });
    } else {
        alert(message);
    }
};

// Modal click outside to close
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        window.closePartnershipModal();
    }
});

// Escape key to close modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        window.closePartnershipModal();
    }
});

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing WARI Research Platform...');
    
    try {
        // Initialize the main app
        window.wariApp = new WARIApp();
        
        // Add smooth scrolling to navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const targetId = this.getAttribute('href').substring(1);
                if (window.wariApp) {
                    window.wariApp.scrollToSection(targetId);
                }
            });
        });

        // Add intersection observer for fade-in animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        // Observe elements for fade-in animation
        setTimeout(() => {
            document.querySelectorAll('.sponsor-card, .benefit-card, .factor-item, .endpoint-card, .download-card').forEach(el => {
                el.style.opacity = '0';
                el.style.transform = 'translateY(20px)';
                el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                observer.observe(el);
            });
        }, 100);

        // Add click handlers for sponsor cards
        document.querySelectorAll('.sponsor-card').forEach(card => {
            card.addEventListener('click', () => {
                window.openPartnershipModal();
            });
            card.style.cursor = 'pointer';
        });

        // Update last updated timestamp
        const lastUpdatedElement = document.getElementById('lastUpdated');
        if (lastUpdatedElement) {
            const now = new Date();
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            lastUpdatedElement.textContent = now.toLocaleDateString('en-US', options);
        }

        console.log('WARI Research Platform initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize WARI Research Platform:', error);
        
        // Show error in the results area
        const tbody = document.getElementById('occupationTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center" style="padding: var(--space-32);">
                        <div class="empty-state">
                            <h3>Loading Error</h3>
                            <p>Unable to load occupation data. Please refresh the page to try again.</p>
                            <button class="btn btn--primary" onclick="window.location.reload()">Refresh Page</button>
                        </div>
                    </td>
                </tr>
            `;
        }
    }
});