```yaml
title: "Why We Chose Rust (And You Should Too)"
author: "The ZendFi Team"
date: "2025-08-28"
description: "The story of how Rust became the foundation of ZendFi, and why we'd make the same choice again."
tags: ["engineering", "rust", "architecture", "performance"]
category: "Dev Knowledge"
image: ""
```

## The Decision Point

When we started building ZendFi, we faced the language question every team faces. We had options:

- **Node.js/TypeScript**: Fast iteration, huge ecosystem
- **Go**: Simple, fast, great for services
- **Python**: Quick prototyping, AI integrations
- **Rust**: Performance, safety, Solana-native

We chose Rust. Here's why, and why after 18 months of production code, we'd choose it again.

---

## Reason 1: The Solana Ecosystem Is Rust

This was pretty much, the biggest factor. Solana itself is written in Rust. The SDKs are Rust-first. The on-chain programs are Rust. The anchor framework is Rust.

When you're building on Solana in Rust, you're using the same types the blockchain uses:

```rust
use solana_sdk::{
    pubkey::Pubkey,
    transaction::Transaction,
    signature::Signature,
};

// This is THE Pubkey type, not a wrapper
fn process_payment(merchant: Pubkey, amount: u64) -> Transaction {
    // Direct access to Solana primitives
}
```

No translation layers. No serialization mismatches. No "oops, JavaScript can't represent that u64 accurately.", haha no shades to all the wonderful JS devs out there, but...

With JavaScript:

```javascript
// Fingers crossed, hope this 64-bit integer fits in a Number!
const amount = BigInt(response.amount);  // ...and now I need to convert everywhere
```

With Rust:

```rust
let amount: u64 = response.amount;  // Yup, that's ready to go!
```

---

## Reason 2: Memory Safety Without GC Pauses

We process payments. Payments have SLAs. When someone clicks "pay," they expect it to work in milliseconds, not pause for garbage collection.

```rust
// This allocation pattern is deterministic
fn process_request(input: &[u8]) -> Result<Response> {
    let parsed = parse_request(input)?;  // Stack or heap, we control it
    let result = compute(parsed)?;
    Ok(result)  // Memory freed deterministically
}
```

In production, our P99 latency is under 50ms. We've never had a GC pause spike. Our memory usage is predictable and flat:

```
Memory Usage Over Time:
────────────────────────────────────────────────────
│                                                  │
│ ────────────────────────────────────────         │ 256MB (stable)
│                                                  │
│                                                  │
│                                                  │
│                                                  │
└──────────────────────────────────────────────────
    0h            12h            24h
```

No sawtooth pattern. No sudden spikes. Just consistent performance.

---

## Reason 3: Fearless Concurrency

Payment processing is inherently concurrent. Multiple requests arrive simultaneously. We need to:

- Validate signatures in parallel
- Query multiple RPC nodes simultaneously
- Process webhooks without blocking
- Handle thousands of WebSocket connections

Rust's ownership model (our starboy! lol) makes concurrent code safe by default:

```rust
use tokio::sync::RwLock;
use std::sync::Arc;

struct PaymentProcessor {
    pending: Arc<RwLock<HashMap<String, PendingPayment>>>,
    rpc_pool: Arc<RpcPool>,
}

impl PaymentProcessor {
    async fn process(&self, payment: Payment) -> Result<Receipt> {
        // Concurrent access is safe - compiler verifies
        let pending = self.pending.read().await;
        if pending.contains_key(&payment.id) {
            return Err(anyhow!("Duplicate payment"));
        }
        drop(pending);  // Release read lock

        // Parallel RPC calls
        let (balance, recent_blockhash) = tokio::try_join!(
            self.rpc_pool.get_balance(&payment.from),
            self.rpc_pool.get_recent_blockhash(),
        )?;

        // No data races possible - compiler enforces it
    }
}
```

In Node.js, we'd need careful discipline to avoid race conditions. In Rust, the compiler catches them at compile time:

```rust
// This won't compile, can't have multiple mutable references
async fn bad_code() {
    let mut data = vec![1, 2, 3];
    let ref1 = &mut data;
    let ref2 = &mut data;  // ERROR: cannot borrow `data` as mutable more than once

    tokio::join!(
        modify(ref1),
        modify(ref2),
    );
}
```

---

## Reason 4: The Type System Catches Bugs

Money is involved. Bugs are expensive. Rust's type system catches entire categories of errors:

### Example 1: Never Confuse Amounts

```rust
// Distinct types for different units
#[derive(Debug, Clone, Copy)]
struct Lamports(u64);

#[derive(Debug, Clone, Copy)]
struct UsdCents(u64);

#[derive(Debug, Clone, Copy)]
struct TokenAmount(u64, u8);  // amount, decimals

fn create_payment(amount: UsdCents) -> Transaction {
    // Can't accidentally pass lamports here
}

// This won't compile:
let lamports = Lamports(1_000_000);
create_payment(lamports);  // ERROR: expected UsdCents, found Lamports
```

### Example 2: States Are Explicit

```rust
enum PaymentState {
    Pending { expires_at: DateTime<Utc> },
    Submitted { signature: Signature, submitted_at: DateTime<Utc> },
    Confirmed { signature: Signature, slot: u64 },
    Failed { reason: String },
    Refunded { refund_signature: Signature },
}

impl PaymentState {
    fn can_refund(&self) -> bool {
        matches!(self, PaymentState::Confirmed { .. })
    }

    fn signature(&self) -> Option<&Signature> {
        match self {
            PaymentState::Submitted { signature, .. } => Some(signature),
            PaymentState::Confirmed { signature, .. } => Some(signature),
            _ => None,
        }
    }
}
```

