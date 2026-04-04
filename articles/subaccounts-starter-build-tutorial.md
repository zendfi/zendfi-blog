---
title: "Build a Sub-Accounts App Starter (Copy-Paste API, SDK, and CLI)"
author: "Blessed Tosin-Oyinbo"
date: "2026-03-31"
description: "A practical starter implementation you can paste into a Node backend to ship virtual accounts, savings, and agentic payment controls"
tags: ["subaccounts", "tutorial", "api", "sdk", "cli", "agentic-payments"]
category: "Dev Knowledge"
image: ""
---

## If You Want to Ship Fast, Start Here

This is the implementation-first companion to our sub-accounts deep dive.

No theory dump. No architecture astronautics.

Just:

- a minimal backend shape
- copy-paste flows
- API, SDK, and CLI equivalents
- three use cases: virtual accounts, savings, and agentic controls

By the end, you will have a production-ready skeleton you can adapt to your app.

---

## What You Are Building

A backend service that manages one sub-account per user and supports:

1. user vault deposits + withdrawals
2. savings mode with Kamino-powered yield operations
3. agent-safe automations with strict bounds

---

## Folder Structure (Starter)

```txt
src/
  env.ts
  zendfi.ts
  subaccounts/
    createUserVault.ts
    getUserVaultBalance.ts
    fundUserVaultViaSplit.ts
    withdrawToWallet.ts
    withdrawToBank.ts
  savings/
    enableSavingsMode.ts
    runSavingsSweepJob.ts
  agentic/
    mintBoundedCredentials.ts
    createExecutionGate.ts
    releaseExecutionGate.ts
```

Use any web framework you like (Express, Fastify, Nest, Hono). The snippets below are framework-agnostic service functions.

---

## Step 1: Client Setup

```ts
// src/env.ts
export const ENV = {
  zendfiApiKey: process.env.ZENDFI_API_KEY || '',
  zendfiApiBase: process.env.ZENDFI_API_BASE || 'https://api.zendfi.tech',
};

if (!ENV.zendfiApiKey) {
  throw new Error('Missing ZENDFI_API_KEY');
}
```

```ts
// src/zendfi.ts
import { ZendFiClient } from '@zendfi/sdk';
import { ENV } from './env';

export const zendfi = new ZendFiClient({
  apiKey: ENV.zendfiApiKey,
  baseURL: ENV.zendfiApiBase,
});
```

### Configure Merchant TTL Policy (Recommended Early Step)

Before minting signing grants, automation tokens, or child delegation tokens, set merchant TTL ceilings explicitly.

```ts
await zendfi.updateSubAccountTtlPolicy({
  signing_grant_max_ttl_seconds: 60 * 60 * 24 * 14,
  automation_token_max_ttl_seconds: 60 * 60 * 24 * 14,
  child_delegation_max_ttl_seconds: 60 * 60 * 24 * 3,
});
```

CLI equivalent:

```bash
zendfi subaccounts ttl-policy-set \
  --signing-grant-max-ttl 1209600 \
  --automation-token-max-ttl 1209600 \
  --child-delegation-max-ttl 259200
```

---

## Use Case 1: Virtual Account Per User

## 1A) Create sub-account at user onboarding

```ts
// src/subaccounts/createUserVault.ts
import { zendfi } from '../zendfi';

export async function createUserVault(userId: string) {
  const sub = await zendfi.createSubAccount({
    label: `user_${userId}`,
    spend_limit_usdc: 1000,
    access_mode: 'delegated',
    yield_enabled: false,
  });

  return {
    subAccountId: sub.id,
    walletAddress: sub.wallet_address,
    label: sub.label,
  };
}
```

Equivalent API call:

```bash
curl -X POST https://api.zendfi.tech/api/v1/subaccounts \
  -H "Authorization: Bearer $ZENDFI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"label":"user_42","spend_limit_usdc":1000,"access_mode":"delegated","yield_enabled":false}'
```

Equivalent CLI call:

```bash
zendfi subaccounts create --label user_42 --spend-limit 1000 --access-mode delegated
```

## 1B) Show balance in app

```ts
// src/subaccounts/getUserVaultBalance.ts
import { zendfi } from '../zendfi';

export async function getUserVaultBalance(subAccountId: string) {
  const b = await zendfi.getSubAccountBalance(subAccountId);

  return {
    usdc: b.usdc_balance,
    sol: b.sol_balance,
    accruedYield: b.accrued_yield,
    savingsEnabled: b.yield_enabled,
    status: b.status,
  };
}
```

CLI:

```bash
zendfi subaccounts balance sa_xxxxx
```

## 1C) Fund vault via split routing (recommended for payment flows)

