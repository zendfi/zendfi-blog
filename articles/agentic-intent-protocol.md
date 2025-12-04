---
title: "Agentic Intent Protocol (AIP-1)"
author: "Blessed Tosin-Oyinbo"
date: "2025-09-15"
description: "Solving the Agent Autonomy Trilemma with Threshold Cryptography"
tags: ["agentic-ai", "cryptography", "infrastructure", "research", "solana"]
category: "Research"
image: ""
---


## Abstract

AI agents need to spend money autonomously. Users need to retain custody of their funds. These requirements have been considered mutually exclusive, until now.

The **Agentic Intent Protocol** uses threshold cryptography to achieve both: agents sign transactions independently while no single party — including us — can access user funds. We call this **distributed non-custody**: the signing key exists, but only as encrypted shards across Lit Protocol's decentralized network. To sign, the backend must prove cryptographic conditions to distributed nodes that independently verify and release their shards. The key is reconstructed only in memory, signs once, then is discarded.

The core insight: **autonomy doesn't require custody**. By separating key storage from key usage through threshold encryption, we achieve what was previously impossible—agents that can sign transactions independently while users maintain cryptographic control.

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

```
*  = Distributed non-custody (requires compromising TWO independent systems)
```

**Our contribution**: The Agentic Intent Protocol achieves all three through threshold cryptography.

---

## The Breakthrough: Distributed Non-Custody

### How It Works

Instead of storing the signing key in one place (custodial) or requiring the user to sign each transaction (non-autonomous), we use **Lit Protocol's threshold encryption network**:

1. **Client generates** a Solana keypair on the user's device
2. **Client encrypts** the keypair using Lit Protocol's threshold encryption
3. **Encrypted shards** are distributed across Lit's decentralized node network
4. **Backend requests decryption** by proving cryptographic conditions are met
5. **Lit nodes independently verify** conditions and release their shards
6. **Key is reconstructed** only in memory, signs the transaction, then is discarded

### Why Lit Protocol?

Lit Protocol is the only production-ready threshold cryptography network that meets our requirements:

- **Decentralized operators**: 100+ nodes run by independent operators, not controlled by any single entity
- **Programmable conditions**: EVM-based access control lets us specify when decryption is allowed
- **Multi-chain native**: Built-in support for Solana, Ethereum, and other chains
- **Production-ready**: Active mainnet since 2023 with battle-tested cryptographic primitives

Building our own threshold network would require years of cryptographic engineering and wouldn't achieve the same trust properties—we'd just be another single point of failure.

![Distributed Non-Custody Model](/images/distrubuted-non-custody-model.png)

### Why This Solves the Trilemma

| Property | How We Achieve It |
|----------|-------------------|
| **Autonomy** | Backend can request decryption and sign without user interaction |
| **Security** | Programmatic spending checks + delegation signature requirement |
| **Non-Custody** | No single party holds the key—threshold requires distributed consensus |

### What "Non-Custody" Means Here

Let's be precise. ZendFi's backend:
- **CAN** request decryption from Lit Protocol
- **CAN** sign transactions once the key is reconstructed
- **CANNOT** decrypt the key alone—requires Lit node consensus
- **CANNOT** access the key if Lit nodes reject the conditions

This is **distributed non-custody**: the backend has signing capability but not unilateral key access. If ZendFi's servers were seized, attackers would obtain only encrypted blobs. If Lit Protocol's network were compromised, attackers would need to also compromise ZendFi's backend. Both would need to be compromised simultaneously.

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

## Two Trust Models, One Protocol

The Agentic Intent Protocol offers two operating modes depending on how much autonomy the user grants:

### Interactive Mode (Maximum Security)

User creates a **device-bound session key** encrypted with their password. Backend stores only ciphertext it cannot decrypt. Every transaction requires the user to decrypt and sign on their device.

```
Security:     ████████████ (Maximum - pure non-custodial)
Autonomy:     ██░░░░░░░░░░ (Limited - requires user for each tx)
Use case:     High-value transactions, security-conscious users
```

**What's cryptographically enforced:**
- Key encryption (Argon2id + AES-256-GCM)
- Only the user's password can decrypt
- Backend literally cannot sign

This is **pure non-custody**, even a fully compromised ZendFi cannot access user funds.

### Autonomous Mode (Maximum Autonomy)

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

### What's Programmatically Enforced

These rely on ZendFi's backend behaving correctly:

| Check | Implementation |
|-------|----------------|
| **Spending limits** | `can_spend()` compares `amount` to `max_amount_usd - used_amount_usd` |
| **Time bounds** | `is_expired()` checks `expires_at < now()` |
| **Revocation** | Database query checks `revoked_at IS NULL` |
| **Rate limits** | Redis counters per API key |

### The Trust Model

### Threat Scenarios

**If ZendFi's backend is compromised**, device-bound keys remain safe since an attacker would only obtain ciphertext they cannot decrypt. Lit-delegated keys are also protected because the attacker would still need to achieve consensus from Lit Protocol's distributed nodes. However, programmatic limits (spending caps, time bounds) would be at risk since an attacker with database access could bypass these checks.

