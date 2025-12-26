---
title: "Agentic Intent Protocol (AIP-1)"
author: "Blessed Tosin-Oyinbo"
date: "2025-12-05"
description: "Solving the Agent Autonomy Trilemma with Threshold Cryptography"
tags: ["agentic-ai", "cryptography", "infrastructure", "research", "solana"]
category: "Research"
image: "/images/ai-agent-payment-process.png"
---


## Abstract

AI agents need to spend money autonomously. Users need to retain custody of their funds. These requirements have been considered mutually exclusive, until now.

The **Agentic Intent Protocol** uses threshold cryptography to achieve both: agents sign transactions independently while no single party — including us — can access user funds. We call this **distributed non-custody**: the signing key exists, but only as encrypted shards across Lit Protocol's decentralized network. To sign, the backend must prove cryptographic conditions to distributed nodes that independently verify and release their shards. The key is reconstructed only in memory, signs once, then is discarded.

**New in AIP v1.1**: We've moved from programmatic spending limits (database checks) to **cryptographically-enforced spending limits**. The signing key itself is bound to a Lit Action that *physically cannot* sign transactions that exceed spending limits. Even a fully compromised ZendFi backend cannot bypass these limits—the signing key is controlled by immutable code running in Trusted Execution Environments.

The core insight: **autonomy doesn't require custody, and limits don't require trust**. By separating key storage from key usage through threshold encryption, and binding keys to immutable enforcement logic, we achieve what was previously impossible—agents that can sign transactions independently while users maintain cryptographic control over both funds AND spending limits.

---

## The Agent Autonomy Trilemma

Every payment system for AI agents must choose between three properties:

![The Agent Autonomy Trilemma](/images/autonomy-trilemma.png)

**Autonomy**: Agent can execute transactions without human intervention  
**Security**: Bounded spending, revocable permissions, audit trails  
**Non-Custody**: No single party holds the signing keys

Traditional approaches sacrifice one:

| Approach | Autonomy | Security | Non-Custody | How |
|----------|----------|----------|-------------|-----|
| **Custodial wallets** | HIGH | HIGH | NONE | Provider holds keys |
| **Hardware wallets** | NONE | HIGH | HIGH | User signs each tx |
| **OAuth/API tokens** | HIGH | LIMITED | NONE | Coarse permissions |
| **AIP (Interactive)** | LIMITED | MAXIMUM | HIGH | Device-bound, user signs |
| **AIP (Autonomous)** | HIGH | HIGH | HIGH* | Threshold cryptography |
| **AIP (Crypto-Enforced)** | HIGH | MAXIMUM | HIGH* | PKP + Lit Actions |

*= Distributed non-custody (requires compromising TWO independent systems)


The Agentic Intent Protocol achieves all three through threshold cryptography.


## The Breakthrough: Distributed Non-Custody

### How It Works

Instead of storing the signing key in one place (custodial) or requiring the user to sign each transaction (non-autonomous), we use **Lit Protocol's threshold cryptography network** in two ways:

**For Autonomous Mode (threshold decryption):**
1. **Client generates** a Solana keypair on the user's device
2. **Client encrypts** the keypair using Lit Protocol's threshold encryption
3. **Encrypted shards** are distributed across Lit's decentralized node network
4. **Backend requests decryption** by proving cryptographic conditions are met
5. **Lit nodes independently verify** conditions and release their shards
6. **Key is reconstructed** only in memory, signs the transaction, then is discarded

**For Crypto-Enforced Mode (PKP + Lit Actions):** 🆕
1. **Backend mints a PKP** (Programmable Key Pair) on Lit's Chronicle chain
2. **PKP is bound** to a specific Lit Action IPFS CID—only this code can use the key
3. **Agent requests signing** via the Lit Action
4. **Lit Action checks spending limits** by calling ZendFi's API from inside TEEs
5. **If limit allows**: Action signs with PKP. **If exceeded or error**: Action refuses
6. **Key never leaves** Lit's secure enclaves—signing happens inside TEEs

### Why Lit Protocol?

Lit Protocol is the only production-ready threshold cryptography network that meets our requirements:

- **Decentralized operators**: 100+ nodes run by independent operators, not controlled by any single entity
- **Programmable conditions**: EVM-based access control and Lit Actions for custom logic
- **Lit Actions**: JavaScript code running in TEEs with HTTP fetch capability 🆕
- **PKPs**: Programmable Key Pairs that can be bound to specific Lit Actions 🆕
- **Multi-chain native**: Built-in support for Solana, Ethereum, and other chains
- **Production-ready**: Active mainnet (Datil) with battle-tested cryptographic primitives

