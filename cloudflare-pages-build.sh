#!/bin/bash
# Cloudflare Pages Build Script
# This script ensures the static directory exists and is ready for deployment

echo "Building for Cloudflare Pages..."

# Ensure static directory exists
if [ ! -d "static" ]; then
    echo "Error: static directory not found"
    exit 1
fi

echo "Build complete - static directory ready"

