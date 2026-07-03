/**
 * Deep Linking Module - PiNet Integration
 * Req #38: Shareable Invoice Links
 */

class DeepLinkingManager {
    constructor(dbManager, invoiceManager) {
        this.dbManager = dbManager;
        this.invoiceManager = invoiceManager;
    }

    /**
     * Generate shareable deep link for invoice
     * Format: pi://app-cdn.minepi.com/mobile-app-ui/app/{AppID}?invoice_id={ID}
     */
    generateInvoiceLink(invoiceId) {
        // In production, use actual Pi App ID from manifest
        const appId = 'pi-ledger-erp'; // From manifest.json
        const baseUrl = `pi://app-cdn.minepi.com/mobile-app-ui/app/${appId}`;
        const webUrl = `${window.location.origin}?invoice_id=${encodeURIComponent(invoiceId)}`;

        return {
            piLink: `${baseUrl}?invoice_id=${encodeURIComponent(invoiceId)}`,
            webLink: webUrl,
            invoiceId: invoiceId
        };
    }

    /**
     * Copy invoice link to clipboard
     */
    async copyInvoiceLink(invoiceId) {
        try {
            const link = this.generateInvoiceLink(invoiceId);

            // Try to copy Pi link first, fallback to web link
            const linkToCopy = link.piLink || link.webLink;

            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(linkToCopy);
                return { success: true, link: linkToCopy };
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = linkToCopy;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return { success: true, link: linkToCopy };
            }
        } catch (error) {
            console.error('Error copying link:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Check URL for invoice_id parameter and open invoice
     */
    async handleDeepLink() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const invoiceId = urlParams.get('invoice_id');

            if (invoiceId) {
                console.log('🔗 Deep link detected, opening invoice:', invoiceId);

                // Remove invoice_id from URL to clean it
                const newUrl = window.location.pathname;
                window.history.replaceState({}, document.title, newUrl);

                // Wait for app to initialize
                await this.waitForAppReady();

                // Open invoice in payment mode
                await this.openInvoiceForPayment(invoiceId);
            }
        } catch (error) {
            console.error('Error handling deep link:', error);
        }
    }

    /**
     * Wait for app to be ready
     */
    async waitForAppReady(maxWait = 5000) {
        const startTime = Date.now();

        while (Date.now() - startTime < maxWait) {
            if (window.dbManager && window.invoiceManager) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        throw new Error('App initialization timeout');
    }

    /**
     * Open invoice in payment mode (read-only view with QR)
     */
    async openInvoiceForPayment(invoiceId) {
        try {
            if (!window.invoiceManager) {
                throw new Error('Invoice manager not initialized');
            }

            // Show invoice QR code
            await window.invoiceManager.showQRCode(invoiceId);

            // Show notification
            this.showDeepLinkNotification(invoiceId);
        } catch (error) {
            console.error('Error opening invoice:', error);
            alert('Invoice not found or could not be opened.');
        }
    }

    /**
     * Show notification for deep link
     */
    showDeepLinkNotification(invoiceId) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #4CAF50;
            color: white;
            padding: 15px 25px;
            border-radius: 5px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 100000;
            animation: slideDown 0.3s ease-out;
        `;

        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 20px;">🔗</span>
                <div>
                    <div style="font-weight: bold;">Invoice Opened</div>
                    <div style="font-size: 12px; opacity: 0.9;">Invoice ID: ${invoiceId}</div>
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s ease-out';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    /**
     * Initialize deep linking (call on app load)
     */
    initialize() {
        // Handle deep link on page load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.handleDeepLink();
            });
        } else {
            this.handleDeepLink();
        }
    }
}

// Export for use in other modules
export { DeepLinkingManager };
if (typeof window !== 'undefined') {
    window.DeepLinkingManager = DeepLinkingManager;
}


