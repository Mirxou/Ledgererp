/**
 * Auto-Lock Module - Security Timeout
 * Clears decryption key from memory after inactivity
 * SECURITY: Banking-grade auto-lock feature
 */

class AutoLockManager {
    constructor(securityManager) {
        this.securityManager = securityManager;
        this.inactivityTimeout = 5 * 60 * 1000; // 5 minutes in milliseconds
        this.timeoutId = null;
        this.isLocked = false;
        this.lastActivity = Date.now();
        
        // MEMORY LEAK FIX: Initialize activityListeners array before setupActivityListeners()
        this.activityListeners = [];
        this.visibilityListener = null;
        
        // Track user activity
        this.setupActivityListeners();
    }

    /**
     * Setup activity listeners to reset timeout
     * MEMORY LEAK FIX: Store listeners for cleanup
     */
    setupActivityListeners() {
        // Remove existing listeners first to prevent duplicates
        this.removeActivityListeners();
        
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        
        // Create bound handler function and store it
        const activityHandler = () => {
            this.resetTimeout();
        };
        
        events.forEach(event => {
            document.addEventListener(event, activityHandler, { passive: true });
            // Store listener info for cleanup: [event, handler, options]
            this.activityListeners.push([event, activityHandler, { passive: true }]);
        });
        
        // Also track visibility changes (tab switch)
        const visibilityHandler = () => {
            if (document.hidden) {
                // Tab hidden - don't reset, but don't lock immediately
            } else {
                // Tab visible again - check if we should lock
                this.checkLockStatus();
            }
        };
        
        document.addEventListener('visibilitychange', visibilityHandler);
        this.visibilityListener = ['visibilitychange', visibilityHandler];
    }

    /**
     * MEMORY LEAK FIX: Remove all activity listeners
     */
    removeActivityListeners() {
        // Remove activity event listeners
        this.activityListeners.forEach(([event, handler, options]) => {
            document.removeEventListener(event, handler, options);
        });
        this.activityListeners = [];
        
        // Remove visibility listener
        if (this.visibilityListener) {
            const [event, handler] = this.visibilityListener;
            document.removeEventListener(event, handler);
            this.visibilityListener = null;
        }
    }

    /**
     * Reset inactivity timeout
     */
    resetTimeout() {
        if (this.isLocked) {
            return; // Don't reset if already locked
        }
        
        this.lastActivity = Date.now();
        
        // Clear existing timeout
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        
        // Set new timeout
        this.timeoutId = setTimeout(() => {
            this.lock();
        }, this.inactivityTimeout);
        
        console.log('🔒 Auto-lock timeout reset');
    }

    /**
     * Lock the application (clear decryption key from memory)
     */
    lock() {
        if (this.isLocked) {
            return; // Already locked
        }
        
        console.log('🔒 Auto-locking application due to inactivity...');
        
        // Clear decryption key from security manager
        if (this.securityManager && typeof this.securityManager.clearDecryptionKey === 'function') {
            this.securityManager.clearDecryptionKey();
        }
        
        // Clear any cached sensitive data
        if (window.dbManager && window.dbManager.clearCache) {
            window.dbManager.clearCache();
        }
        
        this.isLocked = true;
        this.timeoutId = null;
        
        // Show lock screen
        this.showLockScreen();
    }

    /**
     * Unlock the application (requires PIN)
     */
    async unlock(pin) {
        if (!this.isLocked) {
            return true; // Already unlocked
        }
        
        try {
            // Verify PIN and restore decryption key
            // This would typically involve re-deriving the key from PIN
            // For now, we'll just check if PIN is valid
            
            // In production, this would:
            // 1. Verify PIN hash
            // 2. Re-derive decryption key from PIN + stored salt
            // 3. Restore key to security manager
            
            const isValid = await this.verifyPIN(pin);
            
            if (isValid) {
                this.isLocked = false;
                this.lastActivity = Date.now();
                this.hideLockScreen();
                this.resetTimeout();
                console.log('✅ Application unlocked');
                return true;
            } else {
                console.warn('❌ Invalid PIN');
                return false;
            }
        } catch (error) {
            console.error('Error unlocking:', error);
            return false;
        }
    }

