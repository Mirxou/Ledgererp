/**
 * Database Module - Hybrid Storage Engine (Vision 2030)
 * Logic:
 * 1. Primary: IndexedDB (Dexie.js) - Offline-first, Zero-latency.
 * 2. Secondary: Pi Blockchain Storage (Stellar) - Cloud Vault, Sync, Multi-device.
 */
import Dexie from 'https://esm.sh/dexie';

class DatabaseManager {
    constructor() {
        this.db = null; // Dexie Instance
        this.piStorage = null; // PiStorage Instance
        this.piAdapter = null;
        this.syncInterval = null;
        this.isSyncing = false;
    }

    /**
     * Initialize the Hybrid Database
     */
    async initialize() {
        try {
            // 1. Initialize Dexie (Local IndexedDB)
            this.db = new Dexie('PiLedgerHybrid');

            // Define Schema
            this.db.version(1).stores({
                invoices: 'invoiceId, merchantId, status, createdAt',
                products: 'productId, name, barcode, category',
                transactions: 'transactionId, invoiceId, status, timestamp',
                settings: 'key',
                syncQueue: '++id, action, entityType, entityId'
            });

            await this.db.open();
            console.log('✅ Local IndexedDB (Dexie) Ready');

            // 2. Setup Pi Adapter (for future sync)
            this.piAdapter = window.piAdapter;

            // 3. Start Periodic Sync Attempt (Silent)
            this.startSyncLoop();

            return true;
        } catch (error) {
            console.error('Hybrid DB Init Error:', error);
            throw error;
        }
    }

    /**
     * Sync Loop - Periodically tries to push local changes to Blockchain
     */
    startSyncLoop() {
        if (this.syncInterval) clearInterval(this.syncInterval);

        this.syncInterval = setInterval(async () => {
            if (this.isSyncing) return;

            // Only sync if user is authenticated
            if (this.piAdapter && this.piAdapter.currentUser) {
                await this.syncWithBlockchain();
            }
        }, 30000); // Try sync every 30s
    }

    async syncWithBlockchain() {
        if (this.isSyncing) return;
        this.isSyncing = true;

        try {
            const syncText = document.querySelector('#sync-status .sync-text');
            const syncIcon = document.querySelector('#sync-status .sync-icon');

            // 1. Initialize PiStorage if needed
            if (!this.piStorage) {
                const PiStorage = (await import('./pi-storage.js')).default;
                this.piStorage = new PiStorage(this.piAdapter);
                await this.piStorage.init().catch(() => null); // pi-adapter uses init()
            }

            if (!this.piStorage || !this.piStorage.accountId) {
                this.isSyncing = false;
                return;
            }

            if (syncIcon) syncIcon.textContent = '⏳';
            if (syncText) syncText.textContent = 'Syncing...';

            // 2. Fetch Sync Queue
            const pendingTasks = await this.db.syncQueue.toArray();

            for (const task of pendingTasks) {
                try {
                    console.log(`🔄 Syncing ${task.entityType}:${task.entityId}...`);

                    if (task.action === 'CREATE' || task.action === 'UPDATE') {
                        const data = await this.db[task.entityType + 's'].get(task.entityId);
                        if (data) {
                            await this.piStorage.setLargeData(`${task.entityType}:${task.entityId}`, data);
                        }
                    } else if (task.action === 'DELETE') {
                        await this.piStorage.deleteLargeData(`${task.entityType}:${task.entityId}`);
                    }

                    // Remove from queue on success
                    await this.db.syncQueue.delete(task.id);
                } catch (taskErr) {
                    console.warn(`Sync task failed for ${task.entityId}:`, taskErr);
                }
            }

            if (syncIcon) syncIcon.textContent = '✅';
            if (syncText) syncText.textContent = 'Cloud Synced';

        } catch (err) {
            console.warn('Blockchain sync failed:', err);
            const syncText = document.querySelector('#sync-status .sync-text');
            const syncIcon = document.querySelector('#sync-status .sync-icon');
            if (syncText) syncText.textContent = 'Offline (Local)';
            if (syncIcon) syncIcon.textContent = '📶';
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * CRUD: Invoices
     */
    async createInvoice(invoiceData) {
        const invoiceRecord = {
            invoiceId: invoiceData.invoiceId || `INV-${Date.now()}`,
            merchantId: invoiceData.merchantId || (this.piAdapter?.currentUser?.uid),
            amount: invoiceData.amount,
            currency: invoiceData.currency || 'PI',
            memo: invoiceData.memo,
            status: invoiceData.status || 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            customerName: invoiceData.customerName || '',
            items: invoiceData.items || [],
            cashPaidFiat: invoiceData.cashPaidFiat || 0,
            cashPaidPi: invoiceData.cashPaidPi || 0,
            totalItemsPi: invoiceData.totalItemsPi || 0,
            exchangeRate: invoiceData.exchangeRate || 0
        };

        // 1. Save Locally (Zero Latency)
        await this.db.invoices.put(invoiceRecord);

        // 2. Queue for Blockchain Sync
        await this.db.syncQueue.add({
            action: 'CREATE',
            entityType: 'invoice',
            entityId: invoiceRecord.invoiceId,
            timestamp: Date.now()
        });

        // Trigger background sync
        this.syncWithBlockchain();

        return invoiceRecord.invoiceId;
    }

    async getInvoices(merchantId) {
        // Always try to load from local DB first for speed
        const localInvoices = await this.db.invoices
            .where('merchantId')
            .equals(merchantId)
            .reverse()
            .sortBy('createdAt');

        return localInvoices;
    }

    async getInvoice(invoiceId) {
        return await this.db.invoices.get(invoiceId);
    }

    /**
     * CRUD: Products
     */
    async saveProduct(productData) {
        const productId = productData.productId || `PROD-${Date.now()}`;
        const productRecord = {
            ...productData,
            productId,
            updatedAt: new Date().toISOString()
        };

        await this.db.products.put(productRecord);
        await this.db.syncQueue.add({
            action: 'UPDATE',
            entityType: 'product',
            entityId: productId
        });

        this.syncWithBlockchain();
        return productId;
    }

    async getProducts() {
        return await this.db.products.toArray();
    }

    /**
     * Settings
     */
    async getSetting(key) {
        const setting = await this.db.settings.get(key);
        return setting ? setting.value : null;
    }

    async setSetting(key, value) {
        await this.db.settings.put({ key, value });
        await this.db.syncQueue.add({
            action: 'UPDATE',
            entityType: 'setting',
            entityId: key
        });
        this.syncWithBlockchain();
        return true;
    }

    async getCurrentMerchantId() {
        if (this.piAdapter && this.piAdapter.currentUser) {
            return this.piAdapter.currentUser.uid;
        }
        return localStorage.getItem('user_uid') || 'anonymous';
    }

    async getMerchant(merchantId) {
        // Fallback or read from settings/local
        const merchant = await this.getSetting('merchant_profile');
        if (merchant) return merchant;

        return {
            merchantId: merchantId,
            name: this.piAdapter?.currentUser?.username || 'Merchant',
            walletAddress: localStorage.getItem('wallet_address') || ''
        };
    }
}

const dbManager = new DatabaseManager();
window.dbManager = dbManager;
export default dbManager;
