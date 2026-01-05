/**
 * Shift Management Module - Z-Report Generation
 * Handles shift closure, report generation, and daily counter reset
 */

class ShiftManager {
    constructor(dbManager) {
        this.dbManager = dbManager;
        this.lastShiftClosure = null;
    }

    /**
     * Initialize shift manager
     */
    async initialize() {
        try {
            // Load last shift closure date from settings
            const lastClosure = await this.dbManager.getSetting('lastShiftClosure');
            if (lastClosure) {
                this.lastShiftClosure = new Date(lastClosure.value);
            }
            console.log('✅ Shift manager initialized');
        } catch (error) {
            console.error('Error initializing shift manager:', error);
        }
    }

    /**
     * Close shift and generate Z-Report
     */
    async closeShift() {
        try {
            // Confirm action
            const confirmed = await Modal.confirm(
                'Are you sure you want to close the current shift?<br><br>' +
                'This will:<br>' +
                '1. Generate a shift report<br>' +
                '2. Reset daily counters<br>' +
                '3. Save the report for records'
            );

            if (!confirmed) {
                return;
            }

            // Calculate totals since last closure
            const totals = await this.calculateShiftTotals();

            // Generate report
            const report = this.generateReport(totals);

            // Save report to database
            const reportId = await this.saveReport(report, totals);

            // Update last closure date
            await this.dbManager.setSetting('lastShiftClosure', new Date().toISOString());
            this.lastShiftClosure = new Date();

            // Reset daily counters (by updating stats display)
            await this.resetDailyCounters();

            // Show success message with report
            this.showReportModal(report, totals);

            console.log('✅ Shift closed successfully:', reportId);
        } catch (error) {
            console.error('Error closing shift:', error);
            console.error('Error closing shift:', error);
            Toast.error('Error closing shift: ' + error.message);
        }
    }

    /**
     * Calculate totals since last shift closure
     */
    async calculateShiftTotals() {
        try {
            const startDate = this.lastShiftClosure || new Date(0); // If no previous closure, use epoch
            const now = new Date();

            // Get all invoices since last closure
            const merchantId = await this.dbManager.getCurrentMerchantId();
            const allInvoices = await this.dbManager.getInvoices(merchantId);
            const shiftInvoices = allInvoices.filter(inv => {
                const invDate = new Date(inv.createdAt);
                return invDate >= startDate && invDate <= now && inv.status !== 'voided' && inv.status !== 'refunded';
            });

            // Calculate totals
            let totalPi = 0;
            let totalCash = 0;
            let paidInvoices = 0;
            let pendingInvoices = 0;

            shiftInvoices.forEach(invoice => {
                if (invoice.status === 'paid') {
                    totalPi += invoice.amount || 0;
                    totalCash += invoice.cashPaidFiat || 0;
                    paidInvoices++;
                } else if (invoice.status === 'pending' || invoice.status === 'draft') {
                    pendingInvoices++;
                }
            });

            return {
                startDate: startDate.toISOString(),
                endDate: now.toISOString(),
                totalPi: totalPi,
                totalCash: totalCash,
                totalInvoices: shiftInvoices.length,
                paidInvoices: paidInvoices,
                pendingInvoices: pendingInvoices
            };
        } catch (error) {
            console.error('Error calculating shift totals:', error);
            throw error;
        }
    }

    /**
     * Generate shift report text
     */
    generateReport(totals) {
        const date = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const summary = `SHIFT REPORT
================
Date: ${date}
Period: ${new Date(totals.startDate).toLocaleDateString()} - ${new Date(totals.endDate).toLocaleDateString()}

SALES SUMMARY:
- Total Sales (Pi): π${totals.totalPi.toFixed(7)}
- Total Cash (Offline): $${totals.totalCash.toFixed(2)}
- Total Invoices: ${totals.totalInvoices}
  • Paid: ${totals.paidInvoices}
  • Pending: ${totals.pendingInvoices}

================
Report Generated: ${new Date().toISOString()}
`;

        return summary;
    }

    /**
     * Save report to database
     */
    async saveReport(report, totals) {
        try {
            const reportId = `SHIFT-${Date.now()}`;
            await this.dbManager.saveShiftReport({
                reportId: reportId,
                date: new Date().toISOString(),
                totalCash: totals.totalCash,
                totalPi: totals.totalPi,
                totalInvoices: totals.totalInvoices,
                summary: report,
                createdAt: new Date().toISOString()
            });
            return reportId;
        } catch (error) {
            console.error('Error saving report:', error);
            throw error;
        }
    }

    /**
     * Reset daily counters (update stats display)
     */
    async resetDailyCounters() {
        // Trigger stats refresh
        if (window.renderStats) {
            await window.renderStats();
        }
    }

    /**
     * Show report modal
     */
    showReportModal(report, totals) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('shift-report-modal');
        if (!modal) {
            modal = document.createElement('dialog');
            modal.id = 'shift-report-modal';
            modal.style.cssText = `
                padding: 30px;
                border-radius: 10px;
                border: 2px solid #4CAF50;
                max-width: 600px;
                background: white;
            `;
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #4CAF50; margin: 0;">📊 Shift Closed Successfully</h2>
            </div>
            <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
                <pre style="white-space: pre-wrap; font-family: monospace; font-size: 12px; margin: 0;">${report}</pre>
            </div>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button id="copy-report-btn" style="padding: 10px 20px; background: #2196F3; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    📋 Copy Report
                </button>
                <button id="close-report-btn" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    ✅ Close
                </button>
            </div>
        `;

        // Event listeners
        document.getElementById('copy-report-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(report).then(() => {
                Toast.success('Report copied to clipboard!');
            });
        });

        document.getElementById('close-report-btn').addEventListener('click', () => {
            modal.close();
        });

        // Show modal
        modal.showModal();
    }

    /**
     * Get shift reports history
     */
    async getShiftReports(limit = 10) {
        try {
            const reports = await this.dbManager.getShiftReports();
            // Sort by createdAt (newest first) and limit
            return reports
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, limit);
        } catch (error) {
            console.error('Error getting shift reports:', error);
            return [];
        }
    }
}

// Export for use in other modules
export { ShiftManager };
if (typeof window !== 'undefined') {
    window.ShiftManager = ShiftManager;
}

