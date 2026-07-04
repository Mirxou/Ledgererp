/**
 * Push Notification Service Stub - Vision 2030
 * Handles native browser notifications for Pi Ledger
 */

const PushService = {
    async requestPermission() {
        if (!('Notification' in window)) {
            console.error("This browser does not support notifications.");
            return false;
        }

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            this.showNotification("Notifications Enabled", {
                body: "You will now receive alerts for important events/updates.",
                icon: "/favicon.png"
            });
            return true;
        }
        return false;
    },

    showNotification(title, options) {
        if (Notification.permission === 'granted') {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification(title, options);
                });
            } else {
                new Notification(title, options);
            }
        }
    },

    init() {
        const btn = document.getElementById('enable-notifications-btn');
        if (btn) {
            btn.addEventListener('click', async () => {
                const granted = await this.requestPermission();
                if (granted) {
                    btn.innerHTML = '<i class="fas fa-check"></i> Alerts Active';
                    btn.classList.replace('btn-premium', 'btn-grey');
                    btn.disabled = true;
                }
            });
        }
    }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => PushService.init());
