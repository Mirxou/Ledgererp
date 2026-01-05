#!/usr/bin/env python3
"""
Compatibility Testing Script
Checks browser compatibility and responsive design
"""

import json
from pathlib import Path

def check_manifest_compatibility():
    """Check manifest.json for compatibility"""
    manifest_path = Path("static/manifest.json")
    
    if not manifest_path.exists():
        return ["❌ manifest.json not found"]
    
    try:
        with open(manifest_path, 'r', encoding='utf-8') as f:
            manifest = json.load(f)
        
        results = []
        
        # Check required fields
        required_fields = ['name', 'short_name', 'start_url', 'display', 'icons']
        for field in required_fields:
            if field in manifest:
                results.append(f"✓ {field}: Present")
            else:
                results.append(f"✗ {field}: Missing")
        
        # Check icons
        if 'icons' in manifest:
            icons = manifest['icons']
            if len(icons) >= 2:
                results.append(f"✓ Icons: {len(icons)} icon(s) defined")
            else:
                results.append("⚠️  Icons: Less than 2 icons defined")
        
        # Check display mode
        if manifest.get('display') == 'standalone':
            results.append("✓ Display: standalone mode (PWA compatible)")
        else:
            results.append(f"⚠️  Display: {manifest.get('display', 'not set')}")
        
        return results
    except Exception as e:
        return [f"❌ Error reading manifest.json: {e}"]

def check_responsive_design():
    """Check for responsive design indicators"""
    index_html = Path("static/index.html")
    
    if not index_html.exists():
        return ["❌ index.html not found"]
    
    try:
        content = index_html.read_text(encoding='utf-8')
        
        results = []
        
        # Check for viewport meta tag
        if 'viewport' in content.lower():
            results.append("✓ Viewport meta tag found")
        else:
            results.append("⚠️  Viewport meta tag not found")
        
        # Check for responsive CSS
        if 'media' in content.lower() or '@media' in content:
            results.append("✓ Responsive CSS found")
        else:
            results.append("⚠️  Responsive CSS not explicitly found")
        
        # Check for mobile-friendly indicators
        mobile_indicators = ['mobile', 'responsive', 'breakpoint', 'max-width']
        found_indicators = [ind for ind in mobile_indicators if ind in content.lower()]
        if found_indicators:
            results.append(f"✓ Mobile-friendly indicators found: {', '.join(found_indicators[:3])}")
        
        return results
    except Exception as e:
        return [f"❌ Error reading index.html: {e}"]

def check_pi_browser_compatibility():
    """Check Pi Browser specific compatibility"""
    results = []
    
    # Check for Pi SDK
    pi_adapter = Path("static/js/pi-adapter.js")
    if pi_adapter.exists():
        content = pi_adapter.read_text(encoding='utf-8')
        
        if 'Pi.authenticate' in content:
            results.append("✓ Pi.authenticate() found")
        else:
            results.append("✗ Pi.authenticate() not found")
        
        if 'Pi.createPayment' in content:
            results.append("✓ Pi.createPayment() found")
        else:
            results.append("✗ Pi.createPayment() not found")
        
        if 'onIncompletePaymentFound' in content:
            results.append("✓ onIncompletePaymentFound callback found")
        else:
            results.append("✗ onIncompletePaymentFound callback not found")
    else:
        results.append("❌ pi-adapter.js not found")
    
    # Check manifest for Pi app fields
    manifest_path = Path("static/manifest.json")
    if manifest_path.exists():
        with open(manifest_path, 'r', encoding='utf-8') as f:
            manifest = json.load(f)
        
        if 'pi_app' in manifest:
            pi_app = manifest['pi_app']
            required_pi_fields = ['app_id', 'name', 'developer', 'support_email']
            for field in required_pi_fields:
                if field in pi_app:
                    results.append(f"✓ pi_app.{field}: Present")
                else:
                    results.append(f"✗ pi_app.{field}: Missing")
        else:
            results.append("✗ pi_app section not found in manifest")
    
    return results

def main():
    print("=" * 60)
    print("Compatibility Testing - Pi Ledger")
    print("=" * 60)
    print()
    
    print("1. Manifest Compatibility:")
    manifest_results = check_manifest_compatibility()
    for result in manifest_results:
        print(f"   {result}")
    print()
    
    print("2. Responsive Design:")
    responsive_results = check_responsive_design()
    for result in responsive_results:
        print(f"   {result}")
    print()
    
    print("3. Pi Browser Compatibility:")
    pi_results = check_pi_browser_compatibility()
    for result in pi_results:
        print(f"   {result}")
    print()
    
    print("=" * 60)
    print("Compatibility Test Complete")
    print("=" * 60)

if __name__ == "__main__":
    main()

