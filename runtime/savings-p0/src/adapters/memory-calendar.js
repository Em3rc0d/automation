export class MemoryCalendarAdapter {
  constructor(events = []) {
    this.events = events.map((event) => structuredClone(event));
  }

  async listUpcoming({ tenantId, from, to }) {
    const fromMs = new Date(from).getTime();
    const toMs = new Date(to).getTime();
    return this.events
      .filter((event) => event.tenantId === tenantId)
      .filter((event) => {
        const at = new Date(event.startsAt).getTime();
        return at >= fromMs && at <= toMs;
      })
      .map((event) => structuredClone(event));
  }

  async upsert({ tenantId, event }) {
    if (!event.id) throw new TypeError("event.id is required");
    if (event.tenantId && event.tenantId !== tenantId) throw new Error("tenant mismatch");
    const idx = this.events.findIndex((item) => item.tenantId === tenantId && item.id === event.id);
    const value = { ...structuredClone(event), tenantId };
    if (idx >= 0) this.events[idx] = value;
    else this.events.push(value);
    return structuredClone(value);
  }
}