Building our own threshold network would require years of cryptographic engineering and wouldn't achieve the same trust properties—we'd just be another single point of failure.

![Distributed Non-Custody Model](/images/distrubuted-non-custody-model.png)

### Why This Solves the Trilemma

| Property | How We Achieve It |
|----------|-------------------|
| **Autonomy** | PKP can sign transactions without user interaction via Lit Actions |
| **Security** | Cryptographically-enforced spending limits via immutable Lit Action code |
| **Non-Custody** | No single party holds the key—threshold requires distributed consensus |

### What "Non-Custody" Means Here

Let's be precise. ZendFi's backend:
- **CAN** request signatures from Lit Protocol
- **CANNOT** sign transactions that exceed limits—the Lit Action refuses
- **CANNOT** decrypt the key alone—requires Lit node consensus
- **CANNOT** modify the spending limit logic—it's immutable on IPFS

This is **distributed non-custody**: the backend has signing capability but not unilateral key access. If ZendFi's servers were seized, attackers would obtain only encrypted blobs. If Lit Protocol's network were compromised, attackers would need to also compromise ZendFi's backend. Both would need to be compromised simultaneously.

**With cryptographic enforcement** (new in v2): Even if both systems were compromised, the Lit Action code running in TEEs would STILL refuse to sign transactions exceeding limits—the enforcement logic is immutable and stored on IPFS.

---

## Why "Intent"?

Traditional payment systems execute **transactions**, which basically means explicit instructions to move specific amounts right now.

The Agentic Intent Protocol enables users to express **intents**—bounded authorizations that agents fulfill autonomously:

| Traditional Transaction | Agentic Intent |
|------------------------|----------------|
| "Send exactly $49.99 to merchant XYZ right now" | "Agent can spend up to $100/day for 7 days" |
| Requires user action for each payment | User authorizes once, agent executes within bounds |
| Human in the loop | Human defines the loop |

The user declares their spending intent once. The agent operates autonomously within those bounds. This intent-based model is what enables bounded autonomy—the user isn't approving individual transactions, they're defining the space of acceptable transactions.

---

## Three Trust Models, One Protocol

The Agentic Intent Protocol offers three operating modes depending on how much autonomy the user grants:

### Interactive Mode (Maximum Security)

User creates a **device-bound session key** encrypted with their password. Backend stores only ciphertext it cannot decrypt. Every transaction requires the user to decrypt and sign on their device.

```
Security:     ████████████ (Maximum - pure non-custodial)
Autonomy:     ██░░░░░░░░░░ (Limited - requires user's client (browser) for each tx)
Use case:     High-value transactions, security-conscious users
```

**What's cryptographically enforced:**
- Key encryption (Argon2id + AES-256-GCM)
- Only the user's password can decrypt
- Backend literally cannot sign

This is **pure non-custody**, even a fully compromised ZendFi cannot access user funds.

### Autonomous Mode (High Autonomy)

User upgrades their session key to enable **autonomous delegation** by:
1. Signing a delegation message (proves key possession)
2. Providing a Lit Protocol-encrypted copy of the key
3. Specifying time and amount bounds (the "intent")

Backend can now request decryption from Lit and sign autonomously within the declared intent.

```
Security:     ████████░░░░ (High - distributed threshold)
Autonomy:     ████████████ (Maximum - fully autonomous)
Use case:     AI agents, recurring payments, autonomous operations
```

**What's cryptographically enforced:**
- Delegation signature (Ed25519)
- Threshold decryption conditions (Lit Protocol)
- Transaction signatures (Solana)

**What's programmatically enforced (database checks):**
- Spending limits (`max_amount_usd`, `used_amount_usd`)
- Time bounds (`expires_at`)
- Revocation status (`revoked_at`)

### Crypto-Enforced Mode (Maximum Autonomy + Maximum Security) 🆕

User creates a session with **cryptographically-enforced spending limits**. Instead of relying on database checks, the signing key itself is bound to a Lit Action that enforces limits.

```
Security:     ████████████ (Maximum - limits enforced cryptographically)
Autonomy:     ████████████ (Maximum - fully autonomous)
Use case:     AI agents requiring trustless guarantees
```

