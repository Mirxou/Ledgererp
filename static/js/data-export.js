/**
 * Data Export Module - CSV Export
 * Allows merchants to export all their data in CSV format
 * GDPR: Data Portability Right
 */

class DataExporter {
    constructor(dbManager) {
        this.dbManager = dbManager;
    }

    /**
     * Export all data to CSV format
     */
    async exportAllDataToCSV() {
        try {
            if (!this.dbManager || !this.dbManager.piStorage) {
                await this.dbManager.initialize();
            }

            const merchantId = await this.dbManager.getCurrentMerchantId();
            const data = {
                invoices: await this.dbManager.getInvoices(merchantId),
                transactions: (await this.dbManager.piStorage.listAccountData('transaction:')).map(e => e.value),
                products: await this.dbManager.getProducts(),
                shiftReports: await this.dbManager.getShiftReports(),
                refunds: await this.dbManager.getRefunds(),
                exportDate: new Date().toISOString()
            };

            // Generate CSV files for each data type
            const csvFiles = {
                invoices: this.convertToCSV(data.invoices, this.getInvoiceHeaders()),
                transactions: this.convertToCSV(data.transactions, this.getTransactionHeaders()),
                products: this.convertToCSV(data.products, this.getProductHeaders()),
                shiftReports: this.convertToCSV(data.shiftReports, this.getShiftReportHeaders()),
                refunds: this.convertToCSV(data.refunds, this.getRefundHeaders())
            };

            // Create ZIP file with all CSV files
            await this.downloadCSVFiles(csvFiles, data.exportDate);

            console.log('✅ Data exported successfully');
            return csvFiles;
        } catch (error) {
            console.error('Error exporting data:', error);
            throw error;
        }
    }

    /**
     * Convert array of objects to CSV string
     */
    convertToCSV(data, headers) {
        if (!data || data.length === 0) {
            return headers.join(',') + '\n'; // Empty CSV with headers
        }

        const rows = [headers.join(',')];

        data.forEach(item => {
            const row = headers.map(header => {
                const value = item[header] || '';
                // Escape commas and quotes in CSV
                const stringValue = String(value).replace(/"/g, '""');
                return `"${stringValue}"`;
            });
            rows.push(row.join(','));
        });

        return rows.join('\n');
    }

    /**
     * Get CSV headers for invoices
     */
    getInvoiceHeaders() {
        return [
            'Invoice ID',
            'Merchant ID',
            'Customer Name',
            'Amount (Pi)',
            'Currency',
            'Status',
            'Cash Paid (Fiat)',
            'Cash Paid (Pi)',
            'Total Items (Pi)',
            'Exchange Rate',
            'External Reference',
            'Created At',
            'Updated At'
        ];
    }

    /**
     * Get CSV headers for transactions
     */
    getTransactionHeaders() {
        return [
            'Transaction ID',
            'Invoice ID',
            'Amount',
            'Currency',
            'Memo',
            'Status',
            'Verified',
            'Timestamp'
        ];
    }

    /**
     * Get CSV headers for products
     */
    getProductHeaders() {
        return [
            'Product ID',
            'Name',
            'Price (Pi)',
            'Category',
            'Created At',
            'Updated At'
        ];
    }

    /**
     * Get CSV headers for shift reports
     */
    getShiftReportHeaders() {
        return [
            'Report ID',
            'Date',
            'Total Cash',
            'Total Pi',
            'Total Invoices',
            'Created At'
        ];
    }

    /**
     * Get CSV headers for refunds
     */
    getRefundHeaders() {
        return [
            'Refund ID',
            'Invoice ID',
            'Amount',
            'Reason',
            'Created At'
        ];
    }

    /**
     * Download CSV files (creates separate downloads for each file)
     */
    async downloadCSVFiles(csvFiles, exportDate) {
        const timestamp = new Date(exportDate).toISOString().split('T')[0];
        
        // Download each CSV file
        for (const [type, csv] of Object.entries(csvFiles)) {
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `ledger_erp_${type}_${timestamp}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            // Small delay between downloads to avoid browser blocking
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Show success message
        alert(`✅ Data exported successfully!\n\nDownloaded ${Object.keys(csvFiles).length} CSV files:\n${Object.keys(csvFiles).map(k => `- ${k}.csv`).join('\n')}`);
    }

    /**
     * Export single table to CSV
     */
    async exportTableToCSV(tableName) {
        try {
            if (!this.dbManager || !this.dbManager.piStorage) {
                await this.dbManager.initialize();
            }

            const merchantId = await this.dbManager.getCurrentMerchantId();
            let data = [];
            let headers = [];

            switch (tableName) {
                case 'invoices':
                    data = await this.dbManager.getInvoices(merchantId);
                    headers = this.getInvoiceHeaders();
                    break;
                case 'transactions':
                    data = (await this.dbManager.piStorage.listAccountData('transaction:')).map(e => e.value);
                    headers = this.getTransactionHeaders();
                    break;
                case 'products':
                    data = await this.dbManager.getProducts();
                    headers = this.getProductHeaders();
                    break;
                case 'shiftReports':
                    data = await this.dbManager.getShiftReports();
                    headers = this.getShiftReportHeaders();
                    break;
                case 'refunds':
                    data = await this.dbManager.getRefunds();
                    headers = this.getRefundHeaders();
                    break;
                default:
                    throw new Error(`Unknown table: ${tableName}`);
            }

            const csv = this.convertToCSV(data, headers);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `ledger_erp_${tableName}_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            console.log(`✅ ${tableName} exported to CSV`);
        } catch (error) {
            console.error(`Error exporting ${tableName}:`, error);
            throw error;
        }
    }
}

// Export for use in other modules
export { DataExporter };
if (typeof window !== 'undefined') {
    window.DataExporter = DataExporter;
}

