/**
 * Subscription Manager
 * Handles Freemium/Pro Logic and Blockchain Verification
 */
const SubscriptionManager = {
    isPro: false,
    expiry: null,

    /**
     * Check Logic:
     * 1. Ask Backend to check Blockchain (`/api/subscription/status`)
     * 2. Update local state
     */
    async checkStatus(piUser, accountId) {
        if (!piUser || !accountId) return false;

        // Store for later use in purchasePro
        this.piUser = piUser;
        this.accountId = accountId;

        try {
            console.log('🔍 Checking Subscription Status for:', accountId);
            const response = await fetch(`/api/subscription/status?account_id=${accountId}`, {
                headers: {
                    'Authorization': `Bearer ${piUser.accessToken}`
                }
            });

            const data = await response.json();

            if (data.is_pro) {
                this.isPro = true;
                this.expiry = data.expiry;
                console.log(`✅ PRO Subscription Active (Expires: ${data.expiry})`);
                this.unlockProFeatures();
            } else {
                this.isPro = false;
                console.log('ℹ️ Free Tier Active', data.reason);
                this.lockProFeatures();
            }

            // Dispatch event for UI
            window.dispatchEvent(new CustomEvent('subscription-update', {
                detail: { isPro: this.isPro, expiry: this.expiry }
            }));

            return this.isPro;
        } catch (error) {
            console.error('Subscription check failed:', error);
            return false;
        }
    },

    unlockProFeatures() {
        document.body.classList.add('is-pro-user');
        // Update UI Text
        const badge = document.getElementById('plan-badge');
        if (badge) {
            badge.textContent = 'PRO';
            badge.className = 'badge badge-pro';
        }
    },

    lockProFeatures() {
        document.body.classList.remove('is-pro-user');
        const badge = document.getElementById('plan-badge');
        if (badge) {
            badge.textContent = 'FREE';
            badge.className = 'badge badge-free';
        }
    },

    async purchasePro(tier = 'pro_monthly') {
        if (!this.piUser || !this.accountId) {
            alert("Please authenticate with Pi first.");
            return;
        }

        try {
            console.log(`🚀 Initiating ${tier} Subscription Payment...`);

            // Get amount from UI or fetch fresh quote
            const amountEl = document.getElementById(tier === 'pro_monthly' ? 'sub-pi-monthly' : 'sub-pi-yearly');
            const amount = amountEl ? parseFloat(amountEl.textContent) : (tier === 'pro_monthly' ? 0.01 : 0.09);

            // Use piAdapter for standard 4-step flow
            const memo = `${tier.toUpperCase()} Subscription`;

            // Call piAdapter (Standard Hackathon 2025 Pattern)
            const result = await window.piAdapter.createPiPayment(
                amount,
                memo,
                '', // Wallet address handled by SDK/Backend for app payments
                // onReadyForServerApproval (Step 2)
                async (paymentId) => {
                    console.log('⏳ Approving subscription payment:', paymentId);
                    await fetch('/blockchain/approve', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ payment_id: paymentId })
                    });
                },
                // onReadyForServerCompletion (Step 4)
                async (paymentId, txid) => {
                    console.log('⏳ Completing subscription payment:', { paymentId, txid });

                    // 1. Call standard blockchain completion
                    await fetch('/blockchain/complete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ payment_id: paymentId, txid: txid })
                    });

                    // 2. Call specialized subscription purchase endpoint
                    const res = await fetch('/api/subscription/purchase', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${this.piUser.accessToken}`
                        },
                        body: JSON.stringify({
                            payment_id: paymentId,
                            txid: txid,
                            tier: tier
                        })
                    });

                    if (res.ok) {
                        console.log('✅ Subscription Provisioned Successfully');
                        // Refresh status
                        await this.checkStatus(this.piUser, this.accountId);
                        alert("Upgrade successful! You are now a PRO user.");
                        window.closeUpgradeModal();
                    }
                }
            );

        } catch (error) {
            console.error('Purchase flow failed:', error);
            if (error.message !== 'cancelled') {
                alert("Purchase failed. Please try again.");
            }
        }
    }
}

window.SubscriptionManager = SubscriptionManager;
window.openUpgradeModal = function () {
    const modal = document.getElementById('upgrade-modal');
    if (modal) {
        modal.classList.add('visible');
        SubscriptionManager.startQuoteUpdate();
    }
};

window.closeUpgradeModal = function () {
    const modal = document.getElementById('upgrade-modal');
    if (modal) {
        modal.classList.remove('visible');
        SubscriptionManager.stopQuoteUpdate();
    }
};

// Add quote methods to SubscriptionManager
Object.assign(SubscriptionManager, {
    quoteInterval: null,

    async updateSubscriptionQuote() {
        const monthlyEl = document.getElementById('sub-pi-monthly');
        const yearlyEl = document.getElementById('sub-pi-yearly');
        if (!monthlyEl || !yearlyEl) return;

        try {
            const response = await fetch('/api/subscription/quote');
            const data = await response.json();
            if (data.monthly && data.yearly) {
                monthlyEl.textContent = data.monthly.pi.toFixed(4);
                yearlyEl.textContent = data.yearly.pi.toFixed(4);
            }
        } catch (error) {
            console.error('Failed to update sub quote:', error);
        }
    },

    startQuoteUpdate() {
        this.updateSubscriptionQuote();
        if (this.quoteInterval) clearInterval(this.quoteInterval);
        this.quoteInterval = setInterval(() => this.updateSubscriptionQuote(), 15000); // Check every 15s
    },

    stopQuoteUpdate() {
        if (this.quoteInterval) {
            clearInterval(this.quoteInterval);
            this.quoteInterval = null;
        }
    }
});

window.closeUpgradeModal = closeUpgradeModal;


window.closeUpgradeModal = closeUpgradeModal;
