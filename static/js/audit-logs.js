/**
 * Audit Logs Module - Owner Only
 * Req #35: Immutable Audit Trail
 * Only accessible to Owner role
 */

class AuditLogsManager {
    constructor(dbManager) {
        this.dbManager = dbManager;
        this.modal = null;
    }

    /**
     * Initialize audit logs manager
     */
    async initialize() {
        // Create modal if it doesn't exist
        this.createModal();
    }

    /**
     * Create audit logs modal
     */
    createModal() {
        let modal = document.getElementById('audit-logs-modal');
        if (modal) {
            this.modal = modal;
            return;
        }

        modal = document.createElement('dialog');
        modal.id = 'audit-logs-modal';
        modal.style.cssText = `
            width: 90%;
            max-width: 1000px;
            border: none;
            border-radius: 10px;
            padding: 0;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;

        modal.innerHTML = `
            <div style="padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="margin: 0;">🕵️ Audit Logs (Owner Only)</h2>
                    <button id="close-audit-modal-btn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
                </div>
                
                <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                    <strong>⚠️ Security Notice:</strong> This log is immutable and cannot be deleted. 
                    It records all critical actions for fraud prevention and compliance.
                </div>
                
                <div style="margin-bottom: 20px;">
                    <input type="text" id="audit-search-input" placeholder="Search by action, user, or entity..." 
                           style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box;">
                </div>
                
                <div id="audit-logs-list" style="max-height: 500px; overflow-y: auto; border: 1px solid #ddd; border-radius: 5px; padding: 10px;">
                    <div style="text-align: center; padding: 20px; color: #666;">
                        Loading audit logs...
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.modal = modal;

        // Setup close button
        const closeBtn = document.getElementById('close-audit-modal-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.close();
            });
        }

        // Setup search
        const searchInput = document.getElementById('audit-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterLogs(e.target.value);
            });
        }

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.close();
            }
        });
    }

    /**
     * Show audit logs modal
     */
    async showAuditLogs() {
        if (!this.modal) {
            await this.initialize();
        }

        // Check if user is owner (get role from database)
        if (!this.dbManager) {
            Toast.error('Database manager not initialized');
            return;
        }
        const userRole = await this.dbManager.getUserRole();
        const isOwner = userRole === 'OWNER';

        if (!isOwner) {
            Toast.error('Access Denied: Audit logs are only accessible to Owners.');
            return;
        }

        this.modal.showModal();
        await this.loadLogs();
    }

    /**
     * Load audit logs from database
     */
    async loadLogs() {
        try {
            const logs = await this.dbManager.getAuditLogs(1000);
            this.renderLogs(logs);
        } catch (error) {
            console.error('Error loading audit logs:', error);
            const list = document.getElementById('audit-logs-list');
            if (list) {
                // SECURITY: Sanitize error message to prevent XSS
                const safeMessage = String(error.message || 'Unknown error').replace(/<[^>]*>/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const errorDiv = document.createElement('div');
                errorDiv.style.cssText = 'color: red; padding: 20px;';
                errorDiv.textContent = `Error loading logs: ${safeMessage}`;
                list.innerHTML = '';
                list.appendChild(errorDiv);
            }
        }
    }

    /**
     * Render audit logs
     */
    renderLogs(logs) {
        const list = document.getElementById('audit-logs-list');
        if (!list) return;

        if (logs.length === 0) {
            // SECURITY: Use textContent instead of innerHTML for static text
            const emptyDiv = document.createElement('div');
            emptyDiv.style.cssText = 'text-align: center; padding: 20px; color: #666;';
            emptyDiv.textContent = 'No audit logs found.';
            list.innerHTML = '';
            list.appendChild(emptyDiv);
            return;
        }

        // Store logs for filtering
        this.allLogs = logs;

        // SECURITY: Sanitize all log data before rendering to prevent XSS
        const sanitizeString = (str) => {
            if (typeof str !== 'string') return String(str || '');
            return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
        };

        list.innerHTML = ''; // Clear first
        logs.forEach(log => {
            const logDiv = document.createElement('div');
            logDiv.style.cssText = 'border-bottom: 1px solid #eee; padding: 15px; margin-bottom: 10px;';
            
            const date = new Date(log.timestamp).toLocaleString();
            const actionColor = this.getActionColor(log.action);

            // Create action badge
            const actionBadge = document.createElement('span');
            actionBadge.style.cssText = `background: ${actionColor}; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px; font-weight: bold;`;
            actionBadge.textContent = sanitizeString(log.action);

            // Create entity info
            const entitySpan = document.createElement('span');
            entitySpan.style.cssText = 'margin-left: 10px; color: #666; font-size: 14px;';
            entitySpan.textContent = `${sanitizeString(log.entityType)} #${sanitizeString(log.entityId || 'N/A')}`;

            // Create date span
            const dateSpan = document.createElement('span');
            dateSpan.style.cssText = 'color: #999; font-size: 12px;';
            dateSpan.textContent = sanitizeString(date);

            // Create header row
            const headerRow = document.createElement('div');
            headerRow.style.cssText = 'display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;';
            const headerLeft = document.createElement('div');
            headerLeft.appendChild(actionBadge);
            headerLeft.appendChild(entitySpan);
            headerRow.appendChild(headerLeft);
            headerRow.appendChild(dateSpan);

            // Create user info
            const userDiv = document.createElement('div');
            userDiv.style.cssText = 'color: #666; font-size: 13px; margin-bottom: 5px;';
            userDiv.innerHTML = `<strong>User:</strong> ${sanitizeString(log.userRole)} (${sanitizeString(log.userId)}) | <strong>IP:</strong> ${sanitizeString(log.ipAddress || 'unknown')}`;

            logDiv.appendChild(headerRow);
            logDiv.appendChild(userDiv);

            // Add details if present
            if (log.details && typeof log.details === 'object') {
                const detailsDiv = document.createElement('div');
                detailsDiv.style.cssText = 'background: #f9f9f9; padding: 10px; border-radius: 3px; font-size: 12px; color: #555;';
                const detailsText = document.createElement('pre');
                detailsText.style.cssText = 'margin: 0; white-space: pre-wrap; word-wrap: break-word;';
                detailsText.textContent = `Details: ${JSON.stringify(log.details, null, 2)}`;
                detailsDiv.appendChild(detailsText);
                logDiv.appendChild(detailsDiv);
            }

            list.appendChild(logDiv);
        });
    }

    /**
     * Filter logs by search term
     */
    filterLogs(searchTerm) {
        if (!this.allLogs) return;

        const term = searchTerm.toLowerCase();
        const filtered = this.allLogs.filter(log => {
            return (
                log.action.toLowerCase().includes(term) ||
                log.userRole.toLowerCase().includes(term) ||
                log.userId.toLowerCase().includes(term) ||
                (log.entityId && log.entityId.toLowerCase().includes(term)) ||
                (log.entityType && log.entityType.toLowerCase().includes(term))
            );
        });

        this.renderLogs(filtered);
    }

    /**
     * Get color for action type
     */
    getActionColor(action) {
        if (action.includes('Created')) return '#4CAF50';
        if (action.includes('Deleted')) return '#f44336';
        if (action.includes('Updated')) return '#2196F3';
        if (action.includes('Refund')) return '#FF9800';
        if (action.includes('Printed')) return '#607D8B';
        if (action.includes('Scanned')) return '#9C27B0';
        return '#666';
    }
}

// Export for use in other modules
export { AuditLogsManager };
if (typeof window !== 'undefined') {
    window.AuditLogsManager = AuditLogsManager;
}

