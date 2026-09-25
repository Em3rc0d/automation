const demos = [
  "payment-reminder",
  "appointment-reminder",
  "lead-followup",
  "lead-intake",
  "unanswered-message-watchdog",
  "quote-followup",
  "email-classify-route",
  "email-attachment-extract",
  "document-archive",
  "low-stock-alert",
  "support-intake",
  "renewal-reminder",
];
for (const demo of demos) {
  await import(`./${demo}/run.js`);
}
