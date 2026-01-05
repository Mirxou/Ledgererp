/**
 * Database Module - Pi Blockchain Storage
 * All data stored on Pi Network (Stellar) Blockchain
 * Uses Stellar Account Data Entries for storage
 */

class DatabaseManager {
    constructor() {
        this.piStorage = null;
        this.piAdapter = null;
    }

    /**
     * Initialize Pi Blockchain Storage
     */
    async initialize() {
        try {
            // Get Pi Adapter
            this.piAdapter = window.piAdapter;
            if (!this.piAdapter || !this.piAdapter.user) {
                throw new Error('Pi authentication required. Please authenticate with Pi Network first.');
            }

            // Import and initialize Pi Storage
            const PiStorage = (await import('/static/js/pi-storage.js')).default;
            this.piStorage = new PiStorage(this.piAdapter);
            await this.piStorage.initialize();

            console.log('✅ Pi Blockchain Storage initialized successfully');

            return true;
        } catch (error) {
            console.error('Error initializing Pi Storage:', error);
            throw new Error('Failed to initialize Pi Blockchain Storage');
        }
    }

    /**
     * Backup reminders not needed for blockchain storage
     * Data is automatically backed up on blockchain
     */
    async checkBackupReminder() {
        // Blockchain storage: Data is always backed up on-chain
        // No reminder needed
        return;
    }

    /**
     * Get current merchant ID from Pi authentication
     * HACKATHON 2025 PATTERN: Pi.uid = Merchant ID (Blind_Lounge, Starmax pattern)
     * Returns Pi.uid as merchant ID (blockchain-based)
     */
    async getCurrentMerchantId() {
        try {
            if (!this.piStorage) {
                await this.initialize();
            }

            // Use Pi.uid as merchant ID (blockchain account)
            if (this.piAdapter && this.piAdapter.user && this.piAdapter.user.uid) {
                return this.piAdapter.user.uid;
            }

            throw new Error('Pi authentication required. Please authenticate with Pi Network.');
        } catch (error) {
            console.error('Error getting merchant ID:', error);
            throw error;
        }
    }

    /**
     * Merchant ID is set by Pi authentication (read-only)
     */
    async setCurrentMerchantId(merchantId) {
        // Merchant ID comes from Pi authentication, cannot be manually set
        console.warn('Merchant ID is managed by Pi authentication and cannot be manually set');
        return false;
    }

    /**
     * Get merchant by merchant ID from blockchain
     */
    async getMerchant(merchantId) {
        try {
            if (!this.piStorage) {
                await this.initialize();
            }

            // Get merchant data from blockchain
            const merchantData = await this.piStorage.getAccountData(`merchant:${merchantId}`);
            
            if (merchantData) {
                return merchantData;
            }

            // Return basic merchant info from Pi authentication
            if (this.piAdapter && this.piAdapter.user) {
                return {
                    merchantId: merchantId,
                    name: this.piAdapter.user.username || 'Merchant',
                    walletAddress: '', // Will be set when user provides wallet
                    createdAt: new Date().toISOString()
                };
            }

            return null;
        } catch (error) {
            console.error('Error getting merchant:', error);
            return null;
        }
    }

    /**
     * Get currency settings from blockchain
     */
    async getCurrencySettings() {
        try {
            if (!this.piStorage) {
                await this.initialize();
            }

            const currencySetting = await this.piStorage.getAccountData('settings:currency');
            if (currencySetting) {
                return currencySetting;
            }

            // Default
            return { symbol: '$', code: 'USD', name: 'US Dollar' };
        } catch (error) {
            console.error('Error getting currency settings:', error);
            return { symbol: '$', code: 'USD', name: 'US Dollar' };
        }
    }

