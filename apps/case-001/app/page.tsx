"use client";

import { useState } from "react";

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

export default function Home() {
  const [token, setToken] = useState("");
  const [sapFile, setSapFile] = useState<File | null>(null);
  const [historyFile, setHistoryFile] = useState<File | null>(null);
  const [result, setResult] = useState<JsonValue | null>(null);
  const [status, setStatus] = useState<JsonValue | null>(null);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const headers = token ? { "x-admin-token": token } : undefined;

  async function upload(path: string, file: File | null) {
    if (!file || !token) return;
    setBusy(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(path, { method: "POST", headers, body: form });
      setResult(await response.json());
      if (response.ok) await refreshStatus();
    } catch {
      setResult({ error: "No se pudo completar la carga." });
    } finally {
      setBusy(false);
    }
  }

  async function refreshStatus() {
    if (!token) return;
    const response = await fetch("/api/status", { headers });
    setStatus(await response.json());
  }

  async function refreshApprovals() {
    if (!token) return;
    const response = await fetch("/api/approvals", { headers });
    const data = await response.json();
    setApprovals(response.ok ? data.approvals ?? [] : []);
    if (!response.ok) setResult(data);
  }

  async function decide(approvalId: string, decision: "approved" | "rejected") {
    if (!token) return;
    setBusy(true);
    try {
      const response = await fetch("/api/approvals", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ approvalId, decision, decidedBy: "pilot-seller" }),
      });
      setResult(await response.json());
      await Promise.all([refreshApprovals(), refreshStatus()]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 860, margin: "40px auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: 8 }}>Asistente de Cotizaciones · Piloto</h1>
      <p style={{ color: "#5d636b", marginTop: 0 }}>
        Consola privada de preparación. La operación diaria del vendedor continúa por WhatsApp.
      </p>

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Acceso del piloto</h2>
        <label style={{ display: "block" }}>
          Clave privada
          <input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            style={inputStyle}
          />
        </label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          <button disabled={!token || busy} onClick={refreshStatus} style={buttonStyle}>Ver estado</button>
          <button disabled={!token || busy} onClick={refreshApprovals} style={buttonStyle}>Ver aprobaciones</button>
        </div>
        {status && <pre style={preStyle}>{JSON.stringify(status, null, 2)}</pre>}
      </section>

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>1. Actualizar snapshot SAP</h2>
        <p style={helpStyle}>Carga el CSV/XLSX autorizado. Un archivo idéntico no crea un snapshot duplicado.</p>
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(event) => setSapFile(event.target.files?.[0] ?? null)}
        />
        <div style={{ marginTop: 14 }}>
          <button onClick={() => upload("/api/import/sap", sapFile)} disabled={!sapFile || !token || busy} style={buttonStyle}>
            {busy ? "Procesando…" : "Subir y validar SAP"}
          </button>
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>2. Importar historial de cotizaciones</h2>
        <p style={helpStyle}>Usa el formato canónico del piloto. Las cotizaciones históricas quedan como referencia, no como autoridad de precio actual.</p>
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(event) => setHistoryFile(event.target.files?.[0] ?? null)}
        />
        <div style={{ marginTop: 14 }}>
          <button onClick={() => upload("/api/import/history", historyFile)} disabled={!historyFile || !token || busy} style={buttonStyle}>
            {busy ? "Procesando…" : "Importar historial"}
          </button>
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>3. Aprobaciones pendientes</h2>
        {approvals.length === 0 ? (
          <p style={helpStyle}>No hay aprobaciones cargadas en esta vista.</p>
        ) : approvals.map((approval) => (
          <div key={approval.id} style={{ borderTop: "1px solid #e5e7eb", padding: "14px 0" }}>
            <div><strong>{approval.quote_id}</strong></div>
            <div style={helpStyle}>{(approval.reasons ?? []).join(", ")}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button disabled={busy} onClick={() => decide(approval.id, "approved")} style={buttonStyle}>Aprobar y enviar</button>
              <button disabled={busy} onClick={() => decide(approval.id, "rejected")} style={buttonStyle}>Rechazar ajuste</button>
            </div>
          </div>
        ))}
      </section>

      {result && <pre style={preStyle}>{JSON.stringify(result, null, 2)}</pre>}

      <p style={{ fontSize: 13, color: "#6b7280", marginTop: 24 }}>
        Esta V1 no modifica SAP. La IA interpreta lenguaje; precios, descuentos, margen, IGV, moneda y totales se validan de forma determinística.
      </p>
    </main>
  );
}

const cardStyle = { background: "white", border: "1px solid #e2e5e9", borderRadius: 14, padding: 24, marginTop: 22 } as const;
const inputStyle = { display: "block", width: "100%", padding: 10, marginTop: 6, boxSizing: "border-box" } as const;
const buttonStyle = { padding: "10px 16px", border: "1px solid #cfd4da", borderRadius: 8, cursor: "pointer", background: "#f8fafc" } as const;
const preStyle = { whiteSpace: "pre-wrap", background: "#111827", color: "#f9fafb", borderRadius: 12, padding: 18, overflow: "auto", marginTop: 16 } as const;
const helpStyle = { color: "#5d636b", fontSize: 14 } as const;
