/**
 * Centralized Error Handler
 * Provides user-friendly error messages in Arabic and English
 * Req #44: Human-Friendly Error Messages
 */

class ErrorHandler {
    /**
     * Get user-friendly error message based on error type
     * @param {Error|string} error - The error object or message
     * @param {string} context - Context where error occurred
     * @returns {Object} - {ar: string, en: string}
     */
    static getFriendlyMessage(error, context = 'general') {
        const errorMessage = typeof error === 'string' ? error : (error?.message || 'Unknown error');
        const errorCode = typeof error === 'object' && error?.code ? error.code : null;

        // Network errors
        if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
            return {
                ar: 'فشل الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.',
                en: 'Connection failed. Please check your internet connection and try again.'
            };
        }

        // Pi SDK errors
        if (errorMessage.includes('Pi SDK') || errorMessage.includes('Pi.authenticate')) {
            return {
                ar: 'فشل تحميل Pi SDK. يرجى التأكد من الاتصال بالإنترنت وإعادة تحميل الصفحة.',
                en: 'Failed to load Pi SDK. Please ensure you have internet connection and reload the page.'
            };
        }

        // Database errors
        if (errorMessage.includes('database') || errorMessage.includes('IndexedDB') || errorMessage.includes('Dexie')) {
            return {
                ar: 'خطأ في قاعدة البيانات المحلية. يرجى إعادة تحميل الصفحة.',
                en: 'Local database error. Please reload the page.'
            };
        }

        // Payment errors
        if (errorMessage.includes('payment') || errorMessage.includes('Payment')) {
            return {
                ar: 'حدث خطأ أثناء معالجة الدفع. يرجى المحاولة مرة أخرى.',
                en: 'An error occurred while processing payment. Please try again.'
            };
        }

        // Authentication errors
        if (errorMessage.includes('authenticate') || errorMessage.includes('auth') || errorMessage.includes('login')) {
            return {
                ar: 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.',
                en: 'Authentication failed. Please try again.'
            };
        }

        // Permission errors
        if (errorMessage.includes('permission') || errorMessage.includes('denied') || errorMessage.includes('blocked')) {
            return {
                ar: 'تم رفض الإذن. يرجى السماح بالصلاحيات المطلوبة في إعدادات المتصفح.',
                en: 'Permission denied. Please allow required permissions in browser settings.'
            };
        }

        // Timeout errors
        if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
            return {
                ar: 'انتهت مهلة الانتظار. يرجى المحاولة مرة أخرى.',
                en: 'Request timeout. Please try again.'
            };
        }

        // Validation errors
        if (errorMessage.includes('required') || errorMessage.includes('invalid') || errorMessage.includes('Invalid')) {
            return {
                ar: 'البيانات المدخلة غير صحيحة. يرجى التحقق من المدخلات.',
                en: 'Invalid input data. Please check your inputs.'
            };
        }

        // File errors
        if (errorMessage.includes('file') || errorMessage.includes('File')) {
            return {
                ar: 'خطأ في معالجة الملف. يرجى التحقق من الملف والمحاولة مرة أخرى.',
                en: 'File processing error. Please check the file and try again.'
            };
        }

        // Generic error
        return {
            ar: `حدث خطأ: ${errorMessage}`,
            en: `An error occurred: ${errorMessage}`
        };
    }

    /**
     * Show error to user in a user-friendly way
     * @param {Error|string} error - The error object or message
     * @param {string} context - Context where error occurred
     * @param {string} language - 'ar' or 'en'
     */
    static showError(error, context = 'general', language = 'en') {
        const messages = this.getFriendlyMessage(error, context);
        const message = language === 'ar' ? messages.ar : messages.en;

        // Use Toast if available
        if (window.Toast) {
            Toast.error(message);
        } else {
            // Fallback to alert
            alert(message);
        }

        // Log to console for debugging
        console.error(`[ErrorHandler] ${context}:`, error);
    }

    /**
     * Handle async operation with error handling
     * @param {Promise} promise - The promise to handle
     * @param {string} context - Context for error messages
     * @param {string} language - 'ar' or 'en'
     * @returns {Promise} - Resolved promise with result or null on error
     */
    static async handleAsync(promise, context = 'operation', language = 'en') {
        try {
            return await promise;
        } catch (error) {
            this.showError(error, context, language);
            return null;
        }
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.ErrorHandler = ErrorHandler;
}

export default ErrorHandler;