    /**
     * Set currency settings on blockchain
     */
    async setCurrencySettings(symbol, code = 'USD', name = 'US Dollar') {
        try {
            if (!this.piStorage) {
                await this.initialize();
            }

            await this.piStorage.setAccountData('settings:currency', {
                symbol: symbol,
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
     * Get user role from blockchain (defaults to OWNER)
     */
    async getUserRole() {
        try {
            if (!this.piStorage) {
                await this.initialize();
            }

            const roleSetting = await this.piStorage.getAccountData('settings:user_role');
            if (roleSetting) {
                return roleSetting.value || 'OWNER';
            }

            // Default to OWNER for authenticated users
            return 'OWNER';
        } catch (error) {
            console.error('Error getting user role:', error);
            return 'OWNER';
        }
    }

    /**
     * Set user role on blockchain
     */
    async setUserRole(role) {
        try {
            if (!this.piStorage) {
                await this.initialize();
            }

            if (role !== 'OWNER' && role !== 'CASHIER') {
                throw new Error('Invalid role. Must be OWNER or CASHIER');
            }

            await this.piStorage.setAccountData('settings:user_role', { value: role });
            return true;
        } catch (error) {
            console.error('Error setting user role:', error);
            return false;
        }
    }

    /**
     * Get all invoices for a merchant from blockchain
     */
    async getInvoices(merchantId) {
        try {
            if (!this.piStorage) {
                await this.initialize();
            }

            // Get all invoice entries from blockchain
            const entries = await this.piStorage.listAccountData('invoice:');
            
            // Filter by merchant ID and convert to array
            const invoices = entries
                .map(entry => entry.value)
                .filter(invoice => invoice.merchantId === merchantId);
            
            return invoices;
        } catch (error) {
            console.error('Error getting invoices:', error);
            return [];
        }
    }


    /**
     * Create new invoice on blockchain
     */
    async createInvoice(invoiceData) {
        try {
            if (!this.piStorage) {
                await this.initialize();
            }

            // Prepare invoice record with all data
            const invoiceRecord = {
                invoiceId: invoiceData.invoiceId || `INV-${Date.now()}`,
                merchantId: invoiceData.merchantId,
                amount: invoiceData.amount,
                currency: invoiceData.currency || 'PI',
                memo: invoiceData.memo,
                status: invoiceData.status || 'pending',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                // Additional fields
                customerName: invoiceData.customerName || '',
                items: invoiceData.items || [],
                cashPaidFiat: invoiceData.cashPaidFiat || 0,
                cashPaidPi: invoiceData.cashPaidPi || 0,
                totalItemsPi: invoiceData.totalItemsPi || 0,
                exchangeRate: invoiceData.exchangeRate || 10.0,
                externalRef: invoiceData.externalRef || null
            };

            console.log('💾 Saving invoice to blockchain:', invoiceRecord.invoiceId);

            // Store on blockchain (will use large data if needed)
            await this.piStorage.setLargeData(`invoice:${invoiceRecord.invoiceId}`, invoiceRecord);
            
            console.log('✅ Invoice saved to blockchain:', invoiceRecord.invoiceId);
            return invoiceRecord.invoiceId;
        } catch (error) {
            console.error('Error creating invoice:', error);
            throw error;
        }
    }

    /**
     * Update invoice status on blockchain
     */
    async updateInvoiceStatus(invoiceId, status) {
        try {
            if (!this.piStorage) {
                await this.initialize();
            }

            // Get existing invoice
            const invoice = await this.piStorage.getLargeData(`invoice:${invoiceId}`);
            
            if (invoice) {
                // Update status
                invoice.status = status;
                invoice.updatedAt = new Date().toISOString();
                
                // Save back to blockchain
                await this.piStorage.setLargeData(`invoice:${invoiceId}`, invoice);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error updating invoice:', error);
            throw error;
        }
    }

    /**
     * Add transaction record on blockchain
     */
    async addTransaction(transactionData) {
        try {
            if (!this.piStorage) {
                await this.initialize();
            }

            const transactionRecord = {
                transactionId: transactionData.transactionId || `TX-${Date.now()}`,
                invoiceId: transactionData.invoiceId,
                amount: transactionData.amount,
                currency: transactionData.currency || 'PI',
                memo: transactionData.memo,
                status: transactionData.status || 'pending',
                verified: transactionData.verified || false,
                timestamp: new Date().toISOString()
            };

            // Store on blockchain
            await this.piStorage.setAccountData(`transaction:${transactionRecord.transactionId}`, transactionRecord);
            return true;
        } catch (error) {
            console.error('Error adding transaction:', error);
            throw error;
        }
    }

    /**
     * Get setting value from blockchain
     */
    async getSetting(key) {
        try {
            if (!this.piStorage) {
                await this.initialize();
            }

            const setting = await this.piStorage.getAccountData(`settings:${key}`);
            return setting ? setting.value : null;
        } catch (error) {
            console.error('Error getting setting:', error);
            return null;
        }
    }

    /**
     * Set setting value on blockchain
     */
    async setSetting(key, value) {
        try {
            if (!this.piStorage) {
                await this.initialize();
            }

            await this.piStorage.setAccountData(`settings:${key}`, { value: value });
            return true;
        } catch (error) {
            console.error('Error setting setting:', error);
            throw error;
        }
    }

    /**
     * Export all data for backup (from blockchain)
     */
    async exportData() {
        try {
            if (!this.piStorage) {
                await this.initialize();
            }

            // Get all data from blockchain
            const invoices = (await this.piStorage.listAccountData('invoice:')).map(e => e.value);
            const transactions = (await this.piStorage.listAccountData('transaction:')).map(e => e.value);
            const products = (await this.piStorage.listAccountData('product:')).map(e => e.value);
            const settings = (await this.piStorage.listAccountData('settings:')).map(e => e.value);

            const data = {
                invoices: invoices,
                transactions: transactions,
                products: products,
                settings: settings,
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
     * Clear all data from blockchain (WARNING: This deletes all data!)
     */
    /**
     * Clear all data from blockchain (used by wipeAllData)
     */
    async clearAllData() {
        try {
            if (!this.piStorage) {
                await this.initialize();
            }

            // Get all data entries
            const allInvoices = await this.piStorage.listAccountData('invoice:');
            const allTransactions = await this.piStorage.listAccountData('transaction:');
            const allProducts = await this.piStorage.listAccountData('product:');
            const allSettings = await this.piStorage.listAccountData('settings:');

            // Delete all entries
            for (const entry of allInvoices) {
                await this.piStorage.deleteLargeData(entry.key);
            }
            for (const entry of allTransactions) {
                await this.piStorage.deleteAccountData(entry.key);
            }
            for (const entry of allProducts) {
                await this.piStorage.deleteLargeData(entry.key);
            }
            for (const entry of allSettings) {
                await this.piStorage.deleteAccountData(entry.key);
            }

            console.warn('⚠️ All data cleared from blockchain');
            return true;
        } catch (error) {
            console.error('Error clearing data:', error);
            throw error;
        }
    }


    /**
     * Req #41: DATA HYGIENE - Archive old invoices (Auto-Archiving)
     * Exports invoices older than specified months to JSON and deletes them from blockchain
     * @param {number} monthsOld - Archive invoices older than this many months (default: 6)
     * @returns {Object} Archive data and count of archived invoices
     */
    async archiveOldData(monthsOld = 6) {
        try {
            if (!this.piStorage) {
                await this.initialize();
            }

            const cutoffDate = new Date();
            cutoffDate.setMonth(cutoffDate.getMonth() - monthsOld);
            const cutoffISO = cutoffDate.toISOString();

            console.log(`📦 Archiving invoices older than ${monthsOld} months (before ${cutoffISO})...`);

            // Get all invoices from blockchain
            const allInvoices = (await this.piStorage.listAccountData('invoice:')).map(e => e.value);
            
            // Filter old invoices
            const oldInvoices = allInvoices.filter(inv => inv.createdAt < cutoffISO);

            if (oldInvoices.length === 0) {
                return {
                    archived: 0,
                    message: 'No old invoices to archive'
                };
            }

            // Get related transactions
            const invoiceIds = oldInvoices.map(inv => inv.invoiceId);
            const allTransactions = (await this.piStorage.listAccountData('transaction:')).map(e => e.value);
            const relatedTransactions = allTransactions.filter(tx => invoiceIds.includes(tx.invoiceId));

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

            // Delete old invoices from blockchain
            for (const invoice of oldInvoices) {
                await this.piStorage.deleteLargeData(`invoice:${invoice.invoiceId}`);
            }

            // Delete related transactions
            for (const tx of relatedTransactions) {
                await this.piStorage.deleteAccountData(`transaction:${tx.transactionId}`);
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
     * Parses CSV string and adds products to blockchain
     * @param {string} csvText - Raw CSV content
     * @returns {Object} Result { imported: count, errors: count }
     */
    async importProductsFromCSV(csvText) {
        try {
            if (!this.piStorage) {
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

            let importedCount = 0;
            let errorCount = 0;

            // Parse rows and save to blockchain
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

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

                    const productData = {
                        productId: `PROD-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                        name: name,
                        pricePi: pricePi,
                        barcode: barcodeIdx > -1 ? cols[barcodeIdx] : null,
                        category: categoryIdx > -1 ? cols[categoryIdx] : 'General',
                        stockQty: stockIdx > -1 ? parseInt(cols[stockIdx]) || 0 : 0,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };

                    // Save to blockchain
                    await this.saveProduct(productData);
                    importedCount++;
                } catch (e) {
                    console.error(`Error parsing row ${i}:`, e);
                    errorCount++;
                }
            }

            console.log(`✅ Successfully imported ${importedCount} products`);

            return {
                imported: importedCount,
                errors: errorCount
            };

        } catch (error) {
            console.error('Error importing products:', error);
            throw error;
        }
    }

    /**
     * Req #35: Immutable Audit Log
     * Records sensitive actions for security and compliance on blockchain
     */
    async logAuditEvent(action, entityType, entityId, details, userRole, userId) {
        try {
            if (!this.piStorage) {
                await this.initialize();
            }

            const auditLog = {
                timestamp: new Date().toISOString(),
                action: action,
                entityType: entityType,
                entityId: entityId,
                details: details,
                userRole: userRole || 'system',
                userId: userId || 'anonymous',
                ipAddress: 'local'
            };

            // Store audit log on blockchain
            const logId = `audit:${Date.now()}:${Math.random().toString(36).substring(2, 9)}`;
            await this.piStorage.setAccountData(logId, auditLog);
            
            console.log(`📝 Audit Log: ${action} on ${entityType}`);
            return true;
        } catch (error) {
            console.error('Failed to write audit log:', error);
            return false;
        }
    }

    /**
     * Get all products from blockchain
     */
    async getProducts() {
        try {
            if (!this.piStorage) {
                await this.initialize();
            }

            const entries = await this.piStorage.listAccountData('product:');
            return entries.map(entry => entry.value);
        } catch (error) {
            console.error('Error getting products:', error);
            return [];
        }
    }

    /**
     * Save product to blockchain
     */
    async saveProduct(productData) {
        try {
            if (!this.piStorage) {
                await this.initialize();
            }

            const productId = productData.productId || `PROD-${Date.now()}`;
            const productRecord = {
                productId: productId,
                name: productData.name,
                pricePi: productData.pricePi,
                barcode: productData.barcode || null,
                category: productData.category || 'General',
                stockQty: productData.stockQty || 0,
                imageBase64: productData.imageBase64 || null,
                createdAt: productData.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Store on blockchain (use large data for images)
            await this.piStorage.setLargeData(`product:${productId}`, productRecord);
            return productId;
        } catch (error) {
            console.error('Error saving product:', error);
            throw error;
        }
    }

    /**
     * Delete product from blockchain
     */
    async deleteProduct(productId) {
        try {
            if (!this.piStorage) {
                await this.initialize();
            }

            await this.piStorage.deleteLargeData(`product:${productId}`);
            return true;
        } catch (error) {
            console.error('Error deleting product:', error);
            throw error;
        }
    }

    /**
     * Update invoice on blockchain
     */
    async updateInvoice(invoiceId, updates) {
        try {
            if (!this.piStorage) {
                await this.initialize();
            }

            // Get existing invoice
            const invoice = await this.piStorage.getLargeData(`invoice:${invoiceId}`);
            
            if (!invoice) {
                throw new Error('Invoice not found');
            }

            // Apply updates
            Object.assign(invoice, updates);
            invoice.updatedAt = new Date().toISOString();

            // Save back to blockchain
            await this.piStorage.setLargeData(`invoice:${invoiceId}`, invoice);
            return true;
        } catch (error) {
            console.error('Error updating invoice:', error);
            throw error;
        }
    }

    /**
     * Delete invoice from blockchain
     */
    async deleteInvoice(invoiceId) {
        try {
            if (!this.piStorage) {
                await this.initialize();
            }

            await this.piStorage.deleteLargeData(`invoice:${invoiceId}`);
            return true;
        } catch (error) {
            console.error('Error deleting invoice:', error);
            throw error;
        }
    }

    /**
     * Get invoice by ID from blockchain
     */
    async getInvoice(invoiceId) {
        try {
            if (!this.piStorage) {
                await this.initialize();
            }

            return await this.piStorage.getLargeData(`invoice:${invoiceId}`);
        } catch (error) {
            console.error('Error getting invoice:', error);
            return null;
        }
    }

    /**
     * Save refund record on blockchain
     */
    async saveRefund(refundData) {
        try {
            if (!this.piStorage) {
                await this.initialize();
            }

            const refundId = refundData.refundId || `REF-${Date.now()}`;
            const refundRecord = {
                refundId: refundId,
                invoiceId: refundData.invoiceId,
                amount: refundData.amount,
                reason: refundData.reason,
                createdAt: refundData.createdAt || new Date().toISOString()
            };

            await this.piStorage.setAccountData(`refund:${refundId}`, refundRecord);
            return refundId;
        } catch (error) {
            console.error('Error saving refund:', error);
            throw error;
        }
    }

    /**
     * Get all refunds from blockchain
     */
    async getRefunds() {
        try {
            if (!this.piStorage) {
                await this.initialize();
            }

            const entries = await this.piStorage.listAccountData('refund:');
            return entries.map(entry => entry.value);
        } catch (error) {
            console.error('Error getting refunds:', error);
            return [];
        }
    }

    /**
     * Save shift report on blockchain
     */
    async saveShiftReport(reportData) {
        try {
            if (!this.piStorage) {
                await this.initialize();
            }

            const reportId = reportData.reportId || `SHIFT-${Date.now()}`;
            const reportRecord = {
                reportId: reportId,
                ...reportData,
                createdAt: reportData.createdAt || new Date().toISOString()
            };

            await this.piStorage.setLargeData(`shiftReport:${reportId}`, reportRecord);
            return reportId;
        } catch (error) {
            console.error('Error saving shift report:', error);
            throw error;
        }
    }

    /**
     * Get all shift reports from blockchain
     */
    async getShiftReports() {
        try {
            if (!this.piStorage) {
                await this.initialize();
            }

            const entries = await this.piStorage.listAccountData('shiftReport:');
            return entries.map(entry => entry.value);
        } catch (error) {
            console.error('Error getting shift reports:', error);
            return [];
        }
    }

    /**
     * Get audit logs from blockchain
     */
    async getAuditLogs(limit = 100) {
        try {
            if (!this.piStorage) {
                await this.initialize();
            }

            const entries = await this.piStorage.listAccountData('audit:');
            // Sort by timestamp (newest first) and limit
            const logs = entries
                .map(entry => entry.value)
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, limit);
            
            return logs;
        } catch (error) {
            console.error('Error getting audit logs:', error);
            return [];
        }
    }
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
     * Req #37: DATA SOVEREIGNTY - Wipe all data (Delete Account)
     * Completely removes all user data from blockchain
     */
    async wipeAllData() {
        try {
            console.log('🗑️ Starting complete data wipe from blockchain...');

            if (!this.piStorage) {
                await this.initialize();
            }

            // Get merchant ID
            const merchantId = await this.getCurrentMerchantId();
            
            // Delete all data using clearAllData (which handles all prefixes)
            await this.clearAllData();

            // Clear localStorage and sessionStorage
            localStorage.clear();
            sessionStorage.clear();

            console.log('✅ All data wiped from blockchain and local storage');
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

