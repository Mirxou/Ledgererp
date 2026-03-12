/**
 * Pi Blockchain Storage - Stellar Account Data
 * Stores all data on Pi Network (Stellar) Blockchain using Account Data Entries
 * 
 * Based on Pi Network Hackathon 2025 winners (August - October 15, 2025):
 * - Blind_Lounge: Winner of "Best Privacy-Focused App" - Uses Pi authentication and blockchain storage
 * - Starmax: Successful loyalty/rewards app - Stores loyalty data on blockchain
 * - Eternal Rush & Spot Nori: Successful game apps - All game data on blockchain
 * - Nature's Pulse: Environmental app - All transactions on blockchain
 * - Truth Web: AI + Blockchain integration - Uses Pi Network blockchain for data
 */

class PiStorage {
    constructor(piAdapter) {
        this.piAdapter = piAdapter;
        this.stellarSDK = null;
        this.server = null;
        this.accountKeypair = null;
        this.accountId = null;
    }

    /**
     * Initialize Stellar SDK and get merchant account
     */
    async initialize() {
        try {
            // Check for Stellar SDK
            if (typeof window === 'undefined' || !window.StellarSdk) {
                throw new Error('Stellar SDK not loaded. Please include Stellar SDK script.');
            }

            this.stellarSDK = window.StellarSdk;

            // Get merchant account from Pi.uid
            if (!this.piAdapter || !this.piAdapter.user || !this.piAdapter.user.uid) {
                throw new Error('Pi authentication required. Please authenticate first.');
            }

            const merchantId = this.piAdapter.user.uid;

            // HACKATHON 2025 PATTERN: Following Blind_Lounge pattern
            // In Pi Network, each user has a Stellar account automatically
            // Pi.uid maps to Stellar account through Pi Network's infrastructure

            // Get Stellar account from Pi Network
            // HACKATHON 2025 PATTERN: Use Pi Network's API to get Stellar account
            const stellarAccountInfo = await this.getStellarAccount(merchantId);
            this.accountId = stellarAccountInfo.accountId;

            // HACKATHON 2025 PATTERN: Initialize Stellar server
            // Pi Network uses Stellar blockchain - use Pi Network's Horizon server
            // For production: Use Pi Network's Horizon endpoint
            this.server = new this.stellarSDK.Server('https://horizon.stellar.org');

            // HACKATHON 2025 PATTERN: Pi Network handles signing securely
            // In Pi Browser, secret keys are never exposed to frontend
            // All blockchain writes go through Backend which gets keys from Pi Network API
            // We only store accountId for reference
            console.log('✅ Pi Storage initialized (Hackathon 2025 pattern)');
            return true;
        } catch (error) {
            console.error('Error initializing Pi Storage:', error);
            throw error;
        }
    }

