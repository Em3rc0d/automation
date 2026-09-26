export class GoogleCalendarAdapter {
  constructor({ client, calendarId = "primary" } = {}) {
    if (!client?.request) throw new TypeError("client.request is required");
    this.client = client;
    this.calendarId = calendarId;
  }

  async healthCheck() {
    const calendar = await this.client.request(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.calendarId)}`,
    );
    return {
      provider: "google_calendar",
      ok: Boolean(calendar?.id),
      calendarId: calendar?.id ?? this.calendarId,
      summary: calendar?.summary ?? null,
    };
  }

  async listUpcoming({ tenantId, from, to }) {
    const payload = await this.client.request(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.calendarId)}/events`,
      {
        query: {
          timeMin: from,
          timeMax: to,
          singleEvents: true,
          orderBy: "startTime",
          maxResults: 2500,
        },
      },
    );
    return (payload.items ?? []).map((event) => ({
      id: event.id,
      externalId: event.id,
      tenantId,
      sourceSystem: "google_calendar",
      title: event.summary ?? null,
      status: event.status ?? "confirmed",
      startsAt: event.start?.dateTime ?? event.start?.date,
      endsAt: event.end?.dateTime ?? event.end?.date ?? null,
      location: event.location ?? null,
      attendees: (event.attendees ?? [])
        .filter((a) => !a.resource)
        .map((a) => ({
          id: a.email,
          name: a.displayName ?? a.email,
          contact: { channel: "email", address: a.email },
          responseStatus: a.responseStatus ?? null,
        })),
    }));
  }
}
