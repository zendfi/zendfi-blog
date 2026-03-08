---
title: "ZendFi MPC Wallet — How It Actually Works"
author: "Blessed Tosin-Oyinbo"
date: "2026-03-08"
description: "In this artcile, we'd learn how exactly ZendFi's MPC wallets work"
tags: ["crytography", "wallet", "security", "solana"]
category: "FAQ"
image: ""
---

> **TL;DR:** Your wallet. Your keys. Your Face ID. ZendFi can't touch your funds — and you never have to write down a single seed phrase.

---

## The Problem With Every Other Crypto Wallet

You've seen the options. Neither is great:

**Option A — Custodial (e.g. Coinbase, PayPal)**
The platform holds your keys. Easy UX, but if they get hacked, freeze your account, or go under? Your funds are at their mercy.

**Option B — Self-custodial (e.g. Phantom, MetaMask)**
You hold your keys. True ownership, but you're responsible for a 24-word seed phrase. Lose it, forget it, or have it stolen? Funds gone. Forever. No support ticket will save you.

**ZendFi is Option C.** You hold your keys — cryptographically, verifiably — but the UX is just... Face ID.

No seed phrase. No browser extension. No hardware wallet. Just your fingerprint or face, same as unlocking your phone.

---

## So How Does It Work?

When you register on ZendFi, here's what happens behind the scenes:

### Step 1 — Your Wallet is Born

ZendFi generates a brand new Solana wallet just for you. Think of it as a unique lock-and-key pair created fresh, just for your account.

```
generate_wallet()
  → creates your unique Solana wallet address + private key
  → immediately splits the private key into 3 pieces
  → stores those 3 pieces separately (more on this below)
  → destroys the original — it's never stored whole, anywhere
```

The moment your private key is split, the original ceases to exist. Not "we deleted it from the database" — gone from memory entirely.

---

### Step 2 — Your Key Gets Split into 3 Pieces (Shards)

This is the magic. Using a technique called **Shamir's Secret Sharing**, your private key is mathematically divided into 3 shards. The rule: **any 2 of the 3 shards can reconstruct the key. 1 shard alone is completely useless.**

Think of it like a combination lock where the code is split across 3 people — you need at least 2 of them to open it. One person alone can't do anything.

Here's where each shard lives:

| Shard | Where It Lives | What Protects It |
|---|---|---|
| **Shard 1** | ZendFi's secure database | Military-grade encryption (AES-256-GCM) |
| **Shard 2** | Lit Protocol — a decentralized network of 30+ independent nodes across the internet | Distributed encryption across hardware-secured nodes. No single entity controls it |
| **Shard 3** | ZendFi's database (separate, isolated) | Same encryption — emergency recovery only |

ZendFi holds Shard 1 and Shard 3. But here's the thing: **those two shards are encrypted with a key that ZendFi's servers don't have standing access to**. And Shard 2 lives on a completely independent network ZendFi doesn't control.

**So ZendFi literally cannot assemble your key without you.**

---

### Step 3 — Signing In With Your Passkey (The Cool Part)

Your passkey (Face ID, fingerprint, or hardware security key) is registered using **WebAuthn** — the same open standard that Apple, Google, and Microsoft are building into every device. It's phishing-proof by design. Your biometric never leaves your device.

When you approve a transaction:

```
you tap Face ID
  → your device signs a unique one-time challenge
  → ZendFi verifies the signature (standard WebAuthn flow)
  → ZendFi fetches Shard 1 from its database
  → Lit Protocol's nodes collectively release Shard 2
  → Shard 1 + Shard 2 reconstruct your private key (in memory only)
  → your transaction is signed
  → the reconstructed key is immediately wiped from memory
  → done ✓
```

The whole reconstruction happens ephemerally — your key exists in memory for milliseconds, signs the transaction, and disappears. It's never written to disk.

---

## For Developers — What's Running Under the Hood

### The WebAuthn Flow

ZendFi uses the FIDO2/WebAuthn standard end-to-end:

