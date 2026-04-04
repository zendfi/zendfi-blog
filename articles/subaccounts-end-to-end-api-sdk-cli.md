---
title: "How to Build with ZendFi Sub-Accounts End-to-End (API, SDK, CLI)"
author: "Blessed Tosin-Oyinbo"
date: "2026-03-31"
description: "A practical guide to building virtual accounts, savings flows, and agentic smart-wallet automations with ZendFi sub-accounts"
tags: ["subaccounts", "sdk", "cli", "api", "agentic-payments", "solana"]
category: "Dev Knowledge"
image: ""
---

## Why Sub-Accounts Exist

Most apps eventually need this pattern:

- one master merchant wallet
- many user-level balances
- isolated spend and withdrawal controls per user
- automation that does not hand your main wallet keys to every microservice

That is exactly what ZendFi sub-accounts are for.

A sub-account is a merchant-owned child wallet with its own identity, balances, controls, and delegation surface.

You can:

- create one sub-account per user (or per team, tenant, strategy)
- fund it directly
- let users withdraw from their own isolated balance
- apply bounded delegation, signing grants, policy checks, execution gates, and balance rules

This guide covers the full build path with API, SDK, and CLI.

---

## The Mental Model

Think in layers:

1. Ledger layer: sub-account wallet + balances
2. Access layer: delegation tokens and signing grants
3. Control layer: policies, intents, triggers, automation rules

Core endpoints/methods/commands map to those layers:

- Lifecycle: create, list, get, balance, freeze, unfreeze, close
- Money movement: drain, withdraw (wallet), withdraw-bank (PAJ)
- Delegation and automation: token mint/revoke, signing grant mint/revoke
- Advanced controls: policy create/dry-run, triggers, execution intents, balance rules

---

## Quick Setup

### API key

Use a merchant API key:

- test: zfi_test_...
- live: zfi_live_...

### SDK

```bash
npm install @zendfi/sdk
```

```ts
import { ZendFiClient } from '@zendfi/sdk';

const zendfi = new ZendFiClient({
  apiKey: process.env.ZENDFI_API_KEY,
});
```

### CLI

```bash
npm i -g @zendfi/cli
zendfi --help
```

Sub-account commands live under:

- zendfi subaccounts ...
- alias: zendfi sa ...

## Set TTL Policy Before You Mint Credentials

Sub-account signing grants, automation tokens, and child delegation tokens now use a merchant TTL policy with platform hard caps.

### API

```bash
curl -X GET https://api.zendfi.tech/api/v1/subaccounts/ttl-policy \
  -H "Authorization: Bearer $ZENDFI_API_KEY"

curl -X POST https://api.zendfi.tech/api/v1/subaccounts/ttl-policy \
  -H "Authorization: Bearer $ZENDFI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "signing_grant_max_ttl_seconds": 1209600,
    "automation_token_max_ttl_seconds": 1209600,
    "child_delegation_max_ttl_seconds": 259200
  }'
```

### SDK

```ts
await zendfi.updateSubAccountTtlPolicy({
  signing_grant_max_ttl_seconds: 60 * 60 * 24 * 14,
  automation_token_max_ttl_seconds: 60 * 60 * 24 * 14,
  child_delegation_max_ttl_seconds: 60 * 60 * 24 * 3,
});
```

### CLI

```bash
zendfi subaccounts ttl-policy-set \
  --signing-grant-max-ttl 1209600 \
  --automation-token-max-ttl 1209600 \
  --child-delegation-max-ttl 259200
```

---

## Use Case 1: Virtual Account Per User (Deposits + Withdrawals)

This is the most common pattern.

You create a sub-account for each user, treat it as that user vault, and build controlled withdrawal flows on top.

## 1) Create a user sub-account

### API

```bash
curl -X POST https://api.zendfi.tech/api/v1/subaccounts \
  -H "Authorization: Bearer $ZENDFI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "user_42",
    "spend_limit_usdc": 1000,
    "access_mode": "delegated",
    "yield_enabled": false
  }'
```

### SDK

```ts
const userSub = await zendfi.createSubAccount({
  label: 'user_42',
  spend_limit_usdc: 1000,
  access_mode: 'delegated',
  yield_enabled: false,
});

console.log(userSub.id, userSub.wallet_address);
```

### CLI

```bash
zendfi subaccounts create \
  --label user_42 \
  --spend-limit 1000 \
  --access-mode delegated
```

## 2) Fund the sub-account

You have two practical funding paths.

### Path A: direct transfer to sub-account wallet

Get wallet via:

- API: GET /api/v1/subaccounts/{id}
- SDK: zendfi.getSubAccount(...)
- CLI: zendfi subaccounts get <id>

Then transfer funds to wallet_address.

