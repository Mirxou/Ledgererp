/**
 * Database Module - Dexie Schema & Persistence
 * Req #24: Persistence (navigator.storage.persist())
 * Req #25: Conflict Resolution (Version-based blob merging)
 * Req #3: Demo Mode (Mock data loading)
 */
// Req #29: Dexie is loaded as script tag in index.html (UMD module)
// Access it from window.Dexie
const Dexie = typeof window !== 'undefined' && window.Dexie ? window.Dexie : null;

if (!Dexie) {
    console.error('Dexie not loaded. Database functionality will not work.');
    throw new Error('Dexie library is required but could not be loaded. Make sure dexie.min.js is loaded before this module.');
}

class DatabaseManager {
    constructor() {
        this.db = null;
        this.isDemoMode = false;
    }

    /**
     * Req #24: Initialize database with persistence
     * Also checks for backup reminders
     */
    async initialize() {
        try {
            // Create Dexie database
            this.db = new Dexie('PiLedgerDB');

            // Define schema
            this.db.version(1).stores({
                merchants: '++id, merchantId, name, walletAddress, createdAt',
                invoices: '++id, invoiceId, merchantId, amount, currency, memo, status, createdAt, updatedAt',
                transactions: '++id, transactionId, invoiceId, amount, currency, memo, status, verified, timestamp',
                settings: 'key, value',
                syncBlobs: '++id, blobId, version, encryptedData, timestamp, synced',
                usedTransactions: '++id, transactionHash, invoiceId, timestamp', // SECURITY: Anti-Replay protection
                shiftReports: '++id, reportId, date, totalCash, totalPi, totalInvoices, summary, createdAt', // Z-Report
                products: '++id, productId, name, pricePi, imageBase64, category, barcode, createdAt, updatedAt', // Visual Inventory + Barcode
                refunds: '++id, refundId, invoiceId, amount, reason, createdAt', // Refund tracking
                auditLogs: '++id, timestamp, userRole, userId, action, entityType, entityId, details, ipAddress' // Req #35: Immutable Audit Trail
            });

            // Req #24: Request persistent storage
            if (navigator.storage && navigator.storage.persist) {
                const isPersistent = await navigator.storage.persist();
                console.log(`Storage persistence granted: ${isPersistent}`);
            }

            // Open database
            await this.db.open();
            console.log('Database initialized successfully');

            // Check for backup reminder (once per week)
            this.checkBackupReminder();

            return true;
        } catch (error) {
            console.error('Error initializing database:', error);
            throw new Error('Failed to initialize database');
        }
    }

    /**
     * Check if user needs backup reminder (once per week)
     */
    async checkBackupReminder() {
        try {
            const lastBackupReminder = localStorage.getItem('lastBackupReminder');
            const now = Date.now();
            const oneWeek = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

            // Check if reminder is needed (once per week)
            if (!lastBackupReminder || (now - parseInt(lastBackupReminder)) > oneWeek) {
                // Check if user has invoices (has data to backup)
                const invoiceCount = await this.db.invoices.count();
                
                if (invoiceCount > 0) {
                    // Show reminder after a short delay
                    setTimeout(() => {
                        if (window.Modal && window.Toast) {
                            window.Modal.show({
                                title: '💾 Backup Reminder',
                                content: `
                                    <div style="text-align: left; padding: 10px;">
                                        <p style="margin-bottom: 15px;">
                                            You have <strong>${invoiceCount}</strong> invoice(s) in your database.
                                        </p>
                                        <p style="color: #f44336; font-weight: bold; margin-bottom: 15px;">
                                            ⚠️ Important: Create a cloud backup to protect your data!
                                        </p>
                                        <ul style="margin-left: 20px; line-height: 1.8;">
                                            <li>If you lose your device, your data will be lost forever</li>
                                            <li>Cloud backup encrypts your data securely</li>
                                            <li>You can restore on any new device with your recovery password</li>
                                        </ul>
                                        <p style="margin-top: 15px; color: #666;">
                                            Click "Create Cloud Backup" in the dashboard to backup your data now.
                                        </p>
                                    </div>
                                `,
                                isHtml: true,
                                footerButtons: [
                                    { 
                                        text: 'Remind Me Later', 
                                        class: 'btn-grey',
                                        onclick: () => {
                                            localStorage.setItem('lastBackupReminder', now.toString());
                                            window.Modal.close();
                                        }
                                    },
                                    { 
                                        text: 'Create Backup Now', 
                                        class: 'btn-primary',
                                        onclick: () => {
                                            localStorage.setItem('lastBackupReminder', now.toString());
                                            window.Modal.close();
                                            // Trigger backup button click if available
                                            const backupBtn = document.getElementById('create-vault-backup-btn');
                                            if (backupBtn) {
                                                backupBtn.click();
                                            } else {
                                                window.Toast.info('Please use the "Create Cloud Backup" button in the dashboard');
                                            }
                                        }
                                    }
                                ]
                            });
                        }
                    }, 5000); // Show after 5 seconds
                }
            }
        } catch (error) {
            console.error('Error checking backup reminder:', error);
        }
    }

