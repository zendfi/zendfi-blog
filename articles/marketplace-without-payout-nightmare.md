---
title: "Building a Marketplace Without the Payout Nightmare"
author: "Blessed Tosin-Oyinbo"
date: "2025-12-31"
description: "How atomic payment splits let you build Gumroad, Fiverr, or OpenSea without managing escrow accounts, batch payouts, or complex accounting"
tags: ["marketplace", "payment-splits", "payments", "solana", "tutorial"]
category: "Dev Knowledge"
image: ""
---

## The Marketplace Problem Nobody Talks About

You're building a marketplace. Could be digital products (like Gumroad), freelance services (like Fiverr), or NFT trading (like OpenSea). The product is solid. The UX is smooth. Users love it.

Then you try to implement payouts.

**Reality check:**

- Creator sells a $100 item
- You need to take 10% platform fee
- Referrer gets 5% for bringing the customer
- Creator should get 85%

Sounds simple, right? Here's what actually happens with traditional systems:

### Option 1: Stripe Connect (Complex)

```javascript
// Step 1: Onboard each creator (KYC hell)
await stripe.accounts.create({
  type: 'express',
  capabilities: { transfers: { requested: true } }
});

// Step 2: Create payment intent
const payment = await stripe.paymentIntents.create({
  amount: 10000, // $100
  application_fee_amount: 1000, // Your 10%
});

// Step 3: Schedule transfer to creator
await stripe.transfers.create({
  amount: 8500, // $85
  destination: creatorStripeAccountId,
});

// Step 4: Handle referral separately (manual payout)
// ...days later in a batch job
```

