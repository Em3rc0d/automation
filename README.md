# Automation Operations Platform

Plataforma multiempresa para operar automatizaciones de Pymes, observar sus datos operativos y demostrar el valor económico generado.

## Tesis

No estamos construyendo un “Zapier peruano”, otro n8n ni un workflow builder para clientes.

**Nosotros configuramos, operamos, observamos y reparamos las automatizaciones. El cliente ve sus datos, procesos, pendientes, salud y ahorro estimado.**

## Invariante económico

Mientras no exista un piloto/cliente pagador que financie producción, el objetivo de costo fijo productivo es **aproximadamente S/0**.

- desarrollo/demos: local + fixtures + mocks;
- no runtime persistente dedicado por cliente;
- producción: control plane y ejecución compartidos/multi-tenant;
- costos externos variables: client-owned cuando sea práctico o medidos/separados contractualmente;
- infraestructura dedicada solo por excepción justificada.

Ver `decisions/ADR-0007-PRE-REVENUE-ZERO-FIXED-COST.md`.


## Superficies

- **Operator Console**: tenants, automation instances, templates, connectors, runs, incidents, approvals, métricas, costos y ahorro.
- **Client Portal**: procesos, datos, actividad, estado, pendientes y Savings Engine.
- **Automation Runtime**: runtime compartido e intercambiable seleccionado por carga/costo; n8n queda como herramienta local/factory y opción de ejecución cuando se justifique.
- **Control Plane**: PostgreSQL/Supabase como fuente de verdad.

## Estructura de conocimiento

- `brainstorming/` — problema, tesis, ICP, alcance y no-alcance.
- `design/` — superficies, UX, roles y journeys.
- `architecture/` — arquitectura, contratos, datos, conectores y runtime; `SAVINGS-WORKFLOW-DOMAIN.md` modela la instalación customer-facing frente a sus AutomationInstances técnicos.
- `decisions/` — ADRs y decisiones congeladas.
- `mining-site/` — índice general de investigación, fuentes y provenance.
- `quarries/` — extracción temática: OSS, n8n templates, AI/OCR, conectores, seguridad y mercado.
- `quarries/workflow-quarry/` — línea de producción de workflows externos/internos: discovery, licencia, inspección, hardening, pruebas y aprobación.
- `security/` — tenancy, secretos, threat model y production readiness.
- `licensing/` — matriz de reutilización comercial y restricciones.
- `commercial/` — catálogo, ICP, discovery y pricing hipótesis.
- `docs/` — onboarding, testing y readiness operativo.
- `workflows/` — capacidades, reductores de trabajo activo y catálogo de Savings Workflows instalables.
  - `SAVINGS-WORKFLOW-CATALOG.md` — catálogo amplio de workflows que reducen trabajo humano repetitivo.
  - `SAVINGS-WORKFLOW-REGISTRY.json` — registro machine-readable.
  - `ACTIVE-WORK-REDUCERS.md` — patrones internos de reducción de trabajo activo.
  - `SAVINGS-WORKFLOW-STANDARD.md` — contrato económico/técnico y estados de certificación.
- `workflows/n8n/` — biblioteca reservada para baselines n8n que ya pasaron todo el quarry.
- `certification/` — criterios, cobertura y certificados por snapshot.
- `mk0/` — cierre documental y arquitectónico antes de build.
- `mk1/` — primer producto operable con un cliente piloto.
- `runtime/` — implementaciones/runtime profiles; `runtime/savings-p0/` prueba ejecución local sin infraestructura pagada.
- `w-savings-p0/` — wave de 12 Savings Workflows baratos/transversales; 12/12 tienen referencia ejecutable sobre el runtime certificado `zero-deps-node-v1`.

## Workflow Quarry

Miles de workflows externos pueden usarse como corpus de búsqueda, pero no se consideran confiables automáticamente.

Pipeline obligatorio:

```text
DISCOVERED
→ LICENSE_CHECKED
→ INSPECTED
→ HARDENED
→ TESTED
→ APPROVED_BASELINE
```

Nada descubierto se elimina por fallar un gate: se conserva con provenance y motivo bajo `no-pass-verified/`. Los duplicados conservan todas sus fuentes; el fingerprint semántico solo evita revisar técnicamente el mismo flujo muchas veces.

El raw corpus masivo puede descargarse a `quarries/workflow-quarry/.external-cache/` para minería local. Esa carpeta está fuera de Git por defecto. El repo conserva provenance, hashes, licencia, findings, hardening, tests y únicamente redistribuye/adapta artifacts cuando los derechos lo permiten.

