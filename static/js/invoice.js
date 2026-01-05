/**
 * Invoice Module - Create Invoice Workflow
 * Handles invoice creation, split payment calculation, and QR code generation
 */
import QRious from 'https://esm.sh/qrious@4.0.2';
import dbManager from './db.js';
import securityManager from './security.js';
import piAdapter from './pi-adapter.js';

// Exchange Rates
const RATE_MARKET_TEST = 10.0; // $10 = 1 Pi (for easy testing math)
const RATE_GCV = 314159.0; // $314,159 = 1 Pi (Global Consensus Value)

/**
 * Format Pi amount with dynamic precision
 * If value >= 1: show 2 decimals (e.g., 10.50)
 * If value < 1: show up to 7 decimals (e.g., 0.0000015)
 * VALIDATION: Handles null, undefined, NaN, and invalid values
 */
function formatPiAmount(value) {
    // VALIDATION FIX: Check for null, undefined, NaN, or invalid values
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
        return '0';
    }
    
    // Ensure value is a number
    const numValue = Number(value);
    if (isNaN(numValue) || !isFinite(numValue)) {
        return '0';
    }
    
    if (numValue >= 1) {
        return numValue.toFixed(2);
    } else {
        // For values < 1, show up to 7 decimal places, removing trailing zeros
        const formatted = numValue.toFixed(7);
        return formatted.replace(/\.?0+$/, ''); // Remove trailing zeros
    }
}

class InvoiceManager {
    constructor() {
        this.modal = null;
        this.items = [];
        this.useGCV = false;
        this.exchangeRate = RATE_MARKET_TEST; // Default: Market test rate
        this.editingInvoiceId = null; // Track if we're editing an invoice
        this.currentInvoiceId = null; // Track current invoice ID (for QR generation)
        // PERFORMANCE FIX: Debounce timer for calculateTotals
        this.calculateTotalsDebounceTimer = null;
        // MEMORY LEAK FIX: Store event listeners and timeouts for cleanup
        this.popstateListener = null;
        this.modalClickListener = null;
        this.setupTimeoutId = null;
        this.closeModalTimeoutId = null;
    }

    /**
     * STATE MANAGEMENT FIX: Helper method to get dbManager consistently
     */
    _getDbManager() {
        return window.dbManager || dbManager;
    }

    /**
     * STATE MANAGEMENT FIX: Helper method to get securityManager consistently
     */
    _getSecurityManager() {
        return window.securityManager || securityManager;
    }

    /**
     * Get wallet address from merchant data
     * SECURITY FIX: Get wallet from database instead of hardcoded value
     */
    async _getWalletAddress(merchantId) {
        try {
            const currentDbManager = this._getDbManager();
            if (!currentDbManager || !merchantId) {
                return 'GDEMO123456789'; // Fallback for demo mode
            }

            const merchant = await currentDbManager.getMerchant(merchantId);
            if (merchant && merchant.walletAddress) {
                return merchant.walletAddress;
            }

            // Fallback to demo wallet if not found
            console.warn('Merchant wallet address not found. Using demo wallet as fallback.');
            return 'GDEMO123456789';
        } catch (error) {
            console.error('Error getting wallet address:', error);
            return 'GDEMO123456789'; // Fallback for errors
        }
    }

    /**
     * Initialize invoice manager
     */
    async initialize() {
        this.modal = document.getElementById('invoice-modal');
        if (!this.modal) {
            console.error('Invoice modal not found');
            return;
        }

        // Setup event listeners
        this.setupEventListeners();

        // Initialize exchange rate (default to GCV)
        this.useGCV = true;
        this.exchangeRate = RATE_GCV;

        // Note: Exchange rate is used only for tax purposes and cash deduction calculations
    }

