/**
 * Product Manager Module
 * Handles product CRUD operations with image compression
 */

class ProductManager {
    constructor(dbManager, imageCompressor) {
        this.dbManager = dbManager;
        this.imageCompressor = imageCompressor || window.ImageCompressor;
    }

    /**
     * Add a new product with image compression
     * @param {Object} productData - Product data {name, pricePi, category, imageFile}
     * @returns {Promise<string>} Product ID
     */
    async addProduct(productData) {
        try {
            const { name, pricePi, category, imageFile } = productData;

            if (!name || !pricePi) {
                throw new Error('Product name and price are required');
            }

            let imageBase64 = null;

            // Compress image if provided
            if (imageFile) {
                // Validate image first
                const validation = this.imageCompressor.validateImage(imageFile);
                if (!validation.valid) {
                    throw new Error(validation.error);
                }

                // Compress image before storing
                imageBase64 = await this.imageCompressor.compressImage(imageFile, 500, 500, 0.8);
                console.log('✅ Product image compressed and ready for storage');
            }

            // Generate product ID
            const productId = `PROD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

            // Save to database
            await this.dbManager.db.products.add({
                productId: productId,
                name: name,
                pricePi: parseFloat(pricePi),
                category: category || 'General',
                imageBase64: imageBase64,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            console.log('✅ Product added:', productId);
            return productId;
        } catch (error) {
            console.error('Error adding product:', error);
            throw error;
        }
    }

    /**
     * Get all products
     * @returns {Promise<Array>} List of products
     */
    async getProducts() {
        try {
            const products = await this.dbManager.db.products.toArray();
            return products;
        } catch (error) {
            console.error('Error getting products:', error);
            return [];
        }
    }

    /**
     * Get product by ID
     * @param {string} productId - Product ID
     * @returns {Promise<Object>} Product data
     */
    async getProduct(productId) {
        try {
            const product = await this.dbManager.db.products.where('productId').equals(productId).first();
            return product;
        } catch (error) {
            console.error('Error getting product:', error);
            return null;
        }
    }

    /**
     * Update product
     * @param {string} productId - Product ID
     * @param {Object} updates - Updated product data
     * @returns {Promise<void>}
     */
    async updateProduct(productId, updates) {
        try {
            // Compress image if new image provided
            if (updates.imageFile) {
                const validation = this.imageCompressor.validateImage(updates.imageFile);
                if (!validation.valid) {
                    throw new Error(validation.error);
                }
                updates.imageBase64 = await this.imageCompressor.compressImage(updates.imageFile, 500, 500, 0.8);
                delete updates.imageFile; // Remove file object
            }

            updates.updatedAt = new Date().toISOString();

            await this.dbManager.db.products.where('productId').equals(productId).modify(updates);
            console.log('✅ Product updated:', productId);
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    }

    /**
     * Delete product
     * @param {string} productId - Product ID
     * @returns {Promise<void>}
     */
    async deleteProduct(productId) {
        try {
            await this.dbManager.db.products.where('productId').equals(productId).delete();
            console.log('✅ Product deleted:', productId);
        } catch (error) {
            console.error('Error deleting product:', error);
            throw error;
        }
    }
}

// Export for use in other modules
export { ProductManager };
if (typeof window !== 'undefined') {
    window.ProductManager = ProductManager;
}

