/**
 * Account Settings Module - Data Sovereignty
 * Req #37: Delete Account & Wipe Data
 */

class AccountSettingsManager {
    constructor(dbManager) {
        this.dbManager = dbManager;
        this.modal = null;
    }

    /**
     * Initialize account settings manager
     */
    async initialize() {
        this.createModal();
    }

    /**
     * Create settings modal with delete account option
     */
    createModal() {
        let modal = document.getElementById('account-settings-modal');
        if (modal) {
            this.modal = modal;
            return;
        }

        modal = document.createElement('dialog');
        modal.id = 'account-settings-modal';
        modal.style.cssText = `
            width: 90%;
            max-width: 600px;
            border: none;
            border-radius: 10px;
            padding: 0;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;

        modal.innerHTML = `
            <div style="padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="margin: 0;">⚙️ Account Settings</h2>
                    <button id="close-settings-modal-btn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
                </div>
                
                <div style="margin-bottom: 30px;">
                    <h3 style="margin-top: 0;">Currency Settings</h3>
                    <p style="color: #666; margin-bottom: 15px;">
                        Set your local currency for cash transactions display.
                    </p>
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 10px; font-weight: bold;">
                            Currency Symbol:
                        </label>
                        <select id="currency-symbol-select" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px; background: var(--input-bg); color: var(--text-color);">
                            <option value="$">$ (USD - US Dollar)</option>
                            <option value="€">€ (EUR - Euro)</option>
                            <option value="£">£ (GBP - British Pound)</option>
                            <option value="¥">¥ (JPY - Japanese Yen)</option>
                            <option value="₹">₹ (INR - Indian Rupee)</option>
                            <option value="₽">₽ (RUB - Russian Ruble)</option>
                            <option value="₪">₪ (ILS - Israeli Shekel)</option>
                            <option value="د.إ">د.إ (AED - UAE Dirham)</option>
                            <option value="ر.س">ر.س (SAR - Saudi Riyal)</option>
                            <option value="د.ج">د.ج (DZD - Algerian Dinar)</option>
                            <option value="د.م.">د.م. (MAD - Moroccan Dirham)</option>
                            <option value="ج.م">ج.م (EGP - Egyptian Pound)</option>
                        </select>
                        <p style="font-size: 12px; color: #666; margin-top: 5px;">
                            This symbol will be displayed for offline cash transactions in the dashboard.
                        </p>
                    </div>
                </div>
                
                <div style="margin-bottom: 30px;">
                    <h3 style="margin-top: 0;">Hardware Settings</h3>
                    <p style="color: #666; margin-bottom: 15px;">
                        Configure your printer type.
                    </p>
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 10px; font-weight: bold;">
                            Printer Type:
                        </label>
                        <select id="printer-type-select" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px; background: var(--input-bg); color: var(--text-color);">
                            <option value="bluetooth">Bluetooth (Mobile/Tablet)</option>
                            <option value="system">System Default (USB/Network/PC)</option>
                        </select>
                        <p style="font-size: 12px; color: #666; margin-top: 5px;">
                            <strong>Bluetooth:</strong> For mobile devices with Bluetooth thermal printers.<br>
                            <strong>System Default:</strong> Uses your computer's default printer (USB, Network, or any installed printer).
                        </p>
                    </div>
                </div>
                
                <div style="margin-bottom: 30px;">
                    <h3 style="margin-top: 0;">Data Management</h3>
                    <p style="color: #666; margin-bottom: 15px;">
                        Manage your account data and optimize performance.
                    </p>
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 10px; font-weight: bold;">
                            Archive Old Data (Req #41):
                        </label>
                        <p style="font-size: 12px; color: #666; margin-bottom: 10px;">
                            Archive invoices older than 6 months to keep the app fast. The archived data will be downloaded as a JSON file, then deleted from your device.
                        </p>
                        <button id="archive-data-btn" style="padding: 10px 20px; background: #2196F3; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; width: 100%;">
                            📦 Archive Old Invoices (6+ months)
                        </button>
                    </div>
                </div>
                
                <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                    <strong>⚠️ Export Your Data First:</strong>
                    <p style="margin: 10px 0 0 0; font-size: 14px;">
                        Before deleting your account, make sure to export your data using the "Export Data" button in the dashboard.
                        Once deleted, your data cannot be recovered.
                    </p>
                </div>
                
                <div style="border-top: 2px solid #f44336; padding-top: 20px; margin-top: 30px;">
                    <h3 style="color: #f44336; margin-top: 0;">Danger Zone</h3>
                    <p style="color: #666; margin-bottom: 15px;">
                        Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <button id="delete-account-btn" style="padding: 12px 24px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; width: 100%;">
                        🗑️ Delete Account & Wipe All Data
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.modal = modal;

        // Setup close button
        const closeBtn = document.getElementById('close-settings-modal-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.close();
            });
        }

