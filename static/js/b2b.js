/**
 * B2B Directory Module - Public Merchants Marketplace
 * Handles fetching and displaying public merchants for B2B connections
 */

class B2BDirectory {
    constructor(dbManager) {
        this.dbManager = dbManager;
        this.publicMerchants = [];
    }

    /**
     * Initialize B2B Directory
     */
    async initialize() {
        try {
            await this.loadPublicMerchants();
            console.log('✅ B2B Directory initialized');
        } catch (error) {
            console.error('Error initializing B2B Directory:', error);
        }
    }

    /**
     * Load public merchants from backend
     */
    async loadPublicMerchants() {
        try {
            // Try to fetch from backend
            try {
                const response = await fetch('/stores/public');
                if (response.ok) {
                    const data = await response.json();
                    this.publicMerchants = data.merchants || [];
                    console.log('✅ Loaded public merchants from backend:', this.publicMerchants.length);
                    return;
                }
            } catch (error) {
                console.warn('Backend not available, using mock data');
            }

            // Fallback: Use mock data for demo
            this.publicMerchants = [
                {
                    merchantId: 'merchant_001',
                    name: 'Coffee Shop Downtown',
                    category: 'Food & Beverage',
                    location: 'New York, NY',
                    acceptsPi: true,
                    description: 'Premium coffee and pastries',
                    walletAddress: 'GCOFFEE123456'
                },
                {
                    merchantId: 'merchant_002',
                    name: 'Tech Gadgets Store',
                    category: 'Electronics',
                    location: 'San Francisco, CA',
                    acceptsPi: true,
                    description: 'Latest tech gadgets and accessories',
                    walletAddress: 'GTECH789012'
                },
                {
                    merchantId: 'merchant_003',
                    name: 'Fashion Boutique',
                    category: 'Fashion & Apparel',
                    location: 'Los Angeles, CA',
                    acceptsPi: true,
                    description: 'Trendy fashion and accessories',
                    walletAddress: 'GFASHION345678'
                },
                {
                    merchantId: 'merchant_004',
                    name: 'Organic Grocery',
                    category: 'Food & Groceries',
                    location: 'Portland, OR',
                    acceptsPi: true,
                    description: 'Fresh organic produce and groceries',
                    walletAddress: 'GORGANIC901234'
                },
                {
                    merchantId: 'merchant_005',
                    name: 'Bookstore & Cafe',
                    category: 'Books & Media',
                    location: 'Seattle, WA',
                    acceptsPi: true,
                    description: 'Books, coffee, and cozy reading space',
                    walletAddress: 'GBOOKS567890'
                }
            ];
        } catch (error) {
            console.error('Error loading public merchants:', error);
            this.publicMerchants = [];
        }
    }

