# Screenshots Directory

This directory should contain screenshots of your Ledger ERP application for Pi App Studio submission.

## Requirements

- **Minimum**: 3 screenshots
- **Maximum**: 10 screenshots
- **Format**: PNG or JPG
- **Recommended Size**: 1920x1080 or higher
- **Aspect Ratio**: 16:9 (landscape) recommended

## Required Screenshots

1. **Invoice Creation Interface** (`screenshot1.png`)
   - Show the invoice creation form
   - Display key features like item entry, amount calculation
   - Should show the Pi payment integration

2. **Invoice List** (`screenshot2.png`)
   - Show the list of invoices
   - Display invoice status, amounts, dates
   - Show filtering/sorting options if available

3. **App Settings** (`screenshot3.png`)
   - Show application settings
   - Display security options, preferences
   - Show merchant profile if applicable

## Optional Screenshots

4. **Payment Flow** (`screenshot4.png`)
   - Show payment processing interface
   - Display QR code or payment confirmation

5. **Reports/Dashboard** (`screenshot5.png`)
   - Show analytics or reports
   - Display statistics, charts

6. **Mobile View** (`screenshot6.png`)
   - Show responsive design
   - Display mobile-optimized interface

## Tips

- Use high-quality screenshots
- Ensure text is readable
- Show actual app functionality, not mockups
- Avoid sensitive data in screenshots
- Use consistent styling across all screenshots

## After Creating Screenshots

1. Place screenshots in this directory
2. Update `static/manifest.json` with screenshot URLs:
   ```json
   "screenshot_urls": [
     "https://yourdomain.com/static/screenshots/screenshot1.png",
     "https://yourdomain.com/static/screenshots/screenshot2.png",
     "https://yourdomain.com/static/screenshots/screenshot3.png"
   ]
   ```
3. Replace `[REPLACE_WITH_YOUR_DOMAIN]` with your actual domain
4. Upload screenshots to Pi Developer Portal when submitting your app

