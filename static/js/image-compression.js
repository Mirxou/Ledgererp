/**
 * Image Compression Utility
 * Prevents Base64 bloat by compressing images before storage
 * Target: 500x500px max, optimized quality
 */

class ImageCompressor {
    /**
     * Compress and resize image before Base64 conversion
     * @param {File} file - Image file from input
     * @param {number} maxWidth - Maximum width (default: 500)
     * @param {number} maxHeight - Maximum height (default: 500)
     * @param {number} quality - JPEG quality 0-1 (default: 0.8)
     * @returns {Promise<string>} Base64 string of compressed image
     */
    static async compressImage(file, maxWidth = 500, maxHeight = 500, quality = 0.8) {
        return new Promise((resolve, reject) => {
            // Validate file type
            if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
                reject(new Error('Invalid image format. Only JPEG, PNG, and WebP are supported.'));
                return;
            }

            // Check file size (reject if > 10MB before compression)
            if (file.size > 10 * 1024 * 1024) {
                reject(new Error('Image file too large. Maximum size: 10MB'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // Calculate new dimensions while maintaining aspect ratio
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth || height > maxHeight) {
                        const ratio = Math.min(maxWidth / width, maxHeight / height);
                        width = width * ratio;
                        height = height * ratio;
                    }

                    // Create canvas for compression
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    
                    // Use high-quality image rendering
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    
                    // Draw resized image
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to Base64 with compression
                    // Use JPEG format for better compression (even for PNG)
                    const mimeType = 'image/jpeg';
                    const base64 = canvas.toDataURL(mimeType, quality);

                    // Log compression stats
                    const originalSizeKB = (file.size / 1024).toFixed(2);
                    const compressedSizeKB = ((base64.length * 3) / 4 / 1024).toFixed(2); // Approximate Base64 size
                    const compressionRatio = ((1 - (base64.length * 3) / 4 / file.size) * 100).toFixed(1);
                    
                    console.log(`✅ Image compressed: ${originalSizeKB}KB → ${compressedSizeKB}KB (${compressionRatio}% reduction)`);
                    console.log(`   Dimensions: ${img.width}x${img.height} → ${width}x${height}`);

                    resolve(base64);
                };

                img.onerror = () => {
                    reject(new Error('Failed to load image'));
                };

                img.src = e.target.result;
            };

            reader.onerror = () => {
                reject(new Error('Failed to read image file'));
            };

            reader.readAsDataURL(file);
        });
    }

    /**
     * Validate image file before compression
     * @param {File} file - Image file
     * @returns {Object} Validation result {valid: boolean, error?: string}
     */
    static validateImage(file) {
        // Check if file exists
        if (!file) {
            return { valid: false, error: 'No file selected' };
        }

        // Check file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            return { valid: false, error: 'Invalid file type. Only JPEG, PNG, and WebP are supported.' };
        }

        // Check file size (10MB max before compression)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            return { valid: false, error: `File too large. Maximum size: ${(maxSize / 1024 / 1024).toFixed(0)}MB` };
        }

        return { valid: true };
    }

    /**
     * Get image dimensions without loading full image
     * @param {File} file - Image file
     * @returns {Promise<{width: number, height: number}>}
     */
    static async getImageDimensions(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    resolve({ width: img.width, height: img.height });
                };
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }
}

// Export for use in other modules
export { ImageCompressor };
if (typeof window !== 'undefined') {
    window.ImageCompressor = ImageCompressor;
}

