# Product Thesis

## Problema

Las Pymes operan gran parte de su trabajo alrededor de correo, WhatsApp, formularios, hojas de cálculo, Drive, CRMs y tareas manuales. El problema comercial no es “falta de IA”; es trabajo repetitivo, pérdida de seguimiento, errores, baja visibilidad y tiempo administrativo.

## Propuesta

Construir una **Automation Operations Platform** multiempresa.

Nosotros:

- descubrimos y modelamos procesos;
- configuramos automatizaciones;
- conectamos sistemas;
- monitoreamos ejecuciones;
- resolvemos incidentes;
- medimos valor operativo.

El cliente:

- ve sus datos operativos;
- ve qué procesos están automatizados;
- ve salud/estado;
- ve pendientes y aprobaciones;
- ve horas liberadas y valor estimado.

## Diferenciador

No vendemos “nodos” ni “workflows”. Vendemos resultados operativos medibles.

La plataforma debe ocultar la complejidad técnica y hacer visible:

1. qué ocurrió;
2. qué requiere atención;
3. qué automatización intervino;
4. qué valor produjo;
5. qué supuestos sustentan ese valor.

## Ofertas iniciales

### LeadFlow
Lead → registro → CRM → asignación → WhatsApp/email → follow-up → resultado.

### Quote2Cash
Interés → cotización → envío → seguimiento → aceptación → factura → cobro → recordatorios.

### OpsFlow
Email/documento → clasificación → extracción → registro → tarea/acción → archivo → telemetría.

## ICP inicial

Empresa de servicios pequeña/mediana que:

- recibe clientes por WhatsApp/email/web;
- usa Excel/Sheets o tareas manuales;
- tiene procesos repetitivos;
- puede medir volumen y tiempo manual;
- tiene suficiente dolor para pagar setup + mantenimiento.

Verticales prioritarios a validar: agencias/consultoras, talleres y servicios técnicos, academias, inmobiliarias, estudios contables, distribuidoras pequeñas y otros servicios B2B.

## Principio comercial

Primero discovery y baseline; después automatización.

`DISCOVER → MAP → MEASURE → SIMPLIFY → DESIGN → AUTOMATE → OBSERVE → IMPROVE`

No automatizar un proceso roto sin comprenderlo.

## Estrategia de crecimiento

`Servicios → automatizaciones reutilizables → templates → paquetes verticales → MRR → producto/SaaS`

La agencia/servicio es el laboratorio que financia y valida la plataforma.

## Restricción económica

La plataforma debe ser barata para la PyME y rentable para nosotros. Antes de ingreso/piloto pagado, el objetivo de costo fijo productivo es aproximadamente S/0.

Principios:
- no financiar infraestructura persistente para un cliente inexistente;
- un nuevo tenant agrega configuración y consumo, no un nuevo servidor;
- proveedores/API/AI/OCR se usan client-owned cuando sea práctico o se miden y separan contractualmente;
- infraestructura dedicada es una excepción comercial/técnica, no el default;
- el piloto pagado activa únicamente la infraestructura mínima requerida.

## Savings Workflows

La unidad comercial instalable es el **Savings Workflow**: un proceso completo que reduce trabajo humano repetitivo y tiene una unidad medible del Savings Engine. Capabilities, adapters y reducers son building blocks internos; no se venden como ahorro independiente cuando forman parte del mismo proceso manual.

Ver `workflows/SAVINGS-WORKFLOW-STANDARD.md` y `workflows/SAVINGS-WORKFLOW-CATALOG.md`.
