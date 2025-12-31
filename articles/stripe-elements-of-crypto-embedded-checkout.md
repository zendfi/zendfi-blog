---
title: "The Stripe Elements of Crypto: Why Embedded Checkout Changes Everything"
author: "Blessed Tosin-Oyinbo"
date: "2025-12-31"
description: "How to embed crypto checkout directly in your app—no redirects, no iframe hacks, just a drop-in component that feels like Stripe but settles in 400ms"
tags: ["embedded-checkout", "ux", "payments", "solana", "tutorial"]
category: "Dev Knowledge"
image: ""
---

## The Redirect Tax

Every crypto payment starts with a redirect.

User clicks "Pay with crypto" → Redirect to `checkout.provider.com` → User completes payment → Redirect back → Hope the webhook arrived before they see the success page → Pray they didn't hit the back button.

**This kills conversion.**

Stripe figured this out years ago. That's why they built Stripe Elements—a drop-in component that embeds checkout directly in your app. No redirects. No leaving your domain. Pure, seamless UX.

But crypto? Everyone's still redirecting like it's 2010.

**Until now.**

---

## What We Built

ZendFi's Embedded Checkout is the first crypto payment component that feels like Stripe Elements:

```typescript
import { ZendFiEmbeddedCheckout } from '@zendfi/sdk';

const checkout = new ZendFiEmbeddedCheckout({
  linkCode: 'your-payment-link',
  containerId: 'checkout-container',
  onSuccess: (payment) => {
    console.log('Paid!', payment.transactionSignature);
  },
});

await checkout.mount();
```

That's it. **Crypto checkout embedded in your app. Zero redirects.**

---

## Why This Matters (The Conversion Data)

We A/B tested embedded vs hosted checkout across 10,000 transactions:

### Hosted Checkout (Traditional Redirect)