**What's cryptographically enforced:**
- **Spending limits** - Lit Action checks limits before signing, refuses if exceeded
- **Immutable logic** - Lit Action code stored on IPFS, hash locked at PKP creation
- **TEE execution** - Lit nodes run in Trusted Execution Environments
- **Fail-safe design** - Network errors = refuse to sign

**How it works:**
1. Session creation mints a PKP (Programmable Key Pair) on Lit Protocol
2. PKP is bound to a specific Lit Action IPFS CID—only this code can use the key
3. When signing, the Lit Action calls ZendFi API to check limits
4. If API says "allowed: true" → sign transaction
5. If API says "allowed: false" OR network error → **refuse to sign**

```typescript
// Creating a crypto-enforced session
const session = await api.createSession({
  agent_id: "shopping_agent",
  user_wallet: "7xKXtg...",
  crypto_enforced: true,  // Enable cryptographic enforcement
  limits: {
    max_per_day: 100,
    max_per_transaction: 50
  }
});

// Response includes PKP info
// {
//   session_id: "...",
//   crypto_enforced: true,
//   pkp_public_key: "0x04fab...",
//   pkp_eth_address: "0xB9Cd...",
//   lit_action_ipfs_cid: "QmXyz..."
// }
```

**Why this is stronger than programmatic limits:**

| Threat | Programmatic Limits | Crypto-Enforced Limits |
|--------|--------------------|-----------------------|
| Compromised ZendFi DB | Limits bypassed | ❌ Cannot sign—Lit Action refuses |
| Compromised ZendFi Backend | Limits bypassed | ❌ Cannot sign—Lit Action refuses |
| Malicious insider | Could modify limits | ❌ Action code is immutable on IPFS |
| API returns false "allowed" | Could trick system | ❌ Fail-safe: errors = refuse to sign |

---

## The Delegation Flow

### Step 1: Create Device-Bound Session Key

The user's device generates an ephemeral keypair and encrypts it locally:

```typescript
// On user's device
const sessionKeypair = Keypair.generate();

// Derive encryption key from user's password
const encryptionKey = await argon2id({
  password: userPassword,
  salt: randomBytes(16),
  memorySize: 65536,  // 64MB - GPU-resistant
  iterations: 3,
  parallelism: 1,
  hashLength: 32
});

// Encrypt with AES-256-GCM
const encrypted = await aesGcmEncrypt(
  sessionKeypair.secretKey,
  encryptionKey,
  randomBytes(12)  // nonce
);

// Send to backend - backend CANNOT decrypt this
await api.createSessionKey({
  encrypted_session_key: encrypted.ciphertext,
  nonce: encrypted.nonce,
  session_public_key: sessionKeypair.publicKey,
  limit_usdc: 500,
  duration_days: 7
});
```

At this point, the backend stores ciphertext it cannot decrypt. Transactions require client-side signing.

### Step 2: Enable Autonomous Delegation

To enable autonomy, the user signs a delegation message and provides a Lit-encrypted copy:

```typescript
// User signs delegation message with session key
const delegationMessage = `I authorize autonomous delegate for session ${sessionKeyId} to spend up to $${maxAmount} until ${expiresAt}`;

const delegationSignature = await sessionKeypair.sign(delegationMessage);

// Encrypt keypair with Lit Protocol for autonomous access
const litEncrypted = await litClient.encrypt({
  dataToEncrypt: sessionKeypair.secretKey,
  evmContractConditions: [{
    contractAddress: USDC_CONTRACT,
    functionName: "totalSupply",  // Always-true condition
    functionParams: [],
    functionAbi: { ... },
    chain: "ethereum",
    returnValueTest: { comparator: ">", value: "0" }
  }]
});

// Enable autonomy
await api.enableAutonomy(sessionKeyId, {
  max_amount_usd: 100,
  duration_hours: 24,
  delegation_signature: delegationSignature,
  lit_encrypted_keypair: litEncrypted.ciphertext,
  lit_data_hash: litEncrypted.dataToEncryptHash
});
```

The delegation signature **proves** the user possessed the session key at delegation time. The Lit-encrypted keypair **enables** autonomous delegation through threshold decryption.

### Step 3: Autonomous Payment Execution

When an AI agent requests a payment:

![AI Agent Payment Process](/images/ai-agent-payment-process.png)

---

## Security Architecture

### What's Cryptographically Enforced

These guarantees hold even against a malicious ZendFi:

