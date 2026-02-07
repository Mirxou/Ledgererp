# Sovereign Decoupling Architecture

## Overview
To ensure a lifespan of 10-20 years, Pi Ledger must be decoupled from current technology stacks (Web2) and future ones (Web3).

## Layered Separation

### 1. Identity Layer
- **Current**: Django/SQLAlchemy models.
- **Action**: Abstraction of user identity into a "Sovereign Identifier" (SID) that can map to Web2 emails/phones or Web3 DIDs.

### 2. Logic Layer (The Brain)
- **Status**: Pure Python business logic.
- **Goal**: Rules engine should be independent of the database schema. All judicial logic (Risk, Disputes) should be unit-testable without a DB.

### 3. Settlement Layer (The Vault)
- **Current**: Pi Network SDK / Stellar.
- **Goal**: The system should be able to settle in any currency (Pi, Stablecoins, Fiat) by swapping the settlement adapter without touching core booking logic.

## Decoupling Strategy
- Use **Interface-based design** for all external integrations.
- Enforce **Clean Architecture** boundaries between the `app.core` and `app.routers`.
- Maintain a local **Sovereign State** that can be synced but not owned by a centralized cloud provider.
