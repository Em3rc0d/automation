import { resolveCredential } from "./credential-resolver.mjs";
import { GoogleApiClient } from "./google-client.mjs";
import { GoogleSheetsTableAdapter } from "./sheets-table.mjs";
import { GmailInboundAdapter, GmailMessageAdapter } from "./gmail.mjs";
import { GoogleCalendarAdapter } from "./calendar.mjs";
import { GoogleDriveStorageAdapter } from "./drive-storage.mjs";

export function createGoogleWorkspaceAdapter(binding, {
  env = process.env,
  fetchFn = globalThis.fetch,
} = {}) {
  if (!binding?.provider) throw new TypeError("binding.provider is required");
  if (!binding?.credentialRef) throw new TypeError("binding.credentialRef is required");
  const credential = resolveCredential(binding.credentialRef, env);
  const client = new GoogleApiClient({ credential, fetchFn });
  const settings = binding.settings ?? {};

  switch (binding.provider) {
    case "google_sheets":
      return new GoogleSheetsTableAdapter({ client, ...settings });
    case "gmail":
      if (binding.capability === "email.inbound" || binding.adapterRole === "trigger") {
        return new GmailInboundAdapter({ client, ...settings });
      }
      return new GmailMessageAdapter({ client, ...settings });
    case "google_calendar":
      return new GoogleCalendarAdapter({ client, ...settings });
    case "google_drive":
      return new GoogleDriveStorageAdapter({ client, ...settings });
    default:
      throw new Error(`unsupported Google Workspace provider: ${binding.provider}`);
  }
}
