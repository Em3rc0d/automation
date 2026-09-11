# Automation Operations Platform

Plataforma multiempresa para operar automatizaciones de Pymes, observar sus datos operativos y demostrar el valor económico generado.

## Tesis

No estamos construyendo un “Zapier peruano”, otro n8n ni un workflow builder para clientes.

**Nosotros configuramos, operamos, observamos y reparamos las automatizaciones. El cliente ve sus datos, procesos, pendientes, salud y ahorro estimado.**

## Superficies

- **Operator Console**: tenants, automation instances, templates, connectors, runs, incidents, approvals, métricas, costos y ahorro.
- **Client Portal**: procesos, datos, actividad, estado, pendientes y Savings Engine.
- **Automation Runtime**: n8n inicialmente, más workers propios donde corresponda.
- **Control Plane**: PostgreSQL/Supabase como fuente de verdad.

## Estructura de conocimiento

- `brainstorming/` — problema, tesis, ICP, alcance y no-alcance.
- `design/` — superficies, UX, roles y journeys.
- `architecture/` — arquitectura, contratos, datos, conectores y runtime.
- `decisions/` — ADRs y decisiones congeladas.
- `mining-site/` — índice general de investigación, fuentes y provenance.
- `quarries/` — extracción temática: OSS, n8n templates, AI/OCR, conectores, seguridad, mercado.
- `security/` — tenancy, secretos, threat model y production readiness.
- `commercial/` — catálogo, ICP, pricing hipótesis y discovery comercial.
- `workflows/` — taxonomía y especificaciones de automatizaciones reutilizables.
- `mk0/` — cierre documental y arquitectónico antes de build.
- `mk1/` — primer producto operable con un cliente piloto.

## Principio de ejecución

Cada MK tiene Definition of Done. No se abre el siguiente mientras existan decisiones críticas sin cerrar.

### MK0

Debe cerrar producto, non-goals, tenancy, modelo de datos, contratos de ejecución/eventos, secrets, Savings Engine, roles/permisos, arquitectura, seguridad mínima, licencias y DoD de MK1.

### MK1

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
- n8n self-hosted como motor inicial
- Node.js workers para lógica no apropiada para n8n
- OpenAI API solo donde aporte
- Vercel + Railway/VPS administrado
- Zod/OpenAPI para contratos
- Vitest + Playwright

> n8n es un candidato, no la fuente de verdad del producto. Su Sustainable Use License se mantiene como gate comercial y legal.

## Estado

`RESEARCH → MK0`

La investigación inicial de OSS, n8n templates, AI/OCR, conectores, seguridad, tenancy y Savings Engine está siendo materializada en `mining-site/` y `quarries/` con fuentes y restricciones de licencia.
