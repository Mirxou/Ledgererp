/**
 * Pi Ledger Plugin Marketplace - Phase 4 Engine
 * (c) 2030 Vision
 */

class PluginManager {
    constructor() {
        this.plugins = new Map();
    }

    /**
     * Register a new extension in the ecosystem
     */
    registerPlugin(pluginId, metadata) {
        console.log(`🔌 Initializing Plugin: ${pluginId} (${metadata.version})`);
        this.plugins.set(pluginId, {
            ...metadata,
            status: 'active',
            installedAt: new Date()
        });
    }

    /**
     * Dispatch event to all active plugins
     */
    dispatchEvent(eventName, data) {
        this.plugins.forEach((plugin, id) => {
            if (plugin.onEvent) plugin.onEvent(eventName, data);
        });
    }
}

window.pluginManager = new PluginManager();