    /**
     * Setup event listeners for modal
     */
    setupEventListeners() {
        // Close modal buttons
        const closeBtn = document.getElementById('close-modal-btn');
        const cancelBtn = document.getElementById('cancel-invoice-btn');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeModal());
        }

        // Add item button
        const addItemBtn = document.getElementById('add-item-btn');
        if (addItemBtn) {
            addItemBtn.addEventListener('click', () => this.addItem());
        }

        // Scan Barcode button (Req #34)
        const scanBarcodeBtn = document.getElementById('scan-barcode-btn');
        if (scanBarcodeBtn && window.hardwareManager) {
            // ERROR HANDLING FIX: Add proper error handling for async operation
            scanBarcodeBtn.addEventListener('click', async () => {
                try {
                    await this.scanBarcode();
                } catch (error) {
                    console.error('Error scanning barcode:', error);
                    if (window.Toast) {
                        Toast.error('Failed to scan barcode: ' + (error.message || 'Unknown error'));
                    }
                }
            });
        }

        // Exchange Rate Radio Buttons
        const rateGCV = document.getElementById('rate-gcv');
        const rateCustom = document.getElementById('rate-custom');
        const customRateInput = document.getElementById('custom-rate-input');

        if (rateGCV) {
            rateGCV.addEventListener('change', () => {
                this.useGCV = true;
                this.exchangeRate = RATE_GCV;
                if (customRateInput) customRateInput.disabled = true;
                this.calculateTotals();
            });
        }

        if (rateCustom) {
            rateCustom.addEventListener('change', () => {
                this.useGCV = false;
                if (customRateInput) {
                    customRateInput.disabled = false;
                    this.exchangeRate = parseFloat(customRateInput.value) || RATE_MARKET_TEST;
                }
                this.calculateTotals();
            });
        }

        if (customRateInput) {
            customRateInput.addEventListener('input', () => {
                if (!this.useGCV) {
                    this.exchangeRate = parseFloat(customRateInput.value) || RATE_MARKET_TEST;
                    // PERFORMANCE FIX: Debounce calculateTotals to avoid excessive recalculations
                    this.debouncedCalculateTotals();
                }
            });
        }

        // Cash Paid Input
        const cashPaidInput = document.getElementById('cash-paid-input');
        if (cashPaidInput) {
            // PERFORMANCE FIX: Debounce calculateTotals to avoid excessive recalculations on every keystroke
            cashPaidInput.addEventListener('input', () => this.debouncedCalculateTotals());
        }

        // Save Draft button
        const saveDraftBtn = document.getElementById('btn-save-draft');
        if (saveDraftBtn) {
            saveDraftBtn.addEventListener('click', () => this.saveDraft());
        }

        // Generate QR button
        const generateQRBtn = document.getElementById('btn-generate-qr');
        if (generateQRBtn) {
            generateQRBtn.addEventListener('click', () => this.generatePaymentQR());
        }

        // Print Receipt button (Req #34)
        const printReceiptBtn = document.getElementById('btn-print-receipt');
        if (printReceiptBtn) {
            printReceiptBtn.addEventListener('click', () => this.printReceipt());
        }

        // Copy Link for Chat button (Chat Integration)
        const copyLinkBtn = document.getElementById('btn-copy-link');
        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', () => this.copyInvoiceLinkForChat());
        }

        // Form submit (legacy support)
        const form = document.getElementById('invoice-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveDraft(); // Default to save draft on form submit
            });
        }

        // Close modal when clicking outside
        // MEMORY LEAK FIX: Store listener for cleanup
        if (this.modal) {
            this.modalClickListener = (e) => {
                if (e.target === this.modal) {
                    this.closeModal();
                }
            };
            this.modal.addEventListener('click', this.modalClickListener);
        }
    }

    /**
     * Open invoice modal
     */
    /**
     * Open invoice modal
     * @param {boolean} clearCurrentInvoice - If true, clears currentInvoiceId to start fresh
     */
    openModal(clearCurrentInvoice = false) {
        if (!this.modal) {
            console.error('Modal not initialized');
            return;
        }

        // Clear current invoice ID if explicitly requested
        if (clearCurrentInvoice) {
            this.currentInvoiceId = null;
            console.log('🆕 Starting new invoice (cleared currentInvoiceId)');
        }

        // Reset form if needed
        if (!this.editingInvoiceId && !this.currentInvoiceId) {
            this.resetForm();
            this.addItem();
        } else if (this.currentInvoiceId) {
            console.log('📝 Continuing with existing invoice:', this.currentInvoiceId);
        }

        // Push history state for Back button support
        if (!this.isInvoiceOpen) {
            history.pushState({ invoiceOpen: true }, '', '#invoice');
            this.isInvoiceOpen = true;
        }

        // Show modal with animation
        this.modal.showModal();
        this.modal.classList.add('slide-up-enter');

        // Remove animation class after it completes
        // MEMORY LEAK FIX: Store timeout ID for cleanup
        if (this.setupTimeoutId) {
            clearTimeout(this.setupTimeoutId);
        }
        this.setupTimeoutId = setTimeout(() => {
            this.modal.classList.remove('slide-up-enter');
            this.setupTimeoutId = null;
        }, 300);

        // Bind popstate listener if not already done
        if (!this.popstateListener) {
            this.popstateListener = (event) => {
                // If back button hit and we are open, close
                if (this.isInvoiceOpen) {
                    this.closeModal(true); // true = from history
                }
            };
            window.addEventListener('popstate', this.popstateListener);
        }
    }

    /**
     * Close invoice modal
     * @param {boolean} isHistoryEvent - true if closed by browser back button
     */
    closeModal(isHistoryEvent = false) {
        // MEMORY LEAK FIX: Clear existing timeout before setting new one
        if (this.closeModalTimeoutId) {
            clearTimeout(this.closeModalTimeoutId);
        }
        
        if (this.modal) {
            // Animate exit
            this.modal.classList.add('slide-down-exit');

            // Wait for animation to finish before native close
            this.closeModalTimeoutId = setTimeout(() => {
                this.modal.close();
                this.modal.classList.remove('slide-down-exit');
                this.closeModalTimeoutId = null;
            }, 250);
        }

        // Reset button visibility
        const saveDraftBtn = document.getElementById('btn-save-draft');
        const generateQRBtn = document.getElementById('btn-generate-qr');
        if (saveDraftBtn) saveDraftBtn.style.display = '';
        if (generateQRBtn) generateQRBtn.style.display = '';

        // Re-enable inputs
        const customerNameInput = document.getElementById('customer-name');
        if (customerNameInput) customerNameInput.disabled = false;

        this.resetForm();
        this.editingInvoiceId = null;
        this.currentInvoiceId = null;
        
        // MEMORY LEAK FIX: Remove popstate listener when modal closes
        if (this.popstateListener) {
            window.removeEventListener('popstate', this.popstateListener);
            this.popstateListener = null;
        }
        
        // MEMORY LEAK FIX: Remove modal click listener
        if (this.modal && this.modalClickListener) {
            this.modal.removeEventListener('click', this.modalClickListener);
            this.modalClickListener = null;
        }

        // Handle History State
        // If closed via UI (X btn), we must pop the history state manually
        // to keep browser history clean.
        if (!isHistoryEvent && this.isInvoiceOpen) {
            if (history.state && history.state.invoiceOpen) {
                history.back();
            }
        }
        this.isInvoiceOpen = false;
    }

    /**
     * Reset form to initial state
     */
    resetForm() {
        this.items = [];
        const itemsList = document.getElementById('items-list');
        if (itemsList) {
            itemsList.innerHTML = '';
        }

        const customerName = document.getElementById('customer-name');
        if (customerName) {
            customerName.value = '';
        }

        const externalRefInput = document.getElementById('external-ref-input');
        if (externalRefInput) {
            externalRefInput.value = '';
        }

        const cashPaidInput = document.getElementById('cash-paid-input');
        if (cashPaidInput) {
            cashPaidInput.value = '0';
        }

        // Reset exchange rate to default (Market Test Rate)
        const rateGCV = document.getElementById('rate-gcv');
        const rateCustom = document.getElementById('rate-custom');
        const customRateInput = document.getElementById('custom-rate-input');
        if (rateGCV) rateGCV.checked = false;
        if (rateCustom) rateCustom.checked = true;
        if (customRateInput) {
            customRateInput.value = RATE_MARKET_TEST;
            customRateInput.disabled = false;
        }
        this.useGCV = false;
        this.exchangeRate = RATE_MARKET_TEST;

        // Clear editing state
        this.editingInvoiceId = null;

        const qrContainer = document.getElementById('qr-container');
        if (qrContainer) {
            qrContainer.style.display = 'none';
        }

        this.calculateTotals();
    }

    /**
     * Add new item row
     * @param {string} name - Item name (optional)
     * @param {number} pricePi - Item price in Pi (optional)
     * @param {number} qty - Item quantity (optional, defaults to 1)
     */
    addItem(name = '', pricePi = 0, qty = 1) {
        const itemsList = document.getElementById('items-list');
        if (!itemsList) return;

        // COLLISION FIX: Use timestamp + random to prevent ID collisions
        const itemId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const itemDiv = document.createElement('div');
        itemDiv.className = 'item-row';
        itemDiv.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
        itemDiv.dataset.itemId = itemId;

        // XSS FIX: Sanitize user input before using in innerHTML
        const sanitizedName = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(name || '') : (name || '');
        const sanitizedPrice = pricePi || '';
        
        itemDiv.innerHTML = `
            <input type="text" class="item-name" placeholder="Item name" value="${sanitizedName}"
                   style="flex: 2; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
            <div style="flex: 1; display: flex; align-items: center; gap: 5px; padding: 0 5px;">
                <input type="number" class="item-price" placeholder="Price (π)" step="any" min="0" value="${sanitizedPrice}"
                       style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                <span style="color: #9c27b0; font-weight: bold; font-size: 16px;">π</span>
            </div>
            <input type="number" class="item-qty" placeholder="Qty" min="1" value="${qty || 1}"
                   style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
            <button type="button" class="remove-item-btn" style="padding: 8px 15px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer;">
                Remove
            </button>
        `;

        itemsList.appendChild(itemDiv);

        // Add event listeners for this item
        const priceInput = itemDiv.querySelector('.item-price');
        const qtyInput = itemDiv.querySelector('.item-qty');
        const removeBtn = itemDiv.querySelector('.remove-item-btn');

        if (priceInput) {
            // PERFORMANCE FIX: Debounce calculateTotals for better performance
            priceInput.addEventListener('input', () => this.debouncedCalculateTotals());
        }
        if (qtyInput) {
            // PERFORMANCE FIX: Debounce calculateTotals for better performance
            qtyInput.addEventListener('input', () => this.debouncedCalculateTotals());
        }
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                itemDiv.remove();
                this.calculateTotals();
            });
        }
    }

    /**
     * PERFORMANCE FIX: Debounced version of calculateTotals
     * Prevents excessive recalculations during rapid input changes
     */
    debouncedCalculateTotals() {
        if (this.calculateTotalsDebounceTimer) {
            clearTimeout(this.calculateTotalsDebounceTimer);
        }
        this.calculateTotalsDebounceTimer = setTimeout(() => {
            this.calculateTotals();
        }, 150); // 150ms delay - good balance between responsiveness and performance
    }

    /**
     * Calculate totals based on Pi-First logic
     * Formula: (Total Items Pi - Cash Paid Pi Equivalent) + 0.01 Network Fee
     */
    calculateTotals() {
        // Get all items (prices are in Pi)
        const itemRows = document.querySelectorAll('.item-row');
        let totalItemsPi = 0;

        itemRows.forEach(row => {
            const priceInput = row.querySelector('.item-price');
            const qtyInput = row.querySelector('.item-qty');

            // VALIDATION FIX: Ensure parseFloat/parseInt return valid numbers
            const pricePi = parseFloat(priceInput?.value || 0) || 0;
            const qty = parseInt(qtyInput?.value || 1) || 1;

            // VALIDATION FIX: Check for NaN or Infinity before adding
            if (isFinite(pricePi) && isFinite(qty) && pricePi >= 0 && qty > 0) {
                totalItemsPi += pricePi * qty;
            }
        });

        // Get cash paid (in Fiat)
        const cashPaidInput = document.getElementById('cash-paid-input');
        // VALIDATION FIX: Ensure parseFloat returns a valid number
        const cashPaidFiat = parseFloat(cashPaidInput?.value || 0) || 0;

        // Convert cash paid to Pi equivalent
        // VALIDATION FIX: Prevent division by zero or invalid exchange rate
        if (!this.exchangeRate || this.exchangeRate <= 0 || !isFinite(this.exchangeRate)) {
            console.warn('Invalid exchange rate detected:', this.exchangeRate, '- Using default:', RATE_MARKET_TEST);
            this.exchangeRate = RATE_MARKET_TEST; // Fallback to default
        }
        const cashPaidPi = cashPaidFiat / this.exchangeRate;

        // Calculate subtotal (after cash deduction)
        const subtotalPi = Math.max(0, totalItemsPi - cashPaidPi); // Ensure non-negative

        // Add network fee
        const totalPiWithFee = subtotalPi + 0.01;

        // Calculate Fiat equivalent for tax purposes only
        const totalFiatEquivalent = totalItemsPi * this.exchangeRate;

        // Update UI with proper formatting
        const totalItemsPiEl = document.getElementById('total-items-pi');
        const cashDeductionPiEl = document.getElementById('cash-deduction-pi');
        const cashPaidPiEquivalentEl = document.getElementById('cash-paid-pi-equivalent');
        const subtotalPiEl = document.getElementById('subtotal-pi');
        const totalPiWithFeeEl = document.getElementById('total-pi-with-fee');
        const totalFiatEl = document.getElementById('total-fiat');

        // Format Pi amounts
        const formattedTotalItems = formatPiAmount(totalItemsPi);
        const formattedCashDeduction = formatPiAmount(cashPaidPi);
        const formattedSubtotal = formatPiAmount(subtotalPi);
        const formattedTotal = formatPiAmount(totalPiWithFee);

        if (totalItemsPiEl) {
            totalItemsPiEl.textContent = `π${formattedTotalItems}`;
        }

        if (cashDeductionPiEl) {
            cashDeductionPiEl.textContent = `-π${formattedCashDeduction}`;
        }

        if (cashPaidPiEquivalentEl) {
            cashPaidPiEquivalentEl.textContent = `-π${formattedCashDeduction}`;
        }

        if (subtotalPiEl) {
            subtotalPiEl.textContent = `π${formattedSubtotal}`;
        }

        if (totalPiWithFeeEl) {
            totalPiWithFeeEl.textContent = `π${formattedTotal}`;
        }

        // Fiat equivalent (for tax purposes only)
        if (totalFiatEl) {
            // VALIDATION FIX: Check for NaN or Infinity before formatting
            const fiatValue = isFinite(totalFiatEquivalent) ? totalFiatEquivalent : 0;
            totalFiatEl.textContent = `$${fiatValue.toFixed(2)}`;
        }
    }

    /**
     * Save invoice as draft (without generating QR)
     */
    async saveDraft() {
        try {
            // Validate inputs
            const customerName = document.getElementById('customer-name')?.value.trim();
            if (!customerName) {
                Toast.warning('Please enter customer name');
                return;
            }

            // Get items (prices are in Pi)
            const itemRows = document.querySelectorAll('.item-row');
            const items = [];
            let totalItemsPi = 0;

            itemRows.forEach(row => {
                const nameInput = row.querySelector('.item-name');
                const priceInput = row.querySelector('.item-price');
                const qtyInput = row.querySelector('.item-qty');

                const name = nameInput?.value?.trim() || '';
                // VALIDATION FIX: Ensure parseFloat/parseInt return valid numbers
                const pricePi = parseFloat(priceInput?.value || 0) || 0;
                const qty = parseInt(qtyInput?.value || 1) || 1;

                // VALIDATION FIX: Check for NaN, Infinity, and valid values
                if (name && isFinite(pricePi) && isFinite(qty) && pricePi > 0 && qty > 0) {
                    items.push({ name, pricePi, qty });
                    totalItemsPi += pricePi * qty;
                }
            });

            if (items.length === 0) {
                Toast.warning('Please add at least one item');
                return;
            }

            // Get cash paid (in Fiat)
            const cashPaidInput = document.getElementById('cash-paid-input');
            const cashPaidFiat = parseFloat(cashPaidInput?.value || 0) || 0;

            // Convert cash paid to Pi equivalent
            // VALIDATION FIX: Prevent division by zero or invalid exchange rate
            if (!this.exchangeRate || this.exchangeRate <= 0 || !isFinite(this.exchangeRate)) {
                console.warn('Invalid exchange rate detected in saveDraft:', this.exchangeRate, '- Using default:', RATE_MARKET_TEST);
                this.exchangeRate = RATE_MARKET_TEST; // Fallback to default
            }
            const cashPaidPi = cashPaidFiat / this.exchangeRate;

            // Calculate subtotal (after cash deduction)
            const subtotalPi = Math.max(0, totalItemsPi - cashPaidPi);

            // Add network fee
            const totalPiWithFee = subtotalPi + 0.01;

            // Determine invoice ID: Use existing ID if editing or already saved, otherwise generate new
            // SECURITY: Generate unguessable Invoice ID (Memo Randomization)
            // Format: INV-{TimestampHex}-{Random4Chars}
            function generateSecureInvoiceId() {
                const timestamp = Date.now();
                const timestampHex = timestamp.toString(16).toUpperCase();
                // Generate 4 random hex characters
                const randomChars = Math.random().toString(16).substring(2, 6).toUpperCase();
                return `INV-${timestampHex}-${randomChars}`;
            }

            const invoiceId = this.editingInvoiceId || this.currentInvoiceId || generateSecureInvoiceId();

            // STATE MANAGEMENT FIX: Use helper method for consistency
            const currentDbManager = this._getDbManager();
            if (!currentDbManager || typeof currentDbManager.getCurrentMerchantId !== 'function') {
                throw new Error('Database manager not available. Please refresh the page.');
            }
            
            // Get merchant ID from database
            const merchantId = await currentDbManager.getCurrentMerchantId();
            if (!merchantId) {
                throw new Error('Merchant ID not found. Please authenticate or set up your merchant account.');
            }

            // Get external reference ID (optional)
            const externalRefInput = document.getElementById('external-ref-input');
            const externalRef = externalRefInput?.value.trim() || null;

            // Create memo with Invoice ID (for linking QR to invoice)
            // STATE MANAGEMENT FIX: Use helper method for consistency
            const currentSecurityManager = this._getSecurityManager();
            if (!currentSecurityManager || typeof currentSecurityManager.sanitizeMemo !== 'function') {
                throw new Error('Security manager not available. Please refresh the page.');
            }
            const memo = currentSecurityManager.sanitizeMemo(invoiceId);

            // Create invoice record
            const invoiceData = {
                invoiceId: invoiceId,
                merchantId: merchantId,
                amount: totalPiWithFee,
                currency: 'PI',
                memo: memo,
                status: (this.editingInvoiceId || this.currentInvoiceId) ? 'pending' : 'draft', // Draft for new, pending for updates
                customerName: customerName,
                items: items.map(item => ({ name: item.name, pricePi: item.pricePi, qty: item.qty })),
                cashPaidFiat: cashPaidFiat,
                cashPaidPi: cashPaidPi,
                totalItemsPi: totalItemsPi,
                exchangeRate: this.exchangeRate,
                externalRef: externalRef
            };

            // Ensure database is initialized (currentDbManager already declared above)
            if (!currentDbManager.db || !currentDbManager.db.isOpen()) {
                await currentDbManager.initialize();
            }

            // Check if invoice already exists (editing or previously saved)
            const existingInvoiceId = this.editingInvoiceId || this.currentInvoiceId;

            if (existingInvoiceId) {
                // Update existing invoice (keep same Invoice ID)
                await currentDbManager.db.invoices.where('invoiceId').equals(existingInvoiceId).modify({
                    ...invoiceData,
                    invoiceId: existingInvoiceId, // Keep original ID
                    status: 'pending', // Change to pending when saved/updated
                    updatedAt: new Date().toISOString()
                });
                this.currentInvoiceId = existingInvoiceId; // Keep track of current invoice
                console.log('✅ Invoice updated (same ID):', existingInvoiceId);

                // Req #35: Log audit event (currentDbManager already declared above)
                await currentDbManager.logAuditEvent(
                    'Invoice_Updated',
                    'invoice',
                    existingInvoiceId,
                    { totalPi: totalPiWithFee, itemCount: items.length },
                    'cashier',
                    'user'
                );
            } else {
                // Create new invoice (currentDbManager already declared above)
                await currentDbManager.createInvoice(invoiceData);
                this.currentInvoiceId = invoiceId; // Track new invoice
                console.log('✅ Invoice saved as draft:', invoiceId);

                // Req #35: Log audit event (currentDbManager already declared above)
                await currentDbManager.logAuditEvent(
                    'Invoice_Created',
                    'invoice',
                    invoiceId,
                    { totalPi: totalPiWithFee, itemCount: items.length, customerName: customerName },
                    'cashier',
                    'user'
                );

                // SECURITY: Register invoice with backend for verification
                try {
                    // VALIDATION FIX: Safe JSON.stringify with error handling
                    let requestBody;
                    try {
                        requestBody = JSON.stringify({
                            invoice_id: invoiceId,
                            invoice_data: {
                                amount: totalPiWithFee,
                                merchantId: merchantId,
                                walletAddress: await this._getWalletAddress(merchantId),
                                status: 'draft',
                                customerName: customerName
                            }
                        });
                    } catch (jsonError) {
                        console.error('Error stringifying invoice data:', jsonError);
                        // Skip registration if JSON.stringify fails (circular reference, etc.)
                        throw jsonError;
                    }
                    
                    const response = await fetch('/blockchain/register-invoice', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: requestBody
                    });
                    // ERROR HANDLING FIX: Check response status properly
                    if (response.ok) {
                        console.log('✅ Invoice registered with blockchain service');
                    } else {
                        // Log non-OK responses for debugging
                        const errorText = await response.text().catch(() => 'Unknown error');
                        console.warn('⚠️ Backend registration failed:', response.status, errorText);
                    }
                } catch (error) {
                    console.warn('⚠️ Failed to register invoice with backend:', error);
                    // Non-critical error, continue
                }
            }

            // Show success message
            // Show success message
            Toast.success(`Invoice saved! ID: ${this.currentInvoiceId}`);

            // Optional: Show modal details if needed, but Toast is cleaner
            // alert(`✅ Invoice saved successfully!\n\nInvoice ID: ${this.currentInvoiceId}\nNet Payable: π${formatPiAmount(totalPiWithFee)}\n\nYou can now generate the payment QR code.`);

            // Refresh dashboard
            setTimeout(async () => {
                if (window.renderInvoices) {
                    await window.renderInvoices();
                }
                if (window.renderStats) {
                    await window.renderStats();
                }
            }, 500);
        } catch (error) {
            console.error('Error saving invoice:', error);
            // ERROR HANDLING IMPROVEMENT: Use ErrorHandler for user-friendly messages
            if (window.ErrorHandler) {
                window.ErrorHandler.showError(error, 'invoice_save', 'en');
            } else {
                Toast.error('Error saving invoice: ' + error.message);
            }
        }
    }


    /**
     * Generate Payment QR Code (after invoice is saved)
     */
    async generatePaymentQR() {
        try {
            // First, ensure invoice is saved
            if (!this.currentInvoiceId && !this.editingInvoiceId) {
                // Auto-save first
                await this.saveDraft();
                // Wait a moment for save to complete
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            // Get invoice ID
            const invoiceId = this.currentInvoiceId || this.editingInvoiceId;
            if (!invoiceId) {
                Toast.warning('Please save the invoice first');
                return;
            }

            // Fetch invoice from database to get current data
            // STATE MANAGEMENT FIX: Use helper method for consistency
            const currentDbManager = this._getDbManager();
            if (!currentDbManager) {
                throw new Error('Database manager not available. Please refresh the page.');
            }
            if (!currentDbManager.db || !currentDbManager.db.isOpen()) {
                await currentDbManager.initialize();
            }

            const invoice = await currentDbManager.db.invoices.where('invoiceId').equals(invoiceId).first();
            if (!invoice) {
                Toast.error('Invoice not found. Please save the invoice first.');
                return;
            }

            // Generate QR code with Invoice ID in memo
            await this.generateQRCode(invoice.amount, invoice.memo, invoice.merchantId, invoiceId);

            console.log('✅ Payment QR generated for invoice:', invoiceId);
        } catch (error) {
            console.error('Error generating payment QR:', error);
            // ERROR HANDLING IMPROVEMENT: Use ErrorHandler for user-friendly messages
            if (window.ErrorHandler) {
                window.ErrorHandler.showError(error, 'qr_generation', 'en');
            } else {
                Toast.error('Error generating QR code: ' + error.message);
            }
        }
    }

    /**
     * Generate invoice and QR code (Legacy method - kept for compatibility)
     */
    async generateInvoice() {
        try {
            // Validate inputs
            // Validate inputs
            const customerName = document.getElementById('customer-name')?.value.trim();
            if (!customerName) {
                Toast.warning('Please enter customer name');
                return;
            }

            // Get items (prices are in Pi)
            const itemRows = document.querySelectorAll('.item-row');
            const items = [];
            let totalItemsPi = 0;

            itemRows.forEach(row => {
                const nameInput = row.querySelector('.item-name');
                const priceInput = row.querySelector('.item-price');
                const qtyInput = row.querySelector('.item-qty');

                const name = nameInput?.value?.trim() || '';
                // VALIDATION FIX: Ensure parseFloat/parseInt return valid numbers
                const pricePi = parseFloat(priceInput?.value || 0) || 0;
                const qty = parseInt(qtyInput?.value || 1) || 1;

                // VALIDATION FIX: Check for NaN, Infinity, and valid values
                if (name && isFinite(pricePi) && isFinite(qty) && pricePi > 0 && qty > 0) {
                    items.push({ name, pricePi, qty });
                    totalItemsPi += pricePi * qty;
                }
            });

            if (items.length === 0) {
                Toast.warning('Please add at least one item');
                return;
            }

            // Get cash paid (in Fiat)
            const cashPaidInput = document.getElementById('cash-paid-input');
            const cashPaidFiat = parseFloat(cashPaidInput?.value || 0) || 0;

            // Convert cash paid to Pi equivalent
            // VALIDATION FIX: Prevent division by zero or invalid exchange rate
            if (!this.exchangeRate || this.exchangeRate <= 0 || !isFinite(this.exchangeRate)) {
                console.warn('Invalid exchange rate detected in saveDraft:', this.exchangeRate, '- Using default:', RATE_MARKET_TEST);
                this.exchangeRate = RATE_MARKET_TEST; // Fallback to default
            }
            const cashPaidPi = cashPaidFiat / this.exchangeRate;

            // Calculate subtotal (after cash deduction)
            const subtotalPi = Math.max(0, totalItemsPi - cashPaidPi);

            // Add network fee
            const totalPiWithFee = subtotalPi + 0.01;

            // SECURITY: Generate unguessable Invoice ID (Memo Randomization)
            // Format: INV-{TimestampHex}-{Random4Chars}
            function generateSecureInvoiceId() {
                const timestamp = Date.now();
                const timestampHex = timestamp.toString(16).toUpperCase();
                // Generate 4 random hex characters
                const randomChars = Math.random().toString(16).substring(2, 6).toUpperCase();
                return `INV-${timestampHex}-${randomChars}`;
            }

            const invoiceId = generateSecureInvoiceId();

            // STATE MANAGEMENT FIX: Use helper method for consistency (single declaration)
            const currentDbManager = this._getDbManager();
            if (!currentDbManager || typeof currentDbManager.getCurrentMerchantId !== 'function') {
                throw new Error('Database manager not available. Please refresh the page.');
            }
            
            // Get merchant ID from database (handles Pi auth, demo mode, or manual setup)
            const merchantId = await currentDbManager.getCurrentMerchantId();
            if (!merchantId) {
                throw new Error('Merchant ID not found. Please authenticate or set up your merchant account.');
            }

            // Get external reference ID (optional)
            const externalRefInput = document.getElementById('external-ref-input');
            const externalRef = externalRefInput?.value.trim() || null;

            // Sanitize memo (Req #11)
            // STATE MANAGEMENT FIX: Use helper method for consistency
            const currentSecurityManager = this._getSecurityManager();
            if (!currentSecurityManager || typeof currentSecurityManager.sanitizeMemo !== 'function') {
                throw new Error('Security manager not available. Please refresh the page.');
            }
            // VALIDATION FIX: Check customerName length before substring
            const customerNamePrefix = customerName && customerName.length > 0 ? customerName.substring(0, 10) : 'CUSTOMER';
            const memo = currentSecurityManager.sanitizeMemo(`${invoiceId}-${customerNamePrefix}`);

            // Create invoice record (always in Pi)
            const invoiceData = {
                invoiceId: invoiceId,
                merchantId: merchantId,
                amount: totalPiWithFee,
                currency: 'PI', // Always Pi
                memo: memo,
                status: 'pending',
                customerName: customerName,
                items: items.map(item => ({ name: item.name, pricePi: item.pricePi, qty: item.qty })),
                cashPaidFiat: cashPaidFiat,
                cashPaidPi: cashPaidPi,
                totalItemsPi: totalItemsPi,
                exchangeRate: this.exchangeRate,
                externalRef: externalRef // External reference / paper invoice ID
            };
            
            // Ensure database is initialized before saving
            if (!currentDbManager.db || !currentDbManager.db.isOpen()) {
                console.log('Database not initialized, initializing now...');
                await currentDbManager.initialize();
            }

            // Check if we're editing an existing invoice
            if (this.editingInvoiceId) {
                // Update existing invoice
                const finalInvoiceId = this.editingInvoiceId; // Save before clearing
                await currentDbManager.db.invoices.where('invoiceId').equals(this.editingInvoiceId).modify({
                    ...invoiceData,
                    invoiceId: this.editingInvoiceId, // Keep original ID
                    updatedAt: new Date().toISOString()
                });
                console.log('✅ Invoice updated:', finalInvoiceId);

                // Generate QR code for updated invoice
                await this.generateQRCode(totalPiWithFee, memo, merchantId);

                // Show success message
                // Show success message
                Toast.success(`Invoice updated! ID: ${finalInvoiceId}`);
                // alert(`✅ Invoice updated successfully!\n\nInvoice ID: ${finalInvoiceId}\nNet Payable: π${formatPiAmount(totalPiWithFee)}`);

                // Clear editing state
                this.editingInvoiceId = null;

                // Close modal
                this.closeModal();

                // Refresh dashboard after a short delay
                setTimeout(async () => {
                    if (window.renderInvoices) {
                        await window.renderInvoices();
                    }
                    if (window.renderStats) {
                        await window.renderStats();
                    }
                }, 1000);
                return; // Exit early for update
            } else {
                // Create new invoice
            // STATE MANAGEMENT FIX: Use helper method for consistency
            const currentDbManager = this._getDbManager();
            await currentDbManager.createInvoice(invoiceData);
                console.log('✅ Invoice created:', invoiceId);

                // Generate QR code (always Pi payment)
                // Works in both Demo Mode and Real Mode
                await this.generateQRCode(totalPiWithFee, memo, merchantId);

                // Check if in demo mode
                const isDemoMode = window.dbManager?.isDemoMode || false;

                // Show success message
                const successMsg = isDemoMode
                    ? `Demo Invoice created! ID: ${invoiceId}`
                    : `Invoice created! ID: ${invoiceId}`;

                Toast.success(successMsg);

                // Close modal
                this.closeModal();

                // Refresh dashboard after a short delay
                setTimeout(async () => {
                    if (window.renderInvoices) {
                        await window.renderInvoices();
                    }
                    if (window.renderStats) {
                        await window.renderStats();
                    }
                }, 1000);
            }
        } catch (error) {
            console.error('Error generating invoice:', error);
            // ERROR HANDLING IMPROVEMENT: Use ErrorHandler for user-friendly messages
            if (window.ErrorHandler) {
                window.ErrorHandler.showError(error, 'invoice_creation', 'en');
            } else {
                Toast.error('Error creating invoice: ' + error.message);
            }
        }
    }


    /**
     * Generate QR code for Pi payment
     * @param {number} amountPi - Amount in Pi
     * @param {string} memo - Payment memo (will include Invoice ID)
     * @param {string} merchantId - Merchant ID
     * @param {string} invoiceId - Invoice ID (optional, will be added to memo if provided)
     */
    async generateQRCode(amountPi, memo, merchantId, invoiceId = null) {
        try {
            // Get wallet address from merchant data using helper method
            // SECURITY FIX: Get wallet from database, not hardcoded
            const walletAddress = await this._getWalletAddress(merchantId);

            // Generate memo with Invoice ID (for linking QR to invoice)
            // Format: InvoiceID (max 28 bytes for Stellar memo)
            let paymentMemo = memo;
            if (invoiceId) {
                // Use Invoice ID as memo (ensure it fits in 28 bytes)
                const invoiceMemo = invoiceId.length <= 28 ? invoiceId : invoiceId.substring(0, 28);
                paymentMemo = securityManager.sanitizeMemo(invoiceMemo);
                console.log('🔗 Using Invoice ID in memo:', invoiceId);
            }

            // Generate Pi payment URL - Use dynamic precision formatter
            const formattedAmount = formatPiAmount(amountPi);
            const paymentUrl = `pi://pay?recipient=${walletAddress}&amount=${formattedAmount}&memo=${encodeURIComponent(paymentMemo)}`;

            console.log('🔗 Payment URL:', paymentUrl);
            console.log('📋 Invoice ID in memo:', invoiceId || 'N/A');

            // Get QR container and canvas
            const qrContainer = document.getElementById('qr-container');
            const qrCodeCanvas = document.getElementById('qr-code-canvas');

            if (!qrContainer) {
                console.error('QR container not found');
                return;
            }

            // Show QR container FIRST (before generating QR)
            qrContainer.style.display = 'block';

            // Get or create canvas element
            let canvas = qrCodeCanvas;
            if (!canvas) {
                // Create canvas if it doesn't exist
                canvas = document.createElement('canvas');
                canvas.id = 'qr-code-canvas';
                canvas.style.cssText = 'max-width: 256px; height: auto; display: block; margin: 0 auto;';

                // Find the qr-code div and replace it with canvas, or append to container
                const qrCodeDiv = document.getElementById('qr-code');
                if (qrCodeDiv) {
                    qrCodeDiv.innerHTML = '';
                    qrCodeDiv.appendChild(canvas);
                } else {
                    // If qr-code div doesn't exist, append directly to container
                    qrContainer.appendChild(canvas);
                }
            }

            // Clear canvas before generating new QR code
            // Note: QRious will handle canvas clearing automatically

            // Generate QR code using QRious library
            try {
                new QRious({
                    element: canvas,
                    value: paymentUrl,
                    size: 256,
                    background: 'white',
                    foreground: 'black',
                    level: 'M'
                });
            } catch (qrError) {
                console.error('QRious error:', qrError);
                // Fallback: Try to create QR code manually
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    // Try QRious again with fresh canvas
                    canvas.width = 256;
                    canvas.height = 256;
                    new QRious({
                        element: canvas,
                        value: paymentUrl,
                        size: 256,
                        background: 'white',
                        foreground: 'black',
                        level: 'M'
                    });
                }
            }

            // Scroll to QR code
            setTimeout(() => {
                qrContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);

            console.log('✅ QR code generated:', paymentUrl);
            console.log('QR Code URL:', paymentUrl);
        } catch (error) {
            console.error('Error generating QR code:', error);
            console.error('Error details:', error.stack);
            alert('Error generating QR code: ' + error.message + '\n\nPayment URL: ' + paymentUrl);
        }
    }

    /**
     * Edit an existing invoice (only if status is 'pending')
     */
    async editInvoice(invoiceId) {
        try {
            // STATE MANAGEMENT FIX: Use helper method for consistency
            const currentDbManager = this._getDbManager();
            if (!currentDbManager) {
                throw new Error('Database manager not available. Please refresh the page.');
            }
            if (!currentDbManager.db || !currentDbManager.db.isOpen()) {
                await currentDbManager.initialize();
            }

            // Get invoice from database
            const invoice = await currentDbManager.db.invoices.where('invoiceId').equals(invoiceId).first();

            if (!invoice) {
                Toast.error('Invoice not found');
                return;
            }

            // Allow editing for both 'pending' and 'draft' invoices
            if (invoice.status !== 'pending' && invoice.status !== 'draft') {
                Toast.warning('Only pending or draft invoices can be edited');
                return;
            }

            // Log invoice data for debugging
            console.log('📋 Invoice data loaded:', invoice);
            console.log('📋 Invoice items:', invoice.items);

            // Set editing state FIRST (before opening modal)
            this.editingInvoiceId = invoiceId;

            // Open modal first (it will skip resetForm because editingInvoiceId is set)
            this.openModal();

            // Wait for modal to be fully rendered and DOM to be ready
            await new Promise(resolve => setTimeout(resolve, 100));

            // Now populate modal with invoice data
            console.log('🔧 Populating form fields...');

            // Populate Customer Name
            const customerNameInput = document.getElementById('customer-name');
            if (customerNameInput) {
                customerNameInput.value = invoice.customerName || '';
                console.log('✅ Customer name set:', invoice.customerName);
            } else {
                console.error('❌ Customer name input not found!');
            }

            // Populate External Reference
            const externalRefInput = document.getElementById('external-ref-input');
            if (externalRefInput) {
                externalRefInput.value = invoice.externalRef || '';
                console.log('✅ External ref set:', invoice.externalRef);
            }

            // Set exchange rate
            const rateGCV = document.getElementById('rate-gcv');
            const rateCustom = document.getElementById('rate-custom');
            const customRateInput = document.getElementById('custom-rate-input');

            if (invoice.exchangeRate === RATE_GCV) {
                if (rateGCV) rateGCV.checked = true;
                if (rateCustom) rateCustom.checked = false;
                if (customRateInput) customRateInput.disabled = true;
                this.useGCV = true;
                this.exchangeRate = RATE_GCV;
                console.log('✅ Exchange rate set to GCV');
            } else {
                if (rateGCV) rateGCV.checked = false;
                if (rateCustom) rateCustom.checked = true;
                if (customRateInput) {
                    customRateInput.value = invoice.exchangeRate || RATE_MARKET_TEST;
                    customRateInput.disabled = false;
                }
                this.useGCV = false;
                this.exchangeRate = invoice.exchangeRate || RATE_MARKET_TEST;
                console.log('✅ Exchange rate set to custom:', this.exchangeRate);
            }

            // Clear existing items FIRST
            this.items = [];
            const itemsList = document.getElementById('items-list');
            if (itemsList) {
                itemsList.innerHTML = '';
                console.log('✅ Items list cleared');
            } else {
                console.error('❌ Items list not found!');
            }

            // Add items from invoice (with actual values)
            if (invoice.items && invoice.items.length > 0) {
                console.log(`📦 Adding ${invoice.items.length} items...`);
                invoice.items.forEach((item, index) => {
                    // Use the actual saved values
                    const itemName = item.name || '';
                    const itemPrice = item.pricePi || 0;
                    const itemQty = item.qty || 1;
                    console.log(`  Item ${index + 1}: ${itemName}, Price: ${itemPrice}, Qty: ${itemQty}`);
                    this.addItem(itemName, itemPrice, itemQty);
                });
                console.log('✅ All items added');
            } else {
                console.warn('⚠️ No items found in invoice, adding empty row');
                // Add at least one empty item row if no items found
                this.addItem();
            }

            // Set cash paid
            const cashPaidInput = document.getElementById('cash-paid-input');
            if (cashPaidInput) {
                cashPaidInput.value = invoice.cashPaidFiat || 0;
                console.log('✅ Cash paid set:', invoice.cashPaidFiat);
            } else {
                console.error('❌ Cash paid input not found!');
            }

            // Update button text to "Update Invoice"
            const generateBtn = document.getElementById('generate-qr-btn');
            if (generateBtn) {
                generateBtn.textContent = 'Update Invoice';
                console.log('✅ Button text updated to "Update Invoice"');
            } else {
                console.error('❌ Generate button not found!');
            }

            // Recalculate totals after populating all fields
            setTimeout(() => {
                this.calculateTotals();
                console.log('✅ Totals recalculated');
            }, 150);

            console.log('✅ Invoice loaded for editing:', invoiceId);
        } catch (error) {
            console.error('Error editing invoice:', error);
            alert('Error loading invoice: ' + error.message);
            // Reset editing state on error
            this.editingInvoiceId = null;
        }
    }

    /**
     * Delete an invoice (only if status is 'pending')
     */
    async deleteInvoice(invoiceId) {
        try {
            const confirmed = await Modal.confirm('Are you sure you want to delete this invoice? This action cannot be undone.');
            if (!confirmed) {
                return;
            }

            // STATE MANAGEMENT FIX: Use helper method for consistency
            const currentDbManager = this._getDbManager();
            if (!currentDbManager) {
                throw new Error('Database manager not available. Please refresh the page.');
            }
            if (!currentDbManager.db || !currentDbManager.db.isOpen()) {
                await currentDbManager.initialize();
            }

            // Get invoice to check status
            const invoice = await currentDbManager.db.invoices.where('invoiceId').equals(invoiceId).first();

            if (!invoice) {
                Toast.error('Invoice not found');
                return;
            }

            // Allow deleting for both 'pending' and 'draft' invoices
            if (invoice.status !== 'pending' && invoice.status !== 'draft') {
                Toast.warning('Only pending or draft invoices can be deleted');
                return;
            }

            // Req #35: Log audit event BEFORE deletion
            await currentDbManager.logAuditEvent(
                'Invoice_Deleted',
                'invoice',
                invoiceId,
                {
                    amount: invoice.amount,
                    status: invoice.status,
                    reason: 'User requested deletion'
                },
                'cashier',
                'user'
            );

            // Delete invoice (currentDbManager already declared above)
            await currentDbManager.db.invoices.where('invoiceId').equals(invoiceId).delete();

            console.log('✅ Invoice deleted:', invoiceId);

            // Refresh dashboard
            if (window.renderInvoices) {
                await window.renderInvoices();
            }
            if (window.renderStats) {
                await window.renderStats();
            }

            Toast.success('Invoice deleted successfully');
        } catch (error) {
            console.error('Error deleting invoice:', error);
            Toast.error('Error deleting invoice: ' + error.message);
        }
    }

    /**
     * Show QR code for an existing invoice
     */
    async showQRCode(invoiceId) {
        try {
            console.log('🔍 Showing QR for invoice:', invoiceId);

            // STATE MANAGEMENT FIX: Use helper method for consistency
            const currentDbManager = this._getDbManager();
            if (!currentDbManager) {
                throw new Error('Database manager not available. Please refresh the page.');
            }
            if (!currentDbManager.db || !currentDbManager.db.isOpen()) {
                await currentDbManager.initialize();
            }

            // Get invoice from database
            const invoice = await currentDbManager.db.invoices.where('invoiceId').equals(invoiceId).first();

            if (!invoice) {
                Toast.error('Invoice not found');
                return;
            }

            console.log('📋 Invoice found:', invoice);

            // Set current invoice ID
            this.currentInvoiceId = invoiceId;

            // Open modal to show QR
            this.openModal();

            // Wait for modal to be ready
            await new Promise(resolve => setTimeout(resolve, 100));

            // Populate form with invoice data (read-only mode)
            const customerNameInput = document.getElementById('customer-name');
            if (customerNameInput) {
                customerNameInput.value = invoice.customerName || '';
                customerNameInput.disabled = true; // Read-only
            }

            // Hide save buttons, show QR only
            const saveDraftBtn = document.getElementById('btn-save-draft');
            const generateQRBtn = document.getElementById('btn-generate-qr');
            if (saveDraftBtn) saveDraftBtn.style.display = 'none';
            if (generateQRBtn) generateQRBtn.style.display = 'none';

            // Generate QR code with Invoice ID in memo
            await this.generateQRCode(invoice.amount, invoice.memo, invoice.merchantId, invoiceId);

            console.log('✅ QR code displayed for invoice:', invoiceId);
        } catch (error) {
            console.error('Error showing QR code:', error);
            alert('Error showing QR code: ' + error.message);
        }
    }


    /**
     * Refund a paid invoice
     * Subtracts amount from daily totals and marks invoice as refunded
     * SECURITY: Checks if invoice is from a closed shift (requires owner permission)
     */
    async refundInvoice(invoiceId) {
        try {
            // STATE MANAGEMENT FIX: Use helper method for consistency
            const currentDbManager = this._getDbManager();
            if (!currentDbManager) {
                throw new Error('Database manager not available. Please refresh the page.');
            }
            if (!currentDbManager.db || !currentDbManager.db.isOpen()) {
                await currentDbManager.initialize();
            }

            const invoice = await currentDbManager.db.invoices.where('invoiceId').equals(invoiceId).first();

            if (!invoice) {
                alert('Invoice not found');
                return;
            }

            if (invoice.status !== 'paid') {
                alert('Only paid invoices can be refunded');
                return;
            }

            // SECURITY CHECK: Check if invoice is from a closed shift (currentDbManager already declared above)
            const lastShiftClosure = await currentDbManager.db.settings.get('lastShiftClosure');
            if (lastShiftClosure) {
                const closureDate = new Date(lastShiftClosure.value);
                const invoiceDate = new Date(invoice.createdAt);

                if (invoiceDate < closureDate) {
                    // Invoice is from a closed shift - require owner permission
                    const isOwner = confirm(
                        `⚠️ SECURITY WARNING\n\n` +
                        `This invoice is from a CLOSED SHIFT (${closureDate.toLocaleDateString()}).\n\n` +
                        `Refunding it will affect historical records.\n\n` +
                        `Are you the OWNER with proper authorization?\n\n` +
                        `Click OK only if you have owner-level permissions.`
                    );

                    if (!isOwner) {
                        alert('Refund cancelled. Only owners can refund invoices from closed shifts.');
                        return;
                    }

                    // Double confirmation for closed shift refunds
                    const doubleConfirm = confirm(
                        `FINAL CONFIRMATION\n\n` +
                        `You are about to refund an invoice from a closed shift.\n\n` +
                        `This action cannot be easily undone.\n\n` +
                        `Proceed?`
                    );

                    if (!doubleConfirm) {
                        return;
                    }
                }
            }

            const reason = prompt('Enter refund reason (optional):') || 'No reason provided';

            if (!confirm(
                `Refund Invoice ${invoiceId}?\n\n` +
                `Amount: π${this.formatPiAmount(invoice.amount)}\n` +
                `Cash: $${(invoice.cashPaidFiat || 0).toFixed(2)}\n\n` +
                `This will:\n` +
                `1. Mark invoice as REFUNDED\n` +
                `2. Subtract amount from daily totals\n` +
                `3. Record refund in history`
            )) {
                return;
            }

            // Update invoice status to refunded (currentDbManager already declared above)
            if (!currentDbManager.db) {
                throw new Error('Database not initialized. Please refresh the page.');
            }
            await currentDbManager.db.invoices.where('invoiceId').equals(invoiceId).modify({
                status: 'refunded',
                updatedAt: new Date().toISOString(),
                refundReason: reason,
                refundedAt: new Date().toISOString()
            });

            // COLLISION FIX: Generate refund ID once and reuse
            const refundId = `REF-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
            
            // Record refund in refunds table (currentDbManager already declared above)
            await currentDbManager.db.refunds.add({
                refundId: refundId,
                invoiceId: invoiceId,
                amount: invoice.amount,
                reason: reason,
                createdAt: new Date().toISOString()
            });

            // Refresh dashboard to update stats (which will subtract refunded amounts)
            if (window.renderInvoices) {
                await window.renderInvoices();
            }
            if (window.renderStats) {
                await window.renderStats();
            }

            // Use the refundId generated above
            alert(`✅ Invoice refunded successfully!\n\nRefund ID: ${refundId}\nAmount: π${this.formatPiAmount(invoice.amount)}`);
            console.log('✅ Invoice refunded:', invoiceId);
        } catch (error) {
            console.error('Error refunding invoice:', error);
            alert('Error refunding invoice: ' + error.message);
        }
    }

    async voidInvoice(invoiceId) {
        try {
            if (!confirm('Are you sure you want to void this invoice? This will create a reversal entry.')) {
                return;
            }

            // STATE MANAGEMENT FIX: Use helper method for consistency
            const currentDbManager = this._getDbManager();
            if (!currentDbManager) {
                throw new Error('Database manager not available. Please refresh the page.');
            }
            if (!currentDbManager.db || !currentDbManager.db.isOpen()) {
                await currentDbManager.initialize();
            }

            // Get invoice
            const invoice = await currentDbManager.db.invoices.where('invoiceId').equals(invoiceId).first();

            if (!invoice) {
                alert('Invoice not found');
                return;
            }

            if (invoice.status !== 'paid') {
                alert('Only paid invoices can be voided');
                return;
            }

            // Update invoice status to 'voided' - currentDbManager already declared above
            await currentDbManager.db.invoices.where('invoiceId').equals(invoiceId).modify({
                status: 'voided',
                updatedAt: new Date().toISOString()
            });

            console.log('✅ Invoice voided:', invoiceId);

            // Refresh dashboard
            if (window.renderInvoices) {
                await window.renderInvoices();
            }
            if (window.renderStats) {
                await window.renderStats();
            }

            alert('Invoice voided successfully');
        } catch (error) {
            console.error('Error voiding invoice:', error);
            alert('Error voiding invoice: ' + error.message);
        }
    }

    /**
     * Req #40: Print Receipt (Universal Printing Support)
     * Supports both Bluetooth and System Printers
     */
    async printReceipt() {
        try {
            // Get current invoice data
            const invoiceId = this.currentInvoiceId || this.editingInvoiceId;

            if (!invoiceId) {
                // Try to get from form
                const invoiceIdInput = document.getElementById('invoice-id-display');
                if (!invoiceIdInput || !invoiceIdInput.textContent) {
                    alert('Please create or open an invoice first.');
                    return;
                }
            }

            // Ensure database is initialized
            // STATE MANAGEMENT FIX: Use helper method for consistency
            const currentDbManager = this._getDbManager();
            if (!currentDbManager) {
                throw new Error('Database manager not available. Please refresh the page.');
            }
            if (!currentDbManager.db || !currentDbManager.db.isOpen()) {
                await currentDbManager.initialize();
            }

            // Get invoice from database
            const invoice = await currentDbManager.db.invoices.where('invoiceId').equals(invoiceId).first();

            if (!invoice) {
                alert('Invoice not found. Please save the invoice first.');
                return;
            }

            // Get merchant info (for shop name) - currentDbManager already declared above
            const merchant = await currentDbManager.db.merchants.toCollection().first();
            const shopName = merchant?.name || 'Ledger ERP Store';

            // Prepare receipt data
            const receiptData = {
                shopName: shopName,
                invoiceId: invoice.invoiceId,
                date: invoice.createdAt || new Date().toISOString(),
                customerName: invoice.customerName || 'Walk-in',
                items: invoice.items || [],
                totalPi: invoice.amount || 0,
                cashPaid: invoice.cashPaidFiat || 0,
                qrCode: true // Indicate QR code should be shown
            };

            // Check if hardwareManager is available
            if (!window.hardwareManager) {
                alert('Hardware manager not available. Please refresh the page.');
                return;
            }

            // Print using hardware manager (handles both Bluetooth and System printers)
            await window.hardwareManager.printReceipt(receiptData);

            // Req #44: Human-Friendly Success Message
            this.showSuccessToast('تمت الطباعة بنجاح', 'تم إرسال الإيصال إلى الطابعة.');
        } catch (error) {
            console.error('Error printing receipt:', error);

            // Req #44: Human-Friendly Error Messages
            let errorTitle = 'فشلت الطباعة';
            let errorMessage = 'حدث خطأ أثناء الطباعة. ';

            if (error.message.includes('not connected') || error.message.includes('Bluetooth')) {
                errorMessage += 'تأكد من اتصال الطابعة وتفعيل البلوتوث.';
            } else if (error.message.includes('System')) {
                errorMessage += 'تأكد من تثبيت الطابعة في النظام واختيارها كطابعة افتراضية.';
            } else {
                errorMessage += error.message;
            }

            this.showErrorToast(errorTitle, errorMessage);
        }
    }

    /**
     * Req #44: Human-Friendly Success Toast
     */
    showSuccessToast(title, message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 100000;
            max-width: 400px;
            animation: slideInRight 0.3s ease-out;
        `;

        // SECURITY: Sanitize title and message to prevent XSS
        const safeTitle = typeof title === 'string' ? title.replace(/<[^>]*>/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : String(title);
        const safeMessage = typeof message === 'string' ? message.replace(/<[^>]*>/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : String(message);
        
        // Use textContent to safely set content
        const titleDiv = document.createElement('div');
        titleDiv.style.cssText = 'font-weight: bold; margin-bottom: 5px;';
        titleDiv.textContent = `✅ ${safeTitle}`;
        
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = 'font-size: 14px; opacity: 0.9;';
        messageDiv.textContent = safeMessage;
        
        toast.appendChild(titleDiv);
        toast.appendChild(messageDiv);

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-out';
            // MEMORY LEAK FIX: Use remove() with fallback for older browsers
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.parentElement.removeChild(toast);
                } else if (toast.remove && typeof toast.remove === 'function') {
                    toast.remove();
                }
            }, 300);
        }, 3000);
    }

    /**
     * Req #44: Human-Friendly Error Toast
     */
    showErrorToast(title, message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 100000;
            max-width: 400px;
            animation: slideInRight 0.3s ease-out;
        `;

        // SECURITY: Sanitize title and message to prevent XSS
        const safeTitle = typeof title === 'string' ? title.replace(/<[^>]*>/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : String(title);
        const safeMessage = typeof message === 'string' ? message.replace(/<[^>]*>/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : String(message);
        
        // Use textContent to safely set content
        const titleDiv = document.createElement('div');
        titleDiv.style.cssText = 'font-weight: bold; margin-bottom: 5px;';
        titleDiv.textContent = `❌ ${safeTitle}`;
        
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = 'font-size: 14px; opacity: 0.9;';
        messageDiv.textContent = safeMessage;
        
        toast.appendChild(titleDiv);
        toast.appendChild(messageDiv);

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-out';
            // MEMORY LEAK FIX: Use remove() with fallback for older browsers
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.parentElement.removeChild(toast);
                } else if (toast.remove && typeof toast.remove === 'function') {
                    toast.remove();
                }
            }, 300);
        }, 5000);
    }

    /**
     * Chat Integration - Copy Invoice Link for Pi Chat
     * Creates a friendly message with invoice link ready to paste in chat
     */
    async copyInvoiceLinkForChat() {
        try {
            // Get current invoice ID
            let invoiceId = this.currentInvoiceId || this.editingInvoiceId;

            if (!invoiceId) {
                // Try to get from form or auto-save first
                const invoiceIdDisplay = document.getElementById('invoice-id-display');
                if (invoiceIdDisplay && invoiceIdDisplay.textContent) {
                    invoiceId = invoiceIdDisplay.textContent.trim();
                } else {
                    // Auto-save invoice first
                    await this.saveDraft();
                    invoiceId = this.currentInvoiceId;
                }
            }

            if (!invoiceId) {
                this.showErrorToast('خطأ', 'يرجى حفظ الفاتورة أولاً قبل نسخ الرابط.');
                return;
            }

            // Ensure database is initialized
            // STATE MANAGEMENT FIX: Use helper method for consistency
            const currentDbManager = this._getDbManager();
            if (!currentDbManager) {
                throw new Error('Database manager not available. Please refresh the page.');
            }
            if (!currentDbManager.db || !currentDbManager.db.isOpen()) {
                await currentDbManager.initialize();
            }

            // Get invoice from database
            const invoice = await currentDbManager.db.invoices.where('invoiceId').equals(invoiceId).first();

            if (!invoice) {
                this.showErrorToast('خطأ', 'الفاتورة غير موجودة. يرجى حفظ الفاتورة أولاً.');
                return;
            }

            // Format amount
            const amountFormatted = formatPiAmount(invoice.amount);

            // Generate shareable link (use deep linking manager if available, otherwise create web link)
            let shareLink;
            if (window.deepLinkingManager) {
                const linkData = window.deepLinkingManager.generateInvoiceLink(invoiceId);
                shareLink = linkData.webLink; // Use web link for chat (more universal)
            } else {
                // Fallback: create web link manually
                shareLink = `${window.location.origin}?invoice_id=${encodeURIComponent(invoiceId)}`;
            }

            // Create friendly message for chat
            const customerName = invoice.customerName || 'Customer';
            const chatMessage = `Hello! Here is your invoice #${invoiceId} for ${amountFormatted} Pi.\n\nPay here: ${shareLink}`;

            // Copy to clipboard
            // ERROR HANDLING FIX: Proper error handling for clipboard operations
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(chatMessage);
                } else {
                    // Fallback for older browsers (deprecated but still needed for compatibility)
                    const textArea = document.createElement('textarea');
                    textArea.value = chatMessage;
                    textArea.style.position = 'fixed';
                    textArea.style.left = '-9999px'; // Better than opacity:0 for accessibility
                    textArea.style.opacity = '0';
                    document.body.appendChild(textArea);
                    textArea.select();
                    textArea.setSelectionRange(0, chatMessage.length); // For mobile devices
                    
                    // ERROR HANDLING FIX: Check if execCommand succeeded
                    const copySuccess = document.execCommand('copy');
                    document.body.removeChild(textArea);
                    
                    if (!copySuccess) {
                        throw new Error('Failed to copy using execCommand');
                    }
                }
            } catch (clipboardError) {
                console.error('Clipboard API error:', clipboardError);
                throw new Error('Failed to copy to clipboard. Please copy manually.');
            }

            // Show success toast
            this.showSuccessToast('تم النسخ!', 'تم نسخ رابط الفاتورة. الصقه في Pi Chat أو أي تطبيق دردشة.');

            console.log('✅ Invoice link copied for chat:', invoiceId);
        } catch (error) {
            console.error('Error copying invoice link for chat:', error);
            this.showErrorToast('خطأ', 'فشل نسخ رابط الفاتورة: ' + error.message);
        }
    }
}



// Export singleton instance
const invoiceManager = new InvoiceManager();

// EXPOSE TO GLOBAL SCOPE for HTML onclick handlers
window.invoiceManager = invoiceManager;

export default invoiceManager;

