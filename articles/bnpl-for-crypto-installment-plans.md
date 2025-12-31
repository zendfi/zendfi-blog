---
title: "Buy Now, Pay Later for Crypto: How to Unlock High-Ticket Sales Without Credit Cards"
author: "Blessed Tosin-Oyinbo"
date: "2025-12-31"
description: "Build installment plans for crypto payments—split $500 purchases into 4 payments, automate reminders, handle late fees, and convert customers who can't afford upfront costs"
tags: ["bnpl", "installments", "payments", "solana", "tutorial"]
category: "Dev Knowledge"
image: ""
---

## The $500 Problem

You're selling a high-ticket item: a GPU ($500), an online course ($300), a productivity tool ($200). Your conversion rate is decent—until customers see the price.

Then you watch them:
1. Add to cart
2. See total: $500
3. Abandon checkout

You know what they're thinking: *"I want this, but I don't have $500 right now."*

In traditional e-commerce, you'd offer Klarna, Affirm, or Afterpay. Customer pays $125/month for 4 months. You get paid upfront (minus ~6% fees). Everyone's happy.

But you're in crypto. And BNPL (Buy Now, Pay Later) for crypto... doesn't exist.

Until now.

---

## Why BNPL Doesn't Exist in Crypto

Traditional BNPL works because:
1. They pull money from credit cards automatically
2. Credit bureaus provide risk scores
3. Debt collection agencies exist

Crypto has none of this:
- ❌ No automatic payments (wallets need to sign each transaction)
- ❌ No credit scores (wallets are pseudonymous)
- ❌ No debt collection (transactions are final)

So everyone assumed BNPL in crypto was impossible.

**But what if we rethink the model?**

---

## The Crypto BNPL Model

Instead of trying to recreate credit card BNPL, we build something that actually works with crypto's properties:

### Traditional BNPL (Affirm/Klarna):
1. Customer gets product immediately
2. BNPL company pays merchant upfront
3. BNPL company collects from customer monthly (with credit card)
4. BNPL company takes the risk

**Problem:** Requires credit infrastructure crypto doesn't have.

### Crypto Installment Plans:
1. Customer pays first installment
2. Customer gets product after first payment
3. Customer pays remaining installments manually (with reminders)
4. Late fees for missed payments
5. Grace periods for forgiveness

**Key insight:** Treat it like recurring billing, not debt collection. Trust + incentives instead of credit checks + collection agencies.

---

## Who This Works For

BNPL makes sense when:

✅ **High-ticket items** ($200+)  
✅ **Digital products** (courses, tools, subscriptions)  
✅ **Physical goods** (hardware, equipment)  
✅ **Predictable customers** (existing users, verified accounts)  
✅ **Products with value AFTER first payment** (courses you can access immediately)

❌ **Low-ticket items** (<$50) - not worth the complexity  
❌ **Anonymous buyers** - too much risk  
❌ **One-time impulse purchases** - standard checkout is fine

---

## Building It: Step-by-Step

Let's build an installment plan system for a $500 GPU purchase.

### Step 1: Install the SDK

```bash
npm install @zendfi/sdk
```

### Step 2: Create an Installment Plan

```typescript
import { zendfi } from '@zendfi/sdk';

// Customer wants to buy a $500 GPU in 4 installments
const plan = await zendfi.createInstallmentPlan({
  customer_wallet: 'CUSTOMER_SOLANA_WALLET',
  customer_email: 'customer@example.com',
  total_amount: 500,
  installment_count: 4,
  first_payment_date: new Date().toISOString(), // Pay first installment now
  payment_frequency_days: 30, // Monthly payments
  description: 'NVIDIA RTX 4090 GPU',
  late_fee_amount: 10, // $10 late fee if payment is late
  grace_period_days: 3, // 3-day grace period before late fee
  metadata: {
    product_id: 'gpu-rtx-4090',
    sku: 'GPU-4090-001',
  },
});

console.log(`Plan created: ${plan.plan_id}`);
console.log(`First payment: $${500 / 4} due now`);
console.log(`Remaining: 3 payments of $${500 / 4} every 30 days`);
```

**What just happened:**

