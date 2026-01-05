#!/usr/bin/env python3
"""
Pi App Studio Submission Readiness Checker
Checks if the app is ready for submission to Pi App Studio
"""

import os
import json
import re
from pathlib import Path
from typing import List, Tuple, Dict

class SubmissionChecker:
    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root)
        self.issues = []
        self.warnings = []
        self.checks_passed = []
        
    def check_domain_placeholders(self) -> List[str]:
        """Check for domain placeholders that need replacement"""
        files_to_check = [
            "static/manifest.json",
            "static/.well-known/pi-app-verification",
            "static/privacy.html",
            "static/terms.html"
        ]
        
        placeholder_patterns = [
            r'\[REPLACE_WITH_YOUR_DOMAIN\]',
            r'\[UPDATE_WITH_YOUR_DOMAIN\]'
        ]
        
        issues = []
        for file_path in files_to_check:
            full_path = self.project_root / file_path
            if not full_path.exists():
                issues.append(f"[ERROR] File not found: {file_path}")
                continue
                
            try:
                content = full_path.read_text(encoding='utf-8')
                for pattern in placeholder_patterns:
                    matches = re.findall(pattern, content)
                    if matches:
                        issues.append(f"[WARNING] {file_path}: Found {len(matches)} placeholder(s) - {pattern}")
            except Exception as e:
                issues.append(f"[ERROR] Error reading {file_path}: {e}")
        
        if not issues:
            self.checks_passed.append("[OK] All domain placeholders replaced")
        else:
            self.issues.extend(issues)
        
        return issues
    
    def check_manifest_json(self) -> List[str]:
        """Check manifest.json for required fields"""
        manifest_path = self.project_root / "static/manifest.json"
        issues = []
        
        if not manifest_path.exists():
            issues.append("[ERROR] manifest.json not found")
            return issues
        
        try:
            with open(manifest_path, 'r', encoding='utf-8') as f:
                manifest = json.load(f)
            
            pi_app = manifest.get('pi_app', {})
            
            # Required fields
            required_fields = [
                'app_id', 'name', 'description', 'developer', 
                'support_email', 'home_url', 'icon_url',
                'privacy_policy_url', 'terms_of_service_url'
            ]
            
            for field in required_fields:
                if field not in pi_app:
                    issues.append(f"[ERROR] manifest.json: Missing required field 'pi_app.{field}'")
                elif isinstance(pi_app[field], str) and ('REPLACE_WITH' in pi_app[field] or 'UPDATE_WITH' in pi_app[field]):
                    issues.append(f"[WARNING] manifest.json: Field 'pi_app.{field}' contains placeholder")
            
            # Check screenshots
            screenshot_urls = pi_app.get('screenshot_urls', [])
            if not screenshot_urls or len(screenshot_urls) < 3:
                self.warnings.append("[WARNING] manifest.json: Less than 3 screenshots configured")
            
            # Check for placeholders in screenshot URLs
            for i, url in enumerate(screenshot_urls):
                if 'REPLACE_WITH' in url or 'UPDATE_WITH' in url:
                    issues.append(f"[WARNING] manifest.json: screenshot_urls[{i}] contains placeholder")
            
            if not issues:
                self.checks_passed.append("[OK] manifest.json has all required fields")
                
        except json.JSONDecodeError as e:
            issues.append(f"[ERROR] manifest.json: Invalid JSON - {e}")
        except Exception as e:
            issues.append(f"[ERROR] Error checking manifest.json: {e}")
        
        self.issues.extend(issues)
        return issues
    
    def check_env_file(self) -> List[str]:
        """Check if production .env file exists and is configured"""
        env_path = self.project_root / ".env"
        env_example = self.project_root / "env.example"
        env_template = self.project_root / "env.production.template"
        
        issues = []
        
        if not env_path.exists():
            if env_template.exists():
                self.warnings.append("[WARNING] .env file not found. Copy from env.production.template")
            else:
                issues.append("[ERROR] .env file not found and no template available")
            return issues
        
        try:
            env_content = env_path.read_text(encoding='utf-8')
            
            # Check critical settings
            if 'ENVIRONMENT=production' not in env_content and 'ENVIRONMENT="production"' not in env_content:
                issues.append("[WARNING] .env: ENVIRONMENT should be 'production'")
            
            if 'SECRET_KEY=' in env_content:
                # Check if SECRET_KEY is placeholder
                if 'REPLACE_WITH' in env_content or 'UPDATE_WITH' in env_content:
                    issues.append("[WARNING] .env: SECRET_KEY contains placeholder - generate a strong key")
                # Check length (basic check)
                secret_key_line = [line for line in env_content.split('\n') if 'SECRET_KEY=' in line]
                if secret_key_line:
                    key_value = secret_key_line[0].split('=', 1)[1].strip().strip('"').strip("'")
                    if len(key_value) < 32:
                        issues.append("[WARNING] .env: SECRET_KEY should be at least 32 characters")
            else:
                issues.append("[ERROR] .env: SECRET_KEY not found")
            
            if 'CORS_ORIGINS' in env_content:
                if '"*"' in env_content or "'*'" in env_content:
                    issues.append("[ERROR] .env: CORS_ORIGINS should NOT contain '*' in production")
            
            if not issues:
                self.checks_passed.append("[OK] .env file configured")
                
        except Exception as e:
            issues.append(f"[ERROR] Error reading .env: {e}")
        
        self.issues.extend(issues)
        return issues
    
    def check_screenshots_directory(self) -> List[str]:
        """Check if screenshots directory exists and has files"""
        screenshots_dir = self.project_root / "static" / "screenshots"
        
        issues = []
        
        if not screenshots_dir.exists():
            issues.append("[WARNING] static/screenshots directory not found")
            self.warnings.append("Create screenshots directory: mkdir -p static/screenshots")
            return issues
        
        screenshot_files = list(screenshots_dir.glob("*.png")) + list(screenshots_dir.glob("*.jpg"))
        
        if len(screenshot_files) < 3:
            issues.append(f"[WARNING] Only {len(screenshot_files)} screenshot(s) found. Need at least 3")
        else:
            self.checks_passed.append(f"[OK] Found {len(screenshot_files)} screenshot(s)")
        
        self.issues.extend(issues)
        return issues
    
    def check_security_headers(self) -> List[str]:
        """Check if security headers are configured in main.py"""
        main_py = self.project_root / "app" / "main.py"
        
        issues = []
        
        if not main_py.exists():
            issues.append("[ERROR] app/main.py not found")
            return issues
        
        try:
            content = main_py.read_text(encoding='utf-8')
            
            required_headers = [
                'Content-Security-Policy',
                'X-Content-Type-Options',
                'X-Frame-Options',
                'Strict-Transport-Security',
                'Referrer-Policy',
                'Permissions-Policy'
            ]
            
            for header in required_headers:
                if header not in content:
                    issues.append(f"[WARNING] Security header '{header}' not found in app/main.py")
            
            # Check CSP allows Pi SDK domains
            if 'Content-Security-Policy' in content:
                if 'app-cdn.minepi.com' not in content and 'sdk.minepi.com' not in content:
                    issues.append("[WARNING] CSP may not allow Pi SDK domains")
            
            if not issues:
                self.checks_passed.append("[OK] Security headers configured")
                
        except Exception as e:
            issues.append(f"[ERROR] Error checking security headers: {e}")
        
        self.issues.extend(issues)
        return issues
    
    def check_pi_sdk_integration(self) -> List[str]:
        """Check if Pi SDK is properly integrated"""
        pi_adapter = self.project_root / "static" / "js" / "pi-adapter.js"
        
        issues = []
        
        if not pi_adapter.exists():
            issues.append("[ERROR] static/js/pi-adapter.js not found")
            return issues
        
        try:
            content = pi_adapter.read_text(encoding='utf-8')
            
            # Check for Pi.createPayment usage
            if 'Pi.createPayment' not in content:
                issues.append("[WARNING] Pi.createPayment() not found - payment integration may be incomplete")
            
            # Check for onIncompletePaymentFound
            if 'onIncompletePaymentFound' not in content:
                issues.append("[ERROR] onIncompletePaymentFound callback not found - required by Pi SDK")
            
            # Check for Pi.authenticate
            if 'Pi.authenticate' not in content:
                issues.append("[ERROR] Pi.authenticate() not found - authentication may be incorrect")
            
            if not issues:
                self.checks_passed.append("[OK] Pi SDK integration looks correct")
                
        except Exception as e:
            issues.append(f"[ERROR] Error checking Pi SDK integration: {e}")
        
        self.issues.extend(issues)
        return issues
    
    def check_backend_endpoints(self) -> List[str]:
        """Check if required backend endpoints exist"""
        main_py = self.project_root / "app" / "main.py"
        
        issues = []
        
        if not main_py.exists():
            return issues
        
        try:
            content = main_py.read_text(encoding='utf-8')
            
            required_endpoints = [
                '/blockchain/verify',
                '/blockchain/approve',
                '/blockchain/complete',
                '/health',
                '/ready'
            ]
            
            for endpoint in required_endpoints:
                if endpoint not in content:
                    issues.append(f"[WARNING] Endpoint '{endpoint}' not found")
            
            if not issues:
                self.checks_passed.append("[OK] Required backend endpoints present")
                
        except Exception as e:
            issues.append(f"[ERROR] Error checking endpoints: {e}")
        
        self.issues.extend(issues)
        return issues
    
    def run_all_checks(self) -> Dict[str, any]:
        """Run all checks and return summary"""
        print("Running Pi App Studio Submission Readiness Checks...\n")
        
        self.check_domain_placeholders()
        self.check_manifest_json()
        self.check_env_file()
        self.check_screenshots_directory()
        self.check_security_headers()
        self.check_pi_sdk_integration()
        self.check_backend_endpoints()
        
        return {
            'passed': self.checks_passed,
            'issues': self.issues,
            'warnings': self.warnings
        }
    
    def print_report(self):
        """Print a formatted report"""
        print("=" * 60)
        print("Pi App Studio Submission Readiness Report")
        print("=" * 60)
        print()
        
        if self.checks_passed:
            print("[PASSED] CHECKS:")
            for check in self.checks_passed:
                print(f"  {check}")
            print()
        
        if self.warnings:
            print("[WARNING] WARNINGS:")
            for warning in self.warnings:
                print(f"  {warning}")
            print()
        
        if self.issues:
            print("[ISSUE] ISSUES TO FIX:")
            for issue in self.issues:
                print(f"  {issue}")
            print()
        
        # Summary
        total_checks = len(self.checks_passed) + len(self.issues) + len(self.warnings)
        passed_count = len(self.checks_passed)
        
        print("=" * 60)
        print(f"SUMMARY: {passed_count}/{total_checks} checks passed")
        
        if not self.issues:
            print("[SUCCESS] READY FOR SUBMISSION!")
        else:
            print("[WARNING] FIX ISSUES BEFORE SUBMISSION")
        print("=" * 60)

def main():
    checker = SubmissionChecker()
    checker.run_all_checks()
    checker.print_report()
    
    # Exit with error code if there are critical issues
    if checker.issues:
        exit(1)
    exit(0)

if __name__ == "__main__":
    main()

