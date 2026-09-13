"use client";

import { useState } from "react";

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

export default function Home() {
  const [token, setToken] = useState("");
  const [sapFile, setSapFile] = useState<File | null>(null);
  const [historyFile, setHistoryFile] = useState<File | null>(null);
  const [messagePhone, setMessagePhone] = useState("+51999999999");
  const [messageText, setMessageText] = useState("Cotízame 10 EPOX-7000-GRIS");
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

  async function simulateMessage() {
    if (!token || !messagePhone.trim() || !messageText.trim()) return;
    setBusy(true);
    try {
      const response = await fetch("/api/poc/message", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ phone: messagePhone, text: messageText }),
      });
      setResult(await response.json());
      await Promise.all([refreshStatus(), refreshApprovals()]);
    } catch {
      setResult({ error: "No se pudo ejecutar el mensaje local." });
    } finally {
      setBusy(false);
    }
  }

  async function decide(approvalId: string, decision: "approved" | "rejected") {
    if (!token) return;
    setBusy(true);
    try {
      const response = await fetch("/api/approvals", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ approvalId, decision, decidedBy: "poc-operator" }),
      });
      setResult(await response.json());
      await Promise.all([refreshApprovals(), refreshStatus()]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ ...cardStyle, borderColor: "#f59e0b", background: "#fffbeb" }}>
        <strong>CASE-001 · PoC local</strong>
        <p style={{ marginBottom: 0, ...helpStyle }}>
          Esta superficie demuestra el flujo técnico en Docker/PostgreSQL local. No es la versión final, no usa WhatsApp real y no constituye certificación P1.
        </p>
      </div>

      <h1 style={{ marginBottom: 8 }}>Asistente de Cotizaciones · PoC</h1>
      <p style={{ color: "#5d636b", marginTop: 0 }}>
        Consola local de ingeniería para SAP, historial, mensajes simulados, cotizaciones y aprobaciones.
      </p>

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Acceso local</h2>
        <label style={{ display: "block" }}>
          Clave privada de la PoC
          <input type="password" value={token} onChange={(event) => setToken(event.target.value)} style={inputStyle} />
        </label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          <button disabled={!token || busy} onClick={refreshStatus} style={buttonStyle}>Ver estado</button>
          <button disabled={!token || busy} onClick={refreshApprovals} style={buttonStyle}>Ver aprobaciones</button>
        </div>
        {status && <pre style={preStyle}>{JSON.stringify(status, null, 2)}</pre>}
      </section>

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>1. Simular mensaje de cliente</h2>
        <p style={helpStyle}>El canal es local. Con CASE001_AI_PROVIDER=gemini, solo la interpretación semántica sale a Gemini; el cálculo sigue siendo determinístico.</p>
        <label style={{ display: "block", marginBottom: 12 }}>
          Teléfono simulado
          <input value={messagePhone} onChange={(event) => setMessagePhone(event.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: "block" }}>
          Mensaje
          <textarea value={messageText} onChange={(event) => setMessageText(event.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical" }} />
        </label>
        <div style={{ marginTop: 14 }}>
          <button onClick={simulateMessage} disabled={!token || !messagePhone.trim() || !messageText.trim() || busy} style={buttonStyle}>
            {busy ? "Procesando…" : "Ejecutar mensaje local"}
          </button>
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>2. Actualizar snapshot SAP</h2>
        <p style={helpStyle}>Carga CSV/XLSX autorizado. Un archivo idéntico no crea un snapshot duplicado.</p>
        <input type="file" accept=".csv,.xlsx,.xls" onChange={(event) => setSapFile(event.target.files?.[0] ?? null)} />
        <div style={{ marginTop: 14 }}>
          <button onClick={() => upload("/api/import/sap", sapFile)} disabled={!sapFile || !token || busy} style={buttonStyle}>
            {busy ? "Procesando…" : "Subir y validar SAP"}
          </button>
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>3. Importar historial de cotizaciones</h2>
        <p style={helpStyle}>El historial queda como referencia comercial; nunca reemplaza el snapshot y la política actuales.</p>
        <input type="file" accept=".csv,.xlsx,.xls" onChange={(event) => setHistoryFile(event.target.files?.[0] ?? null)} />
        <div style={{ marginTop: 14 }}>
          <button onClick={() => upload("/api/import/history", historyFile)} disabled={!historyFile || !token || busy} style={buttonStyle}>
            {busy ? "Procesando…" : "Importar historial"}
          </button>
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>4. Aprobaciones pendientes</h2>
        {approvals.length === 0 ? (
          <p style={helpStyle}>No hay aprobaciones cargadas en esta vista.</p>
        ) : approvals.map((approval) => (
          <div key={approval.id} style={{ borderTop: "1px solid #e5e7eb", padding: "14px 0" }}>
            <div><strong>{approval.quote_id}</strong></div>
            <div style={helpStyle}>{(approval.reasons ?? []).join(", ")}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button disabled={busy} onClick={() => decide(approval.id, "approved")} style={buttonStyle}>Aprobar y enviar localmente</button>
              <button disabled={busy} onClick={() => decide(approval.id, "rejected")} style={buttonStyle}>Rechazar ajuste</button>
            </div>
          </div>
        ))}
      </section>

      {result && <pre style={preStyle}>{JSON.stringify(result, null, 2)}</pre>}

      <p style={{ fontSize: 13, color: "#6b7280", marginTop: 24 }}>
        PoC únicamente. No modifica SAP, no envía WhatsApp real y no demuestra producción. Gemini interpreta lenguaje; precios, descuentos, margen, IGV, FX y totales siguen bajo código determinístico.
      </p>
    </main>
  );
}

const cardStyle = { background: "white", border: "1px solid #e2e5e9", borderRadius: 14, padding: 24, marginTop: 22 } as const;
const inputStyle = { display: "block", width: "100%", padding: 10, marginTop: 6, boxSizing: "border-box" } as const;
const buttonStyle = { padding: "10px 16px", border: "1px solid #cfd4da", borderRadius: 8, cursor: "pointer", background: "#f8fafc" } as const;
const preStyle = { whiteSpace: "pre-wrap", background: "#111827", color: "#f9fafb", borderRadius: 12, padding: 18, overflow: "auto", marginTop: 16 } as const;
const helpStyle = { color: "#5d636b", fontSize: 14 } as const;