### Path B: route payment flow directly into sub-account via splits

If you use payment links/splits, wallet recipients now support sub-account routing.

#### API example

```bash
curl -X POST https://api.zendfi.tech/api/v1/payment-links \
  -H "Authorization: Bearer $ZENDFI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50,
    "description": "Top up user_42 vault",
    "split_recipients": [
      {
        "recipient_type": "wallet",
        "sub_account_id": "sa_user_42"
      }
    ]
  }'
```

If there is only one split recipient and you omit percentage/fixed_amount_usd, it defaults to 100%.

## 3) Show balances in your app

### API

```bash
curl -X GET https://api.zendfi.tech/api/v1/subaccounts/sa_user_42/balance \
  -H "Authorization: Bearer $ZENDFI_API_KEY"
```

### SDK

```ts
const balance = await zendfi.getSubAccountBalance(userSub.id);
console.log(balance.usdc_balance, balance.sol_balance);
```

### CLI

```bash
zendfi subaccounts balance sa_user_42
```

## 4) Build withdrawals

For wallet withdrawal, use withdraw.
For fiat bank payout, use withdraw-bank.

### Wallet withdrawal API

```bash
curl -X POST https://api.zendfi.tech/api/v1/subaccounts/sa_user_42/withdraw \
  -H "Authorization: Bearer $ZENDFI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to_address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "amount": 10,
    "token": "Usdc",
    "mode": "live",
    "delegation_token": "satk_xxxxx",
    "signing_grant": "ssgt_xxxxx"
  }'
```

### Wallet withdrawal SDK

```ts
await zendfi.withdrawFromSubAccount(userSub.id, {
  to_address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  amount: 10,
  token: 'Usdc',
  mode: 'live',
  delegation_token: process.env.SUB_DELEGATION_TOKEN,
  signing_grant: process.env.SUB_SIGNING_GRANT,
});
```

### Wallet withdrawal CLI

```bash
zendfi subaccounts withdraw sa_user_42 \
  --to 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU \
  --amount 10 \
  --token Usdc \
  --mode live \
  --delegation-token satk_xxxxx \
  --signing-grant ssgt_xxxxx
```

### Bank withdrawal CLI

```bash
zendfi subaccounts withdraw-bank sa_user_42 \
  --amount 25 \
  --bank-id GTB \
  --account-number 0123456789 \
  --mode live \
  --signing-grant ssgt_xxxxx \
  --automation-token saatk_xxxxx
```

withdraw-bank uses the same proxy-email OTP automation model as split bank payouts, so you do not run manual OTP UX in your integration.

## 5) Helpful lifecycle controls

When risk flags trigger:

- freeze sub-account
- revoke active delegated credentials
- investigate
- optionally unfreeze and mint fresh credentials

```bash
zendfi subaccounts freeze sa_user_42 --reason "risk-engine-flag"
zendfi subaccounts unfreeze sa_user_42 --reason "manual-review-cleared"
```

---

## Use Case 2: Savings App with Kamino-Powered Yield

Pattern: each user has a sub-account vault, and savings mode is represented by yield_enabled.

### Create savings-enabled user vault

### API

```bash
curl -X POST https://api.zendfi.tech/api/v1/subaccounts \
  -H "Authorization: Bearer $ZENDFI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "saver_42",
    "spend_limit_usdc": 2000,
    "access_mode": "delegated",
    "yield_enabled": true
  }'
```

### SDK

```ts
const saverSub = await zendfi.createSubAccount({
  label: 'saver_42',
  spend_limit_usdc: 2000,
  access_mode: 'delegated',
  yield_enabled: true,
});
```

### CLI

```bash
zendfi subaccounts create \
  --label saver_42 \
  --spend-limit 2000 \
  --access-mode delegated \
  --yield-enabled
```

### Savings operations model

In production you typically run this loop:

1. User deposits into sub-account
2. Your backend detects yield_enabled = true
3. Your savings worker executes Kamino earn actions
4. User sees principal + accrued_yield in account views

Balance snapshots already expose:

- usdc_balance
- accrued_yield
- yield_enabled

### Kamino earn API surface

Kamino-backed earn routes are available under merchant scope:

- GET /api/v1/merchants/me/earn/metrics
- GET /api/v1/merchants/me/earn/position
- GET /api/v1/merchants/me/earn/preview-withdraw
- POST /api/v1/merchants/me/earn/deposit
- POST /api/v1/merchants/me/earn/withdraw

Example deposit call:

```bash
curl -X POST https://api.zendfi.tech/api/v1/merchants/me/earn/deposit \
  -H "Authorization: Bearer $ZENDFI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "amount_usdc": 250 }'
```

