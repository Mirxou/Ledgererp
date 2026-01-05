/**
 * Hardware Integration Module
 * Thermal Printer Support & Barcode Scanner
 * Req #34: Web Bluetooth & Camera Integration
 * Req #40: Universal Printing Support (USB/System Printers)
 */

class HardwareManager {
    constructor() {
        this.printerDevice = null;
        this.scannerActive = false;
        this.scannerInstance = null;
        this.printerType = 'bluetooth'; // 'bluetooth' or 'system'
    }

    /**
     * Req #40: Get printer type from settings
     */
    async loadPrinterSettings() {
        try {
            if (window.dbManager) {
                const printerType = await window.dbManager.getSetting('printer_type');
                if (printerType) {
                    this.printerType = printerType;
                    console.log('📋 Printer type loaded:', this.printerType);
                }
            }
        } catch (error) {
            console.warn('Could not load printer settings:', error);
        }
    }

    /**
     * Req #40: Set printer type
     */
    async setPrinterType(type) {
        if (type !== 'bluetooth' && type !== 'system') {
            throw new Error('Invalid printer type. Must be "bluetooth" or "system"');
        }

        this.printerType = type;

        // Save to database
        if (window.dbManager) {
            await window.dbManager.saveSetting('printer_type', type);
        }

        console.log('📋 Printer type set to:', type);
    }

    /**
     * Req #40: Get current printer type
     */
    getPrinterType() {
        return this.printerType;
    }

