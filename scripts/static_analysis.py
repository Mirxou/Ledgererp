"""
Static Code Analysis - Comprehensive Feature Verification
فحص الكود الثابت للتحقق من وجود جميع الميزات
"""
import os
import re
import json
from pathlib import Path
from typing import Dict, List, Tuple

class StaticAnalyzer:
    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root)
        self.results = {
            "demo_mode": {"status": "unknown", "details": []},
            "invoice_creation": {"status": "unknown", "details": []},
            "pi_authentication": {"status": "unknown", "details": []},
            "bip39": {"status": "unknown", "details": []},
            "pin": {"status": "unknown", "details": []},
            "responsive_design": {"status": "unknown", "details": []},
            "xss_protection": {"status": "unknown", "details": []},
            "error_handling": {"status": "unknown", "details": []},
        }
    
    def read_file(self, file_path: str) -> str:
        """Read file content"""
        full_path = self.project_root / file_path
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            return f"ERROR: {str(e)}"
    
    def check_demo_mode(self):
        """Check Demo Mode implementation"""
        print("[*] Checking Demo Mode...")
        issues = []
        
        # Check index.html for demo button
        index_html = self.read_file("static/index.html")
        if 'id="demo-mode-btn"' in index_html or 'Enter Demo Mode' in index_html:
            self.results["demo_mode"]["details"].append("[PASS] Demo Mode button found in index.html")
        else:
            issues.append("[FAIL] Demo Mode button not found in index.html")
        
        # Check db.js for loadDemoData function
        db_js = self.read_file("static/js/db.js")
        if 'loadDemoData' in db_js or 'async loadDemoData' in db_js:
            self.results["demo_mode"]["details"].append("[PASS] loadDemoData() function found in db.js")
        else:
            issues.append("[FAIL] loadDemoData() function not found in db.js")
        
        if not issues:
            self.results["demo_mode"]["status"] = "pass"
        else:
            self.results["demo_mode"]["status"] = "fail"
            self.results["demo_mode"]["details"].extend(issues)
    
    def check_invoice_creation(self):
        """Check Invoice Creation features"""
        print("[*] Checking Invoice Creation...")
        issues = []
        
        invoice_js = self.read_file("static/js/invoice.js")
        
        # Check for addItem
        if re.search(r'addItem\s*\(|function\s+addItem', invoice_js):
            self.results["invoice_creation"]["details"].append("✅ addItem() function found")
        else:
            issues.append("❌ addItem() function not found")
        
        # Check for calculateTotals
        if 'calculateTotals' in invoice_js:
            self.results["invoice_creation"]["details"].append("✅ calculateTotals() function found")
        else:
            issues.append("❌ calculateTotals() function not found")
        
        # Check for debouncedCalculateTotals
        if 'debouncedCalculateTotals' in invoice_js:
            self.results["invoice_creation"]["details"].append("✅ debouncedCalculateTotals() found (performance optimization)")
        else:
            issues.append("⚠️ debouncedCalculateTotals() not found (performance may be affected)")
        
        # Check for QR code generation
        if 'QRious' in invoice_js or 'generateQRCode' in invoice_js or 'qr-code' in invoice_js:
            self.results["invoice_creation"]["details"].append("✅ QR Code generation found")
        else:
            issues.append("⚠️ QR Code generation not found")
        
        if not issues:
            self.results["invoice_creation"]["status"] = "pass"
        else:
            self.results["invoice_creation"]["status"] = "fail"
            self.results["invoice_creation"]["details"].extend(issues)
    
    def check_pi_authentication(self):
        """Check Pi Authentication implementation"""
        print("[*] Checking Pi Authentication...")
        issues = []
        
        pi_adapter_js = self.read_file("static/js/pi-adapter.js")
        
        # Check for Pi.authenticate
        if 'Pi.authenticate' in pi_adapter_js:
            self.results["pi_authentication"]["details"].append("✅ Pi.authenticate() found")
        else:
            issues.append("❌ Pi.authenticate() not found")
        
        # Check for initialize
        if 'async initialize' in pi_adapter_js or 'initialize()' in pi_adapter_js:
            self.results["pi_authentication"]["details"].append("✅ Pi SDK initialize() found")
        else:
            issues.append("❌ Pi SDK initialize() not found")
        
        # Check for onIncompletePaymentFound
        if 'onIncompletePaymentFound' in pi_adapter_js:
            self.results["pi_authentication"]["details"].append("✅ onIncompletePaymentFound() found (Req #2)")
        else:
            issues.append("⚠️ onIncompletePaymentFound() not found")
        
        if not issues:
            self.results["pi_authentication"]["status"] = "pass"
        else:
            self.results["pi_authentication"]["status"] = "fail"
            self.results["pi_authentication"]["details"].extend(issues)
    
    def check_bip39(self):
        """Check BIP-39 implementation"""
        print("[*] Checking BIP-39...")
        issues = []
        
        security_js = self.read_file("static/js/security.js")
        
        # Check for generateMnemonic
        if 'generateMnemonic' in security_js:
            self.results["bip39"]["details"].append("✅ generateMnemonic() function found")
        else:
            issues.append("❌ generateMnemonic() function not found")
        
        # Check for 12 words validation
        if '12 words' in security_js or 'words.length !== 12' in security_js:
            self.results["bip39"]["details"].append("✅ 12-word validation found")
        else:
            issues.append("⚠️ 12-word validation not found")
        
        # Check for anti-phishing (24-word block)
        if '24' in security_js and ('wordCount === 24' in security_js or 'words.length === 24' in security_js):
            self.results["bip39"]["details"].append("✅ Anti-phishing (24-word block) found")
        else:
            issues.append("⚠️ Anti-phishing (24-word block) not found")
        
        if not issues:
            self.results["bip39"]["status"] = "pass"
        else:
            self.results["bip39"]["status"] = "fail"
            self.results["bip39"]["details"].extend(issues)
    
    def check_pin(self):
        """Check PIN implementation"""
        print("[*] Checking PIN...")
        issues = []
        
        index_html = self.read_file("static/index.html")
        auto_lock_js = self.read_file("static/js/auto-lock.js")
        
        # Check for PIN input in index.html
        if 'id="pin-input"' in index_html or 'pin-input' in index_html:
            self.results["pin"]["details"].append("✅ PIN input field found in index.html")
        else:
            issues.append("❌ PIN input field not found in index.html")
        
        # Check for maxlength="6" or 6-digit validation
        if 'maxlength="6"' in index_html or 'maxlength="6"' in auto_lock_js:
            self.results["pin"]["details"].append("✅ PIN maxlength=6 found")
        else:
            issues.append("⚠️ PIN maxlength=6 not found")
        
        # Check for PIN in auto-lock
        if 'unlock-pin-input' in auto_lock_js or 'pin-input' in auto_lock_js:
            self.results["pin"]["details"].append("✅ PIN field in auto-lock found")
        else:
            issues.append("⚠️ PIN field in auto-lock not found")
        
        if not issues:
            self.results["pin"]["status"] = "pass"
        else:
            self.results["pin"]["status"] = "fail"
            self.results["pin"]["details"].extend(issues)
    
    def check_responsive_design(self):
        """Check Responsive Design"""
        print("[*] Checking Responsive Design...")
        issues = []
        
        style_css = self.read_file("static/css/style.css")
        
        # Check for media queries
        if '@media' in style_css:
            media_queries = re.findall(r'@media[^{]*', style_css)
            self.results["responsive_design"]["details"].append(f"✅ Found {len(media_queries)} media queries")
            
            # Check for mobile breakpoint
            if re.search(r'@media.*max-width.*600|@media.*max-width.*768', style_css):
                self.results["responsive_design"]["details"].append("✅ Mobile breakpoint found")
            else:
                issues.append("⚠️ Mobile breakpoint not found")
            
            # Check for tablet breakpoint
            if re.search(r'@media.*min-width.*600|@media.*min-width.*768', style_css):
                self.results["responsive_design"]["details"].append("✅ Tablet breakpoint found")
            else:
                issues.append("⚠️ Tablet breakpoint not found")
        else:
            issues.append("❌ No media queries found")
        
        # Check for safe area support
        if 'safe-area-inset' in style_css:
            self.results["responsive_design"]["details"].append("✅ Safe area support found")
        else:
            issues.append("⚠️ Safe area support not found")
        
        if not issues:
            self.results["responsive_design"]["status"] = "pass"
        else:
            self.results["responsive_design"]["status"] = "fail"
            self.results["responsive_design"]["details"].extend(issues)
    
    def check_xss_protection(self):
        """Check XSS Protection"""
        print("[*] Checking XSS Protection...")
        issues = []
        warnings = []
        
        # Check all JS files for DOMPurify usage
        js_files = [
            "static/js/invoice.js",
            "static/js/ui-utils.js",
            "static/js/audit-logs.js",
            "static/js/bug-reporting.js",
            "static/js/csv-import.js",
            "static/index.html",
            "static/app.html"
        ]
        
        dompurify_found = False
        innerhtml_unsafe = []
        
        for js_file in js_files:
            if not os.path.exists(self.project_root / js_file):
                continue
                
            content = self.read_file(js_file)
            
            # Check for DOMPurify
            if 'DOMPurify' in content or 'dompurify' in content.lower():
                dompurify_found = True
                self.results["xss_protection"]["details"].append(f"✅ DOMPurify found in {js_file}")
            
            # Check for innerHTML usage
            innerhtml_matches = re.finditer(r'\.innerHTML\s*=', content)
            for match in innerhtml_matches:
                # Check context for sanitization
                start = max(0, match.start() - 100)
                end = min(len(content), match.end() + 50)
                context = content[start:end]
                
                if 'DOMPurify' not in context and 'sanitize' not in context.lower():
                    innerhtml_unsafe.append(f"{js_file}:{self.get_line_number(content, match.start())}")
        
        if dompurify_found:
            self.results["xss_protection"]["details"].append("✅ DOMPurify is being used")
        else:
            issues.append("❌ DOMPurify not found")
        
        if innerhtml_unsafe:
            warnings.append(f"⚠️ Found {len(innerhtml_unsafe)} potentially unsafe innerHTML usages")
            for unsafe in innerhtml_unsafe[:5]:  # Show first 5
                warnings.append(f"  - {unsafe}")
        
        if not issues and not warnings:
            self.results["xss_protection"]["status"] = "pass"
        elif not issues:
            self.results["xss_protection"]["status"] = "warning"
            self.results["xss_protection"]["details"].extend(warnings)
        else:
            self.results["xss_protection"]["status"] = "fail"
            self.results["xss_protection"]["details"].extend(issues)
            self.results["xss_protection"]["details"].extend(warnings)
    
    def check_error_handling(self):
        """Check Error Handling"""
        print("[*] Checking Error Handling...")
        issues = []
        
        # Check for ErrorHandler
        error_handler_js = self.read_file("static/js/error-handler.js")
        
        if 'ErrorHandler' in error_handler_js or 'class ErrorHandler' in error_handler_js:
            self.results["error_handling"]["details"].append("✅ ErrorHandler class found")
        else:
            issues.append("❌ ErrorHandler class not found")
        
        # Check for try-catch blocks in critical files
        invoice_js = self.read_file("static/js/invoice.js")
        try_catch_count = len(re.findall(r'try\s*{', invoice_js))
        if try_catch_count > 0:
            self.results["error_handling"]["details"].append(f"✅ Found {try_catch_count} try-catch blocks in invoice.js")
        else:
            issues.append("⚠️ No try-catch blocks found in invoice.js")
        
        if not issues:
            self.results["error_handling"]["status"] = "pass"
        else:
            self.results["error_handling"]["status"] = "fail"
            self.results["error_handling"]["details"].extend(issues)
    
    def get_line_number(self, content: str, position: int) -> int:
        """Get line number from position"""
        return content[:position].count('\n') + 1
    
    def run_all_checks(self):
        """Run all static analysis checks"""
        print("=" * 60)
        print("Starting Static Code Analysis...")
        print("=" * 60)
        
        self.check_demo_mode()
        self.check_invoice_creation()
        self.check_pi_authentication()
        self.check_bip39()
        self.check_pin()
        self.check_responsive_design()
        self.check_xss_protection()
        self.check_error_handling()
        
        print("\n" + "=" * 60)
        print("Static Analysis Complete!")
        print("=" * 60)
        
        return self.results
    
    def get_summary(self):
        """Get summary of results"""
        total = len(self.results)
        passed = sum(1 for r in self.results.values() if r["status"] == "pass")
        failed = sum(1 for r in self.results.values() if r["status"] == "fail")
        warnings = sum(1 for r in self.results.values() if r["status"] == "warning")
        
        return {
            "total": total,
            "passed": passed,
            "failed": failed,
            "warnings": warnings,
            "status": "pass" if failed == 0 else "fail"
        }

if __name__ == "__main__":
    analyzer = StaticAnalyzer()
    results = analyzer.run_all_checks()
    summary = analyzer.get_summary()
    
    print(f"\nSummary: {summary['passed']}/{summary['total']} checks passed")
    if summary['failed'] > 0:
        print(f"Failed: {summary['failed']}")
    if summary['warnings'] > 0:
        print(f"Warnings: {summary['warnings']}")
    
    # Save results to JSON
    output = {
        "summary": summary,
        "details": results
    }
    
    with open("static_analysis_results.json", "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print("\nResults saved to static_analysis_results.json")