Los baselines aprobados se promueven a `workflows/n8n/` y siguen necesitando configuración + acceptance test por cliente.

## Biblioteca de capacidades PyME

`workflows/SMB-CAPABILITY-LIBRARY.md` cubre actualmente 20 familias comunes: ventas/CRM, citas, quote-to-cash, AR/cobranzas, AP/documentos, gastos, procurement, inventario/ecommerce, soporte/SLA, onboarding de clientes, HR, inbox/mensajería, documentos/knowledge, feedback/retención, reporting/KPI/savings, approvals/HITL, sync/master data, IT/access, work orders/service ops y marketing/admin.

La biblioteca expresa capacidades reutilizables; `workflows/CONNECTOR-MATRIX.md` desacopla esas capacidades de proveedores concretos.

## Principio de ejecución

Cada MK tiene Definition of Done. No se abre el siguiente mientras existan decisiones críticas sin cerrar.

### MK0 — CLOSED

Producto, non-goals, tenancy, modelo de dominio, contratos, secrets/OAuth, Savings Engine, roles/permisos, arquitectura, seguridad, licencias, workflow quarry y DoD de MK1 están cerrados a nivel conocimiento/diseño.

Evidencia: `mk0/CLOSURE-LEDGER.md`.

### MK1 — NOT CERTIFIED / implementation stage

Termina cuando podemos:

1. Crear un tenant/cliente.
2. Conectar al menos un sistema real.
3. Configurar dos automatizaciones.
4. Ejecutarlas.
5. Registrar runs, errores e incidentes.
6. Mostrar al cliente los `ProcessRecord` relevantes.
7. Mostrar ahorro estimado con baseline y confidence.
8. Operar/reparar desde Operator Console sin tocar datos directamente en producción.

## Non-goals MK1

- workflow builder para clientes
- marketplace
- billing complejo
- app móvil
- ERP
- microservicios
- Kubernetes/Kafka
- multi-region
- generic AI agent
- BI builder
- white-label de n8n

## Stack candidato MK1

- TypeScript
- Next.js
- PostgreSQL / Supabase
- Supabase Auth + RLS
- runtime de ejecución compartido e intercambiable; selección por perfil `function` / `scheduled` / `durable` / `human_loop` / `heavy`
- n8n permitido para diseño local, factory y casos productivos seleccionados **solo bajo un modelo comercial/licenciamiento compatible**
- Node.js workers para lógica no apropiada para n8n
- OpenAI API solo donde aporte
- hosting/runtime productivo se elige al activar un piloto pagado; Vercel/Railway/VPS son opciones, no costo pre-revenue obligatorio
- Zod/OpenAPI para contratos
- Vitest + Playwright

> n8n es un candidato, no la fuente de verdad del producto. Su licencia/commercial deployment permanece como gate explícito en `licensing/LICENSE-MATRIX.md`.

## Certificación

La certificación es por snapshot y separa tres niveles:

```text
K0 — KNOWLEDGE_ARCHITECTURE_CERTIFIED
W1 — BASELINE_LIBRARY_CERTIFIED
P1 — PILOT_PRODUCT_CERTIFIED
```

`K0 != W1 != P1`.

El repositorio tiene CI en `.github/workflows/repository-certification.yml` para validar invariantes estructurales/documentales. Los criterios exactos están en `certification/CRITERIA.md`.

## Estado

```text
K0 KNOWLEDGE / ARCHITECTURE     CLOSED
WORKFLOW QUARRY                 CONTINUOUS
W1 APPROVED BASELINE LIBRARY    NOT YET CERTIFIED
W-SAVINGS-P0 REFERENCE WAVE     12/12 EXECUTABLE REFERENCES
P1 PILOT PRODUCT                NOT YET CERTIFIED
```

No se presenta W1/P1 como terminado hasta existir evidencia real de workflow tests, conectores, tenant isolation, runtime, restore/rollback e incident drill.

## Savings Workflow Catalog

El repositorio mantiene un catálogo amplio de Savings Workflows de nivel solución. Estos no aumentan artificialmente el conteo de CAPABILITY: son composiciones customer-facing de capacidades/reductores existentes.

Actualmente `workflows/savings/` contiene **233 materialized DESIGN_READY package skeletons** en 21 dominios. Cada paquete trae manifest, config/input/output contracts, fixtures, test plan, SavingsBaseline, flow plan y runbook. Ver `workflows/savings/INDEX.md`.

