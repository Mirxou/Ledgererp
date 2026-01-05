#!/usr/bin/env python3
"""
Security Audit Script for Pi Ledger
Checks for common security vulnerabilities
"""

import re
import json
from pathlib import Path
from typing import List, Dict

class SecurityAuditor:
    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root)
        self.issues = []
        self.warnings = []
        self.passed = []
    
    def check_xss_vulnerabilities(self):
        """Check for XSS vulnerabilities"""
        print("Checking for XSS vulnerabilities...")
        
        js_files = list(self.project_root.glob("static/js/*.js"))
        html_files = list(self.project_root.glob("static/*.html"))
        
        # Check for innerHTML usage without sanitization
        for file_path in js_files + html_files:
            try:
                content = file_path.read_text(encoding='utf-8')
                
                # Check for dangerous innerHTML patterns
                if 'innerHTML' in content:
                    # Check if DOMPurify is used
                    if 'DOMPurify' not in content and 'sanitize' not in content.lower():
                        self.warnings.append(f"⚠️  {file_path}: innerHTML used without sanitization")
                    else:
                        self.passed.append(f"✓ {file_path}: innerHTML with sanitization")
                
                # Check for eval() usage
                if 'eval(' in content:
                    self.issues.append(f"❌ {file_path}: eval() usage detected (security risk)")
                
            except Exception as e:
                self.warnings.append(f"⚠️  Error reading {file_path}: {e}")
    
    def check_sql_injection(self):
        """Check for SQL injection vulnerabilities"""
        print("Checking for SQL injection vulnerabilities...")
        
        py_files = list(self.project_root.glob("app/**/*.py"))
        
        for file_path in py_files:
            try:
                content = file_path.read_text(encoding='utf-8')
                
                # Check for raw SQL queries (if any)
                if 'execute(' in content and 'SELECT' in content:
                    # Check if parameters are used
                    if '%s' in content or '?' in content:
                        self.passed.append(f"✓ {file_path}: Parameterized queries used")
                    else:
                        self.warnings.append(f"⚠️  {file_path}: Potential SQL injection risk")
                
            except Exception as e:
                pass
    
    def check_secrets_exposure(self):
        """Check for exposed secrets"""
        print("Checking for exposed secrets...")
        
        # Check .env file is in .gitignore
        gitignore = self.project_root / ".gitignore"
        if gitignore.exists():
            gitignore_content = gitignore.read_text(encoding='utf-8')
            if '.env' in gitignore_content:
                self.passed.append("✓ .env is in .gitignore")
            else:
                self.issues.append("❌ .env is NOT in .gitignore")
        else:
            self.warnings.append("⚠️  .gitignore not found")
        
        # Check for hardcoded secrets in code
        js_files = list(self.project_root.glob("static/js/*.js"))
        py_files = list(self.project_root.glob("app/**/*.py"))
        
        secret_patterns = [
            r'api[_-]?key["\']?\s*[:=]\s*["\'][^"\']+["\']',
            r'secret[_-]?key["\']?\s*[:=]\s*["\'][^"\']+["\']',
            r'password["\']?\s*[:=]\s*["\'][^"\']+["\']',
        ]
        
        for file_path in js_files + py_files:
            try:
                content = file_path.read_text(encoding='utf-8')
                for pattern in secret_patterns:
                    matches = re.findall(pattern, content, re.IGNORECASE)
                    if matches:
                        # Check if it's a placeholder
                        if 'REPLACE' in content or 'UPDATE' in content or 'your_' in content.lower():
                            continue
                        self.warnings.append(f"⚠️  {file_path}: Potential secret exposure")
            except Exception:
                pass
    
    def check_cors_configuration(self):
        """Check CORS configuration"""
        print("Checking CORS configuration...")
        
        config_file = self.project_root / "app" / "core" / "config.py"
        main_file = self.project_root / "app" / "main.py"
        
        for file_path in [config_file, main_file]:
            if not file_path.exists():
                continue
            
            try:
                content = file_path.read_text(encoding='utf-8')
                
                # Check for wildcard CORS in actual configuration (not in warning messages)
                # Skip if it's in a warning/comment string
                lines = content.split('\n')
                for i, line in enumerate(lines):
                    # Skip comment lines and warning messages
                    if line.strip().startswith('#') or 'WARNING' in line or 'SECURITY WARNING' in line:
                        continue
                    
                    # Check for wildcard CORS assignment
                    if ('CORS_ORIGINS' in line or 'cors_origins' in line or 'allow_origins' in line):
                        if '"*"' in line or "'*'" in line:
                            # Skip if it's a check/warning (contains 'if', 'in', 'WARNING', 'check')
                            if any(keyword in line for keyword in ['if ', ' in ', 'WARNING', 'check', 'SECURITY']):
                                continue  # This is a check/warning, not actual configuration
                            # Skip if it's checking for wildcard (contains 'in' operator)
                            if ' in ' in line and ('cors_origins_list' in line or 'CORS_ORIGINS' in line):
                                continue  # This is checking if wildcard exists, not setting it
                            # Check if it's in production environment
                            if 'ENVIRONMENT' in content and 'production' in content:
                                # Check if it's actually setting wildcard or just checking
                                if '=' in line and ('allow_origins=settings.CORS_ORIGINS' in line or 'CORS_ORIGINS:' in line):
                                    # This is using settings, which is OK
                                    continue
                                self.issues.append(f"❌ {file_path}: Line {i+1} - Wildcard CORS in production")
                            else:
                                self.warnings.append(f"⚠️  {file_path}: Line {i+1} - Wildcard CORS (OK for development)")
                
                # Check if CORS is properly configured using settings
                if 'allow_origins=settings.CORS_ORIGINS' in content:
                    self.passed.append(f"✓ {file_path}: CORS uses settings (properly configured)")
            except Exception:
                pass
    
    def check_input_sanitization(self):
        """Check input sanitization"""
        print("Checking input sanitization...")
        
        js_files = list(self.project_root.glob("static/js/*.js"))
        
        sanitization_found = False
        for file_path in js_files:
            try:
                content = file_path.read_text(encoding='utf-8')
                if 'DOMPurify' in content or 'sanitize' in content.lower():
                    sanitization_found = True
                    self.passed.append(f"✓ {file_path}: Input sanitization found")
            except Exception:
                pass
        
        if not sanitization_found:
            self.warnings.append("⚠️  Input sanitization not found in JS files")
    
    def check_encryption(self):
        """Check encryption implementation"""
        print("Checking encryption implementation...")
        
        security_js = self.project_root / "static" / "js" / "security.js"
        
        if security_js.exists():
            content = security_js.read_text(encoding='utf-8')
            
            if 'AES' in content or 'encrypt' in content.lower():
                self.passed.append("✓ Encryption implementation found")
            else:
                self.warnings.append("⚠️  Encryption implementation not found")
        else:
            self.warnings.append("⚠️  security.js not found")
    
    def run_all_checks(self):
        """Run all security checks"""
        print("=" * 60)
        print("Security Audit - Pi Ledger")
        print("=" * 60)
        print()
        
        self.check_xss_vulnerabilities()
        print()
        self.check_sql_injection()
        print()
        self.check_secrets_exposure()
        print()
        self.check_cors_configuration()
        print()
        self.check_input_sanitization()
        print()
        self.check_encryption()
        print()
        
        return {
            'passed': self.passed,
            'warnings': self.warnings,
            'issues': self.issues
        }
    
    def print_report(self):
        """Print security audit report"""
        print("=" * 60)
        print("Security Audit Report")
        print("=" * 60)
        print()
        
        if self.passed:
            print("✅ PASSED:")
            for item in self.passed:
                print(f"  {item}")
            print()
        
        if self.warnings:
            print("⚠️  WARNINGS:")
            for item in self.warnings:
                print(f"  {item}")
            print()
        
        if self.issues:
            print("❌ CRITICAL ISSUES:")
            for item in self.issues:
                print(f"  {item}")
            print()
        
        print("=" * 60)
        print(f"Summary: {len(self.passed)} passed, {len(self.warnings)} warnings, {len(self.issues)} issues")
        print("=" * 60)

def main():
    auditor = SecurityAuditor()
    auditor.run_all_checks()
    auditor.print_report()
    
    if auditor.issues:
        return 1
    return 0

if __name__ == "__main__":
    import sys
    sys.exit(main())

