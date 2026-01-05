/**
 * UI Utilities for Pi Browser Compatibility
 * Replaces native alerts/confirms with custom Toasts and Modals
 * Ensures standardized behavior across iOS/Android webviews
 */

class Toast {
    static container = null;

    static init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            document.body.appendChild(this.container);
        }
    }

    static show(message, type = 'info', duration = 3000) {
        this.init();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        // Icon based on type
        let icon = '';
        if (type === 'success') icon = '✅ ';
        else if (type === 'error') icon = '❌ ';
        else if (type === 'warning') icon = '⚠️ ';
        else icon = 'ℹ️ ';

        // SECURITY: Sanitize message to prevent XSS (toast messages should be plain text)
        let safeMessage = message;
        if (typeof message === 'string') {
            // Strip all HTML tags from toast messages
            safeMessage = message.replace(/<[^>]*>/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
        
        // Use textContent for icon and message to prevent XSS
        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-message"></span>
        `;
        toast.querySelector('.toast-message').textContent = safeMessage;

        this.container.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Remove after duration
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.parentElement.removeChild(toast);
                }
            }, 300); // Wait for fade out animation
        }, duration);
    }

    static success(message, duration) {
        this.show(message, 'success', duration);
    }

    static error(message, duration = 4000) {
        this.show(message, 'error', duration);
    }

    static info(message, duration) {
        this.show(message, 'info', duration);
    }

    static warning(message, duration) {
        this.show(message, 'warning', duration);
    }
}

class Modal {
    static init() {
        // Create modal container if it doesn't exist
        if (!document.getElementById('custom-modal-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'custom-modal-overlay';
            overlay.className = 'modal-overlay hidden';

            // Add standard back button SVG definition for reuse
            const backArrow = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

            overlay.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <button class="icon-btn back-modal-btn" onclick="Modal.close()">${backArrow}</button>
                        <h3 id="modal-title">Title</h3>
                        <div style="width: 24px;"></div> <!-- Spacer for balance -->
                    </div>
                    <div class="modal-body" id="modal-body">
                        <!-- Content goes here -->
                    </div>
                    <div class="modal-footer" id="modal-footer">
                        <button class="btn btn-secondary" onclick="Modal.close()">Close</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            // Handle browser back button (PopState)
            window.addEventListener('popstate', (event) => {
                if (this.isOpen) {
                    this.close(true); // true = closed by history event
                }
            });
        }
    }

    static isOpen = false;

    static show({ title, content, isHtml = false, footerButtons = [] }) {
        this.init();
        const overlay = document.getElementById('custom-modal-overlay');
        const titleEl = document.getElementById('modal-title');
        const bodyEl = document.getElementById('modal-body');
        const footerEl = document.getElementById('modal-footer');
        const contentEl = overlay.querySelector('.modal-content');

        titleEl.textContent = title || 'Info';

        if (isHtml) {
            // SECURITY: Sanitize HTML content to prevent XSS attacks
            let sanitizedContent = content;
            if (window.securityManager && typeof window.securityManager.sanitizeInput === 'function') {
                // Allow safe HTML tags for modals (p, div, span, strong, em, ul, ol, li, br, iframe)
                sanitizedContent = window.securityManager.sanitizeInput(content, {
                    ALLOWED_TAGS: ['p', 'div', 'span', 'strong', 'em', 'ul', 'ol', 'li', 'br', 'iframe', 'input'],
                    ALLOWED_ATTR: ['id', 'class', 'style', 'src', 'width', 'height', 'border', 'type', 'value'],
                    KEEP_CONTENT: true
                });
            } else if (typeof DOMPurify !== 'undefined') {
                // Fallback to DOMPurify if available
                sanitizedContent = DOMPurify.sanitize(content, {
                    ALLOWED_TAGS: ['p', 'div', 'span', 'strong', 'em', 'ul', 'ol', 'li', 'br', 'iframe', 'input'],
                    ALLOWED_ATTR: ['id', 'class', 'style', 'src', 'width', 'height', 'border', 'type', 'value'],
                    KEEP_CONTENT: true
                });
            } else {
                // Last resort: strip all HTML tags except safe ones
                sanitizedContent = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                    .replace(/on\w+="[^"]*"/gi, ''); // Remove event handlers
            }
            bodyEl.innerHTML = sanitizedContent;
        } else {
            bodyEl.textContent = content;
        }

        // Setup footer buttons
        if (footerButtons.length > 0) {
            footerEl.innerHTML = '';
            footerEl.style.display = 'flex';
            footerButtons.forEach(btn => {
                const button = document.createElement('button');
                button.className = `btn ${btn.class || 'btn-secondary'}`;
                button.textContent = btn.text;
                button.onclick = () => {
                    if (btn.onClick) btn.onClick();
                    if (btn.closeOnClick !== false) this.close();
                };
                footerEl.appendChild(button);
            });
        } else {
            // Default close button or hidden if pure nav view
            footerEl.style.display = 'none'; 
        }

        // Show overlay with animation
        overlay.classList.remove('hidden');
        overlay.classList.add('visible');
        contentEl.classList.add('slide-up-enter');
        
        // Push state to history so "Back" button works
        if (!this.isOpen) {
            history.pushState({ modalOpen: true }, '', '#modal');
            this.isOpen = true;
        }

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        // Clean animation class after transition
        setTimeout(() => contentEl.classList.remove('slide-up-enter'), 300);
    }

    static close(isHistoryEvent = false) {
        const overlay = document.getElementById('custom-modal-overlay');
        const contentEl = overlay ? overlay.querySelector('.modal-content') : null;

        if (overlay && !overlay.classList.contains('hidden')) {
            // Animate out
            if (contentEl) contentEl.classList.add('slide-down-exit');

            setTimeout(() => {
                overlay.classList.remove('visible');
                overlay.classList.add('hidden');
                document.body.style.overflow = '';
                if (contentEl) contentEl.classList.remove('slide-down-exit');
                
                this.isOpen = false;

                // If closed via UI (not back button), pop the history state
                // so the user isn't stuck with a #modal URL
                if (!isHistoryEvent) {
                    // Check if state is actually ours before going back
                    if (history.state && history.state.modalOpen) {
                        history.back();
                    }
                }
            }, 250); // Wait for animation
        }
    }

    static confirm(message) {
        return new Promise((resolve) => {
            this.show({
                title: 'Confirm',
                content: message,
                footerButtons: [
                    {
                        text: 'Cancel',
                        class: 'btn-secondary',
                        onClick: () => resolve(false)
                    },
                    {
                        text: 'Confirm',
                        class: 'btn-primary',
                        onClick: () => resolve(true)
                    }
                ]
            });
        });
    }

    static async prompt(message, defaultValue = '') {
        return new Promise((resolve) => {
            const inputId = `prompt-input-${Date.now()}`;
            this.show({
                title: 'Input Required',
                content: `
                    <p>${message}</p>
                    <input type="text" id="${inputId}" class="form-control" value="${defaultValue}" style="width: 100%; margin-top: 10px;">
                `,
                isHtml: true,
                footerButtons: [
                    {
                        text: 'Cancel',
                        class: 'btn-secondary',
                        onClick: () => resolve(null)
                    },
                    {
                        text: 'OK',
                        class: 'btn-primary',
                        onClick: () => {
                            const val = document.getElementById(inputId).value;
                            resolve(val);
                        }
                    }
                ]
            });
            // Focus input
            setTimeout(() => {
                const input = document.getElementById(inputId);
                if (input) input.focus();
            }, 100);
        });
    }

    // Special method to show external content (like Privacy Policy)
    static showIframe(url, title) {
        this.show({
            title: title,
            content: `<iframe src="${url}" style="width: 100%; height: 60vh; border: none; border-radius: 4px;"></iframe>`,
            isHtml: true,
            footerButtons: [
                { text: 'Close', class: 'btn-secondary' }
            ]
        });
    }
}

// Make globally available
window.Toast = Toast;
window.Modal = Modal;