    /**
     * THERMAL PRINTER SUPPORT (Web Bluetooth API)
     * Connects to standard ESC/POS thermal printers (58mm/80mm)
     */
    async connectPrinter() {
        try {
            // Check if Web Bluetooth is supported
            if (!navigator.bluetooth) {
                throw new Error('Web Bluetooth API is not supported in this browser. Please use Chrome/Edge.');
            }

            // Request Bluetooth device (ESC/POS printers typically use this service)
            const device = await navigator.bluetooth.requestDevice({
                filters: [
                    { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // Generic Access Profile
                    { namePrefix: 'POS' }, // Common printer name prefix
                    { namePrefix: 'Thermal' },
                    { namePrefix: 'Printer' }
                ],
                optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', 'battery_service']
            });

            console.log('🔌 Connecting to printer:', device.name);

            // Connect to GATT server
            const server = await device.gatt.connect();

            // Get primary service (ESC/POS printers use this)
            const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');

            // Get characteristic for writing
            const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

            this.printerDevice = {
                device: device,
                server: server,
                service: service,
                characteristic: characteristic
            };

            console.log('✅ Printer connected successfully');
            return true;
        } catch (error) {
            // Req #44: Human-Friendly Error Messages
            if (error.name === 'NotFoundError') {
                this.showErrorToast('الطابعة غير متصلة', 'تأكد من تشغيل الطابعة وتفعيل البلوتوث، ثم حاول مرة أخرى.', 'printer');
                throw new Error('No printer found. Make sure your printer is turned on and Bluetooth is enabled.');
            } else if (error.name === 'SecurityError') {
                this.showErrorToast('تم رفض الإذن', 'يرجى السماح بالوصول إلى البلوتوث في إعدادات المتصفح.', 'bluetooth');
                throw new Error('Bluetooth permission denied. Please allow Bluetooth access.');
            } else {
                console.error('Error connecting to printer:', error);
                this.showErrorToast('خطأ في الاتصال', 'فشل الاتصال بالطابعة. تأكد من أن الطابعة قريبة ومتصلة.', 'error');
                throw new Error('Failed to connect to printer: ' + error.message);
            }
        }
    }

    /**
     * Req #40: Universal Print - Print receipt (supports both Bluetooth and System printers)
     */
    async printReceipt(receiptData) {
        // Load printer settings
        await this.loadPrinterSettings();

        // Route to appropriate print method
        if (this.printerType === 'system') {
            return await this.printReceiptSystem(receiptData);
        } else {
            try {
                // Try Bluetooth first
                return await this.printReceiptBluetooth(receiptData);
            } catch (error) {
                console.warn('Bluetooth print failed, attempting fallback to System Print:', error);

                // Show localized toast message
                const isArabic = document.documentElement.lang === 'ar';
                const title = isArabic ? 'فشل الطباعة عبر البلوتوث' : 'Bluetooth Print Failed';
                const msg = isArabic ? 'جاري التحويل للطباعة عبر النظام...' : 'Switching to System Print...';

                this.showErrorToast(title, msg, 'printer');

                // Auto-fallback to System Print
                return await this.printReceiptSystem(receiptData);
            }
        }
    }

    /**
     * Req #40: Print receipt using System Printer (USB/Network)
     */
    async printReceiptSystem(receiptData) {
        try {
            // Create print receipt container if it doesn't exist
            let printContainer = document.getElementById('print-receipt-container');
            if (!printContainer) {
                printContainer = document.createElement('div');
                printContainer.id = 'print-receipt-container';
                document.body.appendChild(printContainer);
            }

            // Format receipt HTML
            const receiptHTML = this.formatReceiptHTML(receiptData);
            printContainer.innerHTML = receiptHTML;

            // Show container temporarily (for print preview)
            printContainer.style.display = 'block';

            // Trigger print dialog
            window.print();

            // Hide container after print
            setTimeout(() => {
                printContainer.style.display = 'none';
            }, 1000);

            console.log('✅ System print dialog opened');
            return true;
        } catch (error) {
            console.error('Error printing via system printer:', error);
            throw new Error('Failed to print via system printer: ' + error.message);
        }
    }

    /**
     * Req #40: Format receipt as HTML for system printing
     */
    formatReceiptHTML(receiptData) {
        const date = new Date(receiptData.date || Date.now());
        const formattedDate = date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        let itemsHTML = '';
        if (receiptData.items && receiptData.items.length > 0) {
            itemsHTML = receiptData.items.map(item => {
                const name = item.name || 'Item';
                const qty = item.qty || 1;
                const price = (item.pricePi || 0).toFixed(7);
                const total = ((item.pricePi || 0) * qty).toFixed(7);
                return `
                    <div class="receipt-item">
                        <div style="display: flex; justify-content: space-between;">
                            <span>${name}</span>
                            <span>π${total}</span>
                        </div>
                        <div style="font-size: 10pt; color: #666; margin-left: 10px;">
                            ${qty} x π${price}
                        </div>
                    </div>
                `;
            }).join('');
        }

        const totalPi = (receiptData.totalPi || 0).toFixed(7);
        const cashPaid = receiptData.cashPaid || 0;

        return `
            <div class="receipt-content">
                <div class="receipt-header">
                    <div style="font-size: 16pt; margin-bottom: 5px;">${receiptData.shopName || 'Ledger ERP Store'}</div>
                    <div style="font-size: 10pt;">Non-Custodial ERP System</div>
                </div>
                
                <div class="receipt-line"></div>
                
                <div style="margin: 10px 0;">
                    <div><strong>Invoice:</strong> ${receiptData.invoiceId || 'N/A'}</div>
                    <div><strong>Date:</strong> ${formattedDate}</div>
                    <div><strong>Customer:</strong> ${receiptData.customerName || 'Walk-in'}</div>
                </div>
                
                <div class="receipt-line"></div>
                
                ${itemsHTML}
                
                <div class="receipt-line"></div>
                
                <div class="receipt-total">
                    <div style="display: flex; justify-content: space-between;">
                        <span>Total:</span>
                        <span>π${totalPi}</span>
                    </div>
                    ${cashPaid > 0 ? `
                        <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                            <span>Cash Paid:</span>
                            <span>$${cashPaid.toFixed(2)}</span>
                        </div>
                    ` : ''}
                </div>
                
                ${receiptData.qrCode ? `
                    <div style="text-align: center; margin: 15px 0;">
                        <div style="font-size: 10pt; margin-bottom: 5px;">Scan QR to Pay:</div>
                        <div style="display: inline-block; border: 1px solid #000; padding: 5px;">
                            [QR Code]
                        </div>
                    </div>
                ` : ''}
                
                <div class="receipt-footer">
                    <div>Thank you for your business!</div>
                    <div style="margin-top: 5px; font-size: 9pt;">Pi Network Payment</div>
                </div>
            </div>
        `;
    }

    /**
     * Print receipt using Bluetooth ESC/POS commands
     */
    async printReceiptBluetooth(receiptData) {
        if (!this.printerDevice) {
            throw new Error('Bluetooth printer not connected. Please connect first.');
        }

        try {
            const { characteristic } = this.printerDevice;

            // ESC/POS commands
            const ESC = '\x1B';
            const GS = '\x1D';

            // Initialize printer
            let commands = ESC + '@'; // Initialize

            // Center align
            commands += ESC + 'a' + '\x01'; // Center

            // Print header
            commands += ESC + '!' + '\x08'; // Bold, double height
            commands += receiptData.shopName || 'Ledger ERP Store\n';
            commands += ESC + '!' + '\x00'; // Normal
            commands += '--------------------------------\n';

            // Print invoice details
            commands += ESC + 'a' + '\x00'; // Left align
            commands += `Invoice: ${receiptData.invoiceId}\n`;
            commands += `Date: ${new Date(receiptData.date).toLocaleString()}\n`;
            commands += `Customer: ${receiptData.customerName || 'Walk-in'}\n`;
            commands += '--------------------------------\n';

            // Print items
            if (receiptData.items && receiptData.items.length > 0) {
                receiptData.items.forEach(item => {
                    const name = item.name.substring(0, 20); // Truncate long names
                    const qty = item.qty || 1;
                    const price = (item.pricePi || 0).toFixed(7);
                    const total = ((item.pricePi || 0) * qty).toFixed(7);

                    commands += `${name}\n`;
                    commands += `  ${qty} x π${price} = π${total}\n`;
                });
                commands += '--------------------------------\n';
            }

            // Print totals
            commands += ESC + '!' + '\x08'; // Bold
            commands += `Total: π${(receiptData.totalPi || 0).toFixed(7)}\n`;
            if (receiptData.cashPaid > 0) {
                commands += `Cash: $${(receiptData.cashPaid || 0).toFixed(2)}\n`;
            }
            commands += ESC + '!' + '\x00'; // Normal

            // Print QR code if available
            if (receiptData.qrCode) {
                commands += '\n';
                commands += 'Scan QR to Pay:\n';
                // Note: ESC/POS QR printing requires specific commands
                // This is a simplified version
                commands += '[QR Code]\n';
            }

            // Footer
            commands += '--------------------------------\n';
            commands += ESC + 'a' + '\x01'; // Center
            commands += 'Thank you!\n';
            commands += 'Pi Network Payment\n';

            // Cut paper
            commands += GS + 'V' + '\x41' + '\x03'; // Partial cut

            // Feed paper
            commands += '\n\n\n';

            // Convert to Uint8Array
            const encoder = new TextEncoder();
            const data = encoder.encode(commands);

            // Send to printer
            await characteristic.writeValue(data);

            console.log('✅ Receipt printed successfully');
            return true;
        } catch (error) {
            console.error('Error printing receipt:', error);
            throw new Error('Failed to print receipt: ' + error.message);
        }
    }

    /**
     * Disconnect printer
     */
    async disconnectPrinter() {
        if (this.printerDevice && this.printerDevice.device) {
            if (this.printerDevice.device.gatt.connected) {
                this.printerDevice.device.gatt.disconnect();
            }
            this.printerDevice = null;
            console.log('🔌 Printer disconnected');
        }
    }

    /**
     * BARCODE SCANNER (Camera API)
     * Uses html5-qrcode library for barcode scanning
     */
    async startBarcodeScanner(onScanSuccess, onScanError) {
        try {
            // Check if html5-qrcode is available
            if (typeof Html5Qrcode === 'undefined') {
                // Load library dynamically
                await this.loadBarcodeLibrary();
            }

            // Create scanner instance
            const scannerId = 'barcode-scanner-viewfinder';
            let scannerElement = document.getElementById(scannerId);

            if (!scannerElement) {
                // Create scanner container
                scannerElement = document.createElement('div');
                scannerElement.id = scannerId;
                scannerElement.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.9);
                    z-index: 100000;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                `;

                scannerElement.innerHTML = `
                    <div style="background: white; padding: 20px; border-radius: 10px; max-width: 500px; width: 90%;">
                        <h2 style="margin-top: 0;">Scan Barcode</h2>
                        <div id="scanner-container" style="width: 100%; margin: 20px 0;"></div>
                        <button id="close-scanner-btn" style="padding: 10px 20px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer; width: 100%;">
                            Close Scanner
                        </button>
                    </div>
                `;

                document.body.appendChild(scannerElement);

                // Setup close button
                document.getElementById('close-scanner-btn').addEventListener('click', () => {
                    this.stopBarcodeScanner();
                });
            }

            // Initialize scanner
            const scanner = new Html5Qrcode('scanner-container');

            await scanner.start(
                { facingMode: 'environment' }, // Use back camera
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 }
                },
                (decodedText, decodedResult) => {
                    // Success callback
                    console.log('Barcode scanned:', decodedText);
                    this.stopBarcodeScanner();
                    if (onScanSuccess) {
                        onScanSuccess(decodedText, decodedResult);
                    }
                },
                (errorMessage) => {
                    // Error callback (ignore, scanner keeps trying)
                    // Only log if it's a real error
                    if (errorMessage && !errorMessage.includes('NotFoundException')) {
                        console.debug('Scan error:', errorMessage);
                    }
                }
            );

            this.scannerInstance = scanner;
            this.scannerActive = true;
            console.log('✅ Barcode scanner started');
        } catch (error) {
            console.error('Error starting barcode scanner:', error);
            if (onScanError) {
                onScanError(error);
            } else {
                Toast.error('Failed to start scanner: ' + error.message);
            }
        }
    }

    /**
     * Stop barcode scanner
     */
    async stopBarcodeScanner() {
        if (this.scannerInstance) {
            try {
                await this.scannerInstance.stop();
                this.scannerInstance = null;
            } catch (error) {
                console.error('Error stopping scanner:', error);
            }
        }

        this.scannerActive = false;

        // Remove scanner UI
        const scannerElement = document.getElementById('barcode-scanner-viewfinder');
        if (scannerElement) {
            scannerElement.remove();
        }

        console.log('🔴 Barcode scanner stopped');
    }

    /**
     * Load html5-qrcode library dynamically
     */
    async loadBarcodeLibrary() {
        return new Promise((resolve, reject) => {
            if (typeof Html5Qrcode !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load barcode scanner library'));
            document.head.appendChild(script);
        });
    }

    /**
     * Check if printer is connected
     */
    isPrinterConnected() {
        return this.printerDevice !== null &&
            this.printerDevice.device &&
            this.printerDevice.device.gatt.connected;
    }

    /**
     * Check if scanner is active
     */
    isScannerActive() {
        return this.scannerActive;
    }

    /**
     * Req #44: Human-Friendly Error Messages - Show Toast Notification
     */
    showErrorToast(title, message, type = 'error') {
        // Delegate to global Toast
        if (window.Toast) {
            if (type === 'error') {
                Toast.error(title + ': ' + message);
            } else if (type === 'printer') {
                Toast.warning(title + ': ' + message);
            } else {
                Toast.info(title + ': ' + message);
            }
        } else {
            // Fallback if Toast not loaded
            console.error(title, message);
            alert(title + ': ' + message);
        }
    }
}

// Add CSS animations for toast
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// Export singleton instance
const hardwareManager = new HardwareManager();
export default hardwareManager;
if (typeof window !== 'undefined') {
    window.HardwareManager = HardwareManager;
    window.hardwareManager = hardwareManager;
}

