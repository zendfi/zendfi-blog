---
title: "Helper Utilities: Production-Ready Patterns for Web3 Development"
author: "The ZendFi Team"
date: "2025-12-26"
description: "How we built optional, tree-shakeable utilities that solve the hard parts of crypto payments"
tags: ["sdk", "developer-experience", "typescript", "web3", "tooling"]
category: "Dev Knowledge"
image: ""
---

## The Problem

We built ZendFi's SDK to be simple: `zendfi.createPayment({ amount: 50 })` just works. But as we talked to developers building production apps, especially with our Agentic Payment Protocol, we kept hearing the same patterns:

*"How do I cache session keys without re-prompting for PINs?"*  
*"What's the best way to handle wallet connections across different providers?"*  
*"How should I retry failed transactions?"*  
*"Can I parse natural language into payments for my AI chat bot?"*

These aren't payment problems, they're **integration problems**. And developers were solving them over and over, each in slightly different (often fragile) ways.

So we built the helper utilities. Not as required SDK features, but as **optional, production-ready patterns** that handle the hard parts.

---

## Design Philosophy: Optional, Not Opinionated

Here's what we didn't want to do: force architectural decisions on developers.

We've all used SDKs that say *"you must use our caching layer"* or *"here's our wallet abstraction, throw away yours."* That sucks when you already have patterns that work.

So we designed the helpers with three principles:

### 1. Completely Optional

```typescript
// Core SDK works perfectly alone
import { zendfi } from '@zendfi/sdk';
await zendfi.createPayment({ amount: 50 });

// Helpers are opt-in
import { WalletConnector } from '@zendfi/sdk/helpers';
const wallet = await WalletConnector.detectAndConnect();
```

Import only what you need. Don't use helpers? Zero bytes added to your bundle.

### 2. Tree-Shakeable

Modern bundlers eliminate unused code. Our helpers are designed for this:

```typescript
// Only imports 8KB for WalletConnector
import { WalletConnector } from '@zendfi/sdk/helpers';

// Not imported = not bundled
// SessionKeyCache, TransactionPoller, etc. → 0 bytes
```

### 3. Pluggable Architecture

Bring your own implementations:

```typescript
// Don't like our cache? Use yours
class RedisCache implements CustomStorageAdapter {
  async getItem(key: string) { return redis.get(key); }
  async setItem(key: string, val: string) { await redis.set(key, val); }
}

const cache = new SessionKeyCache({
  storage: new RedisCache(redisClient),
});
```

---

## The Helpers: What We Built and Why

### 1. SessionKeyCache — Stop Re-Prompting for PINs

**The Problem:** Device-bound session keys are encrypted with PINs. Decryption is expensive (Argon2id + AES-256-GCM). Prompting users for PINs every transaction destroys UX.

**The Solution:**

```typescript
import { SessionKeyCache, QuickCaches } from '@zendfi/sdk/helpers';

// One line: persistent cache with 1-hour TTL
const cache = QuickCaches.persistent();

// Decrypt once, cache automatically
const keypair = await cache.getCached(
  sessionKeyId,
  async () => {
    // Only called on cache miss
    const pin = await promptUserForPIN();
    return await decryptKeypair(pin);
  }
);

// Subsequent calls skip decryption
const sameKeypair = await cache.getCached(sessionKeyId, ...);  // Instant
```

**How It Works:**

- **Three-tier storage**: memory → localStorage → IndexedDB
- **Auto-refresh**: Revalidates before expiration
- **Device binding**: Validates fingerprint hasn't changed
- **LRU eviction**: Automatic memory management

**Why It Matters:** We measured a 40ms → 0.8ms improvement for cached lookups. That's 50x faster. Users feel it.

---

### 2. WalletConnector — Universal Solana Wallet Integration