**Issues:**
- Creators need Stripe accounts (KYC, verification delays)
- Application fees capped at 10% (can't do complex splits)
- Transfers take 7 days to settle
- Referral payouts require separate batch jobs
- Complex state management (what if transfer fails?)
- $0.25 per payout (adds up fast)

### Option 2: Escrow + Batch Payouts (Painful)

```javascript
// Hold funds in your account
const payment = await stripe.charges.create({ amount: 10000 });

// Later, in a cron job (once per week):
await database.query(`
  SELECT creator_id, SUM(amount) as total
  FROM pending_payouts
  WHERE status = 'pending'
  GROUP BY creator_id
`);

// Send payouts one by one
for (const payout of pendingPayouts) {
  await stripe.payouts.create({
    amount: payout.total,
    destination: payout.bank_account,
  });
}
```

**Issues:**
- You're holding other people's money (regulatory nightmare)
- Creators wait days/weeks for payouts
- Accounting complexity (reconcile every transaction)
- Failed payouts = manual cleanup
- Creator complaints about delayed payments

### Option 3: PayPal (Worse)

Don't. Just don't. 3.5% + $0.49 fees, frozen accounts, and mass payouts that fail randomly.

---

## The Atomic Split Solution

What if payment splits happened **at transaction time**? No holding funds. No batch jobs. No escrow accounts.

```typescript
import { zendfi } from '@zendfi/sdk';

// One API call. Three recipients. Instant settlement.
const payment = await zendfi.createPayment({
  amount: 100,
  description: 'Digital art purchase',
  split_recipients: [
    { recipient_wallet: 'creator_wallet', percentage: 85 },
    { recipient_wallet: 'platform_wallet', percentage: 10 },
    { recipient_wallet: 'referrer_wallet', percentage: 5 },
  ],
});

// Done. All three got paid instantly.
```

**What just happened:**

1. Customer pays $100 USDC
2. Transaction atomically splits:
   - $85 → Creator (instantly)
   - $10 → Platform (instantly)
   - $5 → Referrer (instantly)
3. All wallets credited in ~400ms
4. Zero escrow. Zero delays. Zero complexity.

This is how payment splits should work.

---

## Building It: Step-by-Step

Let's build a digital marketplace (think Gumroad for crypto) with automatic revenue splits.

### Step 1: Install the SDK

```bash
npm install @zendfi/sdk
```

### Step 2: The Basic Split Payment

```typescript
import { zendfi } from '@zendfi/sdk';

// Create payment with splits
const payment = await zendfi.createPayment({
  amount: 100,
  description: 'Premium digital template',
  customer_email: 'buyer@example.com',
  split_recipients: [
    {
      recipient_wallet: 'CREATOR_SOLANA_WALLET',
      recipient_name: 'Jane (Creator)',
      percentage: 85, // Creator gets 85%
    },
    {
      recipient_wallet: 'PLATFORM_SOLANA_WALLET',
      recipient_name: 'Platform Fee',
      percentage: 10, // Platform gets 10%
    },
    {
      recipient_wallet: 'REFERRER_SOLANA_WALLET',
      recipient_name: 'Affiliate',
      percentage: 5, // Referrer gets 5%
    },
  ],
});

console.log(`Payment URL: ${payment.payment_url}`);
console.log(`Split IDs: ${payment.split_ids}`);
```

That's it. When the customer pays, all three recipients get paid atomically.

### Step 3: Fixed Amounts + Percentages

You can mix fixed amounts and percentages:

```typescript
const payment = await zendfi.createPayment({
  amount: 100,
  description: 'Freelance design work',
  split_recipients: [
    {
      recipient_wallet: 'FREELANCER_WALLET',
      recipient_name: 'Designer',
      fixed_amount_usd: 90, // Freelancer gets $90 flat
    },
    {
      recipient_wallet: 'PLATFORM_WALLET',
      recipient_name: 'Platform Fee',
      fixed_amount_usd: 8, // Platform gets $8 flat
    },
    {
      recipient_wallet: 'CHARITY_WALLET',
      recipient_name: 'Tip Jar',
      percentage: 2, // Remaining 2% goes to charity ($2)
    },
  ],
});
```

### Step 4: Dynamic Split Orders

Control the order of splits (for cascading fees):

```typescript
const payment = await zendfi.createPayment({
  amount: 100,
  description: 'Course purchase',
  split_recipients: [
    {
      recipient_wallet: 'PROCESSOR_WALLET',
      recipient_name: 'Payment processor',
      fixed_amount_usd: 0.60, // Platform fee first (0.6%)
      split_order: 1,
    },
    {
      recipient_wallet: 'INSTRUCTOR_WALLET',
      recipient_name: 'Course instructor',
      percentage: 70, // 70% of remaining ($99.40)
      split_order: 2,
    },
    {
      recipient_wallet: 'PLATFORM_WALLET',
      recipient_name: 'Platform',
      percentage: 30, // 30% of remaining
      split_order: 3,
    },
  ],
});

// Result:
// Platform fee: $0.60
// Instructor: $69.58 (70% of $99.40)
// Platform: $29.82 (30% of $99.40)
```

### Step 5: Webhook Notifications Per Recipient

Each recipient gets a webhook when their split completes:

```typescript
// app/api/webhooks/zendfi/route.ts
import { verifyNextWebhook } from '@zendfi/sdk/webhooks';

export async function POST(request: Request) {
  const webhook = await verifyNextWebhook(request);
  
  if (!webhook) {
    return new Response('Invalid signature', { status: 401 });
  }
  
  switch (webhook.event) {
    case 'split.completed':
      const split = webhook.data;
      
      // Notify creator their payment arrived
      await notifyUser({
        wallet: split.recipient_wallet,
        amount: split.amount_usd,
        description: split.description,
      });
      
      // Update balance in your database
      await updateCreatorBalance(split.recipient_wallet, split.amount_usd);
      
      console.log(`✅ Split completed: ${split.amount_usd} USDC to ${split.recipient_name}`);
      break;
      
    case 'split.failed':
      // Handle failed split (rare, but possible)
      await handleFailedSplit(webhook.data);
      break;
  }
  
  return new Response('OK');
}
```

---

## Real-World Example: Building Gumroad for Crypto

Let's build a complete product sale flow with splits:

### Backend: Create Product Sale

```typescript
// app/api/products/[id]/purchase/route.ts
import { zendfi } from '@zendfi/sdk';

export async function POST(request: Request) {
  const { productId, referralCode } = await request.json();
  
  // Get product details
  const product = await db.products.findOne({ id: productId });
  const creator = await db.users.findOne({ id: product.creator_id });
  
  // Calculate splits
  const platformFee = product.price * 0.10; // 10%
  const creatorAmount = product.price * 0.85; // 85%
  const referralAmount = product.price * 0.05; // 5% (if referred)
  
  // Build split recipients
  const splitRecipients = [
    {
      recipient_wallet: creator.wallet_address,
      recipient_name: creator.display_name,
      fixed_amount_usd: creatorAmount,
    },
    {
      recipient_wallet: process.env.PLATFORM_WALLET,
      recipient_name: 'Platform Fee',
      fixed_amount_usd: platformFee,
    },
  ];
  
  // Add referrer if exists
  if (referralCode) {
    const referrer = await db.users.findOne({ referral_code: referralCode });
    if (referrer) {
      splitRecipients.push({
        recipient_wallet: referrer.wallet_address,
        recipient_name: `Referral: ${referrer.display_name}`,
        fixed_amount_usd: referralAmount,
      });
    }
  }
  
  // Create payment with splits
  const payment = await zendfi.createPayment({
    amount: product.price,
    description: `${product.name} by ${creator.display_name}`,
    customer_email: request.headers.get('user-email'),
    split_recipients: splitRecipients,
    metadata: {
      product_id: productId,
      creator_id: product.creator_id,
      referral_code: referralCode || null,
    },
  });
  
  return Response.json({
    payment_url: payment.payment_url,
    payment_id: payment.id,
  });
}
```

### Frontend: Embedded Checkout

```typescript
// app/products/[id]/page.tsx
'use client';

import { ZendFiEmbeddedCheckout } from '@zendfi/sdk';
import { useEffect, useState } from 'react';

export default function ProductPage({ product }) {
  const [purchasing, setPurchasing] = useState(false);
  
  const handlePurchase = async () => {
    setPurchasing(true);
    
    // Create payment with splits (backend)
    const response = await fetch(`/api/products/${product.id}/purchase`, {
      method: 'POST',
      body: JSON.stringify({
        productId: product.id,
        referralCode: getReferralFromURL(),
      }),
    });
    
    const { payment_url } = await response.json();
    
    // Extract link code from URL
    const linkCode = payment_url.split('/').pop();
    
    // Embed checkout
    const checkout = new ZendFiEmbeddedCheckout({
      linkCode,
      containerId: 'checkout-container',
      mode: 'live',
      
      onSuccess: async (payment) => {
        // Grant access to product
        await fetch('/api/grant-access', {
          method: 'POST',
          body: JSON.stringify({
            productId: product.id,
            paymentId: payment.paymentId,
          }),
        });
        
        // Show download link
        window.location.href = `/downloads/${product.id}`;
      },
      
      onError: (error) => {
        alert('Payment failed. Please try again.');
        setPurchasing(false);
      },
    });
    
    await checkout.mount();
  };
  
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      
      <div className="mt-8">
        <button
          onClick={handlePurchase}
          disabled={purchasing}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg"
        >
          Buy for ${product.price}
        </button>
      </div>
      
      {purchasing && (
        <div id="checkout-container" className="mt-8"></div>
      )}
      
      <div className="mt-4 text-sm text-gray-600">
        <p>💰 Creator gets 85% (${(product.price * 0.85).toFixed(2)})</p>
        <p>🏪 Platform fee: 10% (${(product.price * 0.10).toFixed(2)})</p>
        {referralCode && (
          <p>🎁 Referral bonus: 5% (${(product.price * 0.05).toFixed(2)})</p>
        )}
      </div>
    </div>
  );
}
```

---

## The Math: Stripe Connect vs Atomic Splits

Let's compare costs for a marketplace doing $100k/month in sales:

### Stripe Connect

**Fees:**
- Stripe fee: 2.9% + $0.30 per transaction
- Average transaction: $50
- Stripe cost per transaction: $1.75
- Transactions per month: 2,000
- **Monthly Stripe fees: $3,500**

**Payout costs:**
- Standard payout: $0.25 each
- Express payout: $1.00 each
- Payouts per month: ~500 creators
- **Monthly payout fees: $125 - $500**

**Total monthly cost: $3,625 - $4,000**

### ZendFi Atomic Splits

**Fees:**
- Platform fee: 0.6% flat
- $100k × 0.6% = **$600/month**
- Split fee: $0 (included)
- Payout fee: $0 (instant, atomic)

**Total monthly cost: $600**

**Savings: $3,025 - $3,400/month ($36k - $41k/year)**

At $1M/month in sales? You save **$300k - $400k/year** in fees.

---

## Advanced Use Cases

### Multi-Tier Affiliate System

```typescript
// Product: $100
// Creator gets 60%, Platform 10%, Affiliates split 30%
const payment = await zendfi.createPayment({
  amount: 100,
  description: 'Course enrollment',
  split_recipients: [
    { recipient_wallet: 'CREATOR_WALLET', percentage: 60 }, // $60
    { recipient_wallet: 'PLATFORM_WALLET', percentage: 10 }, // $10
    { recipient_wallet: 'AFFILIATE_1_WALLET', percentage: 20 }, // $20 (direct referrer)
    { recipient_wallet: 'AFFILIATE_2_WALLET', percentage: 10 }, // $10 (second tier)
  ],
});
```

### Dynamic Creator Tiers

```typescript
// Adjust split based on creator tier
const creatorTier = await getCreatorTier(creatorId);

const creatorPercentage = {
  bronze: 70,
  silver: 75,
  gold: 80,
  platinum: 85,
}[creatorTier];

const payment = await zendfi.createPayment({
  amount: 100,
  split_recipients: [
    { recipient_wallet: creatorWallet, percentage: creatorPercentage },
    { recipient_wallet: platformWallet, percentage: 100 - creatorPercentage },
  ],
});
```

### Tipping on Top of Purchase

```typescript
// Base price: $50, Customer adds $10 tip
const payment = await zendfi.createPayment({
  amount: 60, // $50 + $10 tip
  description: 'Digital art + tip',
  split_recipients: [
    {
      recipient_wallet: 'ARTIST_WALLET',
      fixed_amount_usd: 50, // Base payment
    },
    {
      recipient_wallet: 'ARTIST_WALLET',
      fixed_amount_usd: 10, // Tip (100% to artist)
    },
    {
      recipient_wallet: 'PLATFORM_WALLET',
      fixed_amount_usd: 5, // Platform fee (only on base, not tip)
    },
  ],
});
```

---

## Handling Edge Cases

### What if a split fails?

Splits are atomic—either all succeed or all fail. If one recipient's wallet is invalid, the entire transaction rolls back. The customer isn't charged.

```typescript
// Webhook for failed splits
case 'split.failed':
  const failedSplit = webhook.data;
  
  // Log for investigation
  await logError({
    payment_id: failedSplit.payment_id,
    recipient: failedSplit.recipient_wallet,
    reason: failedSplit.failure_reason,
  });
  
  // Notify customer (rare, but handle gracefully)
  await emailCustomer({
    subject: 'Payment Processing Issue',
    body: 'We encountered an issue. Please contact support.',
  });
  
  break;
```

### What about refunds?

When you refund a split payment, all recipients return their portion:

```typescript
// Original split: $100 → $85 creator, $10 platform, $5 referrer
const refund = await zendfi.refundPayment(paymentId);

// Automatic proportional refunds:
// Creator returns: $85
// Platform returns: $10
// Referrer returns: $5
// Customer receives: $100
```

### Can I update splits after payment?

No. Splits happen atomically at transaction time. This is by design—prevents complexity and ensures instant settlement.

If you need to adjust payouts later, create a new payment (like a bonus or correction).

---

## Security & Compliance

### Are you holding funds?

No. Payments go directly to recipient wallets atomically. We never custody funds.

### What about taxes?

Each recipient receives their split directly. They're responsible for their own tax reporting. You (the platform) report your platform fee as revenue.

Provide 1099s to US creators earning >$600/year (same as traditional marketplaces).

### KYC requirements?

Creators just need a Solana wallet address. No KYC, no onboarding delays. They can start receiving payments immediately.

Note: Depending on your jurisdiction and transaction volume, you may need KYC for your platform. Consult a lawyer.

---

## Production Checklist

Before launching your marketplace:

### ✅ Payment Splits
- [ ] Define your platform fee percentage
- [ ] Decide split allocation (creator%, platform%, referral%)
- [ ] Handle edge cases (invalid wallets, failed splits)
- [ ] Test with devnet USDC (free testing)
- [ ] Set up webhook endpoints for split notifications

### ✅ Creator Experience
- [ ] Onboarding flow (collect Solana wallet address)
- [ ] Earnings dashboard (show real-time balance)
- [ ] Transaction history with split breakdowns
- [ ] Email notifications when earnings arrive
- [ ] Wallet setup guide for non-crypto users

### ✅ Customer Experience
- [ ] Clear pricing breakdown (show creator cut, platform fee)
- [ ] Embedded checkout (no redirects)
- [ ] Post-purchase download/access flow
- [ ] Receipt emails with transaction details
- [ ] Support for failed payments

### ✅ Accounting & Legal
- [ ] Track platform fees for tax reporting
- [ ] Generate 1099s for US creators (if required)
- [ ] Terms of service covering split payments
- [ ] Creator agreement outlining fee structure
- [ ] Consult lawyer on jurisdiction-specific requirements

---

## Why This Changes Marketplaces

Traditional marketplaces are slow because of payment rails:

**Old way:**
1. Customer pays platform
2. Platform holds funds (escrow)
3. Wait for disputes period (7-30 days)
4. Batch payout to creator
5. Creator waits for bank transfer (3-5 days)
6. **Total time: 10-35 days**

**Atomic splits:**
1. Customer pays
2. All recipients get paid instantly
3. **Total time: ~400ms**

This isn't just faster—it's a different business model. Creators get paid immediately. No escrow accounts. No regulatory complexity. No "please wait 2 weeks for your payout" support tickets.

You're not building a marketplace with payments. You're building a marketplace **powered by** instant settlements.

---

## What's Next?

We're working on:

- **Subscription splits**: Recurring revenue splits for memberships
- **Conditional splits**: "If creator sells >$10k, increase their cut to 90%"
- **Split templates**: Pre-defined split structures you can reuse
- **Split analytics**: Dashboard showing split performance
- **Multi-chain splits**: Same atomic splits on Ethereum, Polygon, etc.

---

## Try It Yourself

Complete starter templates and guides:

**Tutorials:**
- [Payment Splits Deep Dive](/article/payment-splits-deep-dive)
- [Marketplace Accounting](/article/marketplace-accounting)
- [Creator Onboarding Guide](/article/creator-onboarding)

**Code:**
- [Gumroad Clone (Next.js)](https://github.com/zendfi/gumroad-clone)
- [Fiverr Clone (React + Express)](https://github.com/zendfi/fiverr-clone)
- [NFT Marketplace (Solana)](https://github.com/zendfi/nft-marketplace-template)

**Dashboard:**
- [Get API keys](https://zendfi.tech/dashboard)
- [Test with devnet](https://docs.zendfi.tech/testing)
- [View split analytics](https://zendfi.tech/dashboard/splits)

---

## Resources

- **SDK Documentation**: [docs.zendfi.tech](https://docs.zendfi.tech)
- **Payment Splits API**: [docs.zendfi.tech/splits](https://docs.zendfi.tech/splits)
- **Webhook Reference**: [docs.zendfi.tech/webhooks](https://docs.zendfi.tech/webhooks)
- **Compliance Guide**: [docs.zendfi.tech/compliance](https://docs.zendfi.tech/compliance)

Questions? Find us on [Twitter](https://twitter.com/zendfi_) or [Discord](https://discord.gg/3QJnnwuXSs).

---

*Building the payment infrastructure for the creator economy. One atomic split at a time.*
