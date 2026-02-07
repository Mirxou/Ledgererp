# Web3 Readiness Assessment

## Current Position
Pi Ledger operates as a "Sovereign Web2" system, ready to bridge to Web3 when the infrastructure (and the developer) is ready.

## On-Chain Opportunities

### 1. Evidence Anchoring
- **Mechanism**: Hash (SHA-256) of evidence records posted to a public ledger.
- **Benefit**: Proof of existence without exposing private content.
- **Pillar**: Non-repudiation.

### 2. Judgment Finality
- **Mechanism**: Posting a "Judgment Fingerprint" on-chain once finalized.
- **Benefit**: Immutable history of outcomes.

### 3. Smart Escrow
- **Mechanism**: Transition from app-managed escrow to blockchain smart contracts.
- **Benefit**: Zero-trust financial operations.

## Privacy Safeguards
- **Rule**: No PII (Personally Identifiable Information) ever touches the chain.
- **Rule**: Reasoning and context stay off-chain to allow for the "Right to be Forgotten" (where applicable by Constitution).

## Implementation Path
- [ ] Research Stellar Soroban smart contracts for Pi Network integration.
- [ ] Implement an "Anchoring Service" stub in `app.services`.
