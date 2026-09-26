function columnName(index) {
  let n = index + 1;
  let result = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

function sheetName(range) {
  return String(range).includes("!") ? String(range).split("!")[0] : "Sheet1";
}

function encodeCell(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

function decodeCell(value, key, jsonColumns) {
  if (!jsonColumns.has(key) || typeof value !== "string" || value === "") return value ?? "";
  try { return JSON.parse(value); } catch { return value; }
}

export class GoogleSheetsTableAdapter {
  constructor({
    client,
    spreadsheetId,
    range,
    idColumn = "id",
    tenantColumn = null,
    jsonColumns = [],
  } = {}) {
    if (!client?.request) throw new TypeError("client.request is required");
    if (!spreadsheetId) throw new TypeError("spreadsheetId is required");
    if (!range) throw new TypeError("range is required");
    this.client = client;
    this.spreadsheetId = spreadsheetId;
    this.range = range;
    this.idColumn = idColumn;
    this.tenantColumn = tenantColumn;
    this.jsonColumns = new Set(jsonColumns);
  }

  endpoint(range = this.range) {
    return `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(this.spreadsheetId)}/values/${encodeURIComponent(range)}`;
  }

  async rawValues() {
    const payload = await this.client.request(this.endpoint(), { query: { majorDimension: "ROWS" } });
    return Array.isArray(payload?.values) ? payload.values : [];
  }

  mapRows(values, tenantId) {
    if (!values.length) return [];
    const headers = values[0].map(String);
    return values.slice(1).map((cells) => {
      const row = {};
      headers.forEach((key, i) => { row[key] = decodeCell(cells[i], key, this.jsonColumns); });
      if (!this.tenantColumn) row.tenantId = tenantId;
      return row;
    }).filter((row) => !this.tenantColumn || String(row[this.tenantColumn]) === String(tenantId));
  }

  async list({ tenantId, predicate = () => true }) {
    return this.mapRows(await this.rawValues(), tenantId).filter(predicate);
  }

  async upsert({ tenantId, key, row }) {
    const values = await this.rawValues();
    if (!values.length) {
      const headers = Object.keys({ ...row, [this.idColumn]: key });
      if (this.tenantColumn && !headers.includes(this.tenantColumn)) headers.push(this.tenantColumn);
      const finalRow = { ...row, [this.idColumn]: key };
      if (this.tenantColumn) finalRow[this.tenantColumn] = tenantId;
      const matrix = [headers, headers.map((h) => encodeCell(finalRow[h]))];
      const end = columnName(headers.length - 1);
      await this.client.request(this.endpoint(`${sheetName(this.range)}!A1:${end}2`), {
        method: "PUT",
        query: { valueInputOption: "RAW" },
        json: { values: matrix },
      });
      return { ...finalRow, tenantId };
    }

    const headers = values[0].map(String);
    if (!headers.includes(this.idColumn)) throw new Error(`sheet missing id column: ${this.idColumn}`);
    const finalRow = { ...row, [this.idColumn]: key };
    if (this.tenantColumn) finalRow[this.tenantColumn] = tenantId;
    const unknown = Object.keys(finalRow).filter((field) => field !== "tenantId" && !headers.includes(field));
    if (unknown.length) throw new Error(`sheet missing columns: ${unknown.join(", ")}`);

    const idIndex = headers.indexOf(this.idColumn);
    const tenantIndex = this.tenantColumn ? headers.indexOf(this.tenantColumn) : -1;
    let rowIndex = -1;
    for (let i = 1; i < values.length; i += 1) {
      if (String(values[i][idIndex] ?? "") !== String(key)) continue;
      if (tenantIndex >= 0 && String(values[i][tenantIndex] ?? "") !== String(tenantId)) continue;
      rowIndex = i + 1;
      break;
    }
    const encoded = headers.map((h) => encodeCell(finalRow[h]));

    if (rowIndex > 0) {
      const end = columnName(headers.length - 1);
      await this.client.request(this.endpoint(`${sheetName(this.range)}!A${rowIndex}:${end}${rowIndex}`), {
        method: "PUT",
        query: { valueInputOption: "RAW" },
        json: { values: [encoded] },
      });
    } else {
      await this.client.request(`${this.endpoint()}:append`, {
        method: "POST",
        query: { valueInputOption: "RAW", insertDataOption: "INSERT_ROWS" },
        json: { values: [encoded] },
      });
    }
    return { ...finalRow, tenantId };
  }
}
