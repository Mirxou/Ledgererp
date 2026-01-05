"""
Comprehensive Automated Test Suite
نظام التحقق الآلي الشامل للتحقق من جميع الميزات
"""
import sys
import time
import json
import subprocess
import requests
from pathlib import Path
from typing import Dict, List
import importlib.util

# Add parent directory to path to import modules
sys.path.insert(0, str(Path(__file__).parent.parent))

class ComprehensiveTester:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.results = {
            "static_analysis": {},
            "server_status": {},
            "browser_tests": [],
            "functional_tests": [],
            "summary": {}
        }
        self.server_process = None
        
    def check_dependencies(self):
        """Check if required dependencies are installed"""
        print("[*] Checking dependencies...")
        
        required = {
            "playwright": "playwright",
            "fastapi": "fastapi",
            "uvicorn": "uvicorn"
        }
        
        missing = []
        for module, package in required.items():
            spec = importlib.util.find_spec(module)
            if spec is None:
                missing.append(package)
        
        if missing:
            print(f"[FAIL] Missing dependencies: {', '.join(missing)}")
            print(f"Install with: pip install {' '.join(missing)}")
            if "playwright" in missing:
                print("After installing playwright, run: playwright install chromium")
            return False
        
        print("[PASS] All dependencies are installed")
        return True
    
    def run_static_analysis(self):
        """Run static code analysis"""
        print("\n" + "=" * 60)
        print("Phase 2: Static Code Analysis")
        print("=" * 60)
        
        try:
            from scripts.static_analysis import StaticAnalyzer
            
            analyzer = StaticAnalyzer(str(self.project_root))
            results = analyzer.run_all_checks()
            summary = analyzer.get_summary()
            
            self.results["static_analysis"] = {
                "summary": summary,
                "details": results
            }
            
            return summary["status"] == "pass"
        except Exception as e:
            print(f"[FAIL] Static analysis failed: {e}")
            self.results["static_analysis"] = {"error": str(e)}
            return False
    
    def start_server(self):
        """Start FastAPI server"""
        print("\n" + "=" * 60)
        print("Phase 3: Starting Server")
        print("=" * 60)
        
        try:
            # Check if server is already running
            try:
                response = requests.get("http://localhost:8000/docs", timeout=2)
                if response.status_code == 200:
                    print("[PASS] Server is already running")
                    self.results["server_status"] = {"status": "running", "already_running": True}
                    return True
            except:
                pass
            
            # Start server
            print("Starting FastAPI server...")
            self.server_process = subprocess.Popen(
                [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"],
                cwd=str(self.project_root),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            # Wait for server to start
            max_attempts = 30
            for i in range(max_attempts):
                try:
                    response = requests.get("http://localhost:8000/docs", timeout=2)
                    if response.status_code == 200:
                        print("[PASS] Server started successfully")
                        self.results["server_status"] = {"status": "running", "pid": self.server_process.pid}
                        return True
                except:
                    time.sleep(1)
                    if i % 5 == 0:
                        print(f"Waiting for server... ({i}/{max_attempts})")
            
            print("[FAIL] Server failed to start within 30 seconds")
            self.results["server_status"] = {"status": "failed", "error": "Timeout"}
            return False
            
        except Exception as e:
            print(f"[FAIL] Error starting server: {e}")
            self.results["server_status"] = {"status": "failed", "error": str(e)}
            return False
    
    def stop_server(self):
        """Stop FastAPI server"""
        if self.server_process:
            print("\nStopping server...")
            self.server_process.terminate()
            try:
                self.server_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.server_process.kill()
            print("[PASS] Server stopped")
    
    def run_browser_tests(self):
        """Run browser automation tests"""
        print("\n" + "=" * 60)
        print("Phase 4: Browser Tests")
        print("=" * 60)
        
        try:
            import asyncio
            from scripts.browser_tests import BrowserTester
            
            tester = BrowserTester()
            results = asyncio.run(tester.run_all_tests())
            
            self.results["browser_tests"] = results
            
            passed = sum(1 for r in results if r["status"] == "pass")
            failed = sum(1 for r in results if r["status"] == "fail")
            warnings = sum(1 for r in results if r["status"] == "warning")
            
            print(f"\nBrowser Tests Summary: {passed} passed, {failed} failed, {warnings} warnings")
            
            return failed == 0
        except Exception as e:
            print(f"[FAIL] Browser tests failed: {e}")
            print("Note: Make sure playwright is installed and browsers are installed")
            print("Run: pip install playwright && playwright install chromium")
            self.results["browser_tests"] = [{"error": str(e)}]
            return False
    
    def generate_report(self):
        """Generate HTML report"""
        print("\n" + "=" * 60)
        print("Phase 6: Generating Report")
        print("=" * 60)
        
        # Calculate summary
        static_status = self.results["static_analysis"].get("summary", {}).get("status", "unknown")
        server_status = self.results["server_status"].get("status", "unknown") == "running"
        
        browser_results = self.results.get("browser_tests", [])
        browser_passed = sum(1 for r in browser_results if isinstance(r, dict) and r.get("status") == "pass")
        browser_total = len([r for r in browser_results if isinstance(r, dict) and "status" in r])
        
        functional_results = self.results.get("functional_tests", [])
        functional_passed = sum(1 for r in functional_results if isinstance(r, dict) and r.get("status") == "pass")
        functional_total = len([r for r in functional_results if isinstance(r, dict) and "status" in r])
        
        self.results["summary"] = {
            "static_analysis": static_status,
            "server_running": server_status,
            "browser_tests": f"{browser_passed}/{browser_total}" if browser_total > 0 else "N/A",
            "functional_tests": f"{functional_passed}/{functional_total}" if functional_total > 0 else "N/A",
            "overall": "pass" if (static_status == "pass" and server_status) else "fail"
        }
        
        # Generate HTML report
        html_content = self.generate_html_report()
        
        report_path = self.project_root / "AUTOMATED_TEST_REPORT.html"
        with open(report_path, "w", encoding="utf-8") as f:
            f.write(html_content)
        
        print(f"[PASS] Report generated: {report_path}")
        
        # Also save JSON
        json_path = self.project_root / "test_results.json"
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(self.results, f, indent=2, ensure_ascii=False)
        
        print(f"[PASS] JSON results saved: {json_path}")
    
    def generate_html_report(self) -> str:
        """Generate HTML report content"""
        summary = self.results["summary"]
        static = self.results.get("static_analysis", {})
        browser = self.results.get("browser_tests", [])
        
        functional = self.results.get("functional_tests", [])
        
        html = f"""<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Automated Test Report - Pi Ledger</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }}
        .header {{
            background: linear-gradient(135deg, #673AB7 0%, #9C27B0 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
        }}
        .summary {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        .summary-card {{
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .summary-card h3 {{
            margin: 0 0 10px 0;
            color: #333;
        }}
        .status-pass {{ color: #4CAF50; font-weight: bold; }}
        .status-fail {{ color: #f44336; font-weight: bold; }}
        .status-warning {{ color: #ff9800; font-weight: bold; }}
        .section {{
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .section h2 {{
            border-bottom: 2px solid #673AB7;
            padding-bottom: 10px;
        }}
        .test-item {{
            padding: 15px;
            margin: 10px 0;
            border-left: 4px solid #ddd;
            background: #f9f9f9;
        }}
        .test-item.pass {{ border-left-color: #4CAF50; }}
        .test-item.fail {{ border-left-color: #f44336; }}
        .test-item.warning {{ border-left-color: #ff9800; }}
        .test-item ul {{
            margin: 10px 0;
            padding-left: 20px;
        }}
        .test-item li {{
            margin: 5px 0;
        }}
        .screenshot {{
            max-width: 100%;
            border: 1px solid #ddd;
            margin: 10px 0;
            border-radius: 4px;
        }}
        .timestamp {{
            color: #666;
            font-size: 0.9em;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Automated Test Report</h1>
        <p class="timestamp">Generated: {time.strftime('%Y-%m-%d %H:%M:%S')}</p>
    </div>
    
    <div class="summary">
        <div class="summary-card">
            <h3>Overall Status</h3>
            <p class="status-{summary.get('overall', 'unknown')}">
                {summary.get('overall', 'unknown').upper()}
            </p>
        </div>
        <div class="summary-card">
            <h3>Static Analysis</h3>
            <p class="status-{static.get('summary', {}).get('status', 'unknown')}">
                {static.get('summary', {}).get('status', 'unknown').upper()}
            </p>
        </div>
        <div class="summary-card">
            <h3>Server Status</h3>
            <p class="status-{'pass' if summary.get('server_running') else 'fail'}">
                {'RUNNING' if summary.get('server_running') else 'NOT RUNNING'}
            </p>
        </div>
        <div class="summary-card">
            <h3>Browser Tests</h3>
            <p>{summary.get('browser_tests', 'N/A')}</p>
        </div>
        <div class="summary-card">
            <h3>Functional Tests</h3>
            <p>{summary.get('functional_tests', 'N/A')}</p>
        </div>
    </div>
"""
        
        # Static Analysis Section
        if static:
            html += """
    <div class="section">
        <h2>Static Code Analysis</h2>
"""
            static_details = static.get("details", {})
            for feature, data in static_details.items():
                status = data.get("status", "unknown")
                details = data.get("details", [])
                
                html += f"""
        <div class="test-item {status}">
            <h3>{feature.replace('_', ' ').title()}</h3>
            <ul>
"""
                for detail in details:
                    html += f"                <li>{detail}</li>\n"
                html += "            </ul>\n        </div>\n"
            
            html += "    </div>\n"
        
        # Browser Tests Section
        if browser:
            html += """
    <div class="section">
        <h2>Browser Tests</h2>
"""
            for test in browser:
                if isinstance(test, dict) and "test" in test:
                    status = test.get("status", "unknown")
                    test_name = test.get("test", "unknown")
                    details = test.get("details", [])
                    screenshots = test.get("screenshots", [])
                    
                    html += f"""
        <div class="test-item {status}">
            <h3>{test_name.replace('_', ' ').title()}</h3>
            <ul>
"""
                    for detail in details:
                        html += f"                <li>{detail}</li>\n"
                    html += "            </ul>\n"
                    
                    if screenshots:
                        html += "            <h4>Screenshots:</h4>\n"
                        for screenshot in screenshots:
                            if screenshot and Path(screenshot).exists():
                                html += f'            <img src="{screenshot}" class="screenshot" alt="Screenshot">\n'
                    
                    html += "        </div>\n"
            
            html += "    </div>\n"
        
        # Functional Tests Section
        if functional:
            html += """
    <div class="section">
        <h2>Functional Tests</h2>
"""
            for test in functional:
                if isinstance(test, dict) and "test" in test:
                    status = test.get("status", "unknown")
                    test_name = test.get("test", "unknown")
                    details = test.get("details", [])
                    
                    html += f"""
        <div class="test-item {status}">
            <h3>{test_name.replace('_', ' ').title()}</h3>
            <ul>
"""
                    for detail in details:
                        html += f"                <li>{detail}</li>\n"
                    html += "            </ul>\n        </div>\n"
            
            html += "    </div>\n"
        
        html += """
</body>
</html>
"""
        return html
    
    def run(self):
        """Run all tests"""
        print("=" * 60)
        print("COMPREHENSIVE AUTOMATED TEST SUITE")
        print("=" * 60)
        
        try:
            # Phase 1: Check dependencies
            if not self.check_dependencies():
                print("\n[FAIL] Please install missing dependencies first")
                return False
            
            # Phase 2: Static Analysis
            static_ok = self.run_static_analysis()
            
            # Phase 3: Start Server
            server_ok = self.start_server()
            
            if not server_ok:
                print("\n[WARN] Server not running, skipping browser tests")
            else:
                # Phase 4: Browser Tests
                try:
                    browser_ok = self.run_browser_tests()
                except Exception as e:
                    print(f"\n[WARN] Browser tests skipped: {e}")
                    browser_ok = False
            
            # Phase 5: Functional Tests
            try:
                from scripts.functional_tests import FunctionalTester
                functional_tester = FunctionalTester(str(self.project_root))
                functional_results = functional_tester.run_all_tests()
                self.results["functional_tests"] = functional_results
            except Exception as e:
                print(f"\n[WARN] Functional tests skipped: {e}")
                self.results["functional_tests"] = [{"error": str(e)}]
                
                # Phase 5: Stop Server
                self.stop_server()
            
            # Phase 6: Generate Report
            self.generate_report()
            
            # Final summary
            print("\n" + "=" * 60)
            print("TEST SUITE COMPLETE")
            print("=" * 60)
            print(f"Static Analysis: {'[PASS]' if static_ok else '[FAIL]'}")
            print(f"Server Status: {'[RUNNING]' if server_ok else '[FAILED]'}")
            print("\nView detailed report: AUTOMATED_TEST_REPORT.html")
            
            return static_ok and server_ok
            
        except KeyboardInterrupt:
            print("\n\n[WARN] Tests interrupted by user")
            self.stop_server()
            return False
        except Exception as e:
            print(f"\n[FAIL] Test suite failed: {e}")
            import traceback
            traceback.print_exc()
            self.stop_server()
            return False

if __name__ == "__main__":
    tester = ComprehensiveTester()
    success = tester.run()
    sys.exit(0 if success else 1)

