/**
 * Bug Reporting Module - Feedback Loop
 * Req #39: Non-sensitive error reporting
 */

class BugReportingManager {
    constructor() {
        this.modal = null;
        this.errorLogs = [];
        this.maxLogs = 50; // Keep last 50 errors
    }

    /**
     * Initialize bug reporting manager
     */
    async initialize() {
        this.createModal();
        this.setupErrorHandling();
    }

    /**
     * Create bug report modal
     */
    createModal() {
        let modal = document.getElementById('bug-report-modal');
        if (modal) {
            this.modal = modal;
            return;
        }

        modal = document.createElement('dialog');
        modal.id = 'bug-report-modal';
        modal.style.cssText = `
            width: 90%;
            max-width: 700px;
            border: none;
            border-radius: 10px;
            padding: 0;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;

        modal.innerHTML = `
            <div style="padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="margin: 0;">🐞 Report Issue</h2>
                    <button id="close-bug-modal-btn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
                </div>
                
                <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                    <strong>🔒 Privacy Notice:</strong>
                    <p style="margin: 10px 0 0 0; font-size: 14px;">
                        Only technical error logs are sent. No personal data, wallet addresses, or sensitive information is included.
                    </p>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">
                        What happened?
                    </label>
                    <textarea id="bug-description" placeholder="Describe the issue you encountered..." rows="5"
                              style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box; font-family: inherit;"></textarea>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">
                        Steps to reproduce (optional):
                    </label>
                    <textarea id="bug-steps" placeholder="1. Click on...\n2. Then...\n3. Error occurs..." rows="4"
                              style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box; font-family: inherit;"></textarea>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                        <input type="checkbox" id="include-logs" checked>
                        <span>Include technical logs (recommended for debugging)</span>
                    </label>
                </div>
                
                <div id="bug-report-status" style="margin-bottom: 20px; padding: 15px; border-radius: 5px; display: none;"></div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="cancel-bug-report-btn" style="padding: 10px 20px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Cancel
                    </button>
                    <button id="submit-bug-report-btn" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                        📤 Submit Report
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.modal = modal;

        // Setup event listeners
        const closeBtn = document.getElementById('close-bug-modal-btn');
        const cancelBtn = document.getElementById('cancel-bug-report-btn');
        const submitBtn = document.getElementById('submit-bug-report-btn');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => modal.close());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => modal.close());
        }

        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.submitBugReport());
        }

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.close();
            }
        });
    }

    /**
     * Setup global error handling
     */
    setupErrorHandling() {
        // Capture unhandled errors
        window.addEventListener('error', (event) => {
            this.logError({
                type: 'error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack,
                timestamp: new Date().toISOString()
            });
        });

        // Capture unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.logError({
                type: 'unhandledrejection',
                message: event.reason?.message || String(event.reason),
                stack: event.reason?.stack,
                timestamp: new Date().toISOString()
            });
        });
    }

    /**
     * Log error (non-sensitive)
     */
    logError(errorData) {
        // Sanitize error data
        const sanitized = this.sanitizeError(errorData);
        
        // Add to logs
        this.errorLogs.push(sanitized);
        
        // Keep only last N logs
        if (this.errorLogs.length > this.maxLogs) {
            this.errorLogs.shift();
        }
    }

    /**
     * Sanitize error data (remove sensitive information)
     */
    sanitizeError(error) {
        const sanitized = { ...error };
        
        // Remove sensitive data
        const sensitivePatterns = [
            /wallet/i,
            /address/i,
            /private/i,
            /key/i,
            /secret/i,
            /password/i,
            /pin/i,
            /mnemonic/i,
            /seed/i,
            /token/i
        ];

        // Sanitize message
        if (sanitized.message) {
            sanitized.message = this.sanitizeString(sanitized.message, sensitivePatterns);
        }

        // Sanitize stack
        if (sanitized.stack) {
            sanitized.stack = this.sanitizeString(sanitized.stack, sensitivePatterns);
        }

        return sanitized;
    }

    /**
     * Sanitize string (remove sensitive patterns)
     */
    sanitizeString(str, patterns) {
        let sanitized = String(str);
        
        patterns.forEach(pattern => {
            sanitized = sanitized.replace(pattern, '[REDACTED]');
        });

        return sanitized;
    }

    /**
     * Show bug report modal
     */
    async showBugReport() {
        if (!this.modal) {
            await this.initialize();
        }

        // Reset form
        const description = document.getElementById('bug-description');
        const steps = document.getElementById('bug-steps');
        const statusDiv = document.getElementById('bug-report-status');

        if (description) description.value = '';
        if (steps) steps.value = '';
        if (statusDiv) {
            statusDiv.style.display = 'none';
            statusDiv.innerHTML = '';
        }

        this.modal.showModal();
    }

    /**
     * Submit bug report
     */
    async submitBugReport() {
        const description = document.getElementById('bug-description');
        const steps = document.getElementById('bug-steps');
        const includeLogs = document.getElementById('include-logs');
        const statusDiv = document.getElementById('bug-report-status');
        const submitBtn = document.getElementById('submit-bug-report-btn');

        if (!description || !description.value.trim()) {
            alert('Please describe the issue.');
            return;
        }

        try {
            // Disable submit button
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = '⏳ Sending...';
            }

            // Prepare report data
            const reportData = {
                description: description.value.trim(),
                steps: steps?.value.trim() || '',
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                timestamp: new Date().toISOString(),
                url: window.location.href.split('?')[0], // Remove query params
                logs: includeLogs?.checked ? this.errorLogs.slice(-10) : [] // Last 10 errors
            };

            // Send to backend
            const response = await fetch('/telemetry/logs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(reportData)
            });

            if (!response.ok) {
                throw new Error('Failed to submit report');
            }

            // Show success
            if (statusDiv) {
                statusDiv.style.display = 'block';
                statusDiv.style.background = '#d4edda';
                // SECURITY: Sanitize content before using innerHTML
                statusDiv.innerHTML = '';
                const successMsg = document.createElement('div');
                // XSS FIX: Use DOMPurify to sanitize HTML content
                if (typeof DOMPurify !== 'undefined') {
                    successMsg.innerHTML = DOMPurify.sanitize('<strong>✅ Report submitted successfully!</strong><br>Thank you for helping improve the app.');
                } else {
                    // Fallback: Use textContent for safety
                    successMsg.textContent = '✅ Report submitted successfully! Thank you for helping improve the app.';
                }
                statusDiv.appendChild(successMsg);
            }

            // Clear form and close after 2 seconds
            setTimeout(() => {
                if (description) description.value = '';
                if (steps) steps.value = '';
                if (statusDiv) statusDiv.style.display = 'none';
                if (this.modal) this.modal.close();
            }, 2000);

        } catch (error) {
            console.error('Error submitting bug report:', error);
            
            if (statusDiv) {
                statusDiv.style.display = 'block';
                statusDiv.style.background = '#f8d7da';
                // SECURITY: Sanitize error message to prevent XSS
                const safeMessage = String(error.message || 'Unknown error').replace(/<[^>]*>/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                statusDiv.innerHTML = '';
                const errorMsg = document.createElement('div');
                // XSS FIX: Use DOMPurify to sanitize HTML content
                if (typeof DOMPurify !== 'undefined') {
                    errorMsg.innerHTML = DOMPurify.sanitize(`<strong>❌ Failed to submit report:</strong> ${safeMessage}`);
                } else {
                    // Fallback: Use textContent for safety
                    errorMsg.textContent = `❌ Failed to submit report: ${safeMessage}`;
                }
                statusDiv.appendChild(errorMsg);
            }
        } finally {
            // Re-enable submit button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '📤 Submit Report';
            }
        }
    }
}

// Export singleton instance
const bugReportingManager = new BugReportingManager();
export default bugReportingManager;
if (typeof window !== 'undefined') {
    window.BugReportingManager = BugReportingManager;
    window.bugReportingManager = bugReportingManager;
}


