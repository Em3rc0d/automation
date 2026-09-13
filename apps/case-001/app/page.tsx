"use client";

import { useState } from "react";

export default function Home() {
  const [token, setToken] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function upload() {
    if (!file || !token) return;
    setBusy(true);
    setResult("");
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/import/sap", {
        method: "POST",
        headers: { "x-admin-token": token },
        body: form,
      });
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch {
      setResult("No se pudo completar la carga.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: "48px auto", padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>Asistente de Cotizaciones · Piloto</h1>
      <p style={{ color: "#5d636b", marginTop: 0 }}>
        Superficie privada para actualizar el snapshot exportado desde SAP. La operación diaria continúa por WhatsApp.
      </p>

      <section style={{ background: "white", border: "1px solid #e2e5e9", borderRadius: 14, padding: 24, marginTop: 28 }}>
        <h2 style={{ marginTop: 0 }}>Actualizar información SAP</h2>
        <label style={{ display: "block", marginBottom: 14 }}>
          Clave privada del piloto
          <input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            style={{ display: "block", width: "100%", padding: 10, marginTop: 6, boxSizing: "border-box" }}
          />
        </label>
        <label style={{ display: "block", marginBottom: 18 }}>
          Archivo CSV/XLSX de SAP
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            style={{ display: "block", marginTop: 8 }}
          />
        </label>
        <button
          onClick={upload}
          disabled={!file || !token || busy}
          style={{ padding: "10px 16px", border: 0, borderRadius: 8, cursor: "pointer" }}
        >
          {busy ? "Procesando…" : "Subir y validar"}
        </button>
      </section>

      {result && (
        <pre style={{ whiteSpace: "pre-wrap", background: "#111827", color: "#f9fafb", borderRadius: 12, padding: 18, overflow: "auto" }}>
          {result}
        </pre>
      )}

      <p style={{ fontSize: 13, color: "#6b7280", marginTop: 24 }}>
        El archivo solo se usa para crear un snapshot de apoyo a cotizaciones. Esta V1 no modifica SAP.
      </p>
    </main>
  );
}