Note: at the time of writing, the SDK and CLI expose full sub-account operations, while earn operations are currently API-first. Many teams wrap these endpoints in an internal service layer next to their savings scheduler.

---

## Use Case 3: Agentic Payments + Smart Wallet Controls

This is where sub-accounts become programmable smart wallets.

You combine delegation, signing grants, policy versions, execution intents, and triggers so autonomous agents can act inside bounded rules.

## Step A: Mint bounded credentials

### SDK: delegation token

```ts
const delegation = await zendfi.mintSubAccountDelegationToken(userSub.id, {
  scope: 'withdraw_only',
  spend_limit_usdc: 100,
  expires_in_seconds: 900,
  single_use: true,
  whitelist: ['7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'],
  agent_label: 'payout-agent',
});
```

### CLI: signing grant

```bash
zendfi subaccounts signing-grant-mint \
  --subaccount-id sa_user_42 \
  --ttl 3600 \
  --max-uses 25 \
  --total-limit 500 \
  --per-tx-limit 50 \
  --mode live \
  --active-days-utc 1,2,3,4,5 \
  --active-start-utc 09:00 \
  --active-end-utc 18:00 \
  --auto-renew
```

## Step B: Add policy controls

### API: create policy

```bash
curl -X POST https://api.zendfi.tech/api/v1/merchants/me/subaccounts/policies \
  -H "Authorization: Bearer $ZENDFI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "sub_account_id": "sa_user_42",
    "policy_type": "signing_grant",
    "status": "active",
    "policy_json": {
      "max_per_tx_usdc": 100,
      "max_per_day_usdc": 500,
      "allowed_modes": ["live"],
      "allowed_weekdays_utc": [1,2,3,4,5],
      "active_start_utc": "09:00",
      "active_end_utc": "18:00"
    }
  }'
```

### CLI: dry-run policy

```bash
zendfi subaccounts policy-dry-run \
  --subaccount-id sa_user_42 \
  --amount 25 \
  --mode live \
  --daily-spend 120 \
  --policy-json '{"max_per_tx_usdc":100,"max_per_day_usdc":500,"allowed_modes":["live"]}'
```

## Step C: Require explicit gate release with execution intents

### SDK

```ts
const intent = await zendfi.createSubAccountExecutionIntent({
  sub_account_id: userSub.id,
  intent_type: 'withdraw_to_bank',
  requires_signal_type: 'webhook_ack',
  payload: {
    bank_id: 'GTB',
    account_number: '0123456789',
  },
  expires_in_seconds: 900,
});

await zendfi.approveSubAccountExecutionIntent(intent.intent_id, { approve: true });

if (intent.signal_token) {
  await zendfi.releaseSubAccountExecutionIntentBySignal({ signal_token: intent.signal_token });
}
```

## Step D: Add reactive controls

### CLI trigger + balance rule

```bash
zendfi subaccounts trigger-create \
  --subaccount-id sa_user_42 \
  --trigger-type balance_below \
  --threshold 20 \
  --cooldown 300

zendfi subaccounts balance-rule-create \
  --subaccount-id sa_user_42 \
  --rule-name keep-hot-wallet-funded \
  --rule-type topup_below \
  --threshold 50 \
  --action-amount 100 \
  --max-actions-per-day 6 \
  --cooldown 300
```

---

## Advanced Controls Feature Flags

For advanced programmable controls in production, ensure these are enabled in your deployment:

- SUBACCOUNT_ADVANCED_CONTROLS_ENABLED=true
- SUBACCOUNT_POLICY_ENGINE_ENABLED=true
- SUBACCOUNT_BALANCE_AUTOMATION_ENABLED=true
- SUBACCOUNT_SIGNING_GRANT_AUTO_RENEW_ENABLED=true

---

## End-to-End Build Blueprint

If you are starting today, implement in this order:

1. Create sub-account per user (label convention: user_<id>)
2. Fund via direct wallet transfer or split routing to sub_account_id
3. Expose balance and transaction timeline in your app
4. Add withdraw + withdraw-bank with bounded tokens/grants
5. Add freeze/unfreeze incident controls
6. Turn on policy + intent gates for high-risk flows
7. Add trigger and balance-rule automations
8. Enable savings mode (yield_enabled) and wire earn automation jobs

That sequence gets you from simple virtual accounts to fully programmable smart-wallet operations without rewriting your architecture later.

---

## Final Thought

Sub-accounts are not just a wallet convenience feature.

They are the clean boundary between:

- your core treasury risk
- your user-level balances
- your autonomous payment agents

Once you model per-user money movement through sub-accounts, everything else gets easier: safer withdrawals, cleaner accounting, and policy-first automation that can scale.

If you are building deposits, savings, or agentic payouts on Solana, start there.
