---
title: "Building a Global SaaS Without Leaving Money on the Table"
author: "Blessed Tosin-Oyinbo"
date: "2025-12-31"
description: "How geo-aware pricing and embedded checkout helped us 3x conversion in emerging markets while cutting payment fees by 81%"
tags: ["saas", "payments", "ppp-pricing", "embedded-checkout", "global"]
category: "Dev Knowledge"
image: ""
---

## The Problem Every SaaS Founder Faces

You built a great product. You priced it at $50/month. Your US customers convert at 8%. You're growing.

Then you look at your analytics. Traffic from India, Nigeria, Brazil—huge numbers. But conversions? **0.3%.**

You post in founder communities: *"How do I get international customers to convert?"*

The responses are predictable:
- *"Just lower your prices globally"* (RIP margins)
- *"Build regional pricing tiers"* (complex to maintain)
- *"They're not your target market"* (leave billions on the table)

Meanwhile, Stripe is quietly taking 2.9% + $0.30 of every transaction. On a $50 subscription, that's **$1.75 per month per customer**. Multiply by 1,000 customers and you're paying $21,000/year to Stripe just to process payments.

There has to be a better way.

---

## The Math That Made Us Rethink Everything

Let's run the numbers on a real SaaS with 1,000 subscribers at $50/month:

### Current State (Stripe, Fixed Pricing)

**Revenue:**
- 1,000 US customers × $50 = $50,000/month
- 0 international customers (priced out)

**Costs:**
- Stripe fees: 2.9% + $0.30 = $1.75/customer
- Monthly Stripe cost: **$1,750**
- Annual Stripe cost: **$21,000**

**Net:** $48,250/month

### With ZendFi + PPP Pricing

**Revenue:**
- 1,000 US customers × $50 = $50,000
- 500 India customers × $17 (PPP adjusted) = $8,500
- 300 Nigeria customers × $12 = $3,600
- 200 Brazil customers × $18 = $3,600

**Total revenue:** $65,700/month (+31%)

**Costs:**
- ZendFi fees: 0.6% flat
- Monthly cost: $394
- Annual cost: **$4,728**

**Net:** $65,306/month

**You just:**
- Increased revenue by $17,056/month
- Reduced payment fees by $16,272/year
- Unlocked 1,000 new customers in emerging markets

That's the power of geo-aware pricing + crypto-native payments.

---

## What is PPP Pricing?

PPP (Purchasing Power Parity) pricing adjusts your product's cost based on what a customer *can actually afford* in their country.

Think about it: $50/month is:
- **0.6%** of average monthly income in the US (~$8,000)
- **4.2%** of average monthly income in India (~$1,200)

Same absolute price. Wildly different relative cost.

PPP pricing fixes this by adjusting based on local purchasing power:

| Country | Base Price | PPP Factor | Local Price | % of Income |
|---------|-----------|------------|-------------|-------------|
| United States | $50 | 1.0 | $50 | 0.6% |
| Brazil | $50 | 0.35 | $17.50 | 0.6% |
| India | $50 | 0.28 | $14 | 0.6% |
| Nigeria | $50 | 0.24 | $12 | 0.6% |

Now the *relative cost* is the same everywhere. That's fair pricing.

---

## Building It: Step-by-Step

Let's build a SaaS subscription flow with geo-aware pricing and embedded checkout.

### Step 1: Install the SDK

```bash
npm install @zendfi/sdk
```

### Step 2: Server-Side Pricing Logic

```typescript
import { zendfi } from '@zendfi/sdk';

// Detect user's country (from IP, profile, or let them choose)
const userCountry = await detectUserCountry(request);

// Get PPP factor
const factor = await zendfi.pricing.getPPPFactor(userCountry);

// Calculate localized price
const basePrice = 50; // Your US price
const localPrice = basePrice * factor.ppp_factor;

console.log(`${factor.country_name}: $${localPrice.toFixed(2)}/month`);
// India: $14.00/month
// Brazil: $17.50/month
// Nigeria: $12.00/month
```

That's it. Three lines to support 180+ countries.

### Step 3: Create Subscription Plan

