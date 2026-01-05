/**
 * Lifecycle Management - Version Check & Force Update
 * Req #13: Secure Updates (Audit Fix)
 * App must check min_version API header on connect
 * If outdated, LOCK UI and force Service Worker update
 */
class LifecycleManager {
    constructor() {
        this.currentVersion = '1.0.0';
        this.minVersion = null;
        this.updateRequired = false;
        this.serviceWorkerRegistration = null;
    }

    /**
     * Req #13: Initialize lifecycle manager
     * Check version on app start
     */
    async initialize() {
        try {
            // Register service worker first
            await this.registerServiceWorker();
            
            // Check version from API
            await this.checkVersion();
            
            // If update required, lock UI
            if (this.updateRequired) {
                this.lockUI();
            }
            
            return {
                success: true,
                updateRequired: this.updateRequired,
                currentVersion: this.currentVersion,
                minVersion: this.minVersion
            };
        } catch (error) {
            console.error('Error initializing lifecycle manager:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Req #13: Check min_version from API header
     */
    async checkVersion() {
        try {
            const response = await fetch('/blockchain/status', {
                method: 'GET',
                cache: 'no-cache'
            });
            
            // Get min version from response header
            const minVersionHeader = response.headers.get('X-Min-Version');
            
            if (minVersionHeader) {
                this.minVersion = minVersionHeader;
                this.updateRequired = this.isVersionOutdated(this.currentVersion, this.minVersion);
                
                console.log(`Version check: Current=${this.currentVersion}, Min=${this.minVersion}, UpdateRequired=${this.updateRequired}`);
            }
            
            return {
                minVersion: this.minVersion,
                updateRequired: this.updateRequired
            };
        } catch (error) {
            console.error('Error checking version:', error);
            // Don't block app if version check fails
            return {
                minVersion: null,
                updateRequired: false
            };
        }
    }

    /**
     * Compare version strings (semantic versioning)
     */
    isVersionOutdated(current, minimum) {
        const currentParts = current.split('.').map(Number);
        const minimumParts = minimum.split('.').map(Number);
        
        for (let i = 0; i < Math.max(currentParts.length, minimumParts.length); i++) {
            const currentPart = currentParts[i] || 0;
            const minimumPart = minimumParts[i] || 0;
            
            if (currentPart < minimumPart) {
                return true;
            } else if (currentPart > minimumPart) {
                return false;
            }
        }
        
        return false; // Versions are equal or current is newer
    }

    /**
     * Req #13: Lock UI if update is required
     */
    lockUI() {
        // Create lock overlay
        const lockOverlay = document.createElement('div');
        lockOverlay.id = 'update-required-overlay';
        lockOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            z-index: 99999;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: white;
            font-family: Arial, sans-serif;
        `;
        
        lockOverlay.innerHTML = `
            <div style="text-align: center; padding: 20px; max-width: 500px;">
                <h1 style="color: #ff4444; margin-bottom: 20px;">⚠️ Update Required</h1>
                <p style="font-size: 18px; margin-bottom: 20px;">
                    Your app version (${this.currentVersion}) is outdated.
                    <br>Minimum required version: ${this.minVersion}
                </p>
                <p style="font-size: 16px; margin-bottom: 30px;">
                    Please refresh the page to update.
                    <br>If the update doesn't start automatically, please clear your cache and reload.
                </p>
                <button id="force-update-btn" style="
                    padding: 15px 30px;
                    font-size: 16px;
                    background: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                ">Update Now</button>
            </div>
        `;
        
        document.body.appendChild(lockOverlay);
        
        // Force update button
        document.getElementById('force-update-btn').addEventListener('click', () => {
            this.forceUpdate();
        });
        
        // Prevent interaction with underlying UI
        document.body.style.pointerEvents = 'none';
        lockOverlay.style.pointerEvents = 'auto';
    }

    /**
     * Req #13: Force Service Worker update
     * Enhanced with cache clearing and verification
     */
    async forceUpdate() {
        try {
            // Step 1: Unregister all service workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                    console.log('Service worker unregistered:', registration.scope);
                }
            }
            
            // Step 2: Clear all caches (including IndexedDB if needed)
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(
                    cacheNames.map(cacheName => {
                        console.log('Deleting cache:', cacheName);
                        return caches.delete(cacheName);
                    })
                );
                console.log('All caches cleared');
            }
            
            // Step 3: Clear service worker cache storage
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                try {
                    const estimate = await navigator.storage.estimate();
                    if (estimate.usage > 0) {
                        // Clear storage if possible
                        if ('clear' in navigator.storage) {
                            await navigator.storage.clear();
                        }
                    }
                } catch (e) {
                    console.warn('Could not clear storage:', e);
                }
            }
            
            // Step 4: Force hard reload (bypass cache)
            // Use cache-busting query parameter
            const url = new URL(window.location.href);
            url.searchParams.set('_update', Date.now().toString());
            window.location.href = url.toString();
        } catch (error) {
            console.error('Error forcing update:', error);
            // Fallback: simple reload with cache bypass
            window.location.reload(true);
        }
    }

    /**
     * Register Service Worker for offline support
     */
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                // Unregister ALL old service workers first (to fix cache issues)
                const oldRegistrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of oldRegistrations) {
                    console.log('Unregistering old service worker:', registration.scope);
                    await registration.unregister();
                }
                
                // Also unregister the controller if it exists
                if (navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
                }
                
                // Wait a bit for unregistration to complete
                await new Promise(resolve => setTimeout(resolve, 100));
                
                const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
                this.serviceWorkerRegistration = registration;
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New service worker available
                                console.log('New service worker available');
                                this.promptUpdate();
                            }
                        });
                    }
                });
                
                console.log('Service worker registered:', registration.scope);
                return registration;
            } catch (error) {
                console.error('Service worker registration failed:', error);
                return null;
            }
        }
        return null;
    }

    /**
     * Prompt user to update when new service worker is available
     */
    promptUpdate() {
        // Show notification (non-blocking)
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #2196F3;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 10000;
            max-width: 300px;
        `;
        
        notification.innerHTML = `
            <p style="margin: 0 0 10px 0;">New version available!</p>
            <button id="update-notification-btn" style="
                padding: 5px 15px;
                background: white;
                color: #2196F3;
                border: none;
                border-radius: 3px;
                cursor: pointer;
            ">Update</button>
        `;
        
        document.body.appendChild(notification);
        
        document.getElementById('update-notification-btn').addEventListener('click', () => {
            this.forceUpdate();
        });
        
        // Auto-dismiss after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 10000);
    }

    /**
     * Check for updates periodically
     */
    startUpdateCheck(intervalMs = 300000) { // Check every 5 minutes
        setInterval(async () => {
            await this.checkVersion();
            if (this.updateRequired) {
                this.lockUI();
            }
        }, intervalMs);
    }
}

// Export singleton instance
const lifecycleManager = new LifecycleManager();
export default lifecycleManager;

