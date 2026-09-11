# Product Surfaces

## 1. Operator Console

Uso exclusivo del equipo operador.

### Overview
- clientes/tenants;
- automatizaciones activas, degradadas y pausadas;
- runs 24h/7d/30d;
- success rate;
- incidentes abiertos;
- approvals pendientes;
- costo variable;
- salud de conectores.

### Cliente interno
Ruta conceptual: `/ops/clients/:tenant`

Tabs:
- Overview
- Automations
- Data
- Connectors
- Savings
- Incidents
- Audit

### Automation detail
Debe mostrar:
- template + versión;
- instancia cliente;
- engine;
- configuración;
- conectores requeridos;
- última ejecución;
- tasa de éxito;
- errores recientes;
- baseline de ahorro;
- acciones: pause, resume, healthcheck, technical details.

## 2. Client Portal

El cliente no ve nodos, prompts internos, webhook URLs ni secretos.

Tabs iniciales:
- Resumen
- Procesos
- Datos
- Ahorro
- Pendientes

### Resumen
- procesos automatizados;
- horas liberadas;
- valor estimado de capacidad;
- costo variable;
- valor operativo neto estimado;
- automatizaciones operativas/degradadas;
- actividad reciente;
- pendientes.

### Datos
Mostrar solo información de los procesos automatizados, no intentar ser un ERP o data warehouse universal.

Ejemplos:
- leads;
- cotizaciones;
- facturas;
- citas;
- tickets;
- documentos procesados.

## 3. Principio UX

**Cliente compra resultado y transparencia, no complejidad técnica.**

Cliente ve:
`Lead Follow-up presenta una incidencia. Última ejecución correcta: 10:42.`

Operador ve:
`HTTP 401 HubSpot · connector_id=... · token refresh failed · trace_id=...`

## 4. Roles iniciales

### Operator
- acceso cross-tenant mediante backend privilegiado y auditado;
- configura, pausa/reanuda, revisa incidentes y conectores.

### Client Admin
- ve datos del tenant;
- ve ahorro;
- gestiona miembros del tenant en una fase posterior;
- decide approvals cuando corresponda.

### Client Viewer
- solo lectura.

MK1 puede comenzar con `operator` y `client_admin` si reducir roles acelera el cierre.
