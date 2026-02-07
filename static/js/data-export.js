/**
 * Data Export Module - Enhanced Portability (XLSX, PDF, JSON, CSV)
 * Vision 2030 - GDPR: Data Portability Right
 */

class DataExporter {
    constructor(dbManager) {
        this.dbManager = dbManager || window.dbManager;
    }

    async getExportData() {
        if (!this.dbManager) throw new Error('Database manager not initialized');
        const merchantId = await this.dbManager.getCurrentMerchantId();
        return {
            invoices: await this.dbManager.getInvoices(merchantId),
            products: await this.dbManager.getProducts(),
            shiftReports: await this.dbManager.getShiftReports(),
            refunds: await this.dbManager.getRefunds(),
            exportDate: new Date().toISOString(),
            merchantName: document.getElementById('shop-name')?.textContent || 'Pi Ledger Merchant'
        };
    }

    /**
     * Export to Excel (XLSX) using SheetJS
     */
    async exportToExcel() {
        try {
            Toast.info('Generating Excel workbook...');
            const data = await this.getExportData();
            const wb = XLSX.utils.book_new();

            // Create sheets for each data type
            const sheets = {
                'Invoices': data.invoices,
                'Products': data.products,
                'Shift Reports': data.shiftReports,
                'Refunds': data.refunds
            };

            for (const [name, content] of Object.entries(sheets)) {
                if (content && content.length > 0) {
                    const ws = XLSX.utils.json_to_sheet(content);
                    XLSX.utils.book_append_sheet(wb, ws, name);
                }
            }

            XLSX.writeFile(wb, `pi_ledger_export_${new Date().toISOString().split('T')[0]}.xlsx`);
            Toast.success('Excel export complete');
        } catch (error) {
            console.error('Excel Export Error:', error);
            Toast.error('Excel export failed');
        }
    }

    /**
     * Export to PDF using jsPDF
     */
    async exportToPDF() {
        try {
            Toast.info('Generating PDF report...');
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const data = await this.getExportData();
            const timestamp = new Date().toLocaleString();

            // Header
            doc.setFontSize(22);
            doc.setTextColor(0, 212, 255); // Jet Blue
            doc.text(data.merchantName, 20, 20);

            doc.setFontSize(12);
            doc.setTextColor(100);
            doc.text(`Business Performance Report - ${timestamp}`, 20, 30);
            doc.line(20, 35, 190, 35);

            // Summary Stats
            doc.setFontSize(16);
            doc.setTextColor(212, 175, 55); // Burnt Gold
            doc.text('Summary', 20, 45);

            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.text(`Total Invoices: ${data.invoices.length}`, 20, 55);
            doc.text(`Total Products: ${data.products.length}`, 20, 60);

            // Simple Invoices Table
            doc.setFontSize(14);
            doc.text('Recent Invoices', 20, 75);
            let y = 85;
            doc.setFontSize(8);
            data.invoices.slice(0, 20).forEach(inv => {
                if (y > 270) { doc.addPage(); y = 20; }
                doc.text(`${inv.id.substring(0, 8)}... | π${inv.amount.toFixed(4)} | ${inv.status} | ${new Date(inv.createdAt).toLocaleDateString()}`, 20, y);
                y += 7;
            });

            doc.save(`pi_ledger_report_${new Date().toISOString().split('T')[0]}.pdf`);
            Toast.success('PDF report generated');
        } catch (error) {
            console.error('PDF Export Error:', error);
            Toast.error('PDF export failed');
        }
    }

    /**
     * Export to JSON (Portable ERP format)
     */
    async exportToJSON() {
        try {
            const data = await this.getExportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pi_ledger_portable_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            Toast.success('JSON export complete');
        } catch (error) {
            Toast.error('JSON export failed');
        }
    }

    /**
     * CSV Export (Legacy support)
     */
    async exportToCSV() {
        // Keep existing CSV logic but consolidated
        const data = await this.getExportData();
        const csv = this.convertToCSV(data.invoices, this.getInvoiceHeaders());
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pi_ledger_invoices_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    }

    convertToCSV(data, headers) {
        if (!data || data.length === 0) return headers.join(',') + '\n';
        const rows = [headers.join(',')];
        data.forEach(item => {
            const row = headers.map(h => `"${String(item[h] || '').replace(/"/g, '""')}"`);
            rows.push(row.join(','));
        });
        return rows.join('\n');
    }

    getInvoiceHeaders() {
        return ['id', 'amount', 'currency', 'status', 'createdAt', 'customerName'];
    }
}

const dataExporter = new DataExporter();
export default dataExporter;
window.dataExporter = dataExporter;

