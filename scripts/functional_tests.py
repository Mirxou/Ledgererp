"""
Functional Tests - Additional feature testing
اختبارات وظيفية إضافية
"""
import json
import re
from pathlib import Path
from typing import Dict

class FunctionalTester:
    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root)
        self.results = []
    
    def read_file(self, file_path: str) -> str:
        """Read file content"""
        full_path = self.project_root / file_path
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            return f"ERROR: {str(e)}"
    
    def test_daily_revenue(self):
        """Test Daily Revenue feature"""
        print("[*] Testing Daily Revenue...")
        result = {
            "test": "daily_revenue",
            "status": "unknown",
            "details": []
        }
        
        index_html = self.read_file("static/index.html")
        
        # Check for daily revenue element
        if 'id="daily-revenue"' in index_html or 'daily-revenue' in index_html:
            result["details"].append("[PASS] Daily Revenue element found in HTML")
        else:
            result["details"].append("[FAIL] Daily Revenue element not found")
            result["status"] = "fail"
            self.results.append(result)
            return result
        
        # Check for daily revenue calculation in JavaScript
        if 'dailyRevenue' in index_html or 'Daily Revenue' in index_html:
            result["details"].append("[PASS] Daily Revenue calculation logic found")
            result["status"] = "pass"
        else:
            result["details"].append("[WARN] Daily Revenue calculation may not be implemented")
            result["status"] = "warning"
        
        self.results.append(result)
        return result
    
    def test_auto_lock(self):
        """Test Auto-Lock feature"""
        print("[*] Testing Auto-Lock...")
        result = {
            "test": "auto_lock",
            "status": "unknown",
            "details": []
        }
        
        auto_lock_js = self.read_file("static/js/auto-lock.js")
        
        # Check for auto-lock timeout
        if 'TIMEOUT' in auto_lock_js or 'timeout' in auto_lock_js or '300000' in auto_lock_js:
            result["details"].append("[PASS] Auto-lock timeout found")
        else:
            result["details"].append("[WARN] Auto-lock timeout not found")
        
        # Check for unlock function
        if 'unlock' in auto_lock_js or 'async unlock' in auto_lock_js:
            result["details"].append("[PASS] Unlock function found")
        else:
            result["details"].append("[FAIL] Unlock function not found")
            result["status"] = "fail"
            self.results.append(result)
            return result
        
        # Check for PIN verification
        if 'verifyPIN' in auto_lock_js or 'verify.*pin' in auto_lock_js.lower():
            result["details"].append("[PASS] PIN verification found")
        else:
            result["details"].append("[WARN] PIN verification not found")
        
        result["status"] = "pass"
        self.results.append(result)
        return result
    
    def test_dark_mode(self):
        """Test Dark Mode feature"""
        print("[*] Testing Dark Mode...")
        result = {
            "test": "dark_mode",
            "status": "unknown",
            "details": []
        }
        
        style_css = self.read_file("static/css/style.css")
        
        # Check for dark mode media query
        if '@media (prefers-color-scheme: dark)' in style_css:
            result["details"].append("[PASS] Dark mode media query found")
        else:
            result["details"].append("[FAIL] Dark mode media query not found")
            result["status"] = "fail"
            self.results.append(result)
            return result
        
        # Check for CSS variables for dark mode
        if '--bg-color' in style_css and 'dark' in style_css.lower():
            result["details"].append("[PASS] Dark mode CSS variables found")
            result["status"] = "pass"
        else:
            result["details"].append("[WARN] Dark mode CSS variables may be incomplete")
            result["status"] = "warning"
        
        self.results.append(result)
        return result
    
    def test_service_worker(self):
        """Test Service Worker"""
        print("[*] Testing Service Worker...")
        result = {
            "test": "service_worker",
            "status": "unknown",
            "details": []
        }
        
        # Check for service worker file
        sw_js = self.read_file("static/sw.js")
        if sw_js and not sw_js.startswith("ERROR"):
            result["details"].append("[PASS] Service Worker file found")
        else:
            result["details"].append("[FAIL] Service Worker file not found")
            result["status"] = "fail"
            self.results.append(result)
            return result
        
        # Check for service worker registration
        index_html = self.read_file("static/index.html")
        if 'serviceWorker' in index_html or 'navigator.serviceWorker' in index_html:
            result["details"].append("[PASS] Service Worker registration found")
            result["status"] = "pass"
        else:
            result["details"].append("[WARN] Service Worker registration not found")
            result["status"] = "warning"
        
        self.results.append(result)
        return result
    
    def run_all_tests(self):
        """Run all functional tests"""
        print("=" * 60)
        print("Starting Functional Tests...")
        print("=" * 60)
        
        self.test_daily_revenue()
        self.test_auto_lock()
        self.test_dark_mode()
        self.test_service_worker()
        
        print("\n" + "=" * 60)
        print("Functional Tests Complete!")
        print("=" * 60)
        
        return self.results

if __name__ == "__main__":
    tester = FunctionalTester()
    results = tester.run_all_tests()
    
    # Save results
    with open("functional_test_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print("\nResults saved to functional_test_results.json")
    
    # Print summary
    passed = sum(1 for r in results if r["status"] == "pass")
    failed = sum(1 for r in results if r["status"] == "fail")
    warnings = sum(1 for r in results if r["status"] == "warning")
    
    print(f"\nSummary: {passed} passed, {failed} failed, {warnings} warnings")