- Customer pays $125 today (first installment)
- Gets access to product immediately
- Owes 3 more payments of $125 each (day 30, 60, 90)
- If payment is >3 days late, $10 late fee applies

### Step 3: Check Payment Schedule

```typescript
// Get the plan details
const planDetails = await zendfi.getInstallmentPlan(plan.plan_id);

console.log(`Payment schedule:`);
planDetails.payment_schedule?.forEach((installment) => {
  console.log(`
    Installment ${installment.installment_number}:
    Amount: $${installment.amount}
    Due: ${installment.due_date}
    Status: ${installment.status}
    ${installment.paid_at ? `Paid: ${installment.paid_at}` : ''}
  `);
});

// Output:
// Installment 1: $125 - Due: 2025-12-31 - Status: paid - Paid: 2025-12-31
// Installment 2: $125 - Due: 2026-01-30 - Status: pending
// Installment 3: $125 - Due: 2026-03-01 - Status: pending
// Installment 4: $125 - Due: 2026-03-31 - Status: pending
```

### Step 4: Handle Webhook Notifications

Set up webhooks to track when payments are due, paid, or late:

```typescript
// app/api/webhooks/zendfi/route.ts
import { verifyNextWebhook } from '@zendfi/sdk/webhooks';

export async function POST(request: Request) {
  const webhook = await verifyNextWebhook(request);
  
  if (!webhook) {
    return new Response('Invalid signature', { status: 401 });
  }
  
  switch (webhook.event) {
    case 'installment.due':
      // Payment is due in 3 days - send reminder
      const dueInstallment = webhook.data;
      await sendPaymentReminder({
        email: dueInstallment.customer_email,
        amount: dueInstallment.amount,
        due_date: dueInstallment.due_date,
        plan_id: dueInstallment.plan_id,
      });
      break;
      
    case 'installment.paid':
      // Payment received - thank customer
      const paidInstallment = webhook.data;
      await sendThankYouEmail({
        email: paidInstallment.customer_email,
        installment_number: paidInstallment.installment_number,
        remaining_payments: paidInstallment.remaining_count,
      });
      
      // Check if plan is complete
      if (paidInstallment.remaining_count === 0) {
        await markOrderAsFullyPaid(paidInstallment.plan_id);
      }
      break;
      
    case 'installment.late':
      // Payment is late - apply late fee and send warning
      const lateInstallment = webhook.data;
      await sendLatePaymentWarning({
        email: lateInstallment.customer_email,
        amount: lateInstallment.amount,
        late_fee: lateInstallment.late_fee,
        grace_period_end: lateInstallment.grace_period_end,
      });
      break;
  }
  
  return new Response('OK');
}
```

**Webhook events:**
- `installment.due` - Payment due in 3 days (reminder)
- `installment.paid` - Payment received successfully
- `installment.late` - Payment is past due date + grace period

### Step 5: Customer Payment Flow

On the customer dashboard, show remaining payments:

```typescript
// app/dashboard/installments/page.tsx
'use client';

import { useEffect, useState } from 'react';

export default function InstallmentsPage() {
  const [plans, setPlans] = useState([]);
  
  useEffect(() => {
    // Fetch customer's installment plans
    fetch('/api/customer/installments')
      .then(r => r.json())
      .then(data => setPlans(data));
  }, []);
  
  const payInstallment = async (planId, installmentNumber) => {
    // Create payment for this specific installment
    const response = await fetch('/api/installments/pay', {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId, installment_number: installmentNumber }),
    });
    
    const { payment_url } = await response.json();
    
    // Redirect to payment
    window.location.href = payment_url;
  };
  
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Your Installment Plans</h1>
      
      {plans.map(plan => (
        <div key={plan.plan_id} className="border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold">{plan.description}</h2>
          <p className="text-gray-600">Total: ${plan.total_amount}</p>
          <p className="text-gray-600">Paid: {plan.paid_count}/{plan.installment_count} installments</p>
          
          <div className="mt-4 space-y-2">
            {plan.payment_schedule.map(installment => (
              <div key={installment.installment_number} className="flex items-center justify-between border-b pb-2">
                <div>
                  <p className="font-medium">Installment {installment.installment_number}</p>
                  <p className="text-sm text-gray-600">Due: {new Date(installment.due_date).toLocaleDateString()}</p>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className="font-bold">${installment.amount}</span>
                  
                  {installment.status === 'paid' ? (
                    <span className="text-green-600">✓ Paid</span>
                  ) : installment.status === 'pending' ? (
                    <button
                      onClick={() => payInstallment(plan.plan_id, installment.installment_number)}
                      className="bg-blue-600 text-white px-4 py-2 rounded"
                    >
                      Pay Now
                    </button>
                  ) : (
                    <span className="text-red-600">⚠ Late</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {plan.status === 'active' && (
            <p className="mt-4 text-sm text-gray-600">
              Next payment due: {new Date(plan.payment_schedule.find(i => i.status === 'pending')?.due_date).toLocaleDateString()}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## Real-World Example: Online Course Purchase

Let's walk through a complete flow for a $300 online course:

### Backend: Create Installment Plan

```typescript
// app/api/courses/[id]/installment/route.ts
import { zendfi } from '@zendfi/sdk';

