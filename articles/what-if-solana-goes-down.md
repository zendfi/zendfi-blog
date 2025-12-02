---
title: ""But What If Solana Goes Down?" (And Other Misconceptions)"
author: "The ZendFi Team"
date: "2025-10-1"
description: "Let's be honest, we're probably all wondering right? Well, let's dig in!"
tags: ["engineering", "rust", "architecture", "performance"]
category: "FAQ"
image: ""
---

## TL;DR

Solana has had outages. So has AWS. So has Visa. We've built resilience into every layer: multi-RPC failover, circuit breakers, idempotent retries, and graceful degradation. When the network hiccups, your payments don't disappear, they wait.

---

## The Elephant in the Room

Alright alright, let's address it directly: Solana has experienced outages. In 2022, there were several. The crypto community (especially Ethereum maxis) loves to bring this up.

Here's our honest take:

1. **Yes, outages happen.** Every system has them.
2. **They've gotten rarer.** 2024 uptime was 99.9%+.
3. **We've built for them.** Our architecture handles network issues gracefully.
4. **The alternative isn't better.** Traditional payment rails have outages too—they're just less public.

Now let's talk about what we actually do when things go wrong.

---

## Misconception #1: "If Solana Goes Down, I Lose My Money"

**Reality: Your money is safe. Transactions just wait.**

When the network is unavailable:

```
User Initiates Payment
        │
        ▼
┌─────────────────────┐
│  Transaction Built  │
│  (Signed by user)   │
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│  Network Check      │ ──► Network down?
└─────────────────────┘           │
        │                         ▼
        │               ┌─────────────────────┐
        │               │  Queue Transaction  │
        │               │  (Persistent store) │
        │               └─────────────────────┘
        │                         │
        ▼                         │
┌─────────────────────┐           │
│  Submit to Network  │ ◄─────────┘ (When network recovers)
└─────────────────────┘
        │
        ▼
   Confirmed ✓
```

Transactions are:

- **Signed client-side** (user's wallet)
- **Stored persistently** (our database)
- **Retried automatically** (with exponential backoff)
- **Confirmed eventually** (when network is healthy)

Your funds never leave your wallet until the transaction actually succeeds on-chain.

---

## Misconception #2: "Solana Is Less Reliable Than Visa"

**Reality: Different failure modes, similar overall reliability.**

Let's compare:

| Metric | Solana (2024) | Visa |
| --- | --- | --- |
| Uptime | 99.9%+ | 99.99% |
| Transaction time | 400ms | 1-3 seconds |
| Settlement time | Instant | 1-3 days |
| Failure visibility | Public (blockchain) | Hidden |
| Recovery method | Automatic retry | Manual intervention |

Visa's "99.99% uptime" means:

- ~52 minutes of downtime per year
- When it fails, transactions are declined
- You have to manually retry

Solana's 99.9% uptime means:

- ~8 hours of potential degradation per year
- When it's slow, transactions queue
- They confirm when the network recovers

**Key difference**: Solana failures are public and dramatic. Visa failures are silent and hidden. Neither is perfect.

---

## Misconception #3: "If Your Server Goes Down, Payments Fail"

**Reality: We run redundant infrastructure with automatic failover.**

Our architecture:

```
                    Load Balancer
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
   ┌──────────┐   ┌──────────┐   ┌──────────┐
   │ Server 1 │   │ Server 2 │   │ Server 3 │
   └──────────┘   └──────────┘   └──────────┘
         │               │               │
         └───────────────┼───────────────┘
                         │
                   PostgreSQL
              (Primary + Replica)
```

If any server fails:

- Load balancer routes to healthy servers
- No requests are dropped
- Users don't notice

If our entire infrastructure fails:

- Pending transactions are persisted
- Webhooks queue and retry
- Nothing is lost

---

## Misconception #4: "RPC Nodes Are a Single Point of Failure"

**Reality: We use multi-RPC with automatic failover.**

We maintain connections to multiple RPC providers:

```rust
pub struct ResilientRpcClient {
    endpoints: Vec<RpcEndpoint>,
    circuit_breakers: HashMap<String, CircuitBreaker>,
}

impl ResilientRpcClient {
    pub async fn send_transaction(&self, tx: &Transaction) -> Result<Signature> {
        for endpoint in self.healthy_endpoints() {
            match endpoint.send_transaction(tx).await {
                Ok(sig) => return Ok(sig),
                Err(e) => {
                    // Mark endpoint as potentially unhealthy
                    self.record_failure(&endpoint);
                    continue;  // Try next endpoint
                }
            }
        }
        Err(Error::AllEndpointsFailed)
    }
}
```

Our RPC strategy:

- **Primary**: Helius (high reliability)
- **Secondary**: QuickNode (geographic diversity)
- **Tertiary**: Public RPC (last resort)
- **Circuit breakers**: Temporarily skip failing endpoints

If Helius is down, we automatically use QuickNode. If both are down, we use public RPCs. If everything is down... well, Solana is probably down.

---

## Misconception #5: "Crypto Transactions Can Get Stuck Forever"

**Reality: Solana transactions have built-in expiration.**

Every Solana transaction includes a recent blockhash that expires in ~2 minutes:

```rust
// Transaction structure
{
    recent_blockhash: "abc123...",  // Valid for ~150 blocks (~2 min)
    signatures: [...],
    message: {...}
}
```

If a transaction doesn't confirm within 2 minutes:

- It becomes invalid
- It can never be processed
- We create a new transaction with a fresh blockhash
- We retry

**Transactions cannot get "stuck" on Solana.** They either confirm or expire.

---

## Misconception #6: "Gas Fees Can Spike Unexpectedly"

**Reality: Solana fees are predictable and we cover them anyway.**

Solana fee structure:

- Base fee: 5,000 lamports (~$0.0001)
- Priority fee: Variable but typically <$0.01

Compare to Ethereum:

- Base fee: Variable (can be $5-$500)
- Priority fee: Auction-based
- Total: Unpredictable, sometimes unusable

With ZendFi:

- **We pay all fees** (gasless transactions)
- **We absorb spikes** (our cost, not yours)
- **Users never see fees** (price shown = price paid)

---

## Misconception #7: "USDC Can Depeg" (sighs 😂)

**Reality: USDC has maintained its peg through multiple crises.**

USDC is backed 1:1 by:

- US dollars in regulated banks
- Short-term US Treasury securities
- Monthly attestations by major accounting firms

Historical depegs:

- March 2023: Briefly dropped to $0.87 during SVB crisis
- Recovered within 48 hours
- Circle had no actual exposure to SVB

Our approach:

- We quote in USD, settle in USDC
- If USDC depegs, the blockchain value fluctuates
- Your accounting stays in USD
- Long-term peg has always restored

For businesses that need guarantees: we're actively working on adding instant off-ramp to actual USD/NGN bank accounts.

---

## What We Actually Guarantee

Let's be precise about what we promise:

### We Guarantee

- **Transaction integrity**: If we confirm a payment, it happened
- **Funds safety**: We never have access to user private keys
- **Retry logic**: Failed transactions are automatically retried
- **Webhook delivery**: At-least-once delivery with dead letter queue
- **Data persistence**: Your payment records are never lost

### We Don't Guarantee (We've got to be honest here)

- **100% uptime**: No one can (we target 99.9%)
- **Instant confirmation**: Usually <1s, but network congestion happens
- **Fixed fees forever**: Solana fees could increase (still our problem, not yours)
- **USDC price stability**: It's a stablecoin, not a guarantee

---

## How We Handle Incidents

When something goes wrong, here's our playbook:

### Level 1: RPC Issues

- Automatic failover to backup RPC
- No user impact
- Alert to engineering team

### Level 2: Transaction Delays

- Queue transactions locally
- Show "processing" status to users
- Retry every 30 seconds
- Alert if delay exceeds 5 minutes

### Level 3: Network Congestion

- Increase priority fees automatically
- Queue non-urgent transactions
- Process high-priority payments first
- Communicate via status page

### Level 4: Full Network Outage

- Pause new payment creation
- Show maintenance page
- Queue all pending transactions
- Post incident updates every 15 minutes
- Process queue when network recovers

---

## The Bottom Line

Every payment system has failure modes. Ours are:

1. **Public** (you can see Solana's status)
2. **Recoverable** (transactions retry automatically)
3. **Non-custodial** (your funds are never at risk with us)

We're not claiming perfection. We're claiming **resilience**.

When things go wrong—and they will—your payments don't disappear. They wait, retry, and eventually succeed.

That's not a limitation of crypto. That's how robust systems work.

---

## Further Reading

- [Solana Status Page](https://status.solana.com)
- [Our Status Page](https://api.zendfi.tech/status)
- [Incident Response Runbook](https://zendfi.tech/docs/reliability/incidents) (public)
- [Solana Post-Mortems](https://solana.com/news) (their transparency)

---

*Have reliability concerns we didn't address? Ask us: info@zendfi.io*