        // Setup delete account button
        const deleteBtn = document.getElementById('delete-account-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.confirmDeleteAccount();
            });
        }

        // Load current currency settings
        this.loadCurrencySettings();

        // Setup currency change handler
        const currencySelect = document.getElementById('currency-symbol-select');
        if (currencySelect) {
            currencySelect.addEventListener('change', async (e) => {
                const symbol = e.target.value;
                const currencyMap = {
                    '$': { code: 'USD', name: 'US Dollar' },
                    '€': { code: 'EUR', name: 'Euro' },
                    '£': { code: 'GBP', name: 'British Pound' },
                    '¥': { code: 'JPY', name: 'Japanese Yen' },
                    '₹': { code: 'INR', name: 'Indian Rupee' },
                    '₽': { code: 'RUB', name: 'Russian Ruble' },
                    '₪': { code: 'ILS', name: 'Israeli Shekel' },
                    'د.إ': { code: 'AED', name: 'UAE Dirham' },
                    'ر.س': { code: 'SAR', name: 'Saudi Riyal' },
                    'د.ج': { code: 'DZD', name: 'Algerian Dinar' },
                    'د.م.': { code: 'MAD', name: 'Moroccan Dirham' },
                    'ج.م': { code: 'EGP', name: 'Egyptian Pound' }
                };
                const currency = currencyMap[symbol] || { code: 'USD', name: 'US Dollar' };
                await this.dbManager.setCurrencySettings(symbol, currency.code, currency.name);
                Toast.success(`Currency set to ${currency.name} (${symbol})`);
                // Refresh stats to update currency symbol
                if (window.renderStats) {
                    await window.renderStats();
                }
            });
        }

        // Setup printer type selector
        const printerTypeSelect = document.getElementById('printer-type-select');
        if (printerTypeSelect && window.hardwareManager) {
            // Load current printer type
            window.hardwareManager.loadPrinterSettings().then(() => {
                printerTypeSelect.value = window.hardwareManager.getPrinterType() || 'bluetooth';
            });

            // Save on change
            printerTypeSelect.addEventListener('change', async () => {
                const newType = printerTypeSelect.value;
                try {
                    await window.hardwareManager.setPrinterType(newType);
                    Toast.success(`Printer type set to: ${newType === 'bluetooth' ? 'Bluetooth (Mobile)' : 'System Default (USB/Network)'}`);
                } catch (error) {
                    Toast.error('Failed to save printer setting: ' + error.message);
                    printerTypeSelect.value = window.hardwareManager.getPrinterType() || 'bluetooth';
                }
            });
        }

        // Setup archive data button (Req #41)
        const archiveBtn = document.getElementById('archive-data-btn');
        if (archiveBtn && this.dbManager) {
            archiveBtn.addEventListener('click', async () => {
                const confirmed = await Modal.confirm(
                    'Archive invoices older than 6 months?<br><br>' +
                    'This will:<br>' +
                    '1. Export old invoices to a JSON file<br>' +
                    '2. Download the file to your device<br>' +
                    '3. Delete old invoices from the app<br><br>' +
                    'This keeps the app fast as your database grows.'
                );

                if (!confirmed) {
                    return;
                }

                try {
                    archiveBtn.disabled = true;
                    archiveBtn.textContent = '⏳ Archiving...';

                    const result = await this.dbManager.archiveOldData(6);

                    if (result.archived === 0) {
                        Toast.info('No old invoices to archive. Your database is already optimized!');
                    } else {
                        // Create download link for archive
                        const blob = new Blob([JSON.stringify(result.archiveData, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `ledger-erp-archive-${new Date().toISOString().split('T')[0]}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);

                        Toast.success(`Successfully archived ${result.archived} invoices! file downloaded.`);
                    }
                } catch (error) {
                    console.error('Error archiving data:', error);
                    Toast.error('Failed to archive data: ' + error.message);
                } finally {
                    archiveBtn.disabled = false;
                    archiveBtn.textContent = '📦 Archive Old Invoices (6+ months)';
                }
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
     * Show settings modal
     */
    async showSettings() {
        if (!this.modal) {
            await this.initialize();
        }
        this.modal.showModal();
    }

    /**
     * Confirm account deletion
     */
    async confirmDeleteAccount() {
        // Triple confirmation for safety
        const confirm1 = await Modal.confirm(
            '⚠️ WARNING: This will PERMANENTLY delete ALL your data!<br><br>' +
            'This includes:<br>' +
            '- All invoices<br>' +
            '- All transactions<br>' +
            '- All products<br>' +
            '- All settings<br>' +
            '- All backups<br><br>' +
            'This action CANNOT be undone!<br><br>' +
            'Are you absolutely sure?'
        );

        if (!confirm1) {
            return;
        }

        const confirm2 = await Modal.prompt(
            'Type "DELETE MY ACCOUNT" to confirm:<br><br>' +
            'This will wipe all data from your device and the server.'
        );

        if (confirm2 !== 'DELETE MY ACCOUNT') {
            Toast.info('Account deletion cancelled. Text did not match.');
            return;
        }

        const confirm3 = await Modal.confirm(
            'FINAL WARNING!<br><br>' +
            'You are about to PERMANENTLY delete everything.<br><br>' +
            'Last chance to cancel. Are you sure?'
        );

        if (!confirm3) {
            Toast.info('Account deletion cancelled.');
            return;
        }

        // Proceed with deletion
        await this.deleteAccount();
    }

    /**
     * Delete account and wipe all data
     */
    async deleteAccount() {
        try {
            // Show loading
            const deleteBtn = document.getElementById('delete-account-btn');
            if (deleteBtn) {
                deleteBtn.disabled = true;
                deleteBtn.textContent = '⏳ Deleting...';
            }

            // Wipe all data
            await this.dbManager.wipeAllData();

            // Close modal
            if (this.modal) {
                this.modal.close();
            }

            // Show success message
            Toast.success('Account deleted successfully. Redirecting...');

            // Redirect to welcome screen
            setTimeout(() => {
                // Clear everything and reload
                window.location.href = '/';
                window.location.reload();
            }, 1000);

        } catch (error) {
            console.error('Error deleting account:', error);
            Toast.error('Error deleting account: ' + error.message);

            // Re-enable button
            const deleteBtn = document.getElementById('delete-account-btn');
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.textContent = '🗑️ Delete Account & Wipe All Data';
            }
        }
    }
}

// Export for use in other modules
export { AccountSettingsManager };
if (typeof window !== 'undefined') {
    window.AccountSettingsManager = AccountSettingsManager;
}


