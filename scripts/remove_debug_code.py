#!/usr/bin/env python3
"""
Remove all debug localhost code from pi-storage.js
This script safely removes fetch statements to 127.0.0.1:7243
"""

import re
import sys

def remove_debug_code(file_path):
    """
    Remove all localhost:7243 debug fetch statements from file
    Keeps the code structure intact
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_length = len(content)
    
    # Pattern 1: Remove fetch statements ending with .catch(() => { });
    # This pattern matches: fetch('http://127.0.0.1:7243/...', { ... }).catch(() => { });
    pattern = r"\s*fetch\('http://127\.0\.0\.1:7243[^)]*\)\s*{\s*method:\s*'POST'[^}]*}\s*\}\.catch\(\(\)\s*=>\s*\{\s*\}\);\s*"
    
    content_modified = re.sub(pattern, '', content, flags=re.MULTILINE | re.DOTALL)
    
    # Pattern 2: Remove #region/#endregion blocks if any remain
    pattern2 = r"\s*//\s*#region\s+agent\s+log.*?//\s*#endregion\s*"
    content_modified = re.sub(pattern2, '', content_modified, flags=re.MULTILINE | re.DOTALL)
    
    # Remove extra newlines that might have been left
    content_modified = re.sub(r'\n\s*\n\s*\n', '\n\n', content_modified)
    
    modified_length = len(content_modified)
    removed_length = original_length - modified_length
    
    # Write back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content_modified)
    
    return {
        'file': file_path,
        'original_size': original_length,
        'modified_size': modified_length,
        'removed_bytes': removed_length,
        'status': 'success'
    }

if __name__ == '__main__':
    file_path = 'static/js/pi-storage.js'
    
    print(f"🔒 Removing debug code from {file_path}...")
    result = remove_debug_code(file_path)
    
    print(f"\n✅ Removal Complete!")
    print(f"   File: {result['file']}")
    print(f"   Original size: {result['original_size']} bytes")
    print(f"   New size: {result['modified_size']} bytes")
    print(f"   Removed: {result['removed_bytes']} bytes (~{result['removed_bytes']/1024:.1f} KB)")
    print(f"\n✅ Status: {result['status']}")
    print(f"\n🔍 Verification:")
    
    # Verify removal
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    localhost_count = content.count('127.0.0.1:7243')
    region_count = content.count('#region agent log')
    
    print(f"   Remaining localhost:7243 refs: {localhost_count}")
    print(f"   Remaining #region blocks: {region_count}")
    
    if localhost_count == 0 and region_count == 0:
        print(f"\n🎉 All debug code removed successfully!")
        sys.exit(0)
    else:
        print(f"\n⚠️ Warning: Some debug code may remain")
        sys.exit(1)
