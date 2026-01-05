/**
 * Server-Sent Events (SSE) Client
 * Connects to backend for real-time payment notifications
 */

class SSEClient {
    constructor(merchantId) {
        this.merchantId = merchantId;
        this.eventSource = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000; // 3 seconds
        this.listeners = new Map(); // Event type -> callback[]
    }

    /**
     * Connect to SSE endpoint
     */
    connect() {
        if (this.eventSource && this.eventSource.readyState !== EventSource.CLOSED) {
            console.log('SSE already connected');
            return;
        }

        const url = `/notifications/events?merchant_id=${encodeURIComponent(this.merchantId)}`;
        console.log('🔌 Connecting to SSE:', url);

        try {
            this.eventSource = new EventSource(url);

            this.eventSource.onopen = () => {
                console.log('✅ SSE connection opened');
                this.reconnectAttempts = 0;
            };

            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('Error parsing SSE message:', error);
                }
            };

            this.eventSource.onerror = (error) => {
                console.error('SSE connection error:', error);
                this.handleReconnect();
            };

            // Listen for specific event types
            this.eventSource.addEventListener('payment_confirmed', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handlePaymentConfirmed(data);
                } catch (error) {
                    console.error('Error handling payment_confirmed:', error);
                }
            });

        } catch (error) {
            console.error('Failed to create SSE connection:', error);
            this.handleReconnect();
        }
    }

    /**
     * Handle incoming SSE message
     */
    handleMessage(data) {
        console.log('📨 SSE message received:', data);

        // Handle heartbeat
        if (data.type === 'heartbeat') {
            return; // Ignore heartbeat
        }

        // Handle connection confirmation
        if (data.type === 'connected') {
            console.log('✅ SSE connection confirmed');
            return;
        }

        // Trigger registered listeners
        if (this.listeners.has(data.type)) {
            this.listeners.get(data.type).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in SSE listener:', error);
                }
            });
        }
    }

    /**
     * Handle payment confirmed event
     */
    handlePaymentConfirmed(data) {
        console.log('💰 Payment confirmed via SSE:', data);
        
        // Update invoice status in database
        if (window.dbManager && window.dbManager.db) {
            window.dbManager.db.invoices
                .where('invoiceId').equals(data.invoice_id)
                .modify({ status: 'paid', updatedAt: new Date().toISOString() })
                .then(() => {
                    console.log('✅ Invoice status updated to paid');
                    
                    // Refresh dashboard
                    if (window.renderInvoices) {
                        window.renderInvoices();
                    }
                    if (window.renderStats) {
                        window.renderStats();
                    }
                    
                    // Show notification
                    this.showPaymentNotification(data);
                })
                .catch(error => {
                    console.error('Error updating invoice:', error);
                });
        }
    }

    /**
     * Show payment notification to user
     */
    showPaymentNotification(data) {
        // Add CSS animation if not already added
        if (!document.getElementById('sse-notification-style')) {
            const style = document.createElement('style');
            style.id = 'sse-notification-style';
            style.textContent = `
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="font-size: 24px;">✅</div>
                <div>
                    <div style="font-weight: bold; margin-bottom: 5px;">Payment Received!</div>
                    <div style="font-size: 14px; opacity: 0.9;">
                        Invoice ${data.invoice_id}<br>
                        Amount: π${data.amount?.toFixed(7) || '0.00'}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
    }

    /**
     * Handle reconnection logic
     */
    handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached. SSE disconnected.');
            return;
        }

        this.reconnectAttempts++;
        console.log(`🔄 Reconnecting SSE (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

        setTimeout(() => {
            this.disconnect();
            this.connect();
        }, this.reconnectDelay * this.reconnectAttempts); // Exponential backoff
    }

    /**
     * Register event listener
     */
    on(eventType, callback) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        this.listeners.get(eventType).push(callback);
    }

    /**
     * Remove event listener
     */
    off(eventType, callback) {
        if (this.listeners.has(eventType)) {
            const callbacks = this.listeners.get(eventType);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Disconnect from SSE
     */
    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
            console.log('🔌 SSE disconnected');
        }
    }
}

// Export for use in other modules
export { SSEClient };
if (typeof window !== 'undefined') {
    window.SSEClient = SSEClient;
}

