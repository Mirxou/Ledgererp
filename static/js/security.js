/**
 * Security Module - Core Security Functions
 * Req #7: BIP-39 (12 words) generation
 * Req #8: Anti-Phishing (Block 24-word inputs)
 * Req #9: AES-GCM Encryption with PIN-derived key
 * Req #10: Recovery Vault Encryption
 * Req #11: Input Sanitization (DOMPurify wrapper)
 * Req #12: Trusted Device/Backup (Encrypted key shard export)
 */
// استيراد مكتبات محلية (CSP-safe)
import DOMPurifyLib from '/static/libs/purify.es.js';
import { ethers } from '/static/libs/ethers.esm.min.js';
const DOMPurify = DOMPurifyLib?.default || DOMPurifyLib || null;

// قائمة كلمات احتياطية لاستخدامها إذا تعذر تحميل ethers
const WORD_LIST = [
    'anchor', 'budget', 'candle', 'digital', 'ember', 'forest', 'galaxy', 'harbor', 'island', 'jungle', 'kernel', 'ledger',
    'matrix', 'nebula', 'orbit', 'pioneer', 'quantum', 'ribbon', 'signal', 'tunnel', 'ultra', 'vector', 'whisper', 'zenith'
];

function generateMnemonicWords(count = 12) {
    const words = [];
    const rnd = new Uint32Array(count);
    crypto.getRandomValues(rnd);
    for (let i = 0; i < count; i++) {
        const idx = rnd[i] % WORD_LIST.length;
        words.push(WORD_LIST[idx]);
    }
    return words.join(' ');
}

class SecurityManager {
    constructor() {
        this.mnemonic = null;
        this.encryptionKey = null;
        this.recoveryPassword = null;
    }

    /**
     * Req #7: Generate BIP-39 mnemonic (12 words)
     * Client-side generation using ethers.js
     */
    async generateMnemonic() {
        try {
            if (ethers && ethers.Wallet && typeof ethers.Wallet.createRandom === 'function') {
                const wallet = ethers.Wallet.createRandom();
                this.mnemonic = wallet.mnemonic.phrase;
            } else {
                // Fallback إلى قائمة محلية
                this.mnemonic = generateMnemonicWords(12);
            }
            const words = this.mnemonic.split(' ');
            if (words.length !== 12) {
                throw new Error('Generated mnemonic must be exactly 12 words');
            }
            return this.mnemonic;
        } catch (error) {
            console.error('Error generating mnemonic:', error);
            throw new Error('Failed to generate mnemonic');
        }
    }

    /**
     * Req #8: Anti-Phishing - Block 24-word inputs
     * Display RED WARNING if user tries to enter 24 words
     */
    validateMnemonicInput(input) {
        const words = input.trim().split(/\s+/);
        const wordCount = words.length;

        if (wordCount === 24) {
            // Req #8: RED WARNING for 24-word input
            const warningElement = document.getElementById('phishing-warning');
            if (warningElement) {
                warningElement.style.display = 'block';
                warningElement.style.color = 'red';
                warningElement.style.fontWeight = 'bold';
                warningElement.textContent =
                    '⚠️ تنبيه: لا تقم أبداً بإدخال كلمات محفظة Pi الخاصة بك هنا. ' +
                    'Warning: Never enter your Pi wallet seed phrase here.';
            }
            throw new Error('24-word inputs are blocked for security. This is not a Pi wallet.');
        }

        if (wordCount !== 12) {
            throw new Error('Mnemonic must be exactly 12 words');
        }

        // Hide warning if valid
        const warningElement = document.getElementById('phishing-warning');
        if (warningElement) {
            warningElement.style.display = 'none';
        }

        return words.join(' ');
    }

    /**
     * Req #9: Derive encryption key from mnemonic + PIN using PBKDF2
     */
    async deriveEncryptionKey(mnemonic, pinCode) {
        try {
            // Combine mnemonic and PIN
            const combined = `${mnemonic}:${pinCode}`;

            // Convert to ArrayBuffer
            const encoder = new TextEncoder();
            const data = encoder.encode(combined);

            // Import as key material
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                data,
                'PBKDF2',
                false,
                ['deriveBits', 'deriveKey']
            );

            // Derive key using PBKDF2
            this.encryptionKey = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: encoder.encode('pi-ledger-salt'), // In production, use random salt
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                {
                    name: 'AES-GCM',
                    length: 256
                },
                false,
                ['encrypt', 'decrypt']
            );

