/**
 * CSV Import Module - Bulk Product Import
 * Req #36: Bulk Onboarding
 */

class CSVImportManager {
    constructor(dbManager) {
        this.dbManager = dbManager;
        this.modal = null;
    }

    /**
     * Initialize CSV import manager
     */
    async initialize() {
        this.createModal();
    }

    /**
     * Create CSV import modal
     */
    createModal() {
        let modal = document.getElementById('csv-import-modal');
        if (modal) {
            this.modal = modal;
            return;
        }

        modal = document.createElement('dialog');
        modal.id = 'csv-import-modal';
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
                    <h2 style="margin: 0;">📥 Import Products from CSV</h2>
                    <button id="close-csv-import-modal-btn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
                </div>
                
                <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                    <strong>📋 CSV Format:</strong>
                    <pre style="background: white; padding: 10px; border-radius: 3px; margin-top: 10px; overflow-x: auto;">
Name,Price_Pi,Barcode,Stock_Qty
Bread,0.5,1234567890123,100
Coffee,2.0,9876543210987,50
Water,0.3,5555555555555,200</pre>
                    <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">
                        <strong>Required columns:</strong> Name, Price_Pi<br>
                        <strong>Optional columns:</strong> Barcode, Stock_Qty, Category
                    </p>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">
                        Select CSV File:
                    </label>
                    <input type="file" id="csv-file-input" accept=".csv" 
                           style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box;">
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">
                        Or Paste CSV Content:
                    </label>
                    <textarea id="csv-text-input" placeholder="Paste CSV content here..." rows="10"
                              style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box; font-family: monospace;"></textarea>
                </div>
                
                <div id="import-status" style="margin-bottom: 20px; padding: 15px; border-radius: 5px; display: none;"></div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="cancel-csv-import-btn" style="padding: 10px 20px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Cancel
                    </button>
                    <button id="import-csv-btn" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                        📥 Import Products
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.modal = modal;

        // Setup event listeners
        const closeBtn = document.getElementById('close-csv-import-modal-btn');
        const cancelBtn = document.getElementById('cancel-csv-import-btn');
        const importBtn = document.getElementById('import-csv-btn');
        const fileInput = document.getElementById('csv-file-input');
        const textInput = document.getElementById('csv-text-input');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => modal.close());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => modal.close());
        }

        if (importBtn) {
            importBtn.addEventListener('click', () => this.importCSV());
        }

        if (fileInput) {
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    const text = await file.text();
                    if (textInput) {
                        textInput.value = text;
                    }
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
     * Show CSV import modal
     */
    async showImportModal() {
        if (!this.modal) {
            await this.initialize();
        }

        // Reset form
        const fileInput = document.getElementById('csv-file-input');
        const textInput = document.getElementById('csv-text-input');
        const statusDiv = document.getElementById('import-status');

        if (fileInput) fileInput.value = '';
        if (textInput) textInput.value = '';
        if (statusDiv) {
            statusDiv.style.display = 'none';
            statusDiv.innerHTML = '';
        }

        this.modal.showModal();
    }

    /**
     * Import products from CSV
     */
    async importCSV() {
        const textInput = document.getElementById('csv-text-input');
        const statusDiv = document.getElementById('import-status');

        if (!textInput || !textInput.value.trim()) {
            alert('Please select a CSV file or paste CSV content.');
            return;
        }

        try {
            // Show loading
            if (statusDiv) {
                statusDiv.style.display = 'block';
                statusDiv.style.background = '#fff3cd';
                // SECURITY: Use textContent for static loading message
                statusDiv.innerHTML = '';
                statusDiv.textContent = '⏳ Importing products...';
            }

            // Import products
            const result = await this.dbManager.importProductsFromCSV(textInput.value);

            // Show success
            if (statusDiv) {
                statusDiv.style.background = '#d4edda';
                // SECURITY: Sanitize numbers before displaying
                const imported = String(result.imported || 0);
                const errors = String(result.errors || 0);
                // XSS FIX: Use DOMPurify to sanitize HTML content
                if (typeof DOMPurify !== 'undefined') {
                    statusDiv.innerHTML = DOMPurify.sanitize(`
                        <strong>✅ Import Successful!</strong><br>
                        Imported: ${DOMPurify.sanitize(imported)} products<br>
                        Errors: ${DOMPurify.sanitize(errors)} rows<br>
                        <small>Please refresh the product list to see new items.</small>
                    `);
                } else {
                    // Fallback: Simple sanitization
                    statusDiv.innerHTML = `
                        <strong>✅ Import Successful!</strong><br>
                        Imported: ${imported.replace(/<[^>]*>/g, '')} products<br>
                        Errors: ${errors.replace(/<[^>]*>/g, '')} rows<br>
                        <small>Please refresh the product list to see new items.</small>
                    `;
                }
            }

            // Log audit event
            await this.dbManager.logAuditEvent(
                'Bulk_Import',
                'product',
                null,
                { imported: result.imported, errors: result.errors },
                'owner',
                'system'
            );

            // Clear form after 3 seconds
            setTimeout(() => {
                if (textInput) textInput.value = '';
                if (statusDiv) {
                    statusDiv.style.display = 'none';
                }
            }, 3000);

        } catch (error) {
            console.error('Error importing CSV:', error);
            
            if (statusDiv) {
                statusDiv.style.display = 'block';
                statusDiv.style.background = '#f8d7da';
                // SECURITY: Sanitize error message to prevent XSS
                const safeMessage = String(error.message || 'Unknown error').replace(/<[^>]*>/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                statusDiv.innerHTML = '';
                const errorMsg = document.createElement('div');
                // XSS FIX: Use DOMPurify to sanitize HTML content
                if (typeof DOMPurify !== 'undefined') {
                    errorMsg.innerHTML = DOMPurify.sanitize(`<strong>❌ Import Failed:</strong> ${safeMessage}`);
                } else {
                    // Fallback: Use textContent for safety
                    errorMsg.textContent = `❌ Import Failed: ${safeMessage}`;
                }
                statusDiv.appendChild(errorMsg);
            }
        }
    }
}

// Export for use in other modules
export { CSVImportManager };
if (typeof window !== 'undefined') {
    window.CSVImportManager = CSVImportManager;
}