```typescript
// Create your subscription plan (do this once)
const plan = await zendfi.createSubscriptionPlan({
  name: 'Pro Plan',
  description: 'Full access to all features',
  amount: localPrice, // PPP-adjusted price
  interval: 'monthly',
  trial_days: 14, // Free trial
});

console.log(`Plan created: ${plan.id}`);
```

### Step 4: Create Payment Link

```typescript
// Create payment link for this customer
const paymentLink = await zendfi.createPaymentLink({
  amount: localPrice,
  description: `${plan.name} - ${factor.country_name}`,
  currency: 'USD',
  metadata: {
    plan_id: plan.id,
    country: userCountry,
    ppp_factor: factor.ppp_factor,
    customer_email: user.email,
  },
});

console.log(`Payment link: ${paymentLink.link_code}`);
```

### Step 5: Embed Checkout (Zero Backend Changes)

Now for the magic: embed the checkout directly in your app. No redirects. No new backend routes. Just drop it in.

```typescript
// app/subscribe/page.tsx
'use client';

import { ZendFiEmbeddedCheckout } from '@zendfi/sdk';
import { useEffect, useState } from 'react';

export default function SubscribePage() {
  const [checkout, setCheckout] = useState(null);

  useEffect(() => {
    const initCheckout = async () => {
      // linkCode comes from your backend (Step 4)
      const linkCode = await fetch('/api/get-payment-link').then(r => r.json());

      const checkoutInstance = new ZendFiEmbeddedCheckout({
        linkCode: linkCode,
        containerId: 'checkout-container',
        mode: 'live', // or 'test' for devnet
        
        onSuccess: async (payment) => {
          console.log('Payment successful!', payment);
          
          // Activate subscription immediately
          await fetch('/api/activate-subscription', {
            method: 'POST',
            body: JSON.stringify({
              paymentId: payment.paymentId,
              email: user.email,
            }),
          });
          
          // Redirect to dashboard
          window.location.href = '/dashboard';
        },
        
        onError: (error) => {
          console.error('Payment failed:', error);
          alert('Payment failed. Please try again.');
        },
        
        theme: {
          primaryColor: '#6366f1',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
        },
      });

      await checkoutInstance.mount();
      setCheckout(checkoutInstance);
    };

    initCheckout();

    return () => {
      if (checkout) {
        checkout.destroy();
      }
    };
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Subscribe to Pro Plan</h1>
      
      {/* Checkout embeds here */}
      <div id="checkout-container"></div>
    </div>
  );
}
```

**What just happened?**

Your checkout is now embedded. Users pay without leaving your app. No redirect whiplash. No broken back buttons. Pure SaaS UX.

### Step 6: Webhook for Instant Activation

When payment confirms, ZendFi sends a webhook. Handle it to activate the subscription:

```typescript
// app/api/webhooks/zendfi/route.ts
import { verifyNextWebhook } from '@zendfi/sdk/webhooks';

export async function POST(request: Request) {
  // Verify webhook signature (prevents spoofing)
  const webhook = await verifyNextWebhook(request);
  
  if (!webhook) {
    return new Response('Invalid signature', { status: 401 });
  }
  
  // Handle events
  switch (webhook.event) {
    case 'payment.confirmed':
      const payment = webhook.data;
      
      // Activate user's subscription
      await activateSubscription({
        email: payment.customer_email,
        planId: payment.metadata.plan_id,
        transactionId: payment.transaction_signature,
      });
      
      // Send welcome email
      await sendWelcomeEmail(payment.customer_email);
      
      console.log(`✅ Subscription activated for ${payment.customer_email}`);
      break;
      
    case 'subscription.payment_failed':
      // Handle failed renewal
      await notifyPaymentFailed(webhook.data.customer_email);
      break;
  }
  
  return new Response('OK');
}
```

**Webhook events you get:**
- `payment.confirmed` - Subscription payment succeeded
- `payment.failed` - Payment failed
- `subscription.activated` - Trial ended, first charge succeeded
- `subscription.payment_failed` - Renewal failed
- `subscription.canceled` - User canceled

You're notified in real-time. No polling. No delays.

---

## The Embedded Checkout Difference

Let's compare the user experience:

### Traditional Hosted Checkout
1. User clicks "Subscribe"
2. **Redirect** to `checkout.provider.com`
3. User completes payment
4. **Redirect** back to your app
5. Hope webhook arrives before they see success page
6. User clicks back button → confused

### ZendFi Embedded Checkout
1. User clicks "Subscribe"
2. Checkout appears **in your app**
3. User completes payment
4. Success state updates **immediately**
5. No redirects. No confusion. Just works.

**Features you get:**
- QR codes for mobile wallets (Phantom, Solflare)
- Direct wallet connections (no mobile needed)
- Gasless transactions (we cover all fees)
- Custom branding/theming
- Real-time status updates
- Multiple tokens (USDC, SOL, USDT)

All in a drop-in component. No backend changes required.

---

## Real-World Example: Converting Indian Developers

Let's say you're selling a developer tool at $50/month. You get traffic from India but no conversions.

### Before: Fixed Pricing

```typescript
// Everyone pays $50
const checkout = await zendfi.createPayment({
  amount: 50,
  description: 'Developer Pro Plan',
});
```

**Result:** 0.3% conversion from India (they're priced out)

### After: PPP Pricing

```typescript
// Server-side: Detect country and adjust price
const userCountry = 'IN'; // India
const factor = await zendfi.pricing.getPPPFactor(userCountry);
const localPrice = 50 * factor.ppp_factor; // $14

const checkout = await zendfi.createPaymentLink({
  amount: localPrice,
  description: `Developer Pro - India`,
  metadata: { original_price: 50, country: 'IN' },
});
```

**Result:** 
- Indian developers now pay $14/month (affordable!)
- Conversion jumps from 0.3% to 4.2%
- You gain 140 new customers from India alone
- Monthly revenue increase: $1,960

And you didn't lose a single US customer (they still pay $50).

---

## Handling Edge Cases

### What if users VPN to get cheaper pricing?

Add country verification:

```typescript
const ipCountry = await detectCountryFromIP(request);
const accountCountry = user.profile.country;

if (ipCountry !== accountCountry) {
  // Ask user to verify their location
  await promptLocationVerification();
}
```

Most users won't VPN for a few dollars. And if they do? They're paying *something* instead of nothing. Still a win.

### What about existing customers?

Grandfather them in:

```typescript
const customer = await getCustomer(email);

if (customer.created_at < new Date('2025-01-01')) {
  // Existing customer: keep their original price
  price = customer.original_price;
} else {
  // New customer: apply PPP
  price = await calculatePPPPrice(customer.country);
}
```

### Should I show prices in local currency?

Yes, but charge in USD:

```typescript
const factor = await zendfi.pricing.getPPPFactor('IN');
const usdPrice = 50 * factor.ppp_factor; // $14
const inrPrice = usdPrice * 83; // ₹1,162 (current exchange rate)

// Display: "₹1,162/month (~$14 USD)"
// Charge: $14 USDC (stable, no forex fees)
```

Crypto lets you display in local currency but settle in stablecoins. No currency conversion fees. No exchange rate risk.

---

## The Fee Comparison That Changes Everything

Let's break down the real cost of payment processing:

### Stripe (Traditional Rails)

**Per-transaction costs:**
- Base fee: 2.9%
- Fixed fee: $0.30
- Currency conversion (if needed): +1.5%
- International cards: +1.0%

**On a $50 subscription:**
- Fees: 2.9% + $0.30 = **$1.75**
- You keep: $48.25
- Annual cost (per customer): **$21.00**

### ZendFi (Crypto Rails)

**Per-transaction costs:**
- Base fee: 0.6% flat
- Fixed fee: $0
- Currency conversion: N/A (USDC is global)
- International: Same rate

**On a $50 subscription:**
- Fees: 0.6% = **$0.30**
- You keep: $49.70
- Annual cost (per customer): **$3.60**

**You save $17.40 per customer per year.**

At 1,000 customers, that's **$17,400/year** back in your pocket. At 10,000? **$174,000/year**.

---

## Production Checklist

Before going live with PPP pricing:

### Pricing Strategy
- [ ] Define your base market (usually US)
- [ ] Set your base price ($50, $99, etc.)
- [ ] Decide which countries get PPP (or apply globally)
- [ ] Create price transparency page showing all regions
- [ ] Set minimum price floor (e.g., never go below $5)

### Technical Setup
- [ ] Implement country detection (IP + account settings)
- [ ] Store user's country in profile
- [ ] Cache PPP factors (they don't change often)
- [ ] Handle webhook signature verification
- [ ] Test with devnet USDC (free testing)

### Legal/Compliance
- [ ] Update terms of service (mention regional pricing)
- [ ] Add country selector to signup flow
- [ ] Implement VPN detection (optional)
- [ ] Comply with local tax regulations
- [ ] Consider GDPR/privacy for location data

### UX Polish
- [ ] Show local currency conversion
- [ ] Display "Original price: $50" for transparency
- [ ] Add country flag icons
- [ ] Implement price comparison tooltips
- [ ] A/B test messaging ("Fair pricing" vs "Local pricing")

---

## Common Objections (And Why They're Wrong)

### "Won't US customers feel ripped off?"

No. They understand purchasing power. Netflix, Spotify, Adobe—all do regional pricing. Customers accept it.

Add transparency: *"We use fair pricing based on local purchasing power. Everyone pays the same relative cost."*

### "This sounds like discrimination"

It's the opposite. **Fixed pricing is discrimination.** You're excluding people who can't afford US prices.

PPP pricing makes your product accessible globally while keeping it sustainable.

### "Managing different prices is complex"

With ZendFi's API, it's three lines:

```typescript
const factor = await zendfi.pricing.getPPPFactor(country);
const localPrice = basePrice * factor.ppp_factor;
```

We handle the complexity. You just multiply.

### "Crypto is too hard for customers"

They don't need to know it's crypto. Embedded checkout accepts:
- Wallet connections (Phantom, Solflare, Backpack)
- QR codes (scan with mobile wallet)
- Stablecoins (USDC = $1, no volatility)

Users see: *"Pay with digital dollars."* That's it.

---

## Why This Matters Now

We're watching a shift in SaaS:

**Old model:**
- Build for US/EU
- Price in dollars
- Accept credit cards
- Hope for 5-8% conversion

**New model:**
- Build global-first
- Price by purchasing power
- Accept stablecoins
- Get 8-12% conversion globally

The companies that adapt first will win the next billion customers.

---

## What's Next?

This is just scratching the surface. Here's what we're working on:

- **Dynamic pricing tiers**: Automatically adjust based on demand
- **Team/enterprise pricing**: Volume discounts with PPP
- **Usage-based billing**: Pay per API call, with PPP multipliers
- **Gift subscriptions**: Buy for friends in other countries (auto-adjust price)
- **Crypto payroll**: Pay remote contractors in their local PPP rate

The future of SaaS is global, fair, and built on crypto rails.

---

## Try It Yourself

Full code examples and starter templates:

**Tutorials:**
- [Embedded Checkout Guide](/article/embedded-checkout-deep-dive)
- [Webhook Integration](/article/webhooks-guide)
- [PPP Pricing Strategy](/article/ppp-pricing-strategy)

**Code:**
- [Next.js SaaS Starter](https://github.com/zendfi/nextjs-saas-starter) (includes PPP + checkout)
- [React Subscription Flow](https://github.com/zendfi/react-subscription-example)
- [Express.js Backend](https://github.com/zendfi/express-subscription-api)

**Dashboard:**
- [Get API keys](https://zendfi.tech/dashboard)
- [Test on devnet](https://docs.zendfi.tech/testing) (free USDC)
- [Join waitlist](https://zendfi.tech)

---

## Resources

- **SDK Documentation**: [docs.zendfi.tech](https://docs.zendfi.tech)
- **PPP Pricing API**: [docs.zendfi.tech/pricing](https://docs.zendfi.tech/pricing)
- **Embedded Checkout**: [docs.zendfi.tech/embedded-checkout](https://docs.zendfi.tech/embedded-checkout)
- **Webhook Reference**: [docs.zendfi.tech/webhooks](https://docs.zendfi.tech/webhooks)

Questions? Ping us on [Twitter](https://twitter.com/zendfi_) or [Discord](https://discord.gg/3QJnnwuXSs).

---

*Building the financial infrastructure for global SaaS. One fair price at a time.*