This is the cleanest way to route checkout funds into a user vault.

```ts
// src/subaccounts/fundUserVaultViaSplit.ts
import { zendfi } from '../zendfi';

export async function fundUserVaultViaSplit(subAccountId: string, amount = 25) {
  const link = await zendfi.createPaymentLink({
    amount,
    description: `Top up ${subAccountId}`,
    split_recipients: [
      {
        recipient_type: 'wallet',
        sub_account_id: subAccountId,
        // single-recipient split can omit percentage/fixed amount and defaults to 100%
      },
    ],
  });

  return {
    linkCode: link.link_code,
    checkoutUrl: link.hosted_page_url,
  };
}
```

You can also pass recipient_sub_account (SDK alias), which is normalized to sub_account_id.

## 1D) Withdraw to wallet

```ts
// src/subaccounts/withdrawToWallet.ts
import { zendfi } from '../zendfi';

export async function withdrawToWallet(input: {
  subAccountId: string;
  toAddress: string;
  amount: number;
  delegationToken?: string;
  signingGrant?: string;
}) {
  return zendfi.withdrawFromSubAccount(input.subAccountId, {
    to_address: input.toAddress,
    amount: input.amount,
    token: 'Usdc',
    mode: 'live',
    delegation_token: input.delegationToken,
    signing_grant: input.signingGrant,
  });
}
```

CLI:

```bash
zendfi subaccounts withdraw sa_xxxxx \
  --to 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU \
  --amount 10 \
  --token Usdc \
  --mode live \
  --delegation-token satk_xxxxx \
  --signing-grant ssgt_xxxxx
```

## 1E) Withdraw to bank

```ts
// src/subaccounts/withdrawToBank.ts
import { zendfi } from '../zendfi';

export async function withdrawToBank(input: {
  subAccountId: string;
  amountUsdc: number;
  bankId: string;
  accountNumber: string;
  automationToken?: string;
  signingGrant?: string;
}) {
  return zendfi.withdrawSubAccountToBank(input.subAccountId, {
    amount_usdc: input.amountUsdc,
    bank_id: input.bankId,
    account_number: input.accountNumber,
    mode: 'live',
    automation_token: input.automationToken,
    signing_grant: input.signingGrant,
  });
}
```

CLI:

```bash
zendfi subaccounts withdraw-bank sa_xxxxx \
  --amount 25 \
  --bank-id GTB \
  --account-number 0123456789 \
  --mode live \
  --automation-token saatk_xxxxx \
  --signing-grant ssgt_xxxxx
```

---

## Use Case 2: Savings App (Kamino-Powered)

You toggle savings intent at sub-account level with yield_enabled, then run earn operations in your backend.

## 2A) Enable savings at creation time

```ts
// src/savings/enableSavingsMode.ts
import { zendfi } from '../zendfi';

export async function createSavingsVault(userId: string) {
  return zendfi.createSubAccount({
    label: `saver_${userId}`,
    spend_limit_usdc: 3000,
    access_mode: 'delegated',
    yield_enabled: true,
  });
}
```

CLI:

```bash
zendfi subaccounts create --label saver_42 --spend-limit 3000 --access-mode delegated --yield-enabled
```

## 2B) Run savings sweep job (API-first for earn)

At the moment, sub-account management is full in SDK/CLI, while Kamino earn actions are API-first.

```ts
// src/savings/runSavingsSweepJob.ts
const API_BASE = process.env.ZENDFI_API_BASE || 'https://api.zendfi.tech';
const API_KEY = process.env.ZENDFI_API_KEY!;

async function zendfiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    throw new Error(`ZendFi API ${res.status}: ${await res.text()}`);
  }

  return res.json();
}

export async function runSavingsSweepJob() {
  // Example policy: deposit 250 USDC into earn when treasury policy says safe.
  const deposit = await zendfiFetch('/api/v1/merchants/me/earn/deposit', {
    method: 'POST',
    body: JSON.stringify({ amount_usdc: 250 }),
  });

  return deposit;
}
```

Related earn endpoints:

- GET /api/v1/merchants/me/earn/metrics
- GET /api/v1/merchants/me/earn/position
- GET /api/v1/merchants/me/earn/preview-withdraw
- POST /api/v1/merchants/me/earn/deposit
- POST /api/v1/merchants/me/earn/withdraw

---

## Use Case 3: Agentic Payments + Smart Wallets

Now we add bounded autonomy.

Goal:

- agents can move money
- agents cannot exceed strict limits
- approvals can be gated and released by signal

## 3A) Mint bounded credentials