Estado inicial del catálogo: **DESIGN_READY**. `DESIGN_READY != TESTED != APPROVED_BASELINE`.

Los **12/12 workflows de W-SAVINGS-P0** ya tienen referencias ejecutables bajo `runtime/savings-p0/`. `zero-deps-node-v1` está **FACTORY-CERTIFIED** con Node 20.19.5, 44/44 tests y evidence SHA `8475fcd95817098c59cd1088b543e4881bd3fe38`. Los workflows siguen `readyForProduction: false` hasta pasar sus gates individuales HARDENED → TESTED → APPROVED_BASELINE.


## W-SAVINGS-P0 baseline library

Los 12 workflows de la primera ola de costo casi cero ya alcanzaron `APPROVED_BASELINE` sobre `zero-deps-node-v1`.

Cada baseline aprobado conserva un registro inmutable en `workflows/approved/savings/` apuntando al snapshot TESTED y a su evidencia CI exacta. Esto **no** salta el gate del cliente: conectores reales, permisos, baseline acordado, fixtures del tenant y aceptación siguen siendo obligatorios.


## Zero-cost installation kit

Los 12 `APPROVED_BASELINE` se pueden convertir en bundles locales de instalación sin provisionar infraestructura:

```bash
python tools/savings/install_approved.py list
python tools/savings/install_approved.py scaffold \
  --workflow PAYMENT_REMINDER_AUTOMATION \
  --tenant acme-demo
python tools/savings/install_approved.py doctor \
  --bundle .local/installations/acme-demo/PAYMENT_REMINDER_AUTOMATION@0.1
```

El bundle separa `config`, connector bindings por `credref:`, SavingsBaseline y acceptance gates. `CLIENT_CONFIGURED` y `CLIENT_ACCEPTED` son bloqueados hasta completar sus requisitos; el installer no levanta Railway/n8n/servidores por cliente.


### Ejecutar un baseline aprobado sin infraestructura

El installation kit también puede ejecutar localmente los 12 baselines aprobados con fixtures del cliente y adapters en memoria:

```bash
node operations/savings/runtime/run_bundle.mjs \
  --bundle .local/installations/acme-demo/PAYMENT_REMINDER_AUTOMATION@0.1 \
  --fixture operations/savings/runtime/examples/payment-reminder.fixture.json
```

Esto ejecuta el mismo código `zero-deps-node-v1`, produce ProcessRecords/Incidents/SavingsEvents y mantiene `productionEvidence=false`: sirve para validar el caso antes de contratar o conectar proveedores reales.


### Google Workspace connector pack

Para clientes que ya operan sobre Google Workspace, `connectors/savings/google-workspace/` ofrece adapters provider-facing para Sheets, Gmail, Calendar y Drive sin añadir dependencias npm ni un servidor dedicado por cliente. El runtime aprobado sigue provider-neutral; credenciales reales viven fuera del bundle mediante `credref:`.

El pack está en estado **PRODUCTION_CANDIDATE**, no implica `CLIENT_ACCEPTED` hasta probar scopes, fixture y dry-run con la cuenta real del tenant.


### De fixture local a conector real

El flujo operativo ya separa explícitamente tres pasos:

```text
LOCAL_SIMULATION
→ BOUND connector
→ LIVE_CONNECTOR_HEALTHCHECK / verified
→ CLIENT_CONFIGURED
→ LIVE_PROVIDER_EXECUTION
→ revisión humana
→ CLIENT_ACCEPTED
```

`verify_connectors.mjs` valida scopes/conectividad sin fingir que un simple bind está verificado. `run_live.mjs` requiere confirmación explícita de side effects y persiste idempotencia/auditoría en archivos locales, evitando introducir una base de datos o servidor dedicado antes de que el ingreso lo justifique.


### Ejecución programada sin servidor dedicado

Para un piloto pagado que ya tenga una máquina Linux/VM/PC operativo, los workflows programados pueden generar un wrapper + crontab local con `tools/savings/deploy_local.py`. Los workflows event-driven disponen de un spool de archivos con `run_event_spool.mjs`.

La decisión sigue siendo económica: **no se aprovisiona Railway/n8n/servidor por cliente por defecto**. El runtime local usa el mismo código aprobado, idempotencia persistente y audit trail; si luego el volumen/ingreso justifica un runtime compartido administrado, se cambia el deployment, no el workflow de negocio.
