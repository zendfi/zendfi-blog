---
title: "Building an AI Shopping Assistant That Actually Pays for Things"
author: "Blessed Tosin-Oyinbo"
date: "2025-12-31"
description: "How to give your AI agent a wallet, spending limits, and the ability to purchase autonomously—without holding their private keys"
tags: ["agentic-ai", "session-keys", "payments", "solana", "tutorial"]
category: "Dev Knowledge"
image: "/images/ai-agent-autonomous-payment.png"
---

## The Dream vs. The Reality

Picture this: You're building an AI shopping assistant. Your users chat with it, ask it to buy coffee, order lunch, grab concert tickets. The AI understands context, finds the best deals, handles the entire purchase flow.

Then comes the payment part.

**Current reality:** The AI generates a payment link. Your user clicks it. Gets redirected. Unlocks their wallet. Reviews the transaction. Signs it. Waits for confirmation. Gets redirected back. *Maybe* the AI remembers what they were doing.

**What we actually want:** The AI just... buys it. User said "get me coffee," AI found a place, payment happens, done. No wallet popups. No signature prompts. No friction.

But here's the problem everyone runs into: **How do you let an AI spend money without giving it custody of funds?**

That's what we're solving today.

---

## The Wrong Ways to Do This

Before we get to the solution, let's talk about why the obvious approaches don't work:

### ❌ Option 1: Give the AI Your Private Key

```typescript
// NEVER DO THIS
const aiAgent = new ShoppingAssistant({
  wallet: yourPrivateKey  // 💀 RIP your funds
});
```

This is like handing your credit card to a stranger and saying *"just charge whatever you need."* Even if you trust the AI provider *today*, what about after a breach? A rogue employee? A government subpoena?

### ❌ Option 2: Sign Every Single Transaction

```typescript
// The current "secure" approach
aiAgent.onPurchaseNeeded((details) => {
  // Wallet popup for the 47th time today
  await wallet.signTransaction(details);
});
```

This defeats the entire point. Your AI can't buy you coffee if it needs permission for every transaction. You're just a slower, more annoying checkout form.

### ❌ Option 3: Custodial Wallets

```typescript
// Trust us™ approach
const balance = await provider.depositFunds(100);
await aiAgent.spend(balance);  // Provider holds your keys
```

You're back to square one: trusting a third party with custody. If they get hacked, compromised, or rug-pull, your funds are gone.

---

## The Solution: Session Keys + Spending Limits + Threshold Cryptography

Here's what we need:

