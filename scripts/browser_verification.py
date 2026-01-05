"""
Browser Verification - Open browser and verify all features
فتح المتصفح والتحقق من جميع الميزات تلقائياً
"""
import asyncio
import time
from pathlib import Path
from playwright.async_api import async_playwright, Page, Browser, BrowserContext

class BrowserVerifier:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.results = []
        self.screenshots_dir = Path("test_screenshots")
        self.screenshots_dir.mkdir(exist_ok=True)
        
    async def init_browser(self, headless: bool = False):
        """Initialize browser (headless=False to see it)"""
        playwright = await async_playwright().start()
        browser = await playwright.chromium.launch(headless=headless)
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
            await page.screenshot(path=str(screenshot_path), full_page=False, timeout=5000)
        except Exception as e:
            print(f"[WARN] Screenshot failed for {name}: {e}")
            return None
        return str(screenshot_path)
    
    async def verify_demo_mode(self, page: Page):
        """Verify Demo Mode"""
        print("\n[*] Verifying Demo Mode...")
        try:
            await page.goto(f"{self.base_url}/static/index.html", wait_until="domcontentloaded", timeout=15000)
            await page.wait_for_timeout(3000)
            
            # Look for demo button
            demo_button = await page.query_selector('#demo-mode-btn, button:has-text("Enter Demo Mode"), button:has-text("Demo")')
            if demo_button:
                print("  [PASS] Demo Mode button found")
                await demo_button.click()
                await page.wait_for_timeout(3000)
                
                # Check for dashboard
                dashboard = await page.query_selector('#dashboard-section, .dashboard-section, [id*="dashboard"]')
                if dashboard:
                    print("  [PASS] Dashboard appeared")
                    return True
                else:
                    print("  [FAIL] Dashboard did not appear")
                    return False
            else:
                print("  [FAIL] Demo Mode button not found")
                return False
        except Exception as e:
            print(f"  [FAIL] Error: {e}")
            return False
    
    async def verify_invoice_creation(self, page: Page):
        """Verify Invoice Creation"""
        print("\n[*] Verifying Invoice Creation...")
        try:
            # Look for create invoice button
            create_btn = await page.query_selector('#create-invoice-btn, button:has-text("Create Invoice"), button:has-text("New Invoice"), button:has-text("فاتورة")')
            
            if create_btn:
                print("  [PASS] Create Invoice button found")
                await create_btn.click()
                await page.wait_for_timeout(2000)
                
                # Check for modal
                modal = await page.query_selector('[role="dialog"], .modal, #invoice-modal')
                if modal:
                    print("  [PASS] Invoice modal opened")
                    
                    # Check for item inputs
                    item_name = await page.query_selector('input[class*="item-name"], input[placeholder*="Item"], input[placeholder*="name"]')
                    if item_name:
                        print("  [PASS] Item name input found")
                    else:
                        print("  [WARN] Item name input not found")
                    
                    return True
                else:
                    print("  [FAIL] Invoice modal did not open")
                    return False
            else:
                print("  [FAIL] Create Invoice button not found")
                return False
        except Exception as e:
            print(f"  [FAIL] Error: {e}")
            return False
    
    async def verify_responsive_design(self, page: Page):
        """Verify Responsive Design"""
        print("\n[*] Verifying Responsive Design...")
        try:
            viewports = [
                {"width": 375, "height": 667, "name": "Mobile"},
                {"width": 768, "height": 1024, "name": "Tablet"},
                {"width": 1920, "height": 1080, "name": "Desktop"}
            ]
            
            for viewport in viewports:
                await page.set_viewport_size({"width": viewport["width"], "height": viewport["height"]})
                await page.wait_for_timeout(1000)
                
                # Check if buttons are visible
                buttons = await page.query_selector_all('button')
                visible_count = 0
                for btn in buttons:
                    if await btn.is_visible():
                        visible_count += 1
                
                print(f"  [PASS] {viewport['name']}: {visible_count} visible buttons")
            
            return True
        except Exception as e:
            print(f"  [FAIL] Error: {e}")
            return False
    
    async def verify_pi_auth(self, page: Page):
        """Verify Pi Authentication"""
        print("\n[*] Verifying Pi Authentication...")
        try:
            # Look for Pi login button
            pi_btn = await page.query_selector('#pi-auth-btn, button:has-text("Pi"), button:has-text("Login with Pi")')
            if pi_btn:
                is_visible = await pi_btn.is_visible()
                if is_visible:
                    print("  [PASS] Pi Authentication button found and visible")
                    return True
                else:
                    print("  [WARN] Pi Authentication button found but not visible")
                    return False
            else:
                print("  [WARN] Pi Authentication button not found (may be hidden)")
                return False
        except Exception as e:
            print(f"  [FAIL] Error: {e}")
            return False
    
    async def verify_console_errors(self, page: Page):
        """Verify Console Errors"""
        print("\n[*] Checking Console Errors...")
        console_errors = []
        
        def handle_console(msg):
            if msg.type == "error":
                console_errors.append(msg.text)
        
        page.on("console", handle_console)
        
        try:
            await page.goto(f"{self.base_url}/static/index.html", wait_until="domcontentloaded", timeout=15000)
            await page.wait_for_timeout(3000)
            
            if console_errors:
                print(f"  [WARN] Found {len(console_errors)} console error(s)")
                for error in console_errors[:3]:
                    print(f"    - {error[:100]}...")
            else:
                print("  [PASS] No console errors")
            
            return len(console_errors) == 0
        except Exception as e:
            print(f"  [FAIL] Error: {e}")
            return False
    
    async def verify_all_features(self, headless: bool = False):
        """Verify all features"""
        print("=" * 60)
        print("BROWSER VERIFICATION - All Features")
        print("=" * 60)
        
        browser, context, page = await self.init_browser(headless=headless)
        
        try:
            # Navigate to page
            print(f"\n[*] Opening {self.base_url}/static/index.html")
            await page.goto(f"{self.base_url}/static/index.html", wait_until="domcontentloaded", timeout=15000)
            await page.wait_for_timeout(3000)
            
            # Take initial screenshot
            screenshot = await self.take_screenshot(page, "initial_page")
            if screenshot:
                print(f"  [INFO] Screenshot saved: {screenshot}")
            
            # Verify all features
            results = {
                "demo_mode": await self.verify_demo_mode(page),
                "invoice_creation": await self.verify_invoice_creation(page),
                "responsive_design": await self.verify_responsive_design(page),
                "pi_auth": await self.verify_pi_auth(page),
                "console_errors": await self.verify_console_errors(page)
            }
            
            # Final screenshot
            screenshot = await self.take_screenshot(page, "final_state")
            if screenshot:
                print(f"  [INFO] Final screenshot saved: {screenshot}")
            
            # Summary
            print("\n" + "=" * 60)
            print("VERIFICATION SUMMARY")
            print("=" * 60)
            
            passed = sum(1 for v in results.values() if v)
            total = len(results)
            
            for feature, result in results.items():
                status = "[PASS]" if result else "[FAIL]"
                print(f"{status} {feature.replace('_', ' ').title()}")
            
            print(f"\nTotal: {passed}/{total} features verified")
            
            # Keep browser open for 10 seconds if not headless
            if not headless:
                print("\n[*] Keeping browser open for 10 seconds...")
                await page.wait_for_timeout(10000)
            
        finally:
            await browser.close()
        
        return results

async def main():
    import sys
    
    # Check if headless mode
    headless = "--headless" in sys.argv
    
    verifier = BrowserVerifier()
    results = await verifier.verify_all_features(headless=headless)
    
    # Exit code based on results
    all_passed = all(results.values())
    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    asyncio.run(main())

