---
title: "Non-Custodial by Design"
author: "Blessed Tosin-Oyinbo"
date: "2025-09-1"
description: "How We Made Our AgentPay Protocol Mathematically Unable to Steal Funds"
tags: ["agentic-ai", "blockchain", "infrastructure", "research", "solana"]
category: "Research"
image: "/images/the-whole-process-with-zendfi.png"
---


## TL;DR

We built a agentic payment protocol where our backend stores encrypted private keys but **literally cannot decrypt them**. This isn't a policy, it's cryptographic fact. Here's exactly how we did it.


## The Problem with "Trust Us"

Basically almost every crypto payment processor says the same thing: *"Your keys are safe with us."*

But here's the uncomfortable truth: if your payment provider *can* access your keys, they're a honeypot. A single database breach, a rogue employee, or a government subpoena could expose everything.

At ZendFi, we asked a different question: **What if we designed a system where stealing keys was mathematically impossible, even for us?**


## The Architecture: Client-Side Encryption

Here's how basic traditional payment backends work in a nutshell:

![The Agent Autonomy Trilemma](/images/how-traditional-backends-handle-it.png)

And here's how ZendFi works:

![The Agent Autonomy Trilemma](/images/how-zendfi-stores-keypair-info.png)

The critical difference: **the private key never exists in plaintext outside the user's device.**


## The Cryptographic Stack

We use a three-layer encryption scheme:

### Layer 1: Argon2id Key Derivation

When a user creates a session key, they choose a PIN. We don't hash this PIN with SHA-256 or bcrypt, we use **Argon2id**, yeah, the winner of the Password Hashing Competition.

Why Argon2id?

1. **Memory-hard**: Argon2id makes it super hard for to use GPUs efficiently
2. **Time-hard**: Each guess takes measurable time
3. **Side-channel resistant**: The "id" variant protects against timing attacks

```javascript
// Client-side key derivation
const encryptionKey = await argon2id({
    password: userPin,
    salt: deviceSalt,
    parallelism: 1,
    iterations: 3,
    memorySize: 65536,  // 64 MB - makes GPU attacks impractical
    hashLength: 32,     // 256-bit output
    outputType: 'binary'
});
```

The output is a 256-bit encryption key derived from the PIN + device-specific salt.

### Layer 2: AES-256-GCM Encryption

With the derived key, we encrypt the Solana keypair using **AES-256-GCM** (Galois/Counter Mode):

```javascript
// Client-side encryption
const nonce = crypto.getRandomValues(new Uint8Array(12));  // 96-bit nonce
const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    encryptionKey,
    keypair.secretKey  // 64 bytes: 32-byte private + 32-byte public
);
```

Why AES-GCM?

1. **Authenticated encryption**: Detects tampering, not just eavesdropping
2. **Hardware acceleration**: Native support in modern browsers via WebCrypto
3. **Battle-tested**: Used by TLS 1.3, Signal, and every major security protocol

### Layer 3: Device Binding

The encryption salt includes a **device fingerprint**, a stable identifier derived from the device's characteristics:

```javascript
async function getStableDeviceFingerprint() {
    let deviceId = localStorage.getItem('zendfi_device_id');
    
    if (!deviceId) {
        // Generate once, persist forever
        deviceId = crypto.getRandomValues(new Uint8Array(16))
            .reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');
        localStorage.setItem('zendfi_device_id', deviceId);
    }
    
    // Hash to fixed-length fingerprint
    const hash = await crypto.subtle.digest('SHA-256', 
        new TextEncoder().encode(deviceId));
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0')).join('');
}
```

This means the same PIN on a different device produces a **completely different encryption key**. Even if an attacker steals the ciphertext AND knows the PIN, they can't decrypt without the original device.


## What the Backend Actually Stores

When a user creates a device-bound session key, our database receives:

| Field | Value | Can Backend Use It? |
|-------|-------|---------------------|
| `encrypted_key_data` | AES-GCM ciphertext | No - needs PIN + device |
| `nonce` | 12-byte random IV | No - useless without key |
| `public_key` | Solana public key | Yes - but it's public anyway |
| `device_fingerprint` | SHA-256 hash | No - can't reverse a hash |

The backend can verify *which* public key a user controls, but it **cannot sign transactions** on their behalf.


## The "Prove It" Test

Here's a thought experiment. Imagine we're evil and want to steal user funds:

1. **Attack: Read the database** → We get ciphertext. Useless without the key.
2. **Attack: Brute-force the PIN** → 6-digit PIN = 1 million possibilities. With Argon2id at 64MB memory cost, each guess takes ~500ms. That's 5.8 days per key... on a single thread. Parallel attacks hit memory limits.
3. **Attack: Steal the device fingerprint** → It's a hash in our DB. We'd need the original device ID from the user's localStorage.
4. **Attack: Intercept the PIN** → It never leaves the user's device. We literally never see it.

The only way to decrypt is to have:
- The encrypted ciphertext (we have this)
- The nonce (we have this)
- The user's PIN (we never see this)
- The user's device (we don't have this)

**We're missing 2 of 4 components. Decryption is practically impossible.**


## But Wait, How Do Agentic Payments Work?

Great question. If we can't decrypt the keys, how does ZendFi enable Agents process payments?

**Answer: We don't sign transactions. Users do.**

Here's the flow for a device-bound payment:

![The Agent Autonomy Trilemma](/images/the-whole-process-with-zendfi.png)

The signature happens **entirely on the user's device**. Our backend is just a relay.


## The Autonomous Delegate Exception

"But wait," you say, "I've seen ZendFi auto-sign transactions for AI agents. How?"

You're right. For **autonomous delegates**, we do sign on behalf of users, but with a crucial difference: the keypair is encrypted with **Lit Protocol**, not just a PIN.

```rust
// User opts into autonomous mode by:
// 1. Signing a delegation message with their session key
// 2. Providing a Lit Protocol encrypted copy of the keypair

let lit_encrypted_keypair = encrypt_with_lit(
    keypair_bytes,
    access_conditions  // e.g., "USDC totalSupply > 0" (always true)
);

// Now our backend CAN decrypt... but only via Lit's threshold network
```

With Lit Protocol:
- Decryption requires consensus from multiple Lit nodes
- No single party (including us) holds the full decryption key
- Access conditions are cryptographically enforced

It's "trust-minimized" rather than "trustless", but the trust is distributed across a decentralized network, not concentrated in our database.


## Real-World Security Properties

Let's map our architecture to security guarantees:

| Threat | Traditional Custodian | ZendFi Device-Bound |
|--------|----------------------|---------------------|
| Database breach | Keys exposed | Only ciphertext leaked |
| Rogue employee | Can steal funds | Cannot decrypt |
| Government subpoena | Must hand over keys | Can only provide ciphertext |
| Backend compromise | Attacker signs txs | Attacker gets useless data |
| Phishing attack | Attacker steals credentials | Still needs device + PIN |


## The Tradeoffs

Nothing is free. Here's what we give up for non-custodial security:

### 1. No Password Recovery
If a user forgets their PIN, we cannot help them. The encryption key is derived client-side and never transmitted.

**Mitigation**: We support recovery QR codes that users can back up, but they must do this proactively.

### 2. Device Lock-In
The device fingerprint is part of the key derivation. Switching devices requires re-encrypting the key.

**Mitigation**: We support device recovery flows where users can transfer keys using their backup QR.

### 3. Slightly Slower Payments
Device-bound payments require a round-trip for the user to sign.

**Mitigation**: Enable autonomous delegates with Lit Protocol for payments under a spending limit.


## Why This Matters

In 2022, FTX collapsed and users lost $8 billion because they trusted a custodian.

In 2024, multiple crypto payment processors were hacked, exposing private keys.

The pattern is clear: **custody is the vulnerability**.

At ZendFi, we didn't build a more secure vault. We eliminated the need for a vault entirely. Our backend is not a trusted party, it's a relay that processes encrypted blobs it cannot read.

That's not marketing. That's math.


## Try It Yourself

Want to verify our claims? Here's how:

1. Create a device-bound session key at [api.zendfi.tech/ai-chat](https://api.zendfi.tech/ai-chat)
2. Open browser DevTools → Application → Local Storage
3. Find `encrypted_session_key` and `encryption_nonce`
4. Try to decrypt it without knowing the PIN

Spoiler: you can't. And neither can we.


## Further Reading

- [Argon2 RFC 9106](https://datatracker.ietf.org/doc/html/rfc9106) - The Argon2 specification
- [AES-GCM in WebCrypto](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt) - Browser encryption API
- [Lit Protocol Documentation](https://developer.litprotocol.com/) - Threshold encryption network
- [ZendFi API Docs](/docs/AGENTIC_API_DOCUMENTATION.md) - Full API reference


*Have questions about our security architecture? Reach out at security@zendfi.tech or join our [Discord](https://discord.gg/zendfi).*