- Every authentication starts with a **fresh one-time challenge** (stored briefly in Redis, auto-deleted the moment it's used)
- A **signature counter** increments on every auth — so replayed credentials are detected and rejected automatically
- The passkey verification bypass method exists in the codebase but is **permanently disabled** — all auth must go through the full WebAuthn challenge-response endpoints

```
POST /api/v1/webauthn/auth/start   → generates challenge
POST /api/v1/webauthn/auth/finish  → verifies response, triggers shard assembly
```

There is no shortcut. No backdoor. The code enforces this.

---

### The Shard Assembly Flow

Once passkey auth passes, shard combination kicks off:

```
combine_shards_for_signing(merchant_id)
  → fetch + decrypt Shard 1 from database
  → connect to Lit Protocol network (minimum 3 nodes required)
  → generate short-lived session signatures (10 min expiry)
  → Lit nodes collectively decrypt Shard 2
  → verify both shards' integrity (checksum validation)
  → reconstruct private key from Shard 1 + Shard 2
  → verify reconstructed wallet address matches merchant's on-record address
  → sign transaction
  → drop key from memory
```

If the reconstructed wallet address doesn't match what's on file, the whole operation aborts. There's no "close enough."

---

### Gasless Transactions

Merchants pay **zero SOL gas fees**. ZendFi's backend acts as the fee payer on every transaction:

```
transaction
  → ZendFi's fee payer covers the gas cost
  → merchant's reconstructed key authorizes the transfer
  → both signatures applied, transaction submitted
```

From the merchant's perspective: approve with Face ID, funds move, no gas math required.

---

### Session Keys — For Automated Flows

For use cases like automatic payment settlement, merchants can create **session keys** — limited, time-bound signing keys that don't require a passkey tap every time:

- Require passkey auth to create (you have to authorize this upfront)
- Capped at a **spending limit** you define
- Expire after a **time window** you set
- Every usage is logged with device, IP, and activity monitoring
- Anomaly detection flags anything that looks off

Think of session keys as "I authorize my system to move up to $500/day for the next 30 days without bugging me each time." You set the rules. The key can't exceed them.

---

### The Escape Hatch — You Can Always Leave

This is how you know ZendFi is genuinely non-custodial: **you can export your full private key anytime.**

```
Dashboard → Danger Zone → Export Private Key
  → passkey authentication required
  → explicit confirmation required
  → private key shown once, in base58 format
  → 60-second countdown, then wiped from UI
  → logged in audit trail
```

Take that key and import it into Phantom, Solflare, or any Solana wallet. ZendFi has no say in the matter. **If a platform can't stop you from leaving with your key, it was never really holding your key.**

---

## The Security Model in Plain English

To compromise a merchant's wallet, an attacker would need to:

1. **Break into ZendFi's servers** and steal the encrypted Shard 1 — and then also steal the encryption key (stored separately in infrastructure secrets, never in the codebase)

2. **AND ALSO** compromise Lit Protocol's independent decentralized node network to get Shard 2 — nodes that run in hardware-secured environments ZendFi doesn't operate or control

3. **AND ALSO** get past the merchant's biometric — meaning their actual face, fingerprint, or physical hardware key

Getting any one of these is hard. Getting all three simultaneously is, for practical purposes, not a realistic threat.

---

## Production Rules (Non-Negotiable)

The system enforces these in code — they're not just policies:

- Lit Protocol **must** be active in production. The server refuses to boot otherwise.
- All passkey auth **must** go through the full WebAuthn challenge-response flow. Bypasses are coded out.
- Every reconstruction verifies the assembled key matches the wallet address on record.
- The master encryption key is **zeroed from memory** the moment it's no longer needed.
- Lit connection requires a minimum of 3 active nodes — fewer than that, the operation fails.

---

## Why This Matters

| | Traditional Custodial | Standard Self-Custodial | ZendFi |
|---|---|---|---|
| You own the keys | ❌ | ✅ | ✅ |
| No seed phrase needed | ✅ | ❌ | ✅ |
| Platform can't move your funds | ❌ | ✅ | ✅ |
| Biometric UX (Face ID / fingerprint) | ❌ | ❌ | ✅ |
| Phishing-resistant auth | ❌ | ❌ | ✅ |
| Can export & take keys anywhere | ❌ | ✅ | ✅ |

The combination of **true self-custody** with **passkey UX** is what makes this genuinely new. The cryptography makes it secure. The WebAuthn integration makes it something a non-technical merchant can actually use every day.

---

*ZendFi — Non-custodial wallets that don't require a computer science degree.*