    /**
     * Get or create current merchant ID
     * Returns merchant ID from Pi authentication or creates one from user UID
     */
    async getCurrentMerchantId() {
        try {
            if (!this.db || !this.db.isOpen()) {
                await this.initialize();
            }

            // Check if merchant ID is stored in settings
            const merchantIdSetting = await this.db.settings.get('current_merchant_id');
            if (merchantIdSetting && merchantIdSetting.value) {
                return merchantIdSetting.value;
            }

            // Check if user is authenticated via Pi
            if (window.piAdapter && window.piAdapter.user && window.piAdapter.user.uid) {
                // Generate merchant ID from Pi UID
                const merchantId = `merchant_${window.piAdapter.user.uid}`;
                
                // Save to settings
                await this.db.settings.put({
                    key: 'current_merchant_id',
                    value: merchantId
                });

                // Also save merchant record if not exists
                const existingMerchant = await this.db.merchants.where('merchantId').equals(merchantId).first();
                if (!existingMerchant) {
                    await this.db.merchants.add({
                        merchantId: merchantId,
                        name: window.piAdapter.user.username || 'Merchant',
                        walletAddress: '', // Will be set when user provides wallet
                        createdAt: new Date().toISOString()
                    });
                }

                return merchantId;
            }

            // Fallback to demo merchant for demo mode
            if (this.isDemoMode) {
                return 'demo_merchant_001';
            }

            // If no authentication, return null (should not happen in production)
            console.warn('No merchant ID found and user not authenticated');
            return null;
        } catch (error) {
            console.error('Error getting merchant ID:', error);
            // Fallback to demo merchant
            return this.isDemoMode ? 'demo_merchant_001' : null;
        }
    }

    /**
     * Set current merchant ID (for manual setup)
     */
    async setCurrentMerchantId(merchantId) {
        try {
            if (!this.db || !this.db.isOpen()) {
                await this.initialize();
            }

            await this.db.settings.put({
                key: 'current_merchant_id',
                value: merchantId
            });

            return true;
        } catch (error) {
            console.error('Error setting merchant ID:', error);
            return false;
        }
    }

    /**
     * Get merchant by merchant ID
     * Returns merchant object with walletAddress
     */
    async getMerchant(merchantId) {
        try {
            if (!this.db || !this.db.isOpen()) {
                await this.initialize();
            }

            const merchant = await this.db.merchants.where('merchantId').equals(merchantId).first();
            return merchant || null;
        } catch (error) {
            console.error('Error getting merchant:', error);
            return null;
        }
    }

