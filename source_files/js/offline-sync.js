/**
 * Offline Sync Engine - Phase 4
 * Vision 2030
 */

class OfflineSyncManager {
    constructor() {
        this.syncQueue = JSON.parse(localStorage.getItem('pi_ledger_sync_queue') || '[]');
        this.isOnline = navigator.onLine;

        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }

    handleOnline() {
        this.isOnline = true;
        console.log('🌐 App is online. Starting background sync...');
        this.updateOnlineStatusUI(true);
        this.processQueue();
    }

    handleOffline() {
        this.isOnline = false;
        console.log('📡 App is offline. Transactions will be queued.');
        this.updateOnlineStatusUI(false);
    }

    /**
     * Queue a transaction for later sync
     */
    queueTransaction(action, data) {
        this.syncQueue.push({ action, data, timestamp: Date.now() });
        localStorage.setItem('pi_ledger_sync_queue', JSON.stringify(this.syncQueue));

        if (window.Toast) {
            Toast.info('تم حفظ العملية محلياً (وضع عدم الاتصال). Transaction saved locally (Offline mode).');
        }
    }

    /**
     * Process the offline queue
     */
    async processQueue() {
        if (this.syncQueue.length === 0) return;

        console.log(`🔄 Syncing ${this.syncQueue.length} queued items...`);

        const remainingQueue = [];
        for (const item of this.syncQueue) {
            try {
                // Here we would call the appropriate manager based on action
                // For now, assume these are invoice saves
                if (item.action === 'save_invoice') {
                    await window.dbManager.saveInvoice(item.data);
                }
                console.log('✅ Item synced successfully:', item.action);
            } catch (error) {
                console.error('❌ Failed to sync item:', item, error);
                remainingQueue.push(item);
            }
        }

        this.syncQueue = remainingQueue;
        localStorage.setItem('pi_ledger_sync_queue', JSON.stringify(this.syncQueue));

        if (this.syncQueue.length === 0 && window.Toast) {
            Toast.success('تمت مزامنة جميع العمليات بنجاح. All transactions synced successfully.');
        }
    }

    updateOnlineStatusUI(online) {
        const statusPill = document.getElementById('online-status-pill');
        if (statusPill) {
            statusPill.className = online ? 'status-pill online' : 'status-pill offline';
            statusPill.innerHTML = online
                ? '<i class="fas fa-check-circle"></i> متصل Online'
                : '<i class="fas fa-exclamation-triangle"></i> وضع عدم الاتصال Offline';
        }
    }
}

window.offlineSyncManager = new OfflineSyncManager();