### Example 3: Errors Are Handled

```rust
// Result forces you to handle errors
fn get_payment(id: &str) -> Result<Payment, PaymentError> {
    let record = db.query(id)?;  // ? propagates errors
    parse_payment(record)
}

// You can't ignore the Result
let payment = get_payment("pay_123");  // WARNING: unused Result
let payment = get_payment("pay_123")?;  // ✓ Properly handled
```

---

## Reason 5: Zero-Cost Abstractions

We write high-level code that compiles to machine-code performance:

```rust
// This high-level, readable code...
let valid_payments: Vec<_> = payments
    .iter()
    .filter(|p| p.amount > 0)
    .filter(|p| p.expires_at > Utc::now())
    .map(|p| ValidPayment::from(p))
    .collect();

// ...compiles to the same assembly as hand-written loops
```

We use iterators, closures, and generics freely. The compiler optimizes them away. We get:

- Abstract, maintainable code
- C-level performance
- No runtime overhead

---

## Reason 6: Incredible Tooling

### Cargo: The Best Build System

```bash
cargo build          # Compile
cargo test           # Run tests
cargo run            # Run the app
cargo fmt            # Format code
cargo clippy         # Lint
cargo doc            # Generate docs
cargo bench          # Benchmarks
```

One tool does everything. No webpack, babel, tsc, npm, yarn decisions. (We bet the JS devs on the team envy this 😎)

### Dependencies Are Sane

```toml
# Cargo.toml
[dependencies]
tokio = { version = "1.0", features = ["full"] }
axum = "0.7"
sqlx = { version = "0.7", features = ["postgres", "runtime-tokio"] }
```

Lock file is automatic. Reproducible builds work. Dependencies compile once and cache.

### Error Messages Are Helpful

```rust
error[E0382]: borrow of moved value: `payment`
  --> src/main.rs:10:15
   |
7  |     let payment = Payment::new();
   |         ------- move occurs because `payment` has type `Payment`, which does not implement the `Copy` trait
8  |     process(payment);
   |             ------- value moved here
9  |     
10 |     log(payment);
   |         ^^^^^^^ value borrowed here after move
   |
help: consider cloning the value if the performance cost is acceptable
   |
8  |     process(payment.clone());
   |                    ++++++++
```

The compiler tells you exactly what's wrong and how to fix it. (Hands up if your compiler can beat this 😂)

---

## Reason 7: Growing Ecosystem

When we started, the Rust web ecosystem was "great!" Now it's even more excellent:

- **axum**: Production-ready web framework from the tokio team
- **sqlx**: Compile-time checked SQL queries
- **serde**: Best-in-class serialization
- **tracing**: Structured logging and distributed tracing
- **tokio**: Battle-tested async runtime

Our stack:

```rust
// This is real production code
#[tokio::main]
async fn main() -> Result<()> {
    // Tracing subscriber for structured logging
    tracing_subscriber::init();

    // Database with compile-time checked queries
    let db = PgPoolOptions::new()
        .max_connections(50)
        .connect(&env::var("DATABASE_URL")?)
        .await?;

    // Verify schema at startup
    sqlx::migrate!().run(&db).await?;

    // Build the app
    let app = Router::new()
        .route("/v1/payments", post(create_payment))
        .route("/v1/payments/:id", get(get_payment))
        .layer(TraceLayer::new_for_http())
        .with_state(AppState::new(db));

    // Run it
    axum::serve(listener, app).await?;

    Ok(())
}
```

Clean, readable, fast, safe.

---

## The Trade-offs We Accept

Rust isn't free. Here's what we pay:

### Learning Curve

New engineers take 2-4 weeks to become productive. But then:

- They write safer code
- They catch bugs earlier
- They understand memory and performance

We consider this an investment, not a cost.

### Some Tasks Are Verbose

Quick scripts are easier in Python:

```python
# Python: 3 lines
data = requests.get(url).json()
result = [x['name'] for x in data if x['active']]
print(result)
```

```rust
// Rust: More lines
let data: Vec<Item> = reqwest::get(url).await?.json().await?;
let result: Vec<&str> = data.iter()
    .filter(|x| x.active)
    .map(|x| x.name.as_str())
    .collect();
println!("{:?}", result);
```
### Compile Times (Ahh yes, the one Blessed never shuts up about 😂)

Debug builds: ~30 seconds  
Release builds: ~3 minutes


We mitigate with:

- `cargo check` for fast feedback
- Incremental compilation
- `sccache` for distributed caching
- Splitting into smaller crates

For production services, the extra explicitness is a feature. For quick scripts, we still use Python.

---

## Would We Choose Rust Again?

Absolutely.

For a payment system on Solana, Rust gives us:

1. **Native blockchain integration** - Same types as Solana itself
2. **Performance** - Sub-50ms latency without GC pauses
3. **Safety** - The compiler catches bugs before production
4. **Concurrency** - Fearless parallelism in payment processing
5. **Reliability** - 18 months, zero memory bugs

The learning curve is real. The compile times are real. But for critical financial infrastructure, we'll take compile-time errors over runtime crashes every time.

---

## Getting Started

If you're considering Rust for your next project:

1. **Read the book**: [The Rust Programming Language](https://doc.rust-lang.org/book/) is excellent
2. **Do the exercises**: [Rustlings](https://github.com/rust-lang/rustlings) for practice
3. **Build something small**: A CLI tool or API server
4. **Join the community**: The Rust community is welcoming and helpful

And if you're building on Solana: don't fight the ecosystem. Use Rust.

---

*Want to learn more about writing Rust? Feel free to reach out to Blessed: **blessed@zendfi.tech**, he's always happy to help!*