```ts
// src/agentic/mintBoundedCredentials.ts
import { zendfi } from '../zendfi';

export async function mintBoundedCredentials(subAccountId: string) {
  const token = await zendfi.mintSubAccountDelegationToken(subAccountId, {
    scope: 'withdraw_only',
    spend_limit_usdc: 100,
    expires_in_seconds: 900,
    single_use: false,
    agent_label: 'ops-agent',
  });

  const intent = await zendfi.startSubAccountSigningGrantBrowserIntent({
    sub_account_id: subAccountId,
    ttl_seconds: 3600,
    max_uses: 25,
    total_limit_usdc: 500,
    per_tx_limit_usdc: 50,
    mode: 'live',
  });

  return {
    delegationToken: token.delegation_token,
    signingGrantBrowserIntent: intent,
  };
}
```

CLI options:

```bash
zendfi subaccounts token sa_xxxxx --scope withdraw_only --spend-limit 100 --ttl 900
zendfi subaccounts signing-grant-mint --subaccount-id sa_xxxxx --ttl 3600 --max-uses 25 --total-limit 500 --per-tx-limit 50 --mode live
```

## 3B) Gate high-risk actions with execution intent

```ts
// src/agentic/createExecutionGate.ts
import { zendfi } from '../zendfi';

export async function createExecutionGate(subAccountId: string) {
  const created = await zendfi.createSubAccountExecutionIntent({
    sub_account_id: subAccountId,
    intent_type: 'withdraw_to_bank',
    requires_signal_type: 'webhook_ack',
    payload: {
      bank_id: 'GTB',
      account_number: '0123456789',
    },
    expires_in_seconds: 900,
  });

  await zendfi.approveSubAccountExecutionIntent(created.intent_id, { approve: true });

  return created;
}
```

```ts
// src/agentic/releaseExecutionGate.ts
import { zendfi } from '../zendfi';

export async function releaseExecutionGate(signalToken: string) {
  return zendfi.releaseSubAccountExecutionIntentBySignal({
    signal_token: signalToken,
  });
}
```

CLI:

```bash
zendfi subaccounts intent-create --subaccount-id sa_xxxxx --intent-type withdraw_to_bank --signal-type webhook_ack --payload '{"bank_id":"GTB","account_number":"0123456789"}' --expires 900
zendfi subaccounts intent-approve <intent-id>
zendfi subaccounts intent-release --signal-token sge_xxxxx
```

## 3C) Add policies, triggers, and balance rules

```bash
zendfi subaccounts policy-create --subaccount-id sa_xxxxx --policy-type signing_grant --status active --policy-json '{"max_per_tx_usdc":100,"max_per_day_usdc":500,"allowed_modes":["live"]}'

zendfi subaccounts trigger-create --subaccount-id sa_xxxxx --trigger-type balance_below --threshold 20 --cooldown 300

zendfi subaccounts balance-rule-create --subaccount-id sa_xxxxx --rule-name keep-hot-wallet-funded --rule-type topup_below --threshold 50 --action-amount 100 --max-actions-per-day 6 --cooldown 300
```

---

## Production Checklist

Before you expose these flows to real users:

1. Keep one DB table mapping app user_id -> sub_account_id -> wallet_address.
2. Never log delegation_token, automation_token, or signing_grant raw values.
3. Freeze immediately on suspicious behavior and rotate credentials after unfreeze.
4. Use execution intents for all non-trivial outflows.
5. Run policy dry-runs in CI for rule changes.
6. Enable advanced controls flags in runtime.

Required flags for advanced programmable controls:

- SUBACCOUNT_ADVANCED_CONTROLS_ENABLED=true
- SUBACCOUNT_POLICY_ENGINE_ENABLED=true
- SUBACCOUNT_BALANCE_AUTOMATION_ENABLED=true
- SUBACCOUNT_SIGNING_GRANT_AUTO_RENEW_ENABLED=true

---

## Minimal Launch Plan (7 Days)

1. Day 1: create/list/get/balance sub-accounts in app.
2. Day 2: fund via split-to-sub-account + direct withdraw-to-wallet.
3. Day 3: add withdraw-bank with bounded token/grant flow.
4. Day 4: add freeze/unfreeze incident tooling.
5. Day 5: add policy + intent gates for high-risk actions.
6. Day 6: add trigger and balance-rule automations.
7. Day 7: enable savings mode and run earn jobs.

That is enough to ship a serious sub-account product fast, then iterate.

---

## One Last Note

Most teams over-invest in wallet plumbing and under-invest in policy boundaries.

With ZendFi sub-accounts, get the boundary model right first:

- isolate balance by user
- bound automation by token/grant/policy
- gate risky actions via intents

Everything else compounds from there.
