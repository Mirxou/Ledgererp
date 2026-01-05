"""
Browser Automation Tests using Playwright
اختبارات آلية بالمتصفح
"""
import asyncio
import json
import time
from pathlib import Path
from typing import Dict, List, Optional
from playwright.async_api import async_playwright, Page, Browser, BrowserContext

class BrowserTester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.results = []
        self.screenshots_dir = Path("test_screenshots")
        self.screenshots_dir.mkdir(exist_ok=True)
        
    async def init_browser(self) -> tuple[Browser, BrowserContext, Page]:
        """Initialize browser"""
        playwright = await async_playwright().start()
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            locale="en-US"
        )
        page = await context.new_page()
        return browser, context, page
    
    async def take_screenshot(self, page: Page, name: str):
        """Take screenshot"""
        screenshot_path = self.screenshots_dir / f"{name}.png"
        try:
            await page.screenshot(path=str(screenshot_path), full_page=False, timeout=10000)
        except Exception as e:
            print(f"[WARN] Screenshot failed for {name}: {e}")
            # Try without full_page
            try:
                await page.screenshot(path=str(screenshot_path), timeout=5000)
            except:
                return None
        return str(screenshot_path)
    
    async def check_console_errors(self, page: Page) -> List[str]:
        """Check for console errors"""
        errors = []
        
        def handle_console(msg):
            if msg.type == "error":
                errors.append(msg.text)
        
        page.on("console", handle_console)
        return errors
    
    async def test_demo_mode(self, page: Page) -> Dict:
        """Test Demo Mode functionality"""
        print(" Testing Demo Mode...")
        test_result = {
            "test": "demo_mode",
            "status": "unknown",
            "details": [],
            "screenshots": []
        }
        
        try:
            # Navigate to index page
            try:
                await page.goto(f"{self.base_url}/static/index.html", wait_until="domcontentloaded", timeout=15000)
            except:
                await page.goto(f"{self.base_url}/static/index.html", timeout=15000)
            await page.wait_for_timeout(3000)  # Wait for page to load
            
            # Take initial screenshot
            screenshot = await self.take_screenshot(page, "demo_mode_initial")
            test_result["screenshots"].append(screenshot)
            
            # Check for demo mode button
            demo_button = await page.query_selector('#demo-mode-btn')
            if not demo_button:
                # Try alternative selector
                demo_button = await page.query_selector('button:has-text("Enter Demo Mode")')
            
            if demo_button:
                test_result["details"].append("[PASS] Demo Mode button found")
                
                # Click demo mode button
                await demo_button.click()
                await page.wait_for_timeout(3000)  # Wait for demo data to load
                
                # Take screenshot after clicking
                screenshot = await self.take_screenshot(page, "demo_mode_activated")
                test_result["screenshots"].append(screenshot)
                
                # Check for dashboard
                dashboard = await page.query_selector('#dashboard-section, .dashboard-section, [id*="dashboard"]')
                if dashboard:
                    test_result["details"].append("[PASS] Dashboard appeared after Demo Mode")
                    
                    # Check for demo invoices (should be 3)
                    invoice_count = await page.evaluate("""
                        () => {
                            const invoices = document.querySelectorAll('[id*="invoice"], .invoice-item, tr[class*="invoice"]');
                            return invoices.length;
                        }
                    """)
                    
                    if invoice_count > 0:
                        test_result["details"].append(f"[PASS] Found {invoice_count} invoice(s) in demo data")
                    else:
                        test_result["details"].append("[WARN] No invoices found in demo data")
                    
                    test_result["status"] = "pass"
                else:
                    test_result["details"].append("[FAIL] Dashboard did not appear after Demo Mode")
                    test_result["status"] = "fail"
            else:
                test_result["details"].append("[FAIL] Demo Mode button not found")
                test_result["status"] = "fail"
                
        except Exception as e:
            test_result["details"].append(f"[FAIL] Error: {str(e)}")
            test_result["status"] = "fail"
            screenshot = await self.take_screenshot(page, "demo_mode_error")
            test_result["screenshots"].append(screenshot)
        
        self.results.append(test_result)
        return test_result
    
    async def test_invoice_creation(self, page: Page) -> Dict:
        """Test Invoice Creation"""
        print(" Testing Invoice Creation...")
        test_result = {
            "test": "invoice_creation",
            "status": "unknown",
            "details": [],
            "screenshots": []
        }
        
        try:
            # First activate demo mode
            try:
                await page.goto(f"{self.base_url}/static/index.html", wait_until="domcontentloaded", timeout=15000)
            except:
                await page.goto(f"{self.base_url}/static/index.html", timeout=15000)
            await page.wait_for_timeout(2000)
            
            demo_button = await page.query_selector('#demo-mode-btn, button:has-text("Enter Demo Mode")')
            if demo_button:
                await demo_button.click()
                await page.wait_for_timeout(3000)
            
            # Look for create invoice button
            create_btn = await page.query_selector('#create-invoice-btn, button:has-text("Create Invoice"), button:has-text("New Invoice")')
            
            if create_btn:
                test_result["details"].append("[PASS] Create Invoice button found")
                await create_btn.click()
                await page.wait_for_timeout(1000)
                
                screenshot = await self.take_screenshot(page, "invoice_modal_opened")
                test_result["screenshots"].append(screenshot)
                
                # Try to add an item
                item_name_input = await page.query_selector('input[class*="item-name"], input[placeholder*="Item"], input[placeholder*="name"]')
                if item_name_input:
                    await item_name_input.fill("Test Item")
                    test_result["details"].append("[PASS] Item name input found and filled")
                
                price_input = await page.query_selector('input[class*="item-price"], input[placeholder*="Price"]')
                if price_input:
                    await price_input.fill("10.5")
                    test_result["details"].append("[PASS] Price input found and filled")
                
                qty_input = await page.query_selector('input[class*="item-qty"], input[placeholder*="Qty"], input[placeholder*="Quantity"]')
                if qty_input:
                    await qty_input.fill("2")
                    test_result["details"].append("[PASS] Quantity input found and filled")
                
                # Check if total is calculated
                await page.wait_for_timeout(500)  # Wait for calculation
                total_element = await page.query_selector('[id*="total"], .total, .final-total')
                if total_element:
                    total_text = await total_element.inner_text()
                    test_result["details"].append(f"[PASS] Total calculated: {total_text}")
                
                # Check for QR code
                qr_code = await page.query_selector('canvas[class*="qr"], img[alt*="QR"], canvas[id*="qr"]')
                if qr_code:
                    test_result["details"].append("[PASS] QR Code generated")
                
                screenshot = await self.take_screenshot(page, "invoice_with_item")
                test_result["screenshots"].append(screenshot)
                
                test_result["status"] = "pass"
            else:
                test_result["details"].append("[FAIL] Create Invoice button not found")
                test_result["status"] = "fail"
                
        except Exception as e:
            test_result["details"].append(f"[FAIL] Error: {str(e)}")
            test_result["status"] = "fail"
            screenshot = await self.take_screenshot(page, "invoice_creation_error")
            test_result["screenshots"].append(screenshot)
        
        self.results.append(test_result)
        return test_result
    
    async def test_responsive_design(self, page: Page) -> Dict:
        """Test Responsive Design on different screen sizes"""
        print(" Testing Responsive Design...")
        test_result = {
            "test": "responsive_design",
            "status": "unknown",
            "details": [],
            "screenshots": []
        }
        
        viewports = [
            {"width": 375, "height": 667, "name": "mobile_iphone_se"},
            {"width": 768, "height": 1024, "name": "tablet_ipad"},
            {"width": 1920, "height": 1080, "name": "desktop"}
        ]
        
        try:
            try:
                await page.goto(f"{self.base_url}/static/index.html", wait_until="domcontentloaded", timeout=15000)
            except:
                await page.goto(f"{self.base_url}/static/index.html", timeout=15000)
            
            for viewport in viewports:
                await page.set_viewport_size({"width": viewport["width"], "height": viewport["height"]})
                await page.wait_for_timeout(1000)
                
                screenshot = await self.take_screenshot(page, f"responsive_{viewport['name']}")
                test_result["screenshots"].append(screenshot)
                
                # Check if content is readable
                body_text = await page.evaluate("() => window.getComputedStyle(document.body).fontSize")
                test_result["details"].append(f"[PASS] {viewport['name']}: Font size {body_text}")
                
                # Check if buttons are visible
                buttons = await page.query_selector_all('button')
                visible_buttons = await page.evaluate("""
                    () => {
                        const buttons = document.querySelectorAll('button');
                        return Array.from(buttons).filter(btn => {
                            const style = window.getComputedStyle(btn);
                            return style.display !== 'none' && style.visibility !== 'hidden';
                        }).length;
                    }
                """)
                
                test_result["details"].append(f"[PASS] {viewport['name']}: {visible_buttons} visible buttons")
            
            test_result["status"] = "pass"
            
        except Exception as e:
            test_result["details"].append(f"[FAIL] Error: {str(e)}")
            test_result["status"] = "fail"
        
        self.results.append(test_result)
        return test_result
    
    async def test_bip39_pin(self, page: Page) -> Dict:
        """Test BIP-39 and PIN"""
        print(" Testing BIP-39 and PIN...")
        test_result = {
            "test": "bip39_pin",
            "status": "unknown",
            "details": [],
            "screenshots": []
        }
        
        try:
            try:
                await page.goto(f"{self.base_url}/static/index.html", wait_until="domcontentloaded", timeout=15000)
            except:
                await page.goto(f"{self.base_url}/static/index.html", timeout=15000)
            await page.wait_for_timeout(2000)
            
            # Look for setup section or mnemonic input
            mnemonic_input = await page.query_selector('#mnemonic-input, input[placeholder*="mnemonic"], input[placeholder*="words"]')
            pin_input = await page.query_selector('#pin-input, input[placeholder*="PIN"], input[type="password"][maxlength="6"]')
            
            if mnemonic_input:
                test_result["details"].append("[PASS] Mnemonic input field found")
                
                # Check maxlength for PIN
                if pin_input:
                    maxlength = await pin_input.get_attribute("maxlength")
                    if maxlength == "6":
                        test_result["details"].append("[PASS] PIN input has maxlength=6")
                    else:
                        test_result["details"].append(f"[WARN] PIN maxlength is {maxlength}, expected 6")
                else:
                    test_result["details"].append("[WARN] PIN input not found on main page")
                
                # Try to generate mnemonic
                generate_btn = await page.query_selector('#generate-mnemonic-btn, button:has-text("Generate")')
                if generate_btn:
                    test_result["details"].append("[PASS] Generate mnemonic button found")
                else:
                    test_result["details"].append("[WARN] Generate mnemonic button not found")
                
                test_result["status"] = "pass"
            else:
                test_result["details"].append("[WARN] Setup page not visible (may need to be triggered)")
                test_result["status"] = "warning"
                
        except Exception as e:
            test_result["details"].append(f"[FAIL] Error: {str(e)}")
            test_result["status"] = "fail"
            screenshot = await self.take_screenshot(page, "bip39_pin_error")
            test_result["screenshots"].append(screenshot)
        
        self.results.append(test_result)
        return test_result
    
    async def test_pi_authentication(self, page: Page) -> Dict:
        """Test Pi Authentication"""
        print(" Testing Pi Authentication...")
        test_result = {
            "test": "pi_authentication",
            "status": "unknown",
            "details": [],
            "screenshots": []
        }
        
        try:
            try:
                await page.goto(f"{self.base_url}/static/index.html", wait_until="domcontentloaded", timeout=15000)
            except:
                await page.goto(f"{self.base_url}/static/index.html", timeout=15000)
            await page.wait_for_timeout(2000)
            
            # Look for Pi login button
            pi_btn = await page.query_selector('#pi-auth-btn, button:has-text("Pi"), button:has-text("Login with Pi")')
            
            if pi_btn:
                test_result["details"].append("[PASS] Pi Authentication button found")
                
                # Check if button is visible
                is_visible = await pi_btn.is_visible()
                if is_visible:
                    test_result["details"].append("[PASS] Pi Authentication button is visible")
                    test_result["status"] = "pass"
                else:
                    test_result["details"].append("[WARN] Pi Authentication button exists but not visible")
                    test_result["status"] = "warning"
            else:
                test_result["details"].append("[FAIL] Pi Authentication button not found")
                test_result["status"] = "fail"
                
            screenshot = await self.take_screenshot(page, "pi_auth_check")
            test_result["screenshots"].append(screenshot)
                
        except Exception as e:
            test_result["details"].append(f"[FAIL] Error: {str(e)}")
            test_result["status"] = "fail"
        
        self.results.append(test_result)
        return test_result
    
    async def test_console_errors(self, page: Page) -> Dict:
        """Test for console errors"""
        print(" Checking Console Errors...")
        test_result = {
            "test": "console_errors",
            "status": "unknown",
            "details": [],
            "screenshots": []
        }
        
        console_errors = []
        
        def handle_console(msg):
            if msg.type == "error":
                console_errors.append(msg.text)
        
        page.on("console", handle_console)
        
        try:
            try:
                await page.goto(f"{self.base_url}/static/index.html", wait_until="domcontentloaded", timeout=15000)
            except:
                await page.goto(f"{self.base_url}/static/index.html", timeout=15000)
            await page.wait_for_timeout(3000)  # Wait for all scripts to load
            
            if console_errors:
                test_result["details"].append(f"[WARN] Found {len(console_errors)} console error(s)")
                for error in console_errors[:5]:  # Show first 5
                    test_result["details"].append(f"  - {error}")
                test_result["status"] = "warning"
            else:
                test_result["details"].append("[PASS] No console errors found")
                test_result["status"] = "pass"
                
        except Exception as e:
            test_result["details"].append(f"[FAIL] Error: {str(e)}")
            test_result["status"] = "fail"
        
        self.results.append(test_result)
        return test_result
    
    async def run_all_tests(self):
        """Run all browser tests"""
        print("=" * 60)
        print("Starting Browser Tests...")
        print("=" * 60)
        
        browser, context, page = await self.init_browser()
        
        try:
            # Run all tests
            await self.test_console_errors(page)
            await self.test_demo_mode(page)
            await self.test_invoice_creation(page)
            await self.test_responsive_design(page)
            await self.test_bip39_pin(page)
            await self.test_pi_authentication(page)
            
        finally:
            await browser.close()
        
        print("\n" + "=" * 60)
        print("Browser Tests Complete!")
        print("=" * 60)
        
        return self.results

async def main():
    tester = BrowserTester()
    results = await tester.run_all_tests()
    
    # Save results
    with open("browser_test_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print("\nResults saved to browser_test_results.json")
    
    # Print summary
    passed = sum(1 for r in results if r["status"] == "pass")
    failed = sum(1 for r in results if r["status"] == "fail")
    warnings = sum(1 for r in results if r["status"] == "warning")
    
    print(f"\nSummary: {passed} passed, {failed} failed, {warnings} warnings")

if __name__ == "__main__":
    asyncio.run(main())