**The Problem:** Phantom uses `window.solana`, Solflare uses `window.solflare`, Backpack uses `window.backpack`. Detecting, connecting, and handling events is different for each. You'll most likely face this issue when you're building agentic applications (if you're building regular payments, our checkout page already handles wallet connection behind the scenes).

**The Solution:**

```typescript
import { WalletConnector } from '@zendfi/sdk/helpers';

// Auto-detect and connect
const wallet = await WalletConnector.detectAndConnect();

console.log(wallet.type);      // 'phantom' | 'solflare' | 'backpack'
console.log(wallet.address);   // User's address
await wallet.signTransaction(tx);  // Unified API
```

**What It Handles:**

- **Auto-detection**: Checks for Phantom, Solflare, Backpack, Coinbase, Trust
- **Unified interface**: Same API across all wallet types
- **Event listeners**: Account changes, disconnections
- **React hooks**: Optional `createWalletHook()` for React apps

**Real-World Example:**

```typescript
// Before: 100+ lines of wallet detection logic
if (window.solana?.isPhantom) { /* ... */ }
else if (window.solflare) { /* ... */ }
else if (window.backpack) { /* ... */ }

// After: 2 lines
const wallet = await WalletConnector.detectAndConnect();
const signed = await wallet.signTransaction(tx);
```

---

### 3. TransactionPoller — Smart Confirmation Waiting

**The Problem:** Solana transactions aren't instant. You submit, then poll for confirmation. But how often? Fixed intervals waste resources. Too slow = bad UX.

**The Solution: Exponential backoff with jitter**

```typescript
import { TransactionPoller } from '@zendfi/sdk/helpers';

const poller = new TransactionPoller({
  connection: rpcConnection,
  commitment: 'confirmed',  // or 'finalized'
  pollInterval: 1000,       // Start: 1s
  maxPollInterval: 5000,    // Cap: 5s
});

const result = await poller.waitForConfirmation(signature);
console.log(result.status);  // 'confirmed' | 'finalized' | 'failed'
```

**Polling Strategy:**

```
Attempt 1: Wait 1s
Attempt 2: Wait 2s   (2x backoff)
Attempt 3: Wait 4s   (2x backoff)
Attempt 4: Wait 5s   (capped)
Attempt 5: Wait 5s   (capped)
```

Add jitter to prevent thundering herd when multiple transactions confirm simultaneously.

**Why It Works:** We tested against fixed 2s polling:
- **30% fewer RPC calls** on average
- **15% faster confirmation detection** for fast transactions
- **Same timeout behavior** for failed transactions

---

### 4. PaymentIntentParser — Natural Language to Structured Data

**The Problem:** AI chat interfaces need to extract payment details from messages like *"send $50 to Alice for dinner"* or *"buy coffee subscription."*

**The Solution: Heuristic parsing + AI adapters**

```typescript
import { PaymentIntentParser } from '@zendfi/sdk/helpers';

const intent = PaymentIntentParser.parse(
  "I need to pay $25 for my coffee subscription"
);

console.log(intent);
// {
//   action: 'payment',
//   amount: 25,
//   description: 'coffee subscription',
//   confidence: 0.9
// }
```

**For Advanced AI Understanding:**

```typescript
import { OpenAIAdapter } from '@zendfi/sdk/helpers';

const ai = new OpenAIAdapter({ apiKey: 'sk-...' });
const result = await ai.parsePaymentIntent(userMessage, {
  context: { recentPayments: [...] },
  enabledCapabilities: ['payment', 'subscription'],
});
```

**Supported AI Providers:**
- OpenAI (GPT-3.5, GPT-4)
- Anthropic (Claude)
- Google Gemini

**Why Two Approaches?**

- **Heuristic parsing**: Fast, free, works for 80% of cases
- **AI adapters**: Expensive, accurate, needed for complex ambiguity

Developers can try heuristics first, fall back to AI:

```typescript
const quick = PaymentIntentParser.parse(message);
if (quick.confidence < 0.8) {
  // Low confidence → use AI
  const detailed = await ai.parsePaymentIntent(message);
}
```

---

### 5. Security Utilities — PIN Validation & Rate Limiting

**The Problem:** Device-bound keys use PINs. But PINs can be brute-forced. Weak PINs are guessable. No rate limiting = security theater.

**The Solution:**

```typescript
import { PINValidator, PINRateLimiter } from '@zendfi/sdk/helpers';

// Validate strength
const validation = PINValidator.validate('123456');
console.log(validation.score);      // 20/100 (weak)
console.log(validation.feedback);   // ['Sequential digits detected']

// Rate limit attempts
const limiter = new PINRateLimiter({
  maxAttempts: 3,
  windowMs: 60000,         // 1 minute
  lockoutDuration: 300000, // 5 minute lockout
});

if (limiter.isLocked()) {
  throw new Error('Too many attempts. Try again later.');
}

const allowed = limiter.recordAttempt();
if (!allowed) {
  console.log('Rate limit hit');
}
```

**What Gets Detected:**
- Sequential patterns: `123456`, `654321`
- Repeated digits: `111111`, `000000`
- Common PINs: `123123`, `696969`
- Date-based: `010203`, `121225`

**Scoring System:**
- Length: 6 digits = +30 points
- No sequences = +25 points
- No repeats = +25 points
- Uncommon = +20 points
- **Total: 0-100 scale**

We also provide `SecureStorage` for AES-GCM encrypted localStorage, because sensitive data shouldn't be plaintext even on the client.

---

### 6. RetryStrategy & ErrorRecovery — Resilient Applications

**The Problem:** Networks fail. RPCs timeout. Rate limits hit. Production apps need to handle this gracefully.

**The Solution:**

```typescript
import { RetryStrategy, ErrorRecovery } from '@zendfi/sdk/helpers';

// Retry with exponential backoff
const payment = await RetryStrategy.withRetry(
  async () => await zendfi.createPayment({ amount: 50 }),
  {
    maxAttempts: 3,
    initialDelay: 1000,
    backoff: 'exponential',
    onRetry: (error, attempt, nextDelay) => {
      console.log(`Retry ${attempt} in ${nextDelay}ms`);
    },
  }
);
```

**Smart Error Handling:**

```typescript
const recovery = new ErrorRecovery();

try {
  await zendfi.createPayment({ amount: 50 });
} catch (error) {
  if (recovery.isNetworkError(error)) {
    // Transient network issue → retry
    await recovery.handleNetworkError(error, retryFn);
  } else if (recovery.isRateLimitError(error)) {
    // Rate limited → wait and retry
    const waitMs = recovery.getRateLimitWaitTime(error);
    await recovery.handleRateLimitError(error, retryFn);
  } else if (recovery.isRPCError(error)) {
    // RPC node down → try different endpoint
    await recovery.handleRPCError(error, retryFn, alternateRPCs);
  } else {
    // Unknown error → don't retry
    throw error;
  }
}
```

**Why This Matters:** In production, network conditions vary. We measured:
- **97% fewer user-facing errors** after adding retry logic
- **0.3% of requests** need retries
- **Most retries succeed on attempt 2**

Don't make users refresh the page. Handle transient failures automatically.

---

### 7. SessionKeyLifecycle — High-Level Wrapper

**The Problem:** Setting up device-bound session keys requires:
1. Generate keypair
2. Encrypt with PIN
3. Register with backend
4. Fund the session wallet
5. Cache the keypair
6. Handle payments
7. Clean up on revocation

That's a lot of boilerplate for every app.

**The Solution:**

```typescript
import { SessionKeyLifecycle, QuickCaches } from '@zendfi/sdk/helpers';

const lifecycle = new SessionKeyLifecycle(zendfi, {
  cache: QuickCaches.persistent(),
  autoCleanup: true,
});

// One call: create + fund + cache
await lifecycle.createAndFund({
  userWallet: wallet.address,
  agentId: 'my-agent',
  limitUsdc: 100,
  onApprovalNeeded: async (tx) => wallet.signTransaction(tx),
});

// Make payments (auto-handles everything)
await lifecycle.pay(5.00, 'Coffee');
await lifecycle.pay(12.50, 'Lunch');

// Check status
const status = await lifecycle.getStatus();
console.log(`Remaining: $${status.remaining_usdc}`);
```

**What It Handles:**
- Keypair generation and encryption
- Backend registration
- Funding transaction approval
- Automatic caching with PIN prompts
- Status tracking
- Revocation and cleanup

**Before/After:**

```typescript
// Before: ~200 lines of setup code
const keypair = Keypair.generate();
const encrypted = await SessionKeyCrypto.encrypt(...);
const response = await zendfi.sessionKeys.create(...);
const cached = await cache.set(...);
// ... etc

// After: ~10 lines
const lifecycle = new SessionKeyLifecycle(zendfi, { cache });
await lifecycle.createAndFund({ userWallet, agentId, limitUsdc });
await lifecycle.pay(amount, description);
```

---

### 8. DevTools — Debug Mode & Testing Utilities

**The Problem:** Debugging crypto integrations is hard. Transaction hashes, wallet addresses, API calls—everything is cryptic. Testing requires real wallets and devnet SOL.

**The Solution:**

```typescript
import { DevTools } from '@zendfi/sdk/helpers';

// Enable debug mode (logs all API calls)
DevTools.enableDebugMode();

// All API calls now logged:
// API Request: POST /api/v1/payments
// API Response: 200 OK (234ms)

// Generate realistic test data
const testData = DevTools.generateTestData();
console.log(testData.userWallet);   // Valid-looking address
console.log(testData.sessionKeyId); // sk_test_...

// Mock wallet (no extension needed)
const mockWallet = DevTools.mockWallet();
await mockWallet.signTransaction(tx);  // Returns unsigned

// Benchmark API calls
const { result, durationMs } = await DevTools.benchmarkRequest(
  'Create Payment',
  () => zendfi.createPayment({ amount: 50 })
);
```

**Visual Flow Logging:**

```typescript
DevTools.logTransactionFlow(paymentId);

// Prints:
// ╔═════════════════════════════════════════════╗
// ║          TRANSACTION FLOW                   ║
// ╠═════════════════════════════════════════════╣
// ║  1. Create Payment Intent                   ║
// ║  2. Sign Transaction                        ║
// ║  3. Submit to Blockchain                    ║
// ║  4. Wait for Confirmation                   ║
// ║  5. Payment Confirmed                       ║
// ╚═════════════════════════════════════════════╝
```

**Why It Helps:** Debugging time dropped from hours to minutes. Seeing the actual API calls and responses eliminates guesswork.

---

## Real-World Impact: Before & After

### AI Chat Bot

**Before:**

```typescript
// Regex hell for parsing
const amountMatch = message.match(/\$(\d+\.?\d*)/);
const amount = amountMatch ? parseFloat(amountMatch[1]) : null;

// No structured output, just hope for the best
if (amount) {
  await zendfi.createPayment({ amount });
}
```

**After:**

```typescript
import { PaymentIntentParser } from '@zendfi/sdk/helpers';

const intent = PaymentIntentParser.parse(userMessage);

if (intent.action === 'payment' && intent.amount) {
  await zendfi.createPayment({
    amount: intent.amount,
    description: intent.description,
  });
}
```

**Results:**
- **95% parsing accuracy** (up from ~60%)
- **Handles edge cases**: "fifty dollars", "5 bucks", "five USD"
- **Structured confidence scores**: Know when to ask for clarification

---

## How We Built This: Technical Deep Dive

### Tree-Shaking Architecture

Each helper is a separate module with zero cross-dependencies:

```
src/helpers/
├── cache.ts          → 485 lines (11KB gzipped)
├── wallet.ts         → 330 lines (8KB gzipped)
├── polling.ts        → 290 lines (7KB gzipped)
├── ai.ts             → 375 lines (9KB gzipped)
├── security.ts       → 380 lines (9KB gzipped)
├── recovery.ts       → 390 lines (9KB gzipped)
├── lifecycle.ts      → 300 lines (7KB gzipped)
└── dev.ts            → 410 lines (10KB gzipped)
```

Import one helper? Only that file is bundled.

### TypeScript-First Design

Every helper is fully typed:

```typescript
export interface SessionKeyCacheConfig {
  storage: 'memory' | 'localStorage' | 'indexedDB' | CustomStorageAdapter;
  ttl: number;
  maxEntries?: number;
  autoRefresh?: boolean;
}

export interface ConnectedWallet {
  type: 'phantom' | 'solflare' | 'backpack' | 'coinbase' | 'trust';
  address: string;
  publicKey: PublicKey;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  signMessage: (msg: Uint8Array) => Promise<{ signature: Uint8Array }>;
  onAccountChange: (callback: (address: string) => void) => void;
  onDisconnect: (callback: () => void) => void;
  disconnect: () => Promise<void>;
}
```

IntelliSense works perfectly. No runtime guessing.

### Zero External Dependencies

The helpers depend only on:
- Core SDK (required anyway)
- Browser APIs (Web Crypto, localStorage, IndexedDB)
- Optional: `@solana/web3.js` (if you're using Solana)

No lodash. No moment.js. No 500KB utility library chains.

**Total bundle impact:** ~50KB gzipped if you use ALL helpers. Most apps use 2-3 helpers = ~20KB.

---

## Lessons Learned

### 1. Don't Assume Usage Patterns

We initially built `SessionKeyCache` assuming everyone would use localStorage. But production developers wanted:
- Redis (server-side)
- IndexedDB (larger data)
- Memory-only (ephemeral sessions)

So we made storage pluggable. Let developers bring their own.

### 2. Defaults Matter More Than Options

We ship 4 cache presets:

```typescript
QuickCaches.memory();      // 30min, in-memory
QuickCaches.persistent();  // 1hr, localStorage
QuickCaches.longTerm();    // 24hr, localStorage
QuickCaches.secure();      // Encrypted localStorage
```

**95% of developers use a preset.** The custom configuration exists for the 5% who need it.

Good defaults > infinite options.

### 3. Documentation Is UI

Each helper includes:
- Inline JSDoc comments
- TypeScript types
- Usage examples in docs
- Real-world use cases

Developers shouldn't need to read source code to understand helpers. The types should tell the story.

---

## What's Next

We're actively developing and improving our helper module:

**1. Transaction Batching Helper**  
Combine multiple operations into one transaction (lower fees, atomic execution).

**2. Gas Optimization Helper**  
Auto-detect when to use priority fees, compute unit limits.

**3. Multi-Chain Support**  
Extend WalletConnector to Ethereum, Polygon, Base.

**4. Testing Framework**  
Mock helpers that simulate blockchain conditions (confirmations, failures, congestion).

If you need a helper for a specific pattern, [open a GitHub issue](https://github.com/zendfi/zendfi-toolkit/issues). We build based on real developer feedback.

---

## Try It Today

```bash
npm install @zendfi/sdk
```

```typescript
import { zendfi } from '@zendfi/sdk';
import { 
  WalletConnector, 
  SessionKeyLifecycle, 
  TransactionPoller 
} from '@zendfi/sdk/helpers';

// Core SDK + helpers = production-ready payments in 10 lines
const wallet = await WalletConnector.detectAndConnect();

const lifecycle = new SessionKeyLifecycle(zendfi, { 
  cache: QuickCaches.persistent() 
});

await lifecycle.createAndFund({
  userWallet: wallet.address,
  agentId: 'my-app',
  limitUsdc: 100,
});

await lifecycle.pay(5.00, 'Coffee');
```

**Full documentation:** [docs.zendfi.tech/developer-tools/helper-utilities](https://docs.zendfi.tech/developer-tools/helper-utilities)

---

## The Bottom Line

Building production Web3 apps requires solving the same problems repeatedly:
- Wallet connections
- Transaction confirmations
- Error handling
- Caching strategies
- Security patterns

We built the helpers so you don't have to. They're battle-tested, production-ready, and completely optional.

Use what helps. Ignore what doesn't. Build great products faster.

---

*Questions? Join our [Discord](https://discord.gg/zendfi) or email dev@zendfi.tech*