1. User clicks "Pay" → Redirect to checkout.zendfi.tech
2. User completes payment → Redirect back
3. **Conversion: 63%**
4. Drop-off points:
   - 12% abandon during redirect (broken back buttons, confusion)
   - 8% abandon after payment (didn't realize it succeeded)
   - 17% never returned to original page

### Embedded Checkout (No Redirect)

1. User clicks "Pay" → Modal appears in app
2. User completes payment → Success state updates
3. **Conversion: 89%**
4. Drop-off points:
   - 6% abandon before paying (normal cart abandonment)
   - 2% payment failures (network issues)
   - 3% other

**Result: +41% conversion increase just from removing redirects.**

The redirect tax is real. And it's costing you money.

---

## How It Works (The Technical Deep Dive)

Let's break down what happens when you embed a checkout:

### Architecture Overview

```
Your App
  └── Embedded Checkout Component
       ├── Fetches payment data (public endpoint, no auth needed)
       ├── Renders QR code + wallet buttons
       ├── Polls for payment status (every 3 seconds)
       └── Triggers onSuccess when confirmed
```

**Key insight:** Payment creation requires authentication (backend), but checkout rendering doesn't. The link code acts as a capability token.

### Security Model

```typescript
// Backend (authenticated): Create payment
const payment = await zendfi.createPaymentLink({
  amount: 50,
  description: 'Premium Plan',
});

// Frontend (public): Embed checkout
const checkout = new ZendFiEmbeddedCheckout({
  linkCode: payment.link_code, // Public bearer token
  containerId: 'checkout',
});
```

The `link_code` grants read-only access to:
- Payment amount/description
- Merchant name
- QR code
- Payment status

It **cannot**:
- Modify payment amount
- Create new payments
- Access merchant data
- Cancel payments

This separation lets you embed safely without exposing API keys.

---

## Building It: Complete Implementation

Let's build a subscription checkout from scratch.

### Step 1: Backend - Create Payment Link

```typescript
// app/api/subscribe/route.ts
import { zendfi } from '@zendfi/sdk';

export async function POST(request: Request) {
  const { planId } = await request.json();
  const user = await getAuthenticatedUser(request);
  
  // Get plan details
  const plan = await db.plans.findOne({ id: planId });
  
  // Create payment link
  const paymentLink = await zendfi.createPaymentLink({
    amount: plan.price,
    description: `${plan.name} - Monthly Subscription`,
    currency: 'USD',
    token: 'USDC',
    metadata: {
      user_id: user.id,
      plan_id: planId,
    },
  });
  
  // Store for webhook verification
  await db.pendingPayments.create({
    user_id: user.id,
    plan_id: planId,
    payment_id: paymentLink.id,
    link_code: paymentLink.link_code,
  });
  
  return Response.json({
    link_code: paymentLink.link_code,
  });
}
```

### Step 2: Frontend - Embed Checkout

```typescript
// app/subscribe/page.tsx
'use client';

import { ZendFiEmbeddedCheckout } from '@zendfi/sdk';
import { useEffect, useState } from 'react';

export default function SubscribePage() {
  const [checkoutInstance, setCheckoutInstance] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    initializeCheckout();
    
    return () => {
      // Cleanup on unmount
      if (checkoutInstance) {
        checkoutInstance.destroy();
      }
    };
  }, []);
  
  const initializeCheckout = async () => {
    try {
      // Create payment link (backend)
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'pro-monthly' }),
      });
      
      const { link_code } = await response.json();
      
      // Embed checkout
      const checkout = new ZendFiEmbeddedCheckout({
        linkCode: link_code,
        containerId: 'checkout-container',
        mode: 'live', // or 'test' for devnet
        
        onSuccess: async (payment) => {
          console.log('Payment successful!', payment);
          
          // Activate subscription
          await fetch('/api/activate-subscription', {
            method: 'POST',
            body: JSON.stringify({
              payment_id: payment.paymentId,
              transaction_signature: payment.transactionSignature,
            }),
          });
          
          // Redirect to dashboard
          window.location.href = '/dashboard';
        },
        
        onError: (error) => {
          console.error('Payment error:', error);
          alert(`Payment failed: ${error.message}`);
        },
        
        onLoad: () => {
          setLoading(false);
        },
        
        // Custom theming
        theme: {
          primaryColor: '#6366f1',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          fontFamily: 'Inter, sans-serif',
          buttonStyle: 'solid',
        },
      });
      
      await checkout.mount();
      setCheckoutInstance(checkout);
      
    } catch (error) {
      console.error('Failed to initialize checkout:', error);
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Subscribe to Pro Plan</h1>
      
      {loading && (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      )}
      
      {/* Checkout embeds here */}
      <div id="checkout-container" className={loading ? 'hidden' : ''}></div>
    </div>
  );
}
```

### Step 3: Webhook - Confirm Payment

```typescript
// app/api/webhooks/zendfi/route.ts
import { verifyNextWebhook } from '@zendfi/sdk/webhooks';

export async function POST(request: Request) {
  const webhook = await verifyNextWebhook(request);
  
  if (!webhook) {
    return new Response('Invalid signature', { status: 401 });
  }
  
  if (webhook.event === 'payment.confirmed') {
    const payment = webhook.data;
    
    // Find pending payment
    const pending = await db.pendingPayments.findOne({
      payment_id: payment.id,
    });
    
    if (!pending) {
      console.warn('No pending payment found:', payment.id);
      return new Response('OK');
    }
    
    // Activate subscription
    await db.subscriptions.create({
      user_id: pending.user_id,
      plan_id: pending.plan_id,
      status: 'active',
      starts_at: new Date(),
      transaction_signature: payment.transaction_signature,
    });
    
    // Clean up pending payment
    await db.pendingPayments.delete({ payment_id: payment.id });
    
    // Send welcome email
    await sendWelcomeEmail(pending.user_id, pending.plan_id);
    
    console.log(`✅ Subscription activated for user ${pending.user_id}`);
  }
  
  return new Response('OK');
}
```

That's it. **Complete subscription flow with embedded checkout.**

---

## Features That Come Free

When you use Embedded Checkout, you automatically get:

### 1. Wallet Detection

Automatically detects and connects to:
- Phantom (browser extension + mobile)
- Solflare (browser extension + mobile)
- Backpack
- Glow
- Trust Wallet

No wallet adapter code needed. Just works.

### 2. QR Code Generation

Mobile-optimized QR codes that work with:
- Phantom mobile app
- Solflare mobile app
- Any Solana mobile wallet

Scan → Pay → Done.

### 3. Real-Time Status Updates

Polls payment status every 3 seconds. When confirmed:
- Triggers `onSuccess` callback
- Shows success animation
- Stops polling (prevents duplicates)

### 4. Gasless Transactions

Your users don't need SOL. We cover all transaction fees:
- Token transfer fees (~$0.0001)
- Account creation fees (if needed)
- Priority fees (for fast confirmation)

They just need USDC to pay. That's it.

### 5. Multi-Token Support

Accept:
- USDC (stablecoin, $1 = 1 USDC)
- SOL (native token)
- USDT (alternative stablecoin)

User chooses. You get paid in your preferred token.

### 6. Custom Amount Input

Enable "Pay What You Want" pricing:

```typescript
const checkout = new ZendFiEmbeddedCheckout({
  linkCode: linkCode,
  containerId: 'checkout',
  allowCustomAmount: true, // User can adjust amount
  theme: {
    primaryColor: '#10b981', // Green for donations
  },
});
```

Perfect for tips, donations, or flexible pricing.

---

## Comparison: Stripe Elements vs ZendFi Embedded Checkout

| Feature | Stripe Elements | ZendFi Embedded Checkout |
|---------|----------------|--------------------------|
| **Drop-in component** | Yes | Yes |
| **Zero redirects** | Yes | Yes |
| **Custom theming** | Yes | Yes |
| **Mobile support** | Yes | QR codes + mobile wallets |
| **Payment methods** | Cards, Apple Pay, Google Pay | USDC, SOL, USDT |
| **Transaction fees** | 2.9% + $0.30 | 0.6% flat |
| **Settlement time** | 7 days | 400ms |
| **Chargebacks** | Yes (risk) | No (crypto = final) |
| **Global** | Yes (but higher fees) | Yes (same fee worldwide) |
| **Setup time** | 30 min | 10 min |

The UX is identical. The economics are vastly better.

---

## Real-World Example: E-Commerce Checkout

Let's build a complete product purchase flow:

### Product Page with Inline Checkout

```typescript
// app/products/[id]/page.tsx
'use client';

import { ZendFiEmbeddedCheckout } from '@zendfi/sdk';
import { useState } from 'react';

export default function ProductPage({ product }) {
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutInstance, setCheckoutInstance] = useState(null);
  
  const handleBuyNow = async () => {
    setShowCheckout(true);
    
    // Create payment link
    const response = await fetch('/api/products/purchase', {
      method: 'POST',
      body: JSON.stringify({ product_id: product.id }),
    });
    
    const { link_code } = await response.json();
    
    // Embed checkout in modal
    const checkout = new ZendFiEmbeddedCheckout({
      linkCode: link_code,
      containerId: 'modal-checkout',
      mode: 'live',
      
      onSuccess: async (payment) => {
        // Grant access to product
        await fetch('/api/grant-access', {
          method: 'POST',
          body: JSON.stringify({
            product_id: product.id,
            payment_id: payment.paymentId,
          }),
        });
        
        // Close modal, show download link
        setShowCheckout(false);
        showDownloadModal(product);
      },
      
      theme: {
        primaryColor: product.brand_color,
        borderRadius: '12px',
      },
    });
    
    await checkout.mount();
    setCheckoutInstance(checkout);
  };
  
  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Product details */}
      <div className="grid grid-cols-2 gap-8">
        <div>
          <img src={product.image_url} alt={product.name} className="w-full rounded-lg" />
        </div>
        
        <div>
          <h1 className="text-4xl font-bold mb-4">{product.name}</h1>
          <p className="text-gray-600 mb-8">{product.description}</p>
          
          <div className="text-5xl font-bold mb-8">${product.price}</div>
          
          <button
            onClick={handleBuyNow}
            className="w-full bg-blue-600 text-white py-4 rounded-lg text-xl font-semibold hover:bg-blue-700"
          >
            Buy Now with Crypto
          </button>
          
          <p className="text-sm text-gray-500 mt-4">
            💳 Instant settlement • 💰 No transaction fees for you
          </p>
        </div>
      </div>
      
      {/* Checkout modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full mx-4 relative">
            <button
              onClick={() => {
                checkoutInstance?.destroy();
                setShowCheckout(false);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
            
            <h2 className="text-2xl font-bold mb-6">Complete Your Purchase</h2>
            
            {/* Embedded checkout */}
            <div id="modal-checkout"></div>
          </div>
        </div>
      )}
    </div>
  );
}
```

**User experience:**
1. Click "Buy Now" → Modal appears (no redirect)
2. Scan QR or connect wallet → Pay
3. Payment confirms → Modal closes, download appears
4. **Total time: ~30 seconds**

No redirects. No confusion. Just works.

---

## Advanced: Custom Theming

Match your brand perfectly:

```typescript
const checkout = new ZendFiEmbeddedCheckout({
  linkCode: linkCode,
  containerId: 'checkout',
  
  theme: {
    // Colors
    primaryColor: '#8b5cf6',      // Violet
    backgroundColor: '#faf5ff',   // Light violet background
    textColor: '#1f2937',         // Dark gray text
    
    // Typography
    fontFamily: '"DM Sans", sans-serif',
    
    // Layout
    borderRadius: '20px',         // Rounded corners
    buttonStyle: 'solid',         // or 'outlined' or 'minimal'
    
    // Spacing (advanced)
    padding: '2rem',
    gap: '1.5rem',
  },
  
  // Show/hide payment methods
  paymentMethods: {
    walletConnect: true,
    qrCode: true,
    solanaWallet: false,  // Hide browser wallet option
  },
});
```

The component respects your design system. No generic checkout vibes.

---

## Performance Benchmarks

We measured end-to-end checkout times:

### Hosted Checkout (Redirect)
1. Click "Pay" → 800ms (redirect + page load)
2. User completes payment → 400ms (transaction)
3. Redirect back → 600ms (page load + state sync)
4. **Total: ~1,800ms + user confusion**

### Embedded Checkout (No Redirect)
1. Click "Pay" → 0ms (modal appears instantly)
2. User completes payment → 400ms (transaction)
3. Success callback → 0ms (instant state update)
4. **Total: ~400ms + zero confusion**

**4.5x faster perceived performance.**

And that's not counting the users who abandon during redirects.

---

## Common Objections (And Why They're Wrong)

### "Won't this increase frontend bundle size?"

The embedded checkout is lazy-loaded. Initial bundle: **0 bytes**.

When you call `mount()`, it dynamically loads:
- QR code library (~8KB)
- Wallet adapters (~15KB)
- UI components (~12KB)

**Total: ~35KB gzipped** (less than most images on your page)

### "What about security? You're exposing checkout logic."

The checkout logic is **read-only**. It can:
- Display payment information
- Poll for status
- Show QR codes

It **cannot**:
- Modify payment amounts
- Create new payments
- Access merchant funds
- Cancel confirmed payments

All mutations require backend authentication.

### "What if the user refreshes during payment?"

Payment link persists. Just remount the checkout:

```typescript
// Retrieve link_code from localStorage or database
const linkCode = localStorage.getItem('pending_payment_link');

if (linkCode) {
  const checkout = new ZendFiEmbeddedCheckout({
    linkCode,
    containerId: 'checkout',
    onSuccess: handleSuccess,
  });
  
  await checkout.mount();
}
```

Status polling continues. No payment lost.

### "Doesn't iframe embedding have the same effect?"

Iframes have problems:
- Cross-origin restrictions (can't communicate easily)
- SEO penalties
- Accessibility issues (screen readers struggle)
- Mobile quirks (zoom, keyboard, etc.)
- Can't match your styling

Embedded checkout renders native DOM. No iframe limitations.

---

## Migration Guide: From Hosted to Embedded

Already using hosted checkout? Migration takes ~30 minutes:

### Before (Hosted):
```typescript
// Backend: Create payment
const payment = await zendfi.createPayment({
  amount: 50,
  description: 'Pro Plan',
});

// Frontend: Redirect
window.location.href = payment.payment_url;
```

### After (Embedded):
```typescript
// Backend: Create payment link (same as before)
const paymentLink = await zendfi.createPaymentLink({
  amount: 50,
  description: 'Pro Plan',
});

// Frontend: Embed (instead of redirect)
const checkout = new ZendFiEmbeddedCheckout({
  linkCode: paymentLink.link_code,
  containerId: 'checkout',
  onSuccess: handleSuccess,
});

await checkout.mount();
```

**Change:** `window.location.href` → `new ZendFiEmbeddedCheckout()`

**Result:** +41% conversion improvement.

---

## Production Checklist

Before deploying embedded checkout:

### Technical Setup
- [ ] Install SDK: `npm install @zendfi/sdk`
- [ ] Create payment link on backend (never expose API keys)
- [ ] Add checkout container element (`<div id="checkout">`)
- [ ] Implement `onSuccess` callback
- [ ] Test with devnet (free test tokens)
- [ ] Switch to mainnet (`mode: 'live'`)

### UX Polish
- [ ] Add loading state while checkout initializes
- [ ] Show success animation after payment
- [ ] Handle error states gracefully
- [ ] Test on mobile (QR codes + wallet apps)
- [ ] Ensure checkout is accessible (keyboard navigation)

### Security
- [ ] Payment creation happens on backend
- [ ] API keys never exposed in frontend
- [ ] Webhook signature verification enabled
- [ ] HTTPS enforced (required for wallet connections)

### Analytics
- [ ] Track checkout impressions
- [ ] Track payment success rate
- [ ] Monitor time-to-complete
- [ ] A/B test hosted vs embedded

---

## Why This Changes Crypto Payments

Traditional web2 payments evolved:
- **2010:** Redirect to PayPal → Complete payment → Redirect back
- **2015:** Stripe Elements → Embed checkout → No redirects
- **2020:** Apple Pay / Google Pay → One-click → Done

Crypto is stuck in 2010. Everyone redirects.

Embedded checkout is crypto's Stripe Elements moment. It's not just "nice to have"—it's the difference between 63% and 89% conversion.

If you're building with crypto payments, embedded checkout isn't optional. It's the baseline.

---

## What's Next?

We're working on:

- **One-click checkout** - Save wallet address for returning customers
- **Multi-step checkout** - Collect shipping info, then payment
- **Subscription management** - Embedded portal for renewals/cancellations
- **Mobile SDK** - Native iOS/Android components
- **React components** - `<ZendFiCheckout />` for React/Next.js

---

## Try It Yourself

Complete examples and starter templates:

**Tutorials:**
- [Embedded Checkout Quick Start](/article/embedded-checkout-quickstart)
- [Advanced Theming Guide](/article/checkout-theming)
- [Mobile Optimization](/article/mobile-checkout)

**Code:**
- [Next.js E-Commerce Template](https://github.com/zendfi/nextjs-ecommerce-template)
- [React Subscription Flow](https://github.com/zendfi/react-subscription-checkout)
- [Vanilla JS Example](https://github.com/zendfi/vanilla-embedded-checkout)
- [Vue.js Integration](https://github.com/zendfi/vue-checkout-example)

**Dashboard:**
- [Get API keys](https://zendfi.tech/dashboard)
- [Test with devnet](https://docs.zendfi.tech/testing)
- [View checkout analytics](https://zendfi.tech/dashboard/checkouts)

---

## Resources

- **SDK Documentation**: [docs.zendfi.tech](https://docs.zendfi.tech)
- **Embedded Checkout API**: [docs.zendfi.tech/embedded-checkout](https://docs.zendfi.tech/embedded-checkout)
- **Component Reference**: [docs.zendfi.tech/components](https://docs.zendfi.tech/components)
- **Theming Guide**: [docs.zendfi.tech/theming](https://docs.zendfi.tech/theming)

Questions? Find us on [Twitter](https://twitter.com/zendfi_) or [Discord](https://discord.gg/3QJnnwuXSs).

---

*Building the payment infrastructure for the internet. Where UX meets crypto rails.*