**If Lit Protocol's network is compromised**, device-bound keys remain completely safe since Lit is not involved in their encryption. Lit-delegated keys would be at risk, but an attacker would still need simultaneous access to ZendFi's backend to actually use them.

**If both ZendFi and Lit Protocol are compromised simultaneously**, device-bound keys still remain safe—neither system can decrypt them since only the user's password can. Lit-delegated keys, however, would be fully at risk in this scenario, as the attacker would have access to both systems required for decryption.

**If a user's device is compromised**, all keys associated with that device are at risk regardless of mode, since the attacker would have access to both the encrypted key material and the ability to capture the user's password.

The key insight: **Autonomous delegation requires compromising TWO independent systems**. This is strictly better than custodial (one system) while enabling full autonomy.

### Compared to Traditional Custody

| Attack Surface | Traditional Custody | AIP Distributed Custody |
|----------------|--------------------|-----------------------|
| Points of failure | 1 (provider backend) | 2 (backend AND Lit network) |
| Required compromises | Provider database | Backend + threshold of Lit nodes |
| Insider threat | Full access to keys | Cannot access without Lit consensus |
| Regulatory seizure | Keys can be seized | Keys don't exist in one place |
| Recovery if provider disappears | Funds lost | User has device-bound backup |

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

Sessions provide server-side spending tracking:

```json
{
  "session_token": "zai_session_...",
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

These limits are **programmatic**—the backend checks them before processing payments. They provide defense-in-depth but are not cryptographic guarantees.

---

## Payment Flows

### Smart Payments (Primary API)

The Smart Payment endpoint handles all complexity:

```bash
curl -X POST https://api.zendfi.com/api/v1/ai/smart-payment \
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
curl -X POST https://api.zendfi.com/api/v1/payment-intents \
  -d '{"amount": 49.99, "agent_id": "checkout_agent"}'

# Response includes client_secret for frontend confirmation
{"id": "...", "client_secret": "pi_xxx_secret_yyy", "status": "requires_payment"}

# 2. Confirm with client_secret (can be done from frontend)
curl -X POST https://api.zendfi.com/api/v1/payment-intents/{id}/confirm \
  -d '{"client_secret": "pi_xxx_secret_yyy", "customer_wallet": "..."}'
```

---

## PPP Pricing Engine

Agents can request intelligent pricing adjusted for purchasing power:

```bash
curl -X POST https://api.zendfi.com/api/v1/ai/pricing/suggest \
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
curl https://api.zendfi.com/api/v1/analytics/agents?period_days=30
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
| `POST /api/v1/ai/sessions` | Create spending session |
| `POST /api/v1/ai/session-keys/device-bound/create` | Create device-bound key |
| `POST /api/v1/ai/session-keys/{id}/enable-autonomy` | Enable autonomous delegation |
| `POST /api/v1/ai/smart-payment` | Execute payment (auto-selects signing method) |
| `POST /api/v1/payment-intents` | Create payment intent |
| `POST /api/v1/ai/pricing/suggest` | Get PPP-adjusted price |

---

## Conclusion

The Agentic Intent Protocol demonstrates that the agent autonomy trilemma is not fundamental — it's an artifact of traditional key management. By leveraging threshold cryptography:

1. **Agents can sign transactions autonomously** (no human in the loop)
2. **Users retain cryptographic control** (no single-party custody)
3. **Spending is bounded** (programmatic limits + time bounds + revocation)

The key architectural insight is **separating key storage from key usage**. The signing key exists, but it's distributed across Lit Protocol's network. ZendFi can request its assembly for signing, but cannot extract it unilaterally. This is distributed non-custody—a new trust model between full custody and pure self-custody.

### What We Built vs. What We Didn't

**We built:**
- Device-bound session keys with client-side encryption
- Lit Protocol integration for autonomous delegation via threshold encryption
- Ed25519 delegation signatures for authorization
- Programmatic spending limits and session management
- Gasless transaction infrastructure
- PPP pricing engine

**We did not build:**
- On-chain spending limits (limits are database checks, not smart contract enforced)
- Trustless revocation (revocation requires trusting ZendFi's backend)
- Multi-party approval workflows (single user authorizes)

### Future Work

- **On-chain limits**: Move spending caps to Solana programs for trustless enforcement
- **Multi-chain**: Extend to EVM chains via Lit Protocol's existing support
- **Agent reputation**: On-chain history enabling trust scores
- **Programmable conditions**: Let users specify custom Lit access control conditions

---

## References

1. Lit Protocol. "Threshold Cryptography for Web3." https://litprotocol.com
2. Solana Foundation. "Solana Documentation." https://docs.solana.com
3. Circle. "USDC on Solana." https://developers.circle.com
4. Biryukov, A., Dinu, D., & Khovratovich, D. "Argon2: Memory-Hard Function." RFC 9106.

---

*© 2025 ZendFi Labs. This document describes the Agentic Intent Protocol as implemented.*