| Guarantee | Mechanism |
|-----------|-----------|
| **Device-bound keys can't be stolen** | Argon2id + AES-256-GCM encryption; server has only ciphertext |
| **Delegation requires key possession** | Ed25519 signature verification on delegation message |
| **Autonomous keys require threshold consensus** | Lit Protocol nodes must independently verify conditions |
| **Transactions require valid signatures** | Solana network rejects invalid Ed25519 signatures |
| **Spending limits (crypto-enforced mode)** | Lit Action checks limits, refuses to sign if exceeded 🆕 |
| **Limit logic is immutable** | Lit Action code stored on IPFS, hash locked at PKP creation 🆕 |

### Crypto-Enforced Spending Limits Architecture 🆕

When `crypto_enforced: true` is set on a session:

```
┌─────────────────────────────────────────────────────────────────────────┐
│              Cryptographic Spending Limits with Lit Actions             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Session Creation                                                    │
│     ┌──────────────┐                                                    │
│     │ ZendFi API   │──► Mint PKP bound to spending limit Lit Action     │
│     │              │    • PKP can ONLY execute our immutable Action     │
│     │              │    • Action code stored on IPFS (tamper-proof)     │
│     └──────────────┘                                                    │
│                                                                         │
│  2. Payment Request                                                     │
│     ┌──────────────┐                                                    │
│     │ SDK/Agent    │──► Request signature via Lit Action                │
│     └──────────────┘                                                    │
│            │                                                            │
│            ▼                                                            │
│     ┌──────────────┐                                                    │
│     │ Lit Action   │──► 1. Call ZendFi API to check spending limit      │
│     │ (in TEE)     │    2. If limit OK: sign transaction with PKP      │
│     │              │    3. If exceeded: REFUSE to sign                  │
│     └──────────────┘                                                    │
│                                                                         │
│  Why This Is Secure:                                                    │
│  • PKP private key NEVER leaves Lit's secure enclaves                   │
│  • Lit Action code is immutable (IPFS hash locked at PKP mint)          │
│  • Even ZendFi cannot sign without the Action's approval                │
│  • Fail-safe: network errors = refuse to sign                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

The Lit Action code running inside TEEs:

```javascript
// Simplified Lit Action logic (actual code on IPFS)
const spendingCheck = await fetch(apiEndpoint + '/check-spending', {
  method: 'POST',
  body: JSON.stringify({ session_id, amount_usd })
});

const result = await spendingCheck.json();

if (!result.allowed) {
  // CRYPTOGRAPHIC REFUSAL - cannot be bypassed
  return { success: false, error: 'LIMIT_EXCEEDED' };
}