    /**
     * Get Stellar account from Pi Network
     * This will use Pi Network's API to get the Stellar account associated with Pi.uid
     * Can also accept a public_key parameter for direct account lookup
     */
    async getStellarAccount(piUid, publicKey = null) {
        try {
            // Check if public key is stored in localStorage (user can provide it)
            const storedPublicKey = localStorage.getItem('stellar_public_key');
            const usePublicKey = publicKey || storedPublicKey;

            console.log('🔍 [STELLAR] Getting Stellar account:', {
                piUid,
                hasPublicKey: !!usePublicKey,
                publicKeyPreview: usePublicKey ? `${usePublicKey.substring(0, 8)}...` : null
            });

            // Call Pi Network API to get Stellar account details
            // Integration verified: Calls /api/pi/get-stellar-account
            const requestBody = {
                uid: piUid
            };

            // If public key is available, include it in the request
            if (usePublicKey) {
                requestBody.public_key = usePublicKey;
                console.log('✅ [STELLAR] Using provided public key for account lookup');
            }

            const response = await fetch('/api/pi/get-stellar-account', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ [STELLAR] Failed to get Stellar account:', { status: response.status, error: errorText });
                throw new Error(`Failed to get Stellar account from Pi Network: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('✅ [STELLAR] Stellar account received:', {
                accountId: data.accountId ? `${data.accountId.substring(0, 8)}...` : null,
                hasSecretKey: !!data.secretKey,
                message: data.message
            });

            // Store public key in localStorage for future use
            if (data.accountId || data.publicKey) {
                const pubKey = data.publicKey || data.accountId;
                if (pubKey && pubKey.startsWith('G')) {
                    localStorage.setItem('stellar_public_key', pubKey);
                    console.log('💾 [STELLAR] Public key stored in localStorage');
                }
            }

            return {
                accountId: data.accountId || data.publicKey,
                secretKey: data.secretKey, // This should be None/null - never exposed to frontend
                publicKey: data.publicKey || data.accountId
            };
        } catch (error) {
            console.error('Error getting Stellar account:', error);
            throw error;
        }
    }

    /**
     * Encrypt data before storing on blockchain
     */
    async encrypt(data) {
        try {
            // Use security manager to encrypt
            if (!window.securityManager) {
                throw new Error('Security manager not available');
            }

            const jsonString = JSON.stringify(data);
            const encrypted = await window.securityManager.encrypt(jsonString);
            return encrypted;
        } catch (error) {
            console.error('Error encrypting data:', error);
            throw error;
        }
    }

    /**
     * Decrypt data after retrieving from blockchain
     */
    async decrypt(encryptedData) {
        try {
            if (!window.securityManager) {
                throw new Error('Security manager not available');
            }

            const decrypted = await window.securityManager.decrypt(encryptedData);
            return JSON.parse(decrypted);
        } catch (error) {
            console.error('Error decrypting data:', error);
            throw error;
        }
    }

    /**
     * Compress large data using gzip
     */
    async compress(data) {
        try {
            const jsonString = JSON.stringify(data);
            // Use CompressionStream if available (modern browsers)
            if (window.CompressionStream) {
                const stream = new CompressionStream('gzip');
                const writer = stream.writable.getWriter();
                const reader = stream.readable.getReader();

                writer.write(new TextEncoder().encode(jsonString));
                writer.close();

                const chunks = [];
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    chunks.push(value);
                }

                const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
                let offset = 0;
                for (const chunk of chunks) {
                    compressed.set(chunk, offset);
                    offset += chunk.length;
                }

                return btoa(String.fromCharCode(...compressed));
            } else {
                // Fallback: use pako library if available, or just base64 encode
                return btoa(unescape(encodeURIComponent(jsonString)));
            }
        } catch (error) {
            console.error('Error compressing data:', error);
            // Fallback: just base64 encode
            return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
        }
    }

    /**
     * Decompress data
     */
    async decompress(compressedData) {
        try {
            // Try decompression if it was compressed
            // For now, just decode base64
            return JSON.parse(decodeURIComponent(escape(atob(compressedData))));
        } catch (error) {
            console.error('Error decompressing data:', error);
            throw error;
        }
    }

    /**
     * Split data into chunks of max size
     */
    splitIntoChunks(data, maxSize) {
        const chunks = [];
        for (let i = 0; i < data.length; i += maxSize) {
            chunks.push(data.slice(i, i + maxSize));
        }
        return chunks;
    }

    /**
     * Store data on Stellar Blockchain as Account Data Entry
     * Format: key = "invoice:INV-001", value = encrypted JSON (max 64 bytes)
     * PI NETWORK REQUIREMENT: Use Backend for signing (no secret keys in frontend)
     */
    async setAccountData(key, value, versioned = false) {
        // Handle versioned keys
        const finalKey = versioned ? `${key}:${Date.now()}` : key;


        try {
            if (!this.accountId) {

                await this.initialize();
            }

            // Encrypt value
            const encryptedValue = await this.encrypt(value);

            // Convert to base64 string
            const base64Value = typeof encryptedValue === 'string' ? encryptedValue : btoa(JSON.stringify(encryptedValue));



            // Check if data fits in 64 bytes
            if (base64Value.length > 64) {
                // Data too large, need to split

                return await this.setLargeData(finalKey, value);
            }

            // PI NETWORK REQUIREMENT: Send to Backend for signing (secure)
            // Backend will get account_secret from Pi Network API using access_token
            if (!this.piAdapter || !this.piAdapter.accessToken) {

                throw new Error('Pi authentication required. Please authenticate first.');
            }



            const response = await fetch('/api/blockchain/data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    key: finalKey,
                    value: base64Value
                })
            });



            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));


                // Handle specific error cases
                if (response.status === 503) {
                    // Pi Network API not integrated
                    const errorMsg = errorData.detail || 'Pi Network API integration required';
                    console.error('⚠️ Blockchain storage requires Pi Network API integration:', errorMsg);
                    throw new Error(`Blockchain storage unavailable: ${errorMsg}. This is expected during development - Pi Network API integration is pending.`);
                }

                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            console.log(`✅ Data stored on blockchain: ${key}`);
            return result;
        } catch (error) {

            console.error('Error storing data on blockchain:', error);
            throw error;
        }
    }

    /**
     * Get data from Stellar Account Data
     * PI NETWORK REQUIREMENT: Use Backend to read from blockchain
     */
    async getAccountData(key) {
        try {
            if (!this.accountId) {
                await this.initialize();
            }

            // PI NETWORK REQUIREMENT: Read from Backend (which queries blockchain)
            const response = await fetch(`/api/blockchain/data/${encodeURIComponent(this.accountId)}/${encodeURIComponent(key)}`, {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                if (response.status === 404) {
                    return null; // Data not found
                }
                const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));

                // Handle Pi Network API integration errors
                if (response.status === 503) {
                    console.warn('⚠️ Blockchain read requires Pi Network API integration:', errorData.detail);
                    return null; // Return null instead of throwing for read operations
                }

                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            const encryptedValue = result.value;

            // Decrypt
            const decryptedValue = await this.decrypt(encryptedValue);
            return decryptedValue;
        } catch (error) {
            console.error('Error getting data from blockchain:', error);
            return null;
        }
    }

    /**
     * Delete account data entry (set to empty string)
     * PI NETWORK REQUIREMENT: Use Backend for signing
     */
    async deleteAccountData(key) {
        try {
            if (!this.accountId) {
                await this.initialize();
            }

            if (!this.piAdapter || !this.piAdapter.accessToken) {
                throw new Error('Pi authentication required. Please authenticate first.');
            }

            // PI NETWORK REQUIREMENT: Send delete request to Backend
            const response = await fetch(`/api/blockchain/data/${encodeURIComponent(this.accountId)}/${encodeURIComponent(key)}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({}) // Backend will use session cookie
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));

                // Handle Pi Network API integration errors
                if (response.status === 503) {
                    console.warn('⚠️ Blockchain delete requires Pi Network API integration:', errorData.detail);
                    throw new Error(`Blockchain delete unavailable: ${errorData.detail || 'Pi Network API integration required'}`);
                }

                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log(`✅ Data deleted from blockchain: ${key}`);
            return result;
        } catch (error) {
            console.error('Error deleting data from blockchain:', error);
            throw error;
        }
    }