            return this.encryptionKey;
        } catch (error) {
            console.error('Error deriving encryption key:', error);
            throw new Error('Failed to derive encryption key');
        }
    }

    /**
     * Req #9: Encrypt data using AES-GCM
     */
    async encryptData(data) {
        if (!this.encryptionKey) {
            throw new Error('Encryption key not initialized');
        }

        try {
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(JSON.stringify(data));

            // Generate IV
            const iv = crypto.getRandomValues(new Uint8Array(12));

            // Encrypt
            const encrypted = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                this.encryptionKey,
                dataBuffer
            );

            // Combine IV and encrypted data
            const combined = new Uint8Array(iv.length + encrypted.byteLength);
            combined.set(iv, 0);
            combined.set(new Uint8Array(encrypted), iv.length);

            // Convert to base64 for storage
            return btoa(String.fromCharCode(...combined));
        } catch (error) {
            console.error('Error encrypting data:', error);
            throw new Error('Encryption failed');
        }
    }

    /**
     * Req #9: Decrypt data using AES-GCM
     */
    async decryptData(encryptedBase64) {
        if (!this.encryptionKey) {
            throw new Error('Encryption key not initialized');
        }

        try {
            // Decode base64
            const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));

            // Extract IV and encrypted data
            const iv = combined.slice(0, 12);
            const encrypted = combined.slice(12);

            // Decrypt
            const decrypted = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                this.encryptionKey,
                encrypted
            );

            // Convert back to JSON
            const decoder = new TextDecoder();
            return JSON.parse(decoder.decode(decrypted));
        } catch (error) {
            console.error('Error decrypting data:', error);
            throw new Error('Decryption failed');
        }
    }

    /**
     * Req #10: Create encrypted vault backup
     * Uses separate Recovery Password (not PIN)
     */
    async createVaultBackup(dbData, recoveryPassword) {
        try {
            // Derive vault encryption key from recovery password
            const encoder = new TextEncoder();
            const passwordData = encoder.encode(recoveryPassword);

            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                passwordData,
                'PBKDF2',
                false,
                ['deriveBits', 'deriveKey']
            );

            const vaultKey = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: encoder.encode('pi-ledger-vault-salt'),
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                {
                    name: 'AES-GCM',
                    length: 256
                },
                false,
                ['encrypt']
            );

            // Compress and encrypt database
            const dbJson = JSON.stringify(dbData);
            const dbBuffer = encoder.encode(dbJson);

            // Generate IV for vault
            const iv = crypto.getRandomValues(new Uint8Array(12));

            const encrypted = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                vaultKey,
                dbBuffer
            );

            // Combine IV and encrypted data
            const combined = new Uint8Array(iv.length + encrypted.byteLength);
            combined.set(iv, 0);
            combined.set(new Uint8Array(encrypted), iv.length);

            const encryptedBlob = btoa(String.fromCharCode(...combined));

            // Hash recovery password for verification (backend cannot decrypt)
            const hashBuffer = await crypto.subtle.digest('SHA-256', passwordData);
            const recoveryHash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));

            this.recoveryPassword = recoveryPassword;

            return {
                encrypted_blob: encryptedBlob,
                recovery_hash: recoveryHash,
                version: '1.0.0',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error creating vault backup:', error);
            throw new Error('Failed to create vault backup');
        }
    }

    /**
     * Req #11: Sanitize user input using DOMPurify
     * Prevents XSS and injection attacks
     */
    sanitizeInput(input, options = {}) {
        if (typeof input !== 'string') {
            return input;
        }

        // Req #11: Use DOMPurify محلياً؛ مع fallback آمن
        if (!DOMPurify) {
            return input
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<[^>]*>/g, '');
        }

        const defaultOptions = {
            ALLOWED_TAGS: [],
            ALLOWED_ATTR: [],
            KEEP_CONTENT: true
        };
        return DOMPurify.sanitize(input, { ...defaultOptions, ...options });
    }

    /**
     * Req #11: Sanitize memo for blockchain (Stellar limit: 28 bytes)
     */
    sanitizeMemo(memo) {
        // Sanitize first
        let sanitized = this.sanitizeInput(memo);

        // Remove any HTML tags that might have slipped through
        sanitized = sanitized.replace(/<[^>]*>/g, '');

        // Enforce 28-byte limit (Req #16)
        const encoder = new TextEncoder();
        const bytes = encoder.encode(sanitized);

        if (bytes.length > 28) {
            // Truncate to fit
            const truncated = new TextDecoder('utf-8').decode(bytes.slice(0, 28));
            sanitized = truncated.replace(/\uFFFD/g, ''); // Remove replacement characters
        }

        return sanitized;
    }

    /**
     * Req #12: Export encrypted key shard for backup on secondary device
     */
    /**
     * Req #12: Export encrypted key shard for backup on secondary device
     */
    async exportKeyShard(devicePassword) {
        if (!this.mnemonic) {
            throw new Error('No mnemonic to export');
        }

        try {
            // Encrypt mnemonic with device-specific password
            const encoder = new TextEncoder();
            const passwordData = encoder.encode(devicePassword);

            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                passwordData,
                'PBKDF2',
                false,
                ['deriveKey']
            );

            const deviceKey = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: encoder.encode('pi-ledger-device-salt'),
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                {
                    name: 'AES-GCM',
                    length: 256
                },
                false,
                ['encrypt']
            );

            const mnemonicBuffer = encoder.encode(this.mnemonic);
            const iv = crypto.getRandomValues(new Uint8Array(12));

            const encrypted = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                deviceKey,
                mnemonicBuffer
            );

            const combined = new Uint8Array(iv.length + encrypted.byteLength);
            combined.set(iv, 0);
            combined.set(new Uint8Array(encrypted), iv.length);

            return {
                encrypted_shard: btoa(String.fromCharCode(...combined)),
                device_id: await this.getDeviceId(),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error exporting key shard:', error);
            throw new Error('Failed to export key shard');
        }
    }

    /**
     * Req #12: Import encrypted key shard (Device Onboarding)
     */
    async importKeyShard(encryptedShardBase64, devicePassword) {
        try {
            const encoder = new TextEncoder();
            const passwordData = encoder.encode(devicePassword);

            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                passwordData,
                'PBKDF2',
                false,
                ['deriveKey']
            );

            const deviceKey = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: encoder.encode('pi-ledger-device-salt'),
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                {
                    name: 'AES-GCM',
                    length: 256
                },
                false,
                ['decrypt']
            );

            // Decode base64
            const combined = Uint8Array.from(atob(encryptedShardBase64), c => c.charCodeAt(0));

            // Extract IV and encrypted data
            const iv = combined.slice(0, 12);
            const encrypted = combined.slice(12);

            // Decrypt
            const decrypted = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                deviceKey,
                encrypted
            );

            const decoder = new TextDecoder();
            const mnemonic = decoder.decode(decrypted);

            return mnemonic;
        } catch (error) {
            console.error('Error importing key shard:', error);
            throw new Error('Failed to import key shard. Wrong password or invalid QR.');
        }
    }

    /**
     * Req #10: Restore data from encrypted vault backup
     * Downloads encrypted blob from server and decrypts it using recovery password
     */
    async restoreFromVault(recoveryPassword) {
        try {
            // Download encrypted vault from server
            const response = await fetch('/sync/vault?recovery_password=' + encodeURIComponent(recoveryPassword), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('No vault backup found. Please create a backup first.');
                } else if (response.status === 401) {
                    throw new Error('Invalid recovery password. Please check your password and try again.');
                }
                throw new Error('Failed to download vault backup');
            }

            const vaultData = await response.json();
            if (!vaultData.encrypted_blob) {
                throw new Error('Invalid vault data received from server');
            }

            // Decrypt vault blob using recovery password
            const encoder = new TextEncoder();
            const passwordData = encoder.encode(recoveryPassword);

            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                passwordData,
                'PBKDF2',
                false,
                ['deriveBits', 'deriveKey']
            );

            const vaultKey = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: encoder.encode('pi-ledger-vault-salt'),
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                {
                    name: 'AES-GCM',
                    length: 256
                },
                false,
                ['decrypt']
            );

            // Decode base64 encrypted blob
            const encryptedBlob = atob(vaultData.encrypted_blob);
            const encryptedArray = new Uint8Array(encryptedBlob.length);
            for (let i = 0; i < encryptedBlob.length; i++) {
                encryptedArray[i] = encryptedBlob.charCodeAt(i);
            }

            // Extract IV (first 12 bytes) and encrypted data
            const iv = encryptedArray.slice(0, 12);
            const encrypted = encryptedArray.slice(12);

            // Decrypt
            const decryptedBuffer = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                vaultKey,
                encrypted
            );

            // Parse decrypted JSON
            const decryptedText = new TextDecoder().decode(decryptedBuffer);
            const dbData = JSON.parse(decryptedText);

            return {
                success: true,
                data: dbData,
                version: vaultData.version,
                timestamp: vaultData.timestamp
            };
        } catch (error) {
            console.error('Error restoring from vault:', error);
            throw new Error('Failed to restore from vault: ' + error.message);
        }
    }

    /**
     * Check if vault backup exists on server
     */
    async checkVaultExists() {
        try {
            const response = await fetch('/sync/vault/exists', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                return { exists: false };
            }

            const result = await response.json();
            return { exists: result.exists || false };
        } catch (error) {
            console.error('Error checking vault existence:', error);
            return { exists: false };
        }
    }

    /**
     * Get device identifier
     */
    async getDeviceId() {
        // Generate device ID from available browser features
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Device fingerprint', 2, 2);

        const fingerprint = canvas.toDataURL();
        const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprint));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Initialize security manager with mnemonic
     */
    async initialize(mnemonic, pinCode) {
        // Validate mnemonic input (Req #8)
        const validated = this.validateMnemonicInput(mnemonic);
        this.mnemonic = validated;

        // Derive encryption key (Req #9)
        await this.deriveEncryptionKey(validated, pinCode);

        return true;
    }

    /**
     * SECURITY: Clear decryption key from memory (Auto-Lock)
     * Removes encryption key and mnemonic from RAM
     */
    clearDecryptionKey() {
        // Clear encryption key
        this.encryptionKey = null;

        // Clear mnemonic from memory (security best practice)
        // Note: mnemonic is still needed for re-deriving key, but we clear it from RAM
        // In production, mnemonic should be stored encrypted, not in plain memory
        this.mnemonic = null;

        console.log('🔒 Encryption key cleared from memory');
    }

    /**
     * Check if encryption key is available
     */
    isKeyAvailable() {
        return this.encryptionKey !== null;
    }
}

// Export singleton instance
const securityManager = new SecurityManager();
export default securityManager;