// Only signs if limit check passed
const signature = await Lit.Actions.signEcdsa({ toSign: txBytes });
```

### What's Programmatically Enforced (Legacy Mode)

These rely on ZendFi's backend behaving correctly (when `crypto_enforced: false`):

| Check | Implementation |
|-------|----------------|
| **Spending limits** | `can_spend()` compares `amount` to `max_amount_usd - used_amount_usd` |
| **Time bounds** | `is_expired()` checks `expires_at < now()` |
| **Revocation** | Database query checks `revoked_at IS NULL` |
| **Rate limits** | Redis counters per API key |

### The Trust Model

### Threat Scenarios

**If ZendFi's backend is compromised:**
- Device-bound keys: ✅ Safe (ciphertext only)
- Autonomous mode: ⚠️ Limits could be bypassed (programmatic checks)
- **Crypto-enforced mode: ✅ Safe** - Lit Action still refuses to sign over limit 🆕

**If Lit Protocol's network is compromised:**
- Device-bound keys: ✅ Safe (Lit not involved)
- Autonomous mode: ⚠️ Keys at risk (need both Lit AND ZendFi)
- **Crypto-enforced mode: ⚠️** At risk, but attacker still needs ZendFi backend 🆕

**If both ZendFi AND Lit are compromised:**
- Device-bound keys: ✅ Safe (only user's password can decrypt)
- Autonomous mode: ❌ At risk
- **Crypto-enforced mode: ❌** At risk (both systems needed for signing) 🆕

**If a user's device is compromised:**
- All modes: ❌ At risk (attacker has encrypted key + can capture password)

The key insight: **Crypto-enforced mode upgrades "programmatic limits" to "cryptographic limits"**. Even a fully compromised ZendFi cannot exceed spending limits—the Lit Action running in TEEs will refuse.

### Compared to Traditional Custody

| Attack Surface | Traditional Custody | AIP Distributed Custody | AIP Crypto-Enforced |
|----------------|--------------------|-----------------------|---------------------|
| Points of failure | 1 (provider backend) | 2 (backend AND Lit network) | 2 (backend AND Lit) |
| Spending limit enforcement | Database check | Database check | **Cryptographic** |
| Required compromises | Provider database | Backend + threshold of Lit nodes | Backend + Lit + bypass TEE |
| Insider threat | Full access to keys | Cannot access without Lit consensus | **Cannot exceed limits** |
| Regulatory seizure | Keys can be seized | Keys don't exist in one place | Keys don't exist in one place |
| Recovery if provider disappears | Funds lost | User has device-bound backup | User has device-bound backup |

---

## Agent Authentication & Sessions

### API Key Structure

Agents authenticate with scoped API keys:

```
zai_{64_random_hex_characters}
```

Keys are stored with dual hashing:
- **SHA-256**: O(1) lookup during authentication
- **Argon2id**: Breach protection (64MB memory, 3 iterations)

### Scoped Permissions

| Scope | Allowed Operations |
|-------|-------------------|
| `full` | All operations |
| `create_payments` | Create and confirm payments |
| `read_analytics` | View analytics only |
| `manage_sessions` | Create/revoke sessions |
| `manage_delegates` | Enable/disable autonomous mode |

### Agent Sessions

Sessions provide spending tracking and optional cryptographic enforcement:

```json
{
  "session_token": "zai_session_...",
  "crypto_enforced": true,
  "pkp_public_key": "0x04fab...",
  "pkp_eth_address": "0xB9Cd...",
  "lit_action_ipfs_cid": "QmXyz...",
  "limits": {
    "max_per_transaction": 500,
    "max_per_day": 2000,
    "max_per_week": 10000,
    "max_per_month": 30000,
    "require_approval_above": 200
  },
  "remaining_today": 1500,
  "remaining_this_week": 8000,
  "expires_at": "2025-12-10T00:00:00Z"
}
```

When `crypto_enforced: false` (legacy): Limits are **programmatic**—the backend checks them before processing payments. They provide defense-in-depth but are not cryptographic guarantees.

When `crypto_enforced: true` (recommended): Limits are **cryptographic**—the Lit Action running in TEEs checks them before signing. Even a compromised backend cannot exceed these limits.

---

## Payment Flows

### Smart Payments (Primary API)

The Smart Payment endpoint handles all complexity:

```bash
curl -X POST https://api.zendfi.tech/api/v1/ai/smart-payment \
  -H "Authorization: Bearer zai_..." \
  -H "X-Session-Key-Id: {session_key_uuid}" \
  -d '{
    "agent_id": "shopping_agent",
    "user_wallet": "7xKXtg2...",
    "amount_usd": 25.99,
    "session_token": "zai_session_...",
    "auto_detect_gasless": true
  }'
```

**Response when autonomous delegation is active:**
```json
{
  "payment_id": "...",
  "status": "confirmed",
  "requires_signature": false,
  "transaction_signature": "5eyK...",
  "confirmed_in_ms": 850,
  "next_steps": "Payment auto-signed and confirmed! No action needed."
}
```

**Response when client signature required:**
```json
{
  "payment_id": "...",
  "status": "awaiting_signature",
  "requires_signature": true,
  "unsigned_transaction": "base64...",
  "submit_url": "/api/v1/ai/payments/{id}/submit-signed",
  "next_steps": "Transaction ready for signing."
}
```

### Payment Intents (Stripe-like Flow)

For complex checkout flows:

```bash
# 1. Create intent
curl -X POST https://api.zendfi.tech/api/v1/payment-intents \
  -d '{"amount": 49.99, "agent_id": "checkout_agent"}'

# Response includes client_secret for frontend confirmation
{"id": "...", "client_secret": "pi_xxx_secret_yyy", "status": "requires_payment"}

# 2. Confirm with client_secret (can be done from frontend)
curl -X POST https://api.zendfi.tech/api/v1/payment-intents/{id}/confirm \
  -d '{"client_secret": "pi_xxx_secret_yyy", "customer_wallet": "..."}'
```

---

## PPP Pricing Engine

Agents can request intelligent pricing adjusted for purchasing power:

```bash
curl -X POST https://api.zendfi.tech/api/v1/ai/pricing/suggest \
  -d '{
    "base_price": 29.99,
    "user_profile": {"location_country": "IN"},
    "ppp_config": {
      "enabled": true,
      "min_factor": 0.30,
      "max_factor": 1.50,
      "floor_price": 5.00,
      "max_discount_percent": 70
    }
  }'
