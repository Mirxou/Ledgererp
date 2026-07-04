/**
 * Reports & Analytics Module - Vision 2030
 * Handles data aggregation and visualization using Chart.js
 */

class ReportManager {
    constructor() {
        this.charts = {};
        this.currentPeriod = '30d'; // Default view
    }

    async initialize() {
        console.log('📊 Initializing Report Manager...');
        this.setupEventListeners();
        await this.refreshAction();
    }

    setupEventListeners() {
        const periodSelector = document.getElementById('report-period-selector');
        if (periodSelector) {
            periodSelector.addEventListener('change', (e) => {
                this.currentPeriod = e.target.value;
                this.refreshAction();
            });
        }
    }

    async refreshAction() {
        const data = await this.aggregateData();
        this.updateMetricCards(data);
        this.renderCharts(data);
    }

    async aggregateData() {
        const db = window.dbManager || (await import('./db.js')).default;
        const merchantId = await db.getCurrentMerchantId();
        const invoices = await db.getInvoices(merchantId);

        const now = new Date();
        const cutoff = new Date();

        if (this.currentPeriod === '7d') cutoff.setDate(now.getDate() - 7);
        else if (this.currentPeriod === '30d') cutoff.setDate(now.getDate() - 30);
        else if (this.currentPeriod === '365d') cutoff.setFullYear(now.getFullYear() - 1);

        const filteredInvoices = invoices.filter(inv => {
            const date = new Date(inv.createdAt);
            return date >= cutoff && inv.status === 'paid';
        });

        // Metrics calculations
        let totalRevenuePi = 0;
        let totalCashFiat = 0;
        const categories = {};
        const dailyTrends = {};

        filteredInvoices.forEach(inv => {
            totalRevenuePi += (inv.amount || 0);
            totalCashFiat += (inv.cashPaidFiat || 0);

            // Group by category
            if (inv.items) {
                inv.items.forEach(item => {
                    const cat = item.category || 'General';
                    categories[cat] = (categories[cat] || 0) + (item.pricePi * item.qty);
                });
            }

            // Daily trends
            const dayKey = new Date(inv.createdAt).toLocaleDateString();
            dailyTrends[dayKey] = (dailyTrends[dayKey] || 0) + (inv.amount || 0);
        });

        return {
            totalRevenuePi,
            totalCashFiat,
            avgOrderValue: filteredInvoices.length > 0 ? (totalRevenuePi / filteredInvoices.length) : 0,
            growthRate: 15.4, // Placeholder for MVP
            categories,
            dailyTrends,
            count: filteredInvoices.length
        };
    }

    updateMetricCards(data) {
        const updateText = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        updateText('report-total-revenue', `π${data.totalRevenuePi.toFixed(2)}`);
        updateText('report-avg-order', `π${data.avgOrderValue.toFixed(4)}`);
        updateText('report-total-invoices', data.count);
        updateText('report-growth-rate', `+${data.growthRate}%`);
    }

    renderCharts(data) {
        // Revenue Trend Chart
        this.renderRevenueChart(data.dailyTrends);
        // Category Distribution Chart
        this.renderCategoryChart(data.categories);
    }

    renderRevenueChart(trends) {
        const ctx = document.getElementById('revenueTrendChart')?.getContext('2d');
        if (!ctx) return;

        if (this.charts.revenue) this.charts.revenue.destroy();

        const labels = Object.keys(trends);
        const values = Object.values(trends);

        this.charts.revenue = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Revenue (Pi)',
                    data: values,
                    borderColor: '#00D4FF',
                    backgroundColor: 'rgba(0, 212, 255, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    renderCategoryChart(categories) {
        const ctx = document.getElementById('categoryChart')?.getContext('2d');
        if (!ctx) return;

        if (this.charts.category) this.charts.category.destroy();

        const labels = Object.keys(categories);
        const values = Object.values(categories);

        this.charts.category = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: ['#00D4FF', '#D4AF37', '#6A0DAD', '#FF4C4C', '#4CAF50'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#888', usePointStyle: true } }
                }
            }
        });
    }
}

// Singleton Pattern
const reportManager = new ReportManager();
export default reportManager;

// Expose to window for UI-utils
window.reportManager = reportManager;