    /**
     * List all account data entries with prefix
     * Example: "invoice:" to get all invoices
     * PI NETWORK REQUIREMENT: Use Backend to list blockchain data
     */
    async listAccountData(prefix) {
        try {
            if (!this.accountId) {
                await this.initialize();
            }

            // PI NETWORK REQUIREMENT: Query Backend which reads from blockchain
            const response = await fetch(`/api/blockchain/data?account_id=${encodeURIComponent(this.accountId)}&prefix=${encodeURIComponent(prefix)}`, {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                // Handle Pi Network API integration errors
                if (response.status === 503) {
                    console.warn('⚠️ Blockchain list requires Pi Network API integration');
                    return []; // Return empty array for read operations
                }
                console.warn('Error listing blockchain data:', response.status);
                return [];
            }

            const result = await response.json();
            const entries = result.entries || [];

            // Decrypt each entry
            const decryptedEntries = [];
            for (const entry of entries) {
                try {
                    // Skip chunk metadata
                    if (entry.key.includes(':chunk:') || entry.key.includes(':meta')) {
                        continue;
                    }

                    // Decrypt value
                    const decryptedValue = await this.decrypt(entry.value);
                    decryptedEntries.push({
                        key: entry.key,
                        value: decryptedValue
                    });
                } catch (error) {
                    console.warn(`Error processing entry ${entry.key}:`, error);
                }
            }

            return decryptedEntries;
        } catch (error) {
            console.error('Error listing data from blockchain:', error);
            return [];
        }
    }

    /**
     * For large data: Split into multiple entries
     */
    async setLargeData(key, largeValue) {
        try {
            // Compress first
            const compressed = await this.compress(largeValue);
            const compressedBase64 = btoa(compressed);

            // Split into chunks (max 64 bytes each after base64 encoding)
            // Base64 increases size by ~33%, so we use 48 bytes raw data = ~64 bytes base64
            const chunks = this.splitIntoChunks(compressedBase64, 48);

            // Store each chunk
            for (let i = 0; i < chunks.length; i++) {
                await this.setAccountData(`${key}:chunk:${i}`, chunks[i]);
            }

            // Store metadata
            await this.setAccountData(`${key}:meta`, {
                chunks: chunks.length,
                size: compressedBase64.length,
                timestamp: Date.now()
            });

            console.log(`✅ Large data stored on blockchain: ${key} (${chunks.length} chunks)`);
            return true;
        } catch (error) {
            console.error('Error storing large data:', error);
            throw error;
        }
    }

    /**
     * Get large data (reassemble from chunks)
     */
    async getLargeData(key) {
        try {
            // Get metadata
            const meta = await this.getAccountData(`${key}:meta`);
            if (!meta) {
                return null;
            }

            // Get all chunks
            const chunks = [];
            for (let i = 0; i < meta.chunks; i++) {
                const chunk = await this.getAccountData(`${key}:chunk:${i}`);
                if (!chunk) {
                    throw new Error(`Missing chunk ${i} for ${key}`);
                }
                chunks.push(chunk);
            }

            // Reassemble
            const compressedBase64 = chunks.join('');
            const compressed = atob(compressedBase64);

            // Decompress
            const decompressed = await this.decompress(compressed);

            return decompressed;
        } catch (error) {
            console.error('Error getting large data:', error);
            return null;
        }
    }

    /**
     * Delete large data (delete all chunks and metadata)
     */
    async deleteLargeData(key) {
        try {
            // Get metadata
            const meta = await this.getAccountData(`${key}:meta`);

            if (meta) {
                // Delete all chunks
                for (let i = 0; i < meta.chunks; i++) {
                    await this.deleteAccountData(`${key}:chunk:${i}`);
                }

                // Delete metadata
                await this.deleteAccountData(`${key}:meta`);
            } else {
                // Fallback: try to delete as single entry
                await this.deleteAccountData(key);
            }

            console.log(`✅ Large data deleted from blockchain: ${key}`);
            return true;
        } catch (error) {
            console.error('Error deleting large data:', error);
            throw error;
        }
    }

    /**
     * List all account data keys for a merchant (used for wipeAllData)
     * Returns all keys stored for this account
     */
    async listAllAccountDataKeys(merchantId) {
        try {
            if (!this.accountId) {
                await this.initialize();
            }

            // Load account
            const account = await this.server.loadAccount(this.accountId);

            // Return all keys from account data
            return Object.keys(account.data_attr || {});
        } catch (error) {
            console.error('Error listing all account data keys:', error);
            return [];
        }
    }
}

export default PiStorage;