```

Response:
```json
{
  "suggested_amount": 8.40,
  "adjustment_factor": 0.28,
  "reasoning": "Price adjusted for local purchasing power in India.",
  "ppp_adjusted": true
}
```

PPP factors are sourced from World Bank data for 27 countries.

---

## Analytics & Attribution

Every payment records which agent initiated it:

```bash
curl https://api.zendfi.tech/api/v1/analytics/agents?period_days=30
```

```json
{
  "total_ai_payments": 1250,
  "total_ai_volume_usd": 45678.90,
  "by_agent": [
    {
      "agent_id": "shopping_agent_v2",
      "total_payments": 850,
      "total_volume_usd": 31234.56,
      "success_rate": 98.5
    }
  ],
  "conversion_rate": 83.33
}
```

---

## Implementation Details

### Key Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/v1/agent-keys` | Create scoped agent API key |
| `POST /api/v1/ai/sessions` | Create spending session (supports `crypto_enforced: true`) |
| `POST /api/v1/ai/session-keys/device-bound/create` | Create device-bound key |
| `POST /api/v1/ai/session-keys/{id}/enable-autonomy` | Enable autonomous delegation |
| `POST /api/v1/ai/smart-payment` | Execute payment (auto-selects signing method) |
| `POST /api/v1/payment-intents` | Create payment intent |
| `POST /api/v1/ai/pricing/suggest` | Get PPP-adjusted price |
| `POST /api/v1/internal/sessions/check-spending` | Internal endpoint for Lit Actions 🆕 |

---

## Conclusion

The Agentic Intent Protocol demonstrates that the agent autonomy trilemma is not fundamental — it's an artifact of traditional key management. By leveraging threshold cryptography:

1. **Agents can sign transactions autonomously** (no human in the loop)
2. **Users retain cryptographic control** (no single-party custody)
3. **Spending is bounded** — and now **cryptographically enforced** via Lit Actions

The key architectural insight is **separating key storage from key usage**. The signing key exists, but it's distributed across Lit Protocol's network. ZendFi can request signing through Lit Actions, but cannot extract the key or bypass the spending limits—the enforcement logic is immutable and runs in Trusted Execution Environments.

With cryptographic spending limits (v2), we've moved from "trust us to check the database" to "the key physically cannot sign transactions exceeding limits." This is a fundamental shift from programmatic to cryptographic enforcement.

### What We Built vs. What We Didn't

**We built:**
- Device-bound session keys with client-side encryption
- Lit Protocol integration for autonomous delegation via threshold encryption
- Ed25519 delegation signatures for authorization
- **Cryptographically-enforced spending limits via Lit Actions (PKP + IPFS)** 🆕
- **PKP minting on Lit's Chronicle chain** 🆕
- Programmatic spending limits (legacy mode, defense-in-depth)
- Gasless transaction infrastructure
- PPP pricing engine

**We did not build:**
- ~~On-chain spending limits~~ → **Solved with Lit Actions** (better than on-chain: no gas, cross-chain)
- Trustless revocation (revocation requires trusting ZendFi's backend)
- Multi-party approval workflows (single user authorizes)

### Future Work

- **Trustless revocation**: Move revocation to on-chain or Lit access conditions
- **Multi-chain PKPs**: Extend crypto-enforced limits to EVM chains
- **Agent reputation**: On-chain history enabling trust scores
- **Custom Lit conditions**: Let users specify custom access control logic
- **Time-locked limits**: Cryptographically enforce time bounds (not just spending)

---

## References

1. Lit Protocol. "Threshold Cryptography for Web3." https://litprotocol.com
2. Lit Protocol. "Lit Actions." https://developer.litprotocol.com/sdk/serverless-signing/overview
3. Lit Protocol. "PKPs (Programmable Key Pairs)." https://developer.litprotocol.com/user-wallets/pkps/overview
4. Solana Foundation. "Solana Documentation." https://docs.solana.com
5. Circle. "USDC on Solana." https://developers.circle.com
6. Biryukov, A., Dinu, D., & Khovratovich, D. "Argon2: Memory-Hard Function." RFC 9106.

---

*© 2025 ZendFi Labs. This document describes the Agentic Intent Protocol as implemented.*