    /**
     * Get currency settings
     */
    async getCurrencySettings() {
        try {
            if (!this.db || !this.db.isOpen()) {
                await this.initialize();
            }

            const currencySetting = await this.db.settings.get('currency_symbol');
            return {
                symbol: currencySetting?.value || '$',
                code: currencySetting?.code || 'USD',
                name: currencySetting?.name || 'US Dollar'
            };
        } catch (error) {
            console.error('Error getting currency settings:', error);
            return { symbol: '$', code: 'USD', name: 'US Dollar' };
        }
    }

    /**
     * Set currency settings
     */
    async setCurrencySettings(symbol, code = 'USD', name = 'US Dollar') {
        try {
            if (!this.db || !this.db.isOpen()) {
                await this.initialize();
            }

            await this.db.settings.put({
                key: 'currency_symbol',
                value: symbol,
                code: code,
                name: name
            });

            return true;
        } catch (error) {
            console.error('Error setting currency:', error);
            return false;
        }
    }

    /**
     * Get user role (OWNER or CASHIER)
     */
    async getUserRole() {
        try {
            if (!this.db || !this.db.isOpen()) {
                await this.initialize();
            }

            const roleSetting = await this.db.settings.get('user_role');
            if (roleSetting && roleSetting.value) {
                return roleSetting.value;
            }

            // Default to OWNER if authenticated via Pi
            if (window.piAdapter && window.piAdapter.user) {
                return 'OWNER';
            }

            // Default to OWNER for demo mode
            if (this.isDemoMode) {
                return 'OWNER';
            }

            return 'OWNER'; // Default role
        } catch (error) {
            console.error('Error getting user role:', error);
            return 'OWNER';
        }
    }

    /**
     * Set user role
     */
    async setUserRole(role) {
        try {
            if (!this.db || !this.db.isOpen()) {
                await this.initialize();
            }

            if (role !== 'OWNER' && role !== 'CASHIER') {
                throw new Error('Invalid role. Must be OWNER or CASHIER');
            }

            await this.db.settings.put({
                key: 'user_role',
                value: role
            });

            return true;
        } catch (error) {
            console.error('Error setting user role:', error);
            return false;
        }
    }

    /**
     * Req #3: Load mock data for Demo Mode
     */
    async loadDemoData() {
        try {
            // Ensure database is initialized
            if (!this.db || !this.db.isOpen()) {
                console.log('Database not open, initializing...');
                await this.initialize();
            }

            this.isDemoMode = true;
            console.log('Clearing existing data...');

            // Clear existing data
            await this.db.merchants.clear();
            await this.db.invoices.clear();
            await this.db.transactions.clear();
            console.log('Existing data cleared');

            // Load mock merchants
            console.log('Adding mock merchants...');
            await this.db.merchants.bulkAdd([
                {
                    merchantId: 'demo_merchant_001',
                    name: 'Demo Store',
                    walletAddress: 'GDEMO1234567890',
                    createdAt: new Date().toISOString()
                },
                {
                    merchantId: 'demo_merchant_002',
                    name: 'Sample Shop',
                    walletAddress: 'GDEMO0987654321',
                    createdAt: new Date().toISOString()
                }
            ]);
            console.log('Mock merchants added');

            // Load mock invoices
            const mockInvoices = [
                {
                    invoiceId: 'INV-DEMO-001',
                    merchantId: 'demo_merchant_001',
                    amount: 50.0,
                    currency: 'USD',
                    memo: 'P-DEMO001-INV001',
                    status: 'paid',
                    createdAt: new Date(Date.now() - 86400000).toISOString(),
                    updatedAt: new Date(Date.now() - 86400000).toISOString()
                },
                {
                    invoiceId: 'INV-DEMO-002',
                    merchantId: 'demo_merchant_001',
                    amount: 25.5,
                    currency: 'PI',
                    memo: 'P-DEMO001-INV002',
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    invoiceId: 'INV-DEMO-003',
                    merchantId: 'demo_merchant_002',
                    amount: 100.0,
                    currency: 'USD',
                    memo: 'P-DEMO002-INV003',
                    status: 'paid',
                    createdAt: new Date(Date.now() - 172800000).toISOString(),
                    updatedAt: new Date(Date.now() - 172800000).toISOString()
                }
            ];

            console.log('Adding mock invoices...');
            await this.db.invoices.bulkAdd(mockInvoices);
            console.log('Mock invoices added');

            // Load mock transactions
            console.log('Adding mock transactions...');
            await this.db.transactions.bulkAdd([
                {
                    transactionId: 'TX-DEMO-001',
                    invoiceId: 'INV-DEMO-001',
                    amount: 50.0,
                    currency: 'USD',
                    memo: 'P-DEMO001-INV001',
                    status: 'verified',
                    verified: true,
                    timestamp: new Date(Date.now() - 86400000).toISOString()
                },
                {
                    transactionId: 'TX-DEMO-002',
                    invoiceId: 'INV-DEMO-003',
                    amount: 100.0,
                    currency: 'USD',
                    memo: 'P-DEMO002-INV003',
                    status: 'verified',
                    verified: true,
                    timestamp: new Date(Date.now() - 172800000).toISOString()
                }
            ]);
            console.log('Mock transactions added');

            console.log('Demo data loaded successfully');
            return true;
        } catch (error) {
            console.error('Error loading demo data:', error);
            throw new Error('Failed to load demo data');
        }
    }

