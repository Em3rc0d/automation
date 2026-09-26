# MYPE Pilot Presets

Status: **OPERATOR STARTING POINTS / NOT CLIENT-ACCEPTED**

These presets compose already approved W-SAVINGS-P0 workflows into common MYPE starting points.

They are deliberately **not** products that skip discovery. A preset only supplies:

- a shortlist of APPROVED_BASELINE workflows;
- a candidate Google Workspace provider mapping;
- a reusable starting topology.

It does not supply:

- client volume;
- manual minutes;
- loaded hourly cost;
- agreed SavingsBaseline;
- credentials;
- provider verification;
- client approval.

## Available presets

- `service-company-google` — Servicios profesionales / agencia: Captura, seguimiento comercial, cotizaciones, cobranza e inbox básico sobre Google Workspace.
- `workshop-google` — Taller / servicio técnico: Prospectos, recordatorios de citas, seguimiento, cobranza, stock y soporte.
- `academy-google` — Academia / capacitación: Captura y seguimiento de interesados, citas, mensajes pendientes, cobranza y renovaciones.
- `backoffice-google` — Backoffice documental: Clasificación de correo, extracción de adjuntos, archivo y soporte operativo.
- `membership-google` — Membresías / contratos recurrentes: Renovaciones, cobranza, soporte y vigilancia de mensajes sin responder.
- `inventory-service-google` — Operación con inventario ligero: Alertas de stock, atención, seguimiento comercial y cobranza para una MYPE con inventario simple.

## Generate a discovery spec

```bash
python tools/savings/pilot_bootstrap.py from-preset \
  --preset workshop-google \
  --tenant taller-demo \
  --out .local/taller-demo-pilot.json
```

Then add measured discovery fields to each workflow:

```json
{
  "monthlyUnits": 120,
  "manualMinutesPerUnit": 4,
  "estimatedHumanMinutesAfterAutomation": 0.5,
  "loadedHourlyCost": 18,
  "baselineMethod": "time_study",
  "baselineSampleSize": 20,
  "confidence": "medium"
}
```

Finally:

```bash
python tools/savings/pilot_bootstrap.py plan --spec .local/taller-demo-pilot.json
python tools/savings/pilot_bootstrap.py scaffold --spec .local/taller-demo-pilot.json
```

Presets reduce setup work; they never replace process discovery or evidence gates.
