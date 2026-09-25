# W-SAVINGS-P0 Adapter Contracts

The reference runtime intentionally starts with zero-dependency, in-memory adapters. They make demos/tests deterministic and establish provider-neutral boundaries before real provider credentials exist.

## Table adapter

Used for Sheet/CSV/ERP-like records.

```js
await table.list({ tenantId, predicate? })
await table.upsert({ tenantId, key, row })
```

Reference: `src/adapters/memory-table.js`.

## Message adapter

Used for email/WhatsApp/SMS-like outbound actions.

```js
await message.send({
  tenantId,
  to,
  channel,
  templateKey,
  variables,
  idempotencyKey
})
```

The adapter owns provider-side idempotency and returns attributable variable cost. Reference: `src/adapters/memory-message.js`.

## Calendar adapter

Used by the next Appointment Reminder implementation.

```js
await calendar.listUpcoming({ tenantId, from, to })
await calendar.upsert({ tenantId, event })
```

Reference: `src/adapters/memory-calendar.js`.

Real Gmail/Google Sheets/Calendar adapters are **not** required to prove P0 locally. Provider binding occurs only when a paying/funded pilot justifies it.