    /**
     * Show B2B Market modal
     */
    async showMarket() {
        await this.loadPublicMerchants();

        // Create modal if it doesn't exist
        let modal = document.getElementById('b2b-market-modal');
        if (!modal) {
            modal = document.createElement('dialog');
            modal.id = 'b2b-market-modal';
            modal.className = 'modal-content'; // Reuse standard class for styling
            // Reset some dialog defaults to match our custom style
            modal.style.cssText = `
                padding: 0;
                border-radius: 16px;
                border: none;
                max-width: 600px;
                width: 100%;
                max-height: 85vh;
                background: white;
                box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                margin: auto;
            `;
            document.body.appendChild(modal);
        }

        const backArrow = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

        // Render merchants
        const merchantsHtml = this.publicMerchants.map(merchant => `
            <div style="border: 1px solid #ddd; border-radius: 12px; padding: 16px; margin-bottom: 12px; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                    <div>
                        <h3 style="margin: 0 0 4px 0; color: #333; font-size: 16px;">${merchant.name}</h3>
                        <div style="color: #666; font-size: 13px; display: flex; align-items: center; gap: 4px; margin-bottom: 2px;">
                            📍 ${merchant.location}
                        </div>
                        <div style="color: #666; font-size: 13px; display: flex; align-items: center; gap: 4px;">
                            🏷️ ${merchant.category}
                        </div>
                    </div>
                    ${merchant.acceptsPi ?
                '<div style="background: rgba(76, 175, 80, 0.1); color: #2E7D32; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600;">Accepts Pi</div>' :
                '<div style="background: #f5f5f5; color: #666; padding: 4px 8px; border-radius: 6px; font-size: 11px;">No Pi</div>'
            }
                </div>
                <p style="color: #555; font-size: 13px; margin: 8px 0; line-height: 1.4;">${merchant.description || 'No description available'}</p>
                <div style="text-align: right; margin-top: 10px;">
                    <button onclick="b2bDirectory.connectMerchant('${merchant.merchantId}')" 
                            style="padding: 8px 16px; background: #673ab7; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; transition: background 0.2s;">
                        Connect
                    </button>
                </div>
            </div>
        `).join('');

        modal.innerHTML = `
            <div class="modal-header">
                <button class="icon-btn back-modal-btn" onclick="b2bDirectory.closeModal()">
                    ${backArrow}
                </button>
                <h3 style="color: #333; margin: 0; font-size: 18px; font-weight: 600;">B2B Market</h3>
                <div style="width: 24px;"></div>
            </div>
            
            <div class="modal-body" style="padding: 16px; overflow-y: auto;">
                <div style="text-align: center; margin-bottom: 20px; padding: 10px; background: #f8f9fa; border-radius: 8px;">
                    <p style="color: #555; margin: 0; font-size: 14px;">Browse trusted suppliers and business partners.</p>
                </div>
                
                ${this.publicMerchants.length > 0 ? merchantsHtml : '<div style="text-align: center; padding: 40px; color: #888;">No merchants available.</div>'}
            </div>
            
            <div class="modal-footer" style="padding: 16px; border-top: 1px solid #eee; display: flex; justify-content: center;">
                <button onclick="b2bDirectory.closeModal()" style="padding: 10px 24px; background: #f5f5f5; color: #333; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
                    Close Market
                </button>
            </div>
        `;

        // Push history state
        if (!this.isMarketOpen) {
            history.pushState({ marketOpen: true }, '', '#market');
            this.isMarketOpen = true;
        }

        // Show modal with animation
        modal.showModal();
        modal.classList.add('slide-up-enter');
        setTimeout(() => modal.classList.remove('slide-up-enter'), 300);

        // Bind popstate listener
        if (!this.popstateListener) {
            this.popstateListener = (event) => {
                if (this.isMarketOpen) {
                    this.closeModal(true);
                }
            };
            window.addEventListener('popstate', this.popstateListener);
        }
    }

    /**
     * Close B2B Market modal
     * @param {boolean} isHistoryEvent
     */
    closeModal(isHistoryEvent = false) {
        const modal = document.getElementById('b2b-market-modal');
        if (modal) {
            modal.classList.add('slide-down-exit');
            setTimeout(() => {
                modal.close();
                modal.classList.remove('slide-down-exit');
            }, 250);
        }

        if (!isHistoryEvent && this.isMarketOpen) {
            if (history.state && history.state.marketOpen) {
                history.back();
            }
        }
        this.isMarketOpen = false;
    }

    /**
     * Connect to a merchant (save contact)
     */
    async connectMerchant(merchantId) {
        try {
            const merchant = this.publicMerchants.find(m => m.merchantId === merchantId);
            if (!merchant) {
                Toast.error('Merchant not found');
                return;
            }

            // Save to contacts/connections (could be a new table)
            // For now, just show a confirmation
            const confirmed = await Modal.confirm(
                `Connect to ${merchant.name}?<br><br>` +
                `This will save their contact information for future B2B transactions.`
            );

            if (confirmed) {
                // In production, save to a connections table
                // For now, just show success message
                Toast.success(`Connected to ${merchant.name}!`);
                console.log('✅ Connected to merchant:', merchant);
            }
        } catch (error) {
            console.error('Error connecting to merchant:', error);
            Toast.error('Error connecting to merchant: ' + error.message);
        }
    }
}

// Export for use in other modules
export { B2BDirectory };
if (typeof window !== 'undefined') {
    window.B2BDirectory = B2BDirectory;
}