export async function POST(request: Request) {
  const { courseId, installmentCount } = await request.json();
  const user = await getAuthenticatedUser(request);
  
  // Get course details
  const course = await db.courses.findOne({ id: courseId });
  
  // Create installment plan
  const plan = await zendfi.createInstallmentPlan({
    customer_wallet: user.wallet_address,
    customer_email: user.email,
    total_amount: course.price, // $300
    installment_count: installmentCount, // 3 installments
    first_payment_date: new Date().toISOString(),
    payment_frequency_days: 30,
    description: `${course.title} - Installment Plan`,
    late_fee_amount: 15, // $15 late fee
    grace_period_days: 5, // 5-day grace period
    metadata: {
      course_id: courseId,
      user_id: user.id,
    },
  });
  
  // Grant immediate access (after first payment)
  await db.enrollments.create({
    user_id: user.id,
    course_id: courseId,
    plan_id: plan.plan_id,
    status: 'active',
  });
  
  // Send confirmation email
  await sendEmail({
    to: user.email,
    subject: `Enrolled in ${course.title}!`,
    body: `
      You're enrolled! Here's your payment plan:
      - First payment: $${course.price / installmentCount} (paid today)
      - Remaining: ${installmentCount - 1} payments of $${course.price / installmentCount}
      - Schedule: Every 30 days
      
      Access your course: https://example.com/courses/${courseId}
    `,
  });
  
  return Response.json({
    plan_id: plan.plan_id,
    access_granted: true,
    next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
}
```

### Email Reminders (Automated)

```typescript
// Cron job (runs daily)
import { zendfi } from '@zendfi/sdk';

async function sendPaymentReminders() {
  // Get all active installment plans
  const plans = await zendfi.listInstallmentPlans({ status: 'active' });
  
  for (const plan of plans) {
    const nextInstallment = plan.payment_schedule?.find(i => i.status === 'pending');
    
    if (!nextInstallment) continue;
    
    const daysUntilDue = Math.floor(
      (new Date(nextInstallment.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    
    // Send reminder 3 days before due
    if (daysUntilDue === 3) {
      await sendEmail({
        to: plan.customer_email,
        subject: 'Payment reminder: Due in 3 days',
        body: `
          Hi! Your next installment payment is due in 3 days.
          
          Amount: $${nextInstallment.amount}
          Due date: ${new Date(nextInstallment.due_date).toLocaleDateString()}
          
          Pay now: https://example.com/installments/${plan.plan_id}/pay
        `,
      });
    }
    
    // Send urgent reminder on due date
    if (daysUntilDue === 0) {
      await sendEmail({
        to: plan.customer_email,
        subject: '⚠️ Payment due today',
        body: `
          Your installment payment of $${nextInstallment.amount} is due today.
          
          Pay now to avoid late fees: https://example.com/installments/${plan.plan_id}/pay
          
          (Grace period: ${plan.grace_period_days} days)
        `,
      });
    }
  }
}

// Run daily at 9am
setInterval(sendPaymentReminders, 24 * 60 * 60 * 1000);
```

---

## The Economics: Does This Actually Work?

Let's compare standard checkout vs installment plans:

### Scenario: $300 Online Course

**Standard Checkout:**
- Conversion rate: 5%
- 1,000 visitors → 50 sales
- Revenue: 50 × $300 = **$15,000**

**Installment Plans (3 payments):**
- Conversion rate: 12% (higher, lower barrier)
- 1,000 visitors → 120 sales
- Revenue: 120 × $300 = **$36,000**
- Late fees collected: ~5% miss payments = 6 customers × $15 = **$90**
- Defaults: ~2% never complete = 2 × $300 = **-$600** (lost revenue)

**Net installment revenue: $35,490**

**Increase: +$20,490 (+136%)**

The math works because:
1. More people can afford $100/month than $300 upfront
2. Late fees cover admin overhead
3. Default rate is low (2-5%) when you grant access immediately

---

## Handling Defaults

What if someone stops paying after installment 2 of 4?

### Option 1: Revoke Access (Harsh)

```typescript
case 'installment.late':
  const lateInstallment = webhook.data;
  
  // If more than 10 days late, revoke access
  if (lateInstallment.days_late > 10) {
    await db.enrollments.update({
      where: { plan_id: lateInstallment.plan_id },
      data: { status: 'suspended' },
    });
    
    await sendEmail({
      to: lateInstallment.customer_email,
      subject: 'Access suspended',
      body: 'Your access has been suspended due to late payment. Pay now to restore access.',
    });
  }
  break;
```

### Option 2: Reduce Access (Lenient)

```typescript
case 'installment.late':
  // Instead of full suspension, limit features
  await db.enrollments.update({
    where: { plan_id: webhook.data.plan_id },
    data: { access_level: 'limited' }, // Can view already-started modules, but not new ones
  });
  
  await sendEmail({
    to: webhook.data.customer_email,
    subject: 'Payment overdue - limited access',
    body: 'Your access is now limited. Pay to restore full access.',
  });
  break;
```

### Option 3: Write It Off (Generous)

```typescript
// If customer paid ≥50% of total, forgive remaining
if (plan.paid_count >= plan.installment_count / 2) {
  await zendfi.cancelInstallmentPlan(plan.plan_id, {
    reason: 'forgiven',
  });
  
  await sendEmail({
    to: plan.customer_email,
    subject: 'Your remaining balance has been forgiven',
    body: 'Thank you for being a customer. Your remaining payments have been waived.',
  });
}
```

Most successful implementations use **Option 2** (reduce access) because:
- Customer has already received value (harder to justify full revoke)
- Lenient policy = better reputation
- Defaulters might return and pay later

---

## Advanced: Variable Installments

Not all installments need to be equal:

```typescript
// Larger first payment, smaller later ones
const plan = await zendfi.createInstallmentPlan({
  customer_wallet: customerWallet,
  customer_email: 'customer@example.com',
  total_amount: 500,
  installment_count: 4,
  payment_frequency_days: 30,
  description: 'GPU Purchase',
  custom_schedule: [
    { installment_number: 1, amount: 200 }, // $200 upfront
    { installment_number: 2, amount: 100 }, // $100 month 1
    { installment_number: 3, amount: 100 }, // $100 month 2
    { installment_number: 4, amount: 100 }, // $100 month 3
  ],
});

// Customer pays $200 now, gets product
// Lower monthly payments increase likelihood of completion
```

Or **graduated payments** (smaller first, larger later):

```typescript
custom_schedule: [
  { installment_number: 1, amount: 50 },   // Easier to start
  { installment_number: 2, amount: 100 },  // Ramp up
  { installment_number: 3, amount: 150 },  // Ramp up
  { installment_number: 4, amount: 200 },  // Final large payment
]
```

---

## Common Objections

### "Why would anyone use this over a credit card?"

1. **No credit card** - Many crypto users don't have/want credit cards
2. **No credit check** - Instantly approved, no FICO score needed
3. **No interest** - Unlike credit cards (20%+ APR), installment plans are 0% interest
4. **Crypto-native** - Some users prefer to pay in USDC

### "What's your default rate?"

Industry averages for BNPL:
- Traditional (Affirm): 2-5% default rate
- Crypto installments: **5-10%** (higher because no credit checks)

But you're not Affirm. You're not taking the full risk. Customer pays first installment upfront, so you're only exposed to remaining 75%.

### "How do you prevent fraud?"

1. **Require account history** - Only offer installments to users with ≥30 days account age
2. **Limit plan values** - Cap at $500 per customer until they prove trustworthy
3. **First payment upfront** - Customer pays 25-50% before access
4. **Progressive trust** - Complete 1 plan successfully → eligible for larger plans

### "What about chargebacks?"

Crypto transactions are final. No chargebacks. But you can:
1. Offer refunds voluntarily (good customer service)
2. Use dispute resolution systems
3. Build reputation systems (good buyers get better terms)

---

## Production Checklist

Before launching installment plans:

### ✅ Financial Planning
- [ ] Define default tolerance (how many defaults can you absorb?)
- [ ] Set installment limits per customer ($500? $1,000?)
- [ ] Decide: equal installments or variable?
- [ ] Calculate late fees (should cover admin costs)
- [ ] Determine grace periods (3-7 days typical)

### ✅ Technical Setup
- [ ] Implement installment plan creation
- [ ] Set up webhook handlers (due, paid, late)
- [ ] Build customer dashboard (show remaining payments)
- [ ] Create email reminder system (automated)
- [ ] Test full flow with devnet USDC

### ✅ Risk Management
- [ ] Require account verification for large plans
- [ ] Implement progressive trust system
- [ ] Set up fraud detection (suspicious patterns)
- [ ] Define revocation policy (when to suspend access)
- [ ] Create dispute resolution process

### ✅ Customer Experience
- [ ] Clear payment schedule on checkout
- [ ] Email reminders (3 days before, day of, day after)
- [ ] Easy one-click payment from reminders
- [ ] Transparent about late fees and grace periods
- [ ] Provide support for payment issues

---

## Why This Changes High-Ticket Sales

Traditional crypto has one payment mode: pay full price upfront or don't buy.

This leaves huge money on the table:
- $500 course? Most can't afford it upfront
- $1,000 hardware? Too risky for one payment
- $200/year subscription? Annual prepay is a barrier

Installment plans unlock these sales while maintaining instant settlement benefits of crypto.

You're not competing with Klarna. You're offering something better: **0% interest, crypto-native payment plans with instant access**.

---

## What's Next?

We're working on:

- **Auto-debit with session keys** - Optional auto-pay for trusted customers
- **Dynamic payment dates** - Align with customer's pay schedule
- **Split installments** - Multiple recipients per installment
- **Subscription installments** - Recurring payments with installment options
- **Risk scoring** - AI-powered default prediction

---

## Try It Yourself

Complete examples and starter templates:

**Tutorials:**
- [Installment Plans Deep Dive](/article/installment-plans-deep-dive)
- [Risk Management Guide](/article/installment-risk-management)
- [Email Automation Setup](/article/installment-email-automation)

**Code:**
- [Course Platform Template](https://github.com/zendfi/course-platform-installments)
- [E-commerce with BNPL](https://github.com/zendfi/ecommerce-bnpl)
- [SaaS Annual Plans](https://github.com/zendfi/saas-installment-plans)

**Dashboard:**
- [Get API keys](https://zendfi.tech/dashboard)
- [Test with devnet](https://docs.zendfi.tech/testing)
- [View installment analytics](https://zendfi.tech/dashboard/installments)

---

## Resources

- **SDK Documentation**: [docs.zendfi.tech](https://docs.zendfi.tech)
- **Installment Plans API**: [docs.zendfi.tech/installments](https://docs.zendfi.tech/installments)
- **Webhook Reference**: [docs.zendfi.tech/webhooks](https://docs.zendfi.tech/webhooks)
- **Risk Management**: [docs.zendfi.tech/risk](https://docs.zendfi.tech/risk)

Questions? Find us on [Twitter](https://twitter.com/zendfi_) or [Discord](https://discord.gg/3QJnnwuXSs).

---

*Building payment infrastructure for the future. Where crypto meets consumer financing.*
