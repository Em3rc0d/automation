export class MemoryTableAdapter {
  constructor(rows = []) {
    this.rows = rows.map((row) => structuredClone(row));
  }

  async list({ tenantId, predicate = () => true }) {
    return this.rows
      .filter((row) => row.tenantId === tenantId)
      .filter(predicate)
      .map((row) => structuredClone(row));
  }

  async upsert({ tenantId, key, row }) {
    if (row.tenantId && row.tenantId !== tenantId) throw new Error("tenant mismatch");
    const idx = this.rows.findIndex((item) => item.tenantId === tenantId && item.id === key);
    const value = { ...structuredClone(row), id: key, tenantId };
    if (idx >= 0) this.rows[idx] = value;
    else this.rows.push(value);
    return structuredClone(value);
  }
}