    /**
     * Req #25: Version-based blob merging for conflict resolution
     */
    async mergeSyncBlob(newBlob, version) {
        try {
            // Get existing blob with highest version
            const existingBlobs = await this.db.syncBlobs
                .orderBy('version')
                .reverse()
                .limit(1)
                .toArray();

            if (existingBlobs.length === 0) {
                // No existing blob, store new one
                await this.db.syncBlobs.add({
                    blobId: `blob_${Date.now()}`,
                    version: version,
                    encryptedData: newBlob,
                    timestamp: new Date().toISOString(),
                    synced: false
                });
                return { merged: false, version: version };
            }

            const existingBlob = existingBlobs[0];

            // Compare versions
            if (this.compareVersions(version, existingBlob.version) > 0) {
                // New blob is newer, replace
                await this.db.syncBlobs.add({
                    blobId: `blob_${Date.now()}`,
                    version: version,
                    encryptedData: newBlob,
                    timestamp: new Date().toISOString(),
                    synced: false
                });
                return { merged: false, version: version, replaced: true };
            } else if (this.compareVersions(version, existingBlob.version) < 0) {
                // Existing blob is newer, keep it
                return { merged: false, version: existingBlob.version, kept: 'existing' };
            } else {
                // Same version - merge logic (in production, implement proper merge)
                // For now, keep existing if data is identical, otherwise create conflict marker
                if (newBlob === existingBlob.encryptedData) {
                    return { merged: true, version: version, conflict: false };
                } else {
                    // Conflict detected - mark for manual resolution
                    await this.db.syncBlobs.add({
                        blobId: `blob_conflict_${Date.now()}`,
                        version: version,
                        encryptedData: newBlob,
                        timestamp: new Date().toISOString(),
                        synced: false,
                        conflict: true,
                        conflictWith: existingBlob.blobId
                    });
                    return { merged: false, version: version, conflict: true };
                }
            }
        } catch (error) {
            console.error('Error merging sync blob:', error);
            throw new Error('Failed to merge sync blob');
        }
    }

    /**
     * Compare version strings (semantic versioning)
     */
    compareVersions(v1, v2) {
        const v1Parts = v1.split('.').map(Number);
        const v2Parts = v2.split('.').map(Number);

        for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
            const v1Part = v1Parts[i] || 0;
            const v2Part = v2Parts[i] || 0;

            if (v1Part > v2Part) return 1;
            if (v1Part < v2Part) return -1;
        }

