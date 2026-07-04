
/**
 * Market Ticker Manager
 * Handles real-time Pi price updates from Backend API
 */
const MarketTicker = {
    priceEl: null,
    changeEl: null,
    currentPrice: 0,
    ws: null,
    fallbackInterval: 30000,
    bitgetWsUrl: 'wss://ws.bitget.com/v2/ws/public',

    init() {
        this.priceEl = document.getElementById('pi-price-value');
        this.changeEl = document.getElementById('pi-price-change');

        if (this.priceEl) {
            this.connectWebSocket();
            // Start REST fallback in case WS fails or for initial load
            this.updatePriceREST();
            setInterval(() => {
                if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                    this.updatePriceREST();
                }
            }, this.fallbackInterval);
        }
    },

    connectWebSocket() {
        try {
            console.log('🔌 Connecting to Bitget Instant Ticker (WebSocket)...');
            this.ws = new WebSocket(this.bitgetWsUrl);

            this.ws.onopen = () => {
                console.log('✅ Bitget WebSocket Connected');
                // Subscribe to PIUSDT ticker (Bitget v2 format)
                const subMsg = {
                    op: 'subscribe',
                    args: [{
                        instType: 'SPOT',
                        channel: 'ticker',
                        instId: 'PIUSDT'
                    }]
                };
                this.ws.send(JSON.stringify(subMsg));
            };

            this.ws.onmessage = (event) => {
                const response = JSON.parse(event.data);
                if (response.action === 'push' && response.data && response.data[0]) {
                    const ticker = response.data[0];
                    this.renderPrice(
                        parseFloat(ticker.lastPr),
                        parseFloat(ticker.open24h),
                        'Bitget-WS'
                    );
                }
            };

            this.ws.onclose = () => {
                console.warn('⚠️ Bitget WebSocket closed. Retrying in 5s...');
                setTimeout(() => this.connectWebSocket(), 5000);
            };

            this.ws.onerror = (err) => {
                console.error('❌ WebSocket Error:', err);
                this.ws.close();
            };

        } catch (error) {
            console.error('WebSocket Initialization failed:', error);
        }
    },

    async updatePriceREST() {
        try {
            console.log('📡 Fetching latest Pi market price from Bitget...');
            const response = await fetch('/api/market/pi-price');
            const data = await response.json();

            if (data.price) {
                console.log(`💹 Pi Price (Source: ${data.source}): $${data.price}`);
                this.renderPrice(data.price, null, data.source);
            }
        } catch (error) {
            console.error('REST Fallback failed:', error);
        }
    },

    renderPrice(price, open24h, source) {
        if (!this.priceEl || isNaN(price)) return;

        // Update global price
        this.currentPrice = price;
        window.piMarketPrice = price; // Extra global exposure

        // Update Price Text
        this.priceEl.textContent = `$${price.toFixed(4)}`;

        // Update Change (if open24h provided)
        if (open24h && open24h > 0) {
            const change = ((price - open24h) / open24h) * 100;
            const sign = change > 0 ? '+' : '';
            this.changeEl.textContent = `(${sign}${change.toFixed(2)}%)`;
            this.changeEl.classList.remove('price-up', 'price-down');
            this.changeEl.classList.add(change >= 0 ? 'price-up' : 'price-down');
        }

        // Visual Feedback (Glow)
        this.priceEl.style.animation = 'none';
        void this.priceEl.offsetWidth;
        this.priceEl.style.animation = 'priceGlow 0.5s ease-out';
    }
};

// Start when document completes loading
window.addEventListener('load', () => MarketTicker.init());
