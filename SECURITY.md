# Security Policy

## Supported Versions

We currently support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in Pi Ledger, please report it responsibly:

1. **Do NOT** create a public GitHub issue
2. Email security details to: **abounaas54@gmail.com**
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours and work with you to address the issue before public disclosure.

## Security Features

### Zero-Knowledge Architecture
- All sensitive data is encrypted **client-side** before transmission
- Backend servers store only encrypted blobs and cannot decrypt user data
- We never have access to private keys, wallet addresses, or unencrypted financial data

### Encryption
- **AES-GCM** encryption with 256-bit keys
- **PBKDF2** key derivation with 100,000 iterations
- **BIP-39** mnemonic generation (12 words)
- Separate recovery password for cloud backups

### Authentication
- Pi Network SDK authentication only (no custom login)
- Device fingerprinting to prevent account duplication
- Anti-replay protection for transactions

### Data Protection
- **Non-custodial**: We do not hold or store user funds
- **Client-side encryption**: All data encrypted before storage
- **Blind sync**: Backend cannot decrypt synchronized data
- **GDPR compliant**: Users can export or delete their data at any time

### Network Security
- **HTTPS enforcement** in production
- **CSP headers** to prevent XSS attacks
- **Rate limiting** to prevent DDoS
- **Input sanitization** using DOMPurify

### Supply Chain Security
- **Subresource Integrity (SRI)** for external scripts
- **Self-hosted assets** where possible
- **Dependency scanning** for known vulnerabilities

## Security Best Practices

### For Users
1. **Save your recovery password securely** - If lost, data cannot be recovered
2. **Use a strong PIN** - At least 6 digits
3. **Create regular backups** - Use cloud backup feature
4. **Keep your device secure** - Use device lock/PIN
5. **Verify payment addresses** - Always double-check before sending Pi

### For Developers
1. **Never commit secrets** - Use `.env` files (excluded from Git)
2. **Keep dependencies updated** - Regularly check for security patches
3. **Follow secure coding practices** - Input validation, output encoding
4. **Use HTTPS in production** - Never use HTTP for sensitive data
5. **Implement rate limiting** - Prevent abuse and DDoS

## Known Limitations

1. **Device Loss**: If device is lost and no backup exists, data cannot be recovered
2. **Recovery Password Loss**: If recovery password is lost, cloud backup cannot be restored
3. **Browser Data Clearing**: Clearing browser data will delete local data (unless backed up)

## Security Updates

Security updates are released as needed. Critical vulnerabilities are patched immediately.

- **Critical**: Fixed within 24 hours
- **High**: Fixed within 7 days
- **Medium**: Fixed within 30 days
- **Low**: Fixed in next regular release

## Compliance

- **GDPR**: Compliant with data protection regulations
- **Pi Network SDK**: Follows Pi Network security guidelines
- **OWASP**: Implements OWASP security best practices

## Contact

For security concerns: **abounaas54@gmail.com**

---

**Last Updated**: December 2025