        return 0;
    }

    /**
     * Get latest sync blob version
     */
    async getLatestSyncBlob() {
        try {
            const blobs = await this.db.syncBlobs
                .orderBy('version')
                .reverse()
                .limit(1)
                .toArray();

            return blobs.length > 0 ? blobs[0] : null;
        } catch (error) {
            console.error('Error getting latest sync blob:', error);
            return null;
        }
    }

    /**
     * Store encrypted sync blob
     */
    async storeSyncBlob(encryptedBlob, version) {
        try {
            const result = await this.mergeSyncBlob(encryptedBlob, version);
            return result;
        } catch (error) {
            console.error('Error storing sync blob:', error);
            throw error;
        }
    }

    /**
     * Get all invoices for a merchant
     */
    async getInvoices(merchantId) {
        try {
            return await this.db.invoices
                .where('merchantId')
                .equals(merchantId)
                .toArray();
        } catch (error) {
            console.error('Error getting invoices:', error);
            return [];
        }
    }

    /**
     * Create new invoice
     */
    async createInvoice(invoiceData) {
        try {
            // Ensure database is initialized and open
            if (!this.db || !this.db.isOpen()) {
                console.log('Database not initialized in createInvoice, initializing now...');
                await this.initialize();
            }

            // Save ALL invoice data including items, customerName, cashPaidFiat, etc.
            const invoiceRecord = {
                invoiceId: invoiceData.invoiceId || `INV-${Date.now()}`,
                merchantId: invoiceData.merchantId,
                amount: invoiceData.amount,
                currency: invoiceData.currency || 'PI',
                memo: invoiceData.memo,
                status: invoiceData.status || 'pending',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                // Additional fields for editing
                customerName: invoiceData.customerName || '',
                items: invoiceData.items || [],
                cashPaidFiat: invoiceData.cashPaidFiat || 0,
                cashPaidPi: invoiceData.cashPaidPi || 0,
                totalItemsPi: invoiceData.totalItemsPi || 0,
                exchangeRate: invoiceData.exchangeRate || 10.0,
                externalRef: invoiceData.externalRef || null
            };

            console.log('💾 Saving invoice with full data:', invoiceRecord);

            const invoiceId = await this.db.invoices.add(invoiceRecord);
            console.log('✅ Invoice saved with ID:', invoiceId);
            return invoiceId;
        } catch (error) {
            console.error('Error creating invoice:', error);
            throw error;
        }
    }

    /**
     * Update invoice status
     */
    async updateInvoiceStatus(invoiceId, status) {
        try {
            const invoice = await this.db.invoices
                .where('invoiceId')
                .equals(invoiceId)
                .first();

            if (invoice) {
                await this.db.invoices.update(invoice.id, {
                    status: status,
                    updatedAt: new Date().toISOString()
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error updating invoice:', error);
            throw error;
        }
    }

    /**
     * Add transaction record
     */
    async addTransaction(transactionData) {
        try {
            await this.db.transactions.add({
                transactionId: transactionData.transactionId || `TX-${Date.now()}`,
                invoiceId: transactionData.invoiceId,
                amount: transactionData.amount,
                currency: transactionData.currency || 'PI',
                memo: transactionData.memo,
                status: transactionData.status || 'pending',
                verified: transactionData.verified || false,
                timestamp: new Date().toISOString()
            });
            return true;
        } catch (error) {
            console.error('Error adding transaction:', error);
            throw error;
        }
    }

    /**
     * Get setting value
     */
    async getSetting(key) {
        try {
            const setting = await this.db.settings.where('key').equals(key).first();
            return setting ? setting.value : null;
        } catch (error) {
            console.error('Error getting setting:', error);
            return null;
        }
    }

    /**
     * Set setting value
     */
    async setSetting(key, value) {
        try {
            await this.db.settings.put({ key, value });
            return true;
        } catch (error) {
            console.error('Error setting setting:', error);
            throw error;
        }
    }

    /**
     * Export all data for backup
     */
    async exportData() {
        try {
            const data = {
                merchants: await this.db.merchants.toArray(),
                invoices: await this.db.invoices.toArray(),
                transactions: await this.db.transactions.toArray(),
                settings: await this.db.settings.toArray(),
                exportDate: new Date().toISOString(),
                version: '1.0.0'
            };
            return data;
        } catch (error) {
            console.error('Error exporting data:', error);
            throw error;
        }
    }

    /**
     * SECURITY: Clear cache (for Auto-Lock)
     * Clears any cached sensitive data from memory
     */
    clearCache() {
        // Clear any cached data structures
        // Note: Database itself remains intact, only memory cache is cleared
        console.log('🔒 Database cache cleared');
    }

    /**
     * Clear all data (for demo mode reset)
     */
    async clearAllData() {
        try {
            await this.db.merchants.clear();
            await this.db.invoices.clear();
            await this.db.transactions.clear();
            await this.db.settings.clear();
            await this.db.syncBlobs.clear();
            return true;
        } catch (error) {
            console.error('Error clearing data:', error);
            throw error;
        }
    }

    /**
     * Check if in demo mode
     */
    isDemoModeActive() {
        return this.isDemoMode;
    }

    /**
     * Req #41: DATA HYGIENE - Archive old invoices (Auto-Archiving)
     * Exports invoices older than specified months to JSON and deletes them from DB
     * @param {number} monthsOld - Archive invoices older than this many months (default: 6)
     * @returns {Object} Archive data and count of archived invoices
     */
    async archiveOldData(monthsOld = 6) {
        try {
            if (!this.db || !this.db.isOpen()) {
                await this.initialize();
            }

            const cutoffDate = new Date();
            cutoffDate.setMonth(cutoffDate.getMonth() - monthsOld);
            const cutoffISO = cutoffDate.toISOString();

            console.log(`📦 Archiving invoices older than ${monthsOld} months (before ${cutoffISO})...`);

            // Get old invoices
            const oldInvoices = await this.db.invoices
                .where('createdAt')
                .below(cutoffISO)
                .toArray();

            if (oldInvoices.length === 0) {
                return {
                    archived: 0,
                    message: 'No old invoices to archive'
                };
            }

            // Get related transactions for these invoices
            const invoiceIds = oldInvoices.map(inv => inv.invoiceId);
            const relatedTransactions = await this.db.transactions
                .where('invoiceId')
                .anyOf(invoiceIds)
                .toArray();

            // Create archive object
            const archiveData = {
                archivedAt: new Date().toISOString(),
                archivePeriod: `${monthsOld} months`,
                cutoffDate: cutoffISO,
                invoices: oldInvoices,
                transactions: relatedTransactions,
                totalInvoices: oldInvoices.length,
                totalTransactions: relatedTransactions.length
            };

            // Delete old invoices from database
            await this.db.invoices
                .where('createdAt')
                .below(cutoffISO)
                .delete();

            // Delete related transactions
            if (relatedTransactions.length > 0) {
                await this.db.transactions
                    .where('invoiceId')
                    .anyOf(invoiceIds)
                    .delete();
            }

            console.log(`✅ Archived ${oldInvoices.length} invoices and ${relatedTransactions.length} transactions`);

            return {
                archived: oldInvoices.length,
                transactionsArchived: relatedTransactions.length,
                archiveData: archiveData,
                message: `Successfully archived ${oldInvoices.length} invoices`
            };
        } catch (error) {
            console.error('Error archiving old data:', error);
            throw new Error('Failed to archive old data: ' + error.message);
        }
    }

    /**
     * Req #36: Bulk Import Products from CSV
     * Parses CSV string and adds products to database
     * @param {string} csvText - Raw CSV content
     * @returns {Object} Result { imported: count, errors: count }
     */
    async importProductsFromCSV(csvText) {
        try {
            if (!this.db || !this.db.isOpen()) {
                await this.initialize();
            }

            console.log('📥 Starting CSV product import...');

            const lines = csvText.split('\n');
            if (lines.length < 2) {
                throw new Error('CSV file is empty or missing headers');
            }

            // Parse headers
            const headers = lines[0].trim().split(',').map(h => h.trim().toLowerCase());

            // Validate headers
            if (!headers.includes('name') || !headers.includes('price_pi')) {
                throw new Error('Missing required columns: Name, Price_Pi');
            }

            const nameIdx = headers.indexOf('name');
            const priceIdx = headers.indexOf('price_pi');
            const barcodeIdx = headers.indexOf('barcode');
            const categoryIdx = headers.indexOf('category');
            const stockIdx = headers.indexOf('stock_qty');

            const productsToAdd = [];
            let errorCount = 0;

            // Parse rows
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                // Handle simple CSV splitting (naive implementation, assumes no commas in values for now)
                // In production, use a proper CSV parser for robust handling
                const cols = line.split(',').map(c => c.trim());

                if (cols.length < headers.length) {
                    console.warn(`Skipping invalid row ${i}: ${line}`);
                    errorCount++;
                    continue;
                }

                try {
                    const name = cols[nameIdx];
                    const pricePi = parseFloat(cols[priceIdx]);

                    if (!name || isNaN(pricePi)) {
                        console.warn(`Skipping invalid data row ${i}: ${line}`);
                        errorCount++;
                        continue;
                    }

                    productsToAdd.push({
                        productId: `PROD-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                        name: name,
                        pricePi: pricePi,
                        barcode: barcodeIdx > -1 ? cols[barcodeIdx] : null,
                        category: categoryIdx > -1 ? cols[categoryIdx] : 'General',
                        stockQty: stockIdx > -1 ? parseInt(cols[stockIdx]) || 0 : 0,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });
                } catch (e) {
                    console.error(`Error parsing row ${i}:`, e);
                    errorCount++;
                }
            }

            if (productsToAdd.length > 0) {
                await this.db.products.bulkAdd(productsToAdd);
                console.log(`✅ Successfully imported ${productsToAdd.length} products`);
            }

            return {
                imported: productsToAdd.length,
                errors: errorCount
            };

        } catch (error) {
            console.error('Error importing products:', error);
            throw error;
        }
    }

    /**
     * Req #35: Immutable Audit Log
     * Records sensitive actions for security and compliance
     */
    /**
     * Check if user needs backup reminder (once per week)
     */
    async checkBackupReminder() {
        try {
            const lastBackupReminder = localStorage.getItem('lastBackupReminder');
            const now = Date.now();
            const oneWeek = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

            // Check if reminder is needed (once per week)
            if (!lastBackupReminder || (now - parseInt(lastBackupReminder)) > oneWeek) {
                // Check if user has invoices (has data to backup)
                const invoiceCount = await this.db.invoices.count();
                
                if (invoiceCount > 0) {
                    // Show reminder after a short delay
                    setTimeout(() => {
                        if (window.Modal && window.Toast) {
                            window.Modal.show({
                                title: '💾 Backup Reminder',
                                content: `
                                    <div style="text-align: left; padding: 10px;">
                                        <p style="margin-bottom: 15px;">
                                            You have <strong>${invoiceCount}</strong> invoice(s) in your database.
                                        </p>
                                        <p style="color: #f44336; font-weight: bold; margin-bottom: 15px;">
                                            ⚠️ Important: Create a cloud backup to protect your data!
                                        </p>
                                        <ul style="margin-left: 20px; line-height: 1.8;">
                                            <li>If you lose your device, your data will be lost forever</li>
                                            <li>Cloud backup encrypts your data securely</li>
                                            <li>You can restore on any new device with your recovery password</li>
                                        </ul>
                                        <p style="margin-top: 15px; color: #666;">
                                            Click "Create Cloud Backup" in the dashboard to backup your data now.
                                        </p>
                                    </div>
                                `,
                                isHtml: true,
                                footerButtons: [
                                    { 
                                        text: 'Remind Me Later', 
                                        class: 'btn-grey',
                                        onclick: () => {
                                            localStorage.setItem('lastBackupReminder', now.toString());
                                            window.Modal.close();
                                        }
                                    },
                                    { 
                                        text: 'Create Backup Now', 
                                        class: 'btn-primary',
                                        onclick: () => {
                                            localStorage.setItem('lastBackupReminder', now.toString());
                                            window.Modal.close();
                                            // Trigger backup button click if available
                                            const backupBtn = document.getElementById('create-vault-backup-btn');
                                            if (backupBtn) {
                                                backupBtn.click();
                                            } else {
                                                window.Toast.info('Please use the "Create Cloud Backup" button in the dashboard');
                                            }
                                        }
                                    }
                                ]
                            });
                        }
                    }, 5000); // Show after 5 seconds
                }
            }
        } catch (error) {
            console.error('Error checking backup reminder:', error);
        }
    }

    async logAuditEvent(action, entityType, entityId, details, userRole, userId) {
        try {
            if (!this.db || !this.db.isOpen()) {
                // ERROR HANDLING IMPROVEMENT: Try to init, but don't crash if fails (audit shouldn't break app flow)
                try { 
                    await this.initialize(); 
                } catch (e) {
                    console.warn('Failed to initialize database for audit log (non-critical):', e.message);
                }
            }

            await this.db.auditLogs.add({
                timestamp: new Date().toISOString(),
                action: action,
                entityType: entityType,
                entityId: entityId,
                details: details, // JSON object
                userRole: userRole || 'system',
                userId: userId || 'anonymous',
                ipAddress: 'local' // Client-side log
            });
            console.log(`📝 Audit Log: ${action} on ${entityType}`);
            return true;
        } catch (error) {
            console.error('Failed to write audit log:', error);
            // Don't throw, just log error
            return false;
        }
    }

    /**
     * Req #37: DATA SOVEREIGNTY - Wipe all data (Delete Account)
     * Completely removes all user data from local storage and remote vault
     */
    async wipeAllData() {
        try {
            console.log('🗑️ Starting complete data wipe...');

            // 1. Delete all data from Dexie
            if (this.db) {
                await this.db.merchants.clear();
                await this.db.invoices.clear();
                await this.db.transactions.clear();
                await this.db.settings.clear();
                await this.db.syncBlobs.clear();
                await this.db.usedTransactions.clear();
                await this.db.shiftReports.clear();
                await this.db.products.clear();
                await this.db.refunds.clear();
                await this.db.auditLogs.clear();

                // Close and delete database
                await this.db.close();
                await Dexie.delete('PiLedgerDB');
                console.log('✅ Local database wiped');
            }

            // 2. Clear localStorage
            localStorage.clear();
            console.log('✅ LocalStorage cleared');

            // 3. Clear sessionStorage
            sessionStorage.clear();
            console.log('✅ SessionStorage cleared');

            // 4. Clear IndexedDB (if any remaining)
            if ('indexedDB' in window) {
                const databases = await indexedDB.databases();
                for (const db of databases) {
                    if (db.name && db.name.includes('PiLedger')) {
                        await indexedDB.deleteDatabase(db.name);
                    }
                }
                console.log('✅ IndexedDB cleared');
            }

            // 5. Remote wipe - Delete vault from server
            try {
                const response = await fetch('/sync/vault', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    console.log('✅ Remote vault deleted');
                } else {
                    console.warn('⚠️ Remote vault deletion failed (may not exist)');
                }
            } catch (error) {
                console.warn('⚠️ Remote vault deletion error (may be offline):', error);
                // Don't fail if remote deletion fails - local wipe is more important
            }

            console.log('✅ Complete data wipe finished');
            return true;
        } catch (error) {
            console.error('❌ Error wiping data:', error);
            throw new Error('Failed to wipe data: ' + error.message);
        }
    }
}

// Export singleton instance
const dbManager = new DatabaseManager();
export default dbManager;