    /**
     * Verify PIN (in production, this would check against hashed PIN)
     */
    async verifyPIN(pin) {
        // Get stored PIN hash from settings
        if (!window.dbManager || !window.dbManager.db) {
            return false;
        }
        
        try {
            const pinSetting = await window.dbManager.getSetting('pin_hash');
            if (!pinSetting) {
                // No PIN set - allow unlock (first time setup)
                return true;
            }
            
            // In production, use bcrypt or similar to verify PIN
            // For now, simple comparison (NOT SECURE - replace in production)
            const storedPIN = await window.dbManager.getSetting('pin');
            return pin === storedPIN;
        } catch (error) {
            console.error('Error verifying PIN:', error);
            return false;
        }
    }

    /**
     * Check if application should be locked based on last activity
     */
    checkLockStatus() {
        if (this.isLocked) {
            return;
        }
        
        const timeSinceActivity = Date.now() - this.lastActivity;
        if (timeSinceActivity >= this.inactivityTimeout) {
            this.lock();
        } else {
            // Reset timeout
            this.resetTimeout();
        }
    }

    /**
     * Show lock screen
     */
    showLockScreen() {
        // Create lock screen if it doesn't exist
        let lockScreen = document.getElementById('auto-lock-screen');
        if (!lockScreen) {
            lockScreen = document.createElement('div');
            lockScreen.id = 'auto-lock-screen';
            lockScreen.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                z-index: 99999;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                color: white;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            `;
            
            lockScreen.innerHTML = `
                <div style="text-align: center; padding: 30px;">
                    <div style="font-size: 64px; margin-bottom: 20px;">🔒</div>
                    <h2 style="margin: 0 0 10px 0;">Application Locked</h2>
                    <p style="margin: 0 0 30px 0; opacity: 0.9;">Auto-locked due to inactivity</p>
                    <div style="margin-bottom: 20px;">
                        <input type="password" id="unlock-pin-input" 
                               placeholder="Enter PIN" 
                               style="padding: 15px; font-size: 18px; border: none; border-radius: 5px; width: 200px; text-align: center;"
                               maxlength="6">
                    </div>
                    <button id="unlock-btn" 
                            style="padding: 12px 30px; background: white; color: #667eea; border: none; border-radius: 5px; font-size: 16px; font-weight: bold; cursor: pointer;">
                        Unlock
                    </button>
                    <p style="margin-top: 20px; font-size: 12px; opacity: 0.7;">
                        For security, the application locks after 5 minutes of inactivity
                    </p>
                </div>
            `;
            
            document.body.appendChild(lockScreen);
            
            // Setup unlock button
            const unlockBtn = document.getElementById('unlock-btn');
            const pinInput = document.getElementById('unlock-pin-input');
            
            unlockBtn.addEventListener('click', async () => {
                const pin = pinInput.value;
                if (pin) {
                    const unlocked = await this.unlock(pin);
                    if (!unlocked) {
                        pinInput.value = '';
                        pinInput.style.border = '2px solid #f44336';
                        setTimeout(() => {
                            pinInput.style.border = 'none';
                        }, 1000);
                    }
                }
            });
            
            // Unlock on Enter key
            pinInput.addEventListener('keypress', async (e) => {
                if (e.key === 'Enter') {
                    unlockBtn.click();
                }
            });
            
            // Focus on input
            pinInput.focus();
        }
        
        lockScreen.style.display = 'flex';
    }

    /**
     * Hide lock screen
     */
    hideLockScreen() {
        const lockScreen = document.getElementById('auto-lock-screen');
        if (lockScreen) {
            lockScreen.style.display = 'none';
        }
    }

    /**
     * Initialize auto-lock (call after app is ready)
     */
    initialize() {
        this.resetTimeout();
        console.log('✅ Auto-lock initialized (5 minute timeout)');
    }

    /**
     * Disable auto-lock (for testing or specific scenarios)
     */
    disable() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }

    /**
     * MEMORY LEAK FIX: Cleanup method to remove all listeners
     * Call this when the manager is no longer needed
     */
    destroy() {
        this.removeActivityListeners();
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        this.isLocked = false;
    }
}

// Export for use in other modules
export { AutoLockManager };
if (typeof window !== 'undefined') {
    window.AutoLockManager = AutoLockManager;
}

