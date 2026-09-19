# CASE-003 Adapter Contracts v1

Status: **DESIGN AUTHORITY FOR CASE-003**

These contracts refine `architecture/CONNECTOR-CONTRACT.md`. Provider-specific payloads never enter the supplier domain.

## Shared context

```ts
export interface OperationContext {
  tenantId: string;
  connectorAccountId?: string;
  automationInstanceId?: string;
  executionRunId?: string;
  traceId: string;
  idempotencyKey?: string;
}
```

## ChannelAdapter

```ts
export interface ChannelAdapter {
  provider: "whatsapp";

  verifyWebhook(input: WebhookInput): Promise<VerifiedWebhook>;
  receive(ctx: OperationContext, input: VerifiedWebhook): Promise<InboundMessage>;

  sendMessage(
    ctx: OperationContext & { idempotencyKey: string },
    input: OutboundMessage
  ): Promise<SideEffectReceipt>;

  sendTemplate(
    ctx: OperationContext & { idempotencyKey: string },
    input: TemplateMessage
  ): Promise<SideEffectReceipt>;

  healthCheck(connectorAccountId: string): Promise<ConnectorHealth>;
}

export interface InboundMessage {
  channel: "whatsapp";
  externalIdentity: string;
  externalMessageId: string;
  receivedAt: string;
  type: "text" | "interactive" | "unsupported";
  content: unknown;
}
```

Webhook verification, replay protection and provider message ID persistence are mandatory before business side effects.

## VerificationDeliveryAdapter

```ts
export interface VerificationDeliveryAdapter {
  sendChallenge(
    ctx: OperationContext & { idempotencyKey: string },
    input: {
      maskedDestinationLabel: string;
      deliveryDestinationRef: string;
      challengeId: string;
      expiresAt: string;
    }
  ): Promise<SideEffectReceipt>;

  sendAccessDecision(
    ctx: OperationContext & { idempotencyKey: string },
    input: {
      deliveryDestinationRef: string;
      decision: "approved" | "rejected";
    }
  ): Promise<SideEffectReceipt>;

  healthCheck(connectorAccountId: string): Promise<ConnectorHealth>;
}
```

The adapter does not generate, store or validate OTP/challenge secrets.

## FileImportAdapter

```ts
export interface FileImportAdapter {
  inspect(ctx: OperationContext, file: StoredFile): Promise<FileInspection>;

  parse(
    ctx: OperationContext,
    file: StoredFile,
    profile: ImportProfile
  ): Promise<ParsedDataset>;

  normalize(
    ctx: OperationContext,
    dataset: ParsedDataset,
    profile: ImportProfile
  ): Promise<NormalizedDataset>;
}
```

The adapter MUST NOT validate business authorization, approve a batch or publish a snapshot.

Allowed MVP formats: XLSX and CSV only. MIME, extension, size and content are independently checked. Original file SHA-256 is immutable provenance evidence.

## ObjectStorage

```ts
export interface ObjectStorage {
  put(
    ctx: OperationContext & { idempotencyKey: string },
    input: StoreObjectInput
  ): Promise<StoredFile>;

  get(ctx: OperationContext, reference: string): Promise<StoredFile>;

  delete(
    ctx: OperationContext & { idempotencyKey: string },
    reference: string
  ): Promise<void>;
}
```

Storage paths are tenant-scoped. Domain tables keep `storageReference`, never raw file bytes.

## NormalizedDataset boundary

Representative QQVA/SCIV/FBL1N evidence was received on 2026-09-19. The normalized envelope and source record kinds are now structurally frozen; raw SAP codes remain raw where no source legend exists.

```ts
export interface NormalizedDataset {
  schemaVersion: 1;
  tenantId: string;
  datasetType: "supplier_ap";
  source: {
    kind: "sap_s4hana_manual_report";
    sourceDataset: "qqva" | "sciv" | "fbl1n";
    importFileId: string;
    importProfileId: string;
    importProfileVersion: number;
    sha256: string;
  };
  records: Array<SupplierCanonical | InvoiceCanonical | FinancialItemCanonical>;
}

export interface SupplierCanonical {
  kind: "supplier";
  companyCode: string;
  sapVendorId: string;
  displayName: string;
  taxId?: string;
  trustedContactEmail?: string;
}

export interface InvoiceCanonical {
  kind: "invoice";
  companyCode: string;
  sapVendorId: string;
  invoiceReference: string;
  documentDate: string;
  receiptDate: string;
  currency: string;
  grossAmount: number;
  dueDate: string;
  fiDocumentNumber?: string;
  fiscalYear?: string;
  invoiceUniqueId?: string;
  technicalStatusRaw?: string;
  invoiceStatusRaw?: string;
}

export interface FinancialItemCanonical {
  kind: "financial_item";
  companyCode: string;
  documentNumber: string;
  fiscalYear: string; // derived from postingDate for FBL1N v1
  documentTypeRaw: string;
  invoiceReference?: string;
  postingDate: string;
  netDueDate: string;
  documentAmount: number;
  currency: string;
  clearingDate?: string;
  clearingDocumentNumber?: string;
  paymentDateRaw?: string;
}
```

The complete evidence-derived mapping and join rules live in `cases/case-003/S4HANA-REPORT-CONTRACT-v1.md` and `cases/case-003/import-profile.v1.json`.

## Error normalization

Adapters use the repository connector error classes where applicable:
`AUTH_EXPIRED`, `AUTH_REVOKED`, `PERMISSION_DENIED`, `RATE_LIMITED`,
`TEMPORARY_PROVIDER_FAILURE`, `INVALID_REQUEST`, `NOT_FOUND`, `CONFLICT`,
`DUPLICATE`, `UNSUPPORTED`, `UNKNOWN_PROVIDER_FAILURE`.

File intake may additionally produce case-domain validation findings, but those are not provider errors.

## Runtime independence

n8n may orchestrate adapter calls. Identity, membership, authorization, approval, snapshot publication and audit policy remain platform-owned.