1. **Agent can sign transactions autonomously** (no wallet popups)
2. **Cryptographically-enforced spending limits** (even we can't bypass them)
3. **Non-custodial** (no single party holds the full private key)
4. **Cross-app compatible** (one session key works across all apps using that agent)

This is exactly what ZendFi's session keys do. Let me show you how.

---

## Building It: Step-by-Step

Let's build a shopping assistant that can autonomously purchase items within a $100/week budget.

### Step 1: Install the SDK

```bash
npm install @zendfi/sdk
# or
pnpm add @zendfi/sdk
```

### Step 2: Create a Session Key with Spending Limits

```typescript
import { zendfi } from '@zendfi/sdk';

// Initialize the SDK (auto-configured from ZENDFI_API_KEY env var)
const userWallet = 'YOUR_SOLANA_WALLET_ADDRESS';

// Create a device-bound session key with Lit Protocol encryption
const sessionKey = await zendfi.sessionKeys.create({
  userWallet,
  agentId: 'shopping-assistant-v1',
  agentName: 'AI Shopping Assistant',
  limitUSDC: 100,        // $100 spending limit
  durationDays: 7,       // Valid for 7 days
  pin: '123456',         // User's PIN (encrypts locally)
  enableLitProtocol: true, // Enable autonomous signing
});

console.log(`Session key created: ${sessionKey.sessionKeyId}`);
console.log(`Session wallet: ${sessionKey.sessionWallet}`);
console.log(`Cross-app compatible: ${sessionKey.crossAppCompatible}`);
```

**What just happened?**

1. **Client generates** a Solana keypair on the user's device
2. **Client encrypts** the keypair with the user's PIN (Argon2id + AES-256-GCM)
3. **Client also encrypts** with Lit Protocol's threshold encryption
4. **Encrypted shards** are stored across Lit's decentralized network
5. **Backend stores** the encrypted blob (but CANNOT decrypt it without PIN or Lit)

The session wallet now exists, but no single party can access it.

### Step 3: Fund the Session Wallet

Session wallets need USDC to spend. You can fund them via:

**Option A: Transfer from your main wallet**

```typescript
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress } from '@solana/spl-token';

const connection = new Connection('https://api.devnet.solana.com');
const userKeypair = // your main wallet keypair
const sessionPubkey = new PublicKey(sessionKey.sessionWallet);

// USDC mint (devnet)
const usdcMint = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

// Get token accounts
const userAta = await getAssociatedTokenAddress(usdcMint, userKeypair.publicKey);
const sessionAta = await getAssociatedTokenAddress(usdcMint, sessionPubkey);

// Transfer 100 USDC to session wallet
const transferIx = createTransferInstruction(
  userAta,
  sessionAta,
  userKeypair.publicKey,
  100_000_000, // 100 USDC (6 decimals)
);

const tx = new Transaction().add(transferIx);
await sendAndConfirmTransaction(connection, tx, [userKeypair]);

console.log('Session wallet funded with 100 USDC!');
```

**Important:** Session wallets don't need SOL for gas! ZendFi's backend covers all transaction fees via gasless architecture.

### Step 4: Unlock for Auto-Signing

User enters their PIN once to unlock autonomous signing:

```typescript
// User unlocks the session key (one-time PIN entry)
await zendfi.sessionKeys.unlock(sessionKey.sessionKeyId, '123456');

console.log('Session key unlocked for autonomous payments!');
```

Behind the scenes:
1. SDK decrypts the keypair using the PIN
2. Re-encrypts it using Lit Protocol with spending limit conditions
3. Lit Protocol's network can now sign autonomously (within limits)

### Step 5: Enable Autonomous Signing

Now we enable autonomous mode so the backend can request signatures from Lit Protocol:

```typescript
// Create delegation message (declares spending limit)
const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
const delegationMsg = zendfi.autonomy.createDelegationMessage(
  sessionKey.sessionKeyId,
  100, // max $100
  expiresAt.toISOString()
);

// Sign delegation with the session key (proves ownership)
const delegationSig = await signDelegationMessage(
  sessionKey.sessionKeyId,
  delegationMsg,
  '123456'
);

// Enable autonomous delegate
const delegate = await zendfi.autonomy.enable(sessionKey.sessionKeyId, {
  max_amount_usd: 100,
  duration_hours: 24 * 7, // 7 days
  delegation_signature: delegationSig,
  expires_at: expiresAt.toISOString(),
});

console.log(`Autonomous delegate enabled: ${delegate.delegate_id}`);
console.log('Backend can now sign when client is offline (via Lit Protocol)');
```

### Step 6: Make Autonomous Payments

Now your AI can purchase things without any user interaction:

```typescript
// AI agent makes a purchase
const payment = await zendfi.sessionKeys.makePayment({
  sessionKeyId: sessionKey.sessionKeyId,
  amount: 5.0,
  recipient: 'MERCHANT_WALLET_ADDRESS',
  description: 'Coffee from Blue Bottle',
});

console.log(`✅ Payment sent: $${payment.amount}`);
console.log(`Transaction: ${payment.signature}`);
console.log('No wallet popup. No signature prompt. Just done.');
```

**What happens behind the scenes:**

1. **Backend checks spending limit** ($5 < $100 remaining ✅)
2. **Backend requests signature** from Lit Protocol
3. **Lit nodes verify conditions** (limit not exceeded, session not expired)
4. **Lit nodes release key shards** (decentralized, no single point of failure)
5. **Key is reconstructed in memory**, signs the transaction, is discarded
6. **Transaction is broadcast** to Solana
7. **Confirmation happens** in ~400ms

All of this happens in under a second. No user interaction required.

---

## The Security Model: How This Stays Safe

Let's address the obvious question: *"If the backend can request signatures, what stops it from draining the wallet?"*

### Layer 1: Client-Side PIN Encryption

The keypair is encrypted with Argon2id (memory-hard, GPU-resistant) + AES-256-GCM. Without the user's PIN, the backend literally cannot decrypt it.

### Layer 2: Lit Protocol Threshold Encryption

The keypair is *also* encrypted using Lit Protocol's threshold encryption. To sign:
1. Backend must prove cryptographic conditions to Lit's network
2. Distributed Lit nodes independently verify spending limits
3. Nodes release key shards only if conditions pass
4. Key is reconstructed in memory (never stored), signs once, is discarded

### Layer 3: Cryptographically-Enforced Spending Limits

The session key is bound to a Lit Action (JavaScript running in Trusted Execution Environments) that:
1. Calls ZendFi's API to check current spending
2. **Physically refuses** to sign if limit is exceeded
3. Cannot be bypassed even if ZendFi's backend is fully compromised

The spending limit isn't a database check we promise to honor—it's **cryptographic enforcement** via immutable code.

### Layer 4: Cross-App Compatibility

Session keys are tied to `agentId`, not your app. If the user installs another app using the same AI agent, they can reuse the session key (with the same spending limits). No need to create multiple sessions for the same agent.

---

## Real-World Example: Coffee Purchase Flow

Let's walk through a complete purchase:

```typescript
// 1. User talks to AI
user: "Get me a coffee from Blue Bottle"

// 2. AI finds the merchant
const merchant = await findMerchant('Blue Bottle Coffee');
const price = await merchant.getPricing('Medium Latte'); // $5.50

// 3. AI checks if purchase is within limits
const status = await zendfi.sessionKeys.getStatus(sessionKeyId);
if (status.remainingUsdc < price) {
  return "You've reached your $100 weekly limit. Want to increase it?";
}

// 4. AI makes the payment autonomously
const payment = await zendfi.sessionKeys.makePayment({
  sessionKeyId,
  amount: 5.50,
  recipient: merchant.wallet,
  description: 'Medium Latte - Blue Bottle',
});

// 5. AI confirms to user
ai: "Done! Your Medium Latte is ready for pickup. Paid $5.50."
ai: "You have $94.50 left in your weekly budget."

// No wallet popup. No transaction signing. Just works.
```

---

## Adding PPP Pricing: Global Reach

One more cool feature: what if your AI assistant adjusts prices based on the user's location?

```typescript
// Detect user's country (from IP or profile)
const userCountry = 'BR'; // Brazil

// Get PPP factor
const factor = await zendfi.pricing.getPPPFactor(userCountry);
console.log(`Brazil PPP factor: ${factor.ppp_factor}`); // 0.35

// Adjust pricing
const basePrice = 5.50; // US price
const localPrice = basePrice * factor.ppp_factor; // $1.93 for Brazil

// Make payment with localized price
const payment = await zendfi.sessionKeys.makePayment({
  sessionKeyId,
  amount: localPrice,
  recipient: merchant.wallet,
  description: `Medium Latte (PPP: ${userCountry})`,
});

console.log(`Charged $${localPrice.toFixed(2)} (${factor.adjustment_percentage}% discount for Brazil)`);
```

Your AI now automatically adjusts prices based on purchasing power parity. A coffee that costs $5.50 in San Francisco costs $1.93 in São Paulo. Same AI, same code, global reach.

---

## Production Checklist

Before deploying to production, make sure you:

### Security
- [ ] Store API keys in environment variables (never commit them)
- [ ] Use `zfi_test_*` keys for development (devnet, free)
- [ ] Switch to `zfi_live_*` keys for production (mainnet, real money)
- [ ] Implement proper PIN/password requirements (min 6 chars, no common patterns)
- [ ] Enable 2FA for your ZendFi account

### UX
- [ ] Show remaining budget to users ("$94.50 left this week")
- [ ] Send push notifications for high-value purchases
- [ ] Provide easy budget increase flow
- [ ] Display transaction history in your app

### Error Handling
- [ ] Handle insufficient balance gracefully
- [ ] Retry failed transactions (network issues happen)
- [ ] Show clear error messages when limits are reached
- [ ] Implement fallback to manual signing if session key expires

### Monitoring
- [ ] Set up webhooks for payment confirmations
- [ ] Log all autonomous payments for audit trails
- [ ] Monitor spending velocity (detect abnormal patterns)
- [ ] Alert users when approaching spending limits

---

## Why This Matters

We're at the beginning of the agentic economy. AI agents will handle billions of microtransactions: buying API tokens, purchasing data, tipping creators, ordering services.

But they can't do any of that if every transaction requires a human to click "approve."

Session keys solve this. They give AI agents the autonomy they need while preserving the security users demand. No custody required. No trust needed. Just cryptography.

---

## What's Next?

This is just the beginning. Here's what we're working on:

- **Subscription payments**: Auto-renewing agent budgets
- **Multi-sig session keys**: Require approval from multiple parties
- **Time-based limits**: $10/hour, $100/day, $500/month
- **Merchant-specific limits**: $50 for coffee shops, $500 for travel
- **Dynamic limit adjustments**: AI learns your patterns, suggests increases

Want to build with us? Join the waitlist at [zendfi.tech](https://zendfi.tech).

---

## Try It Yourself

We've built a complete demo showing two AI agents autonomously purchasing from each other:

👉 **[Agent Economy Demo](https://github.com/zendfi/agent-economy-demo)**

It shows:
- Session key creation with PIN encryption
- Autonomous payment between agents
- Real-time transaction monitoring
- Full state machine for payment lifecycle

Clone it, run it, break it, ship it. That's how we learn.

---

## Resources

- **SDK Documentation**: [docs.zendfi.tech](https://docs.zendfi.tech)
- **Session Keys Guide**: [docs.zendfi.tech/session-keys](https://docs.zendfi.tech/session-keys)
- **Agentic Intent Protocol**: [Read our research paper](/article/agentic-intent-protocol)
- **Non-Custodial Architecture**: [How we designed it](/article/non-custodial-by-design)

Questions? Find us on [Twitter](https://twitter.com/zendfiHQ) or [Discord](https://discord.gg/zendfi).

---

*Building the future of agentic payments, one transaction at a time.*
