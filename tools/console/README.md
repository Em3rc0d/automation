# Operator Console · MK1 local

Primera plataforma **interactiva** de Automation para operadores. Se apoya en el catálogo real
de Savings Workflows y en el instalador de baselines aprobados; no inventa
automatizaciones operativas.

## Ejecutar

```bash
python3 tools/console/server.py
# Abrir http://127.0.0.1:8765
```

Sin pip, npm, n8n, Railway ni Supabase. Python 3.10+ para la consola y demo; Node.js 20+ solo para simulaciones del runtime aprobado.

## Seed automático del catálogo (nuevo)

Al **levantar el servidor**, antes de atender peticiones, Automation sincroniza
**todas las entradas** del registro `workflows/SAVINGS-WORKFLOW-REGISTRY.json`
en una base SQLite local (por defecto: `.local/console/catalog.sqlite3`).

- Estado actual del registro: **233** automatizaciones; **12 APPROVED_BASELINE**
  instalables y **221 DESIGN_READY** visibles como propuestas.
- La biblioteca muestra **todas las etapas** por defecto, con filtros por etapa
  y búsqueda; se alimenta de SQLite sembrada, no directamente del JSON.
- Es **idempotente**: reiniciar no duplica filas. Cambios de nombre, versión o
  etapa se actualizan desde el registro; entradas retiradas quedan archivadas
  con `source_present=0` y no se muestran ni instalan.
- El seed es transaccional. Si la fuente está corrupta o no cumple los
  contratos, falla el inicio en vez de presentar un catálogo inconsistente.
- Seed de **templates** ≠ instalación al cliente: el comando nunca crea
  un tenant, cambia un bundle existente, configura un proveedor, activa
  una automatización ni modifica el estado de certificación.

Se puede ejecutar manualmente sin levantar la consola:

```bash
python3 tools/console/catalog_seed.py
```

Salida JSON incluye conteo de insertadas, actualizadas y sin cambios, además
del hash SHA-256 de la fuente. Para entornos de prueba:

```bash
python3 tools/console/server.py --catalog-db .local/console/catalog.sqlite3
```

La fuente oficial sigue siendo el archivo del repositorio y su lifecycle
(APPROVED_BASELINE / DESIGN_READY), no la copia SQLite.


Para utilizar otra raíz de instalaciones locales:

```bash
python3 tools/console/server.py --installations-root .local/installations --port 8765
```

## Demo funcional: Chifa AV Perú (sin Node, sin proveedores)

**No es una maqueta de solo lectura.** Desde el menú **Demo Chifa AV Perú**:
- Registrar un pedido de prueba (`PENDING`) en SQLite.
- Confirmarlo y descontar stock dentro de una transacción.
- Generar una alerta cuando el stock cruza su umbral mínimo.
- Generar una notificación en **bandeja simulada** (sin WhatsApp, SMTP ni otro servicio).
- Crear tickets y consultar un historial persistente de eventos.
- Reiniciar solo el escenario ficticio desde la UI para repetir la prueba.

### Pedidos con múltiples ítems

Un pedido posee una **cabecera única** (cliente, estado, total) y **una o
más líneas** con SKU, cantidad, precio unitario al momento de crear el
pedido y subtotal. Desde el navegador, selecciona productos, agrégalos
al carrito, modifica cantidades o quita líneas; el total se calcula
automáticamente. El servidor valida todas las líneas y determina precios
desde el menú, no desde valores enviados por el navegador.

**Prueba sugerida**: agrega **Wantán × 4**, **Aeropuerto × 4** y
**Gaseosa × 2** al mismo pedido. Antes de confirmar, revisa una sola
orden pendiente por **S/ 154.00**, con **3 líneas**. Al confirmar:

- Wantán: 5 → 1 (alerta por mínimo 2).
- Aeropuerto: 6 → 2 (alerta por mínimo 2).
- Gaseosa: 9 → 7 (sin alerta).
- Se registran 3 movimientos de inventario, 2 alertas y un único
  `ORDER_CONFIRMED` con una notificación simulada.

Si un producto está sin stock, **ninguno de los ítems del pedido se
descuenta**: el pedido sigue pendiente hasta resolver el bloqueo.
Una segunda confirmación del mismo pedido tampoco descuenta dos veces.

La API principal es `POST /api/demo/orders`:

```json
{
  "customerAlias": "Mesa 3 (demo)",
  "items": [
    {"sku": "WANTAN", "quantity": 4},
    {"sku": "AEROPUERTO", "quantity": 4},
    {"sku": "GASEOSA", "quantity": 2}
  ]
}
```

Se mantiene compatibilidad temporal con solicitudes antiguas
`{"sku":"WANTAN","quantity":4}` para no romper pruebas previas.
El inventario ficticio actualmente representa **productos terminados**
(platillos/bebidas), no recetas ni consumo de ingredientes; para una
cocina productiva habrá que registrar insumos y recetas (BOM).

La base está en `.local/console/restaurant-demo.sqlite3`, ignorada por Git.
Los datos son **100 % sintéticos**, no ventas reales del Chifa AV Perú.
Se trata de un **motor demo local** aparte de los 12 workflows
`zero-deps-node-v1` certificados. Su funcionamiento no implica que las
233 referencias del catálogo estén ejecutándose ni permite cambiar estados
de aceptación sin evidencia.

### Diagnóstico Windows / Node

La app de pedidos, inventario y tickets funciona con **Python 3.10+**,
aunque Node esté ausente. Las 12 simulaciones con runtime certificado sí
requieren **Node.js 20+**. Se corrigió el subprocess para preservar variables
imprescindibles de Windows y decodificar salida UTF-8.

Abre PowerShell en la raíz:

```powershell
node --version
python3 tools/console/server.py
```

La salida mostrará `LOCAL_SIMULATION: X/Y PASS, ... skipped ... Reason: ...`.
Si Node no está instalado se mostrará `NODE_NOT_FOUND`; la consola sigue
funcionando. Para omitir las 12 simulaciones al inicio (pero conservar la demo):

```powershell
python3 tools/console/server.py --skip-startup-simulations
```

Hay CI en `ubuntu-latest` y `windows-latest` para detectar discrepancias
de rutas, conexiones SQLite y subprocess.
## Espacio de AV Perú: catálogo completo + simulaciones

Por defecto, ejecutar `python3 tools/console/server.py` realiza lo siguiente
**antes de empezar a escuchar peticiones HTTP**:

1. Actualiza el seed SQLite con las **233** entradas del registro canónico.
2. Asocia las **233** referencias al tenant local `chifaavperu`, sin
   confundir el catálogo con instalaciones operativas.
3. Crea un bundle **DRAFT** para cada uno de los **12 APPROVED_BASELINE**
   que todavía no esté instalado. Si ya existe (por ejemplo, `Support Intake`
   o `Document Archive`), conserva exactamente su configuración.
4. Conserva los **221 DESIGN_READY** como `DESIGN_ONLY`: planificación
   visible sin instalación ni código ejecutable aprobado.
5. Ejecuta automáticamente las **12 simulaciones locales** con el runner
   aprobado `operations/savings/runtime/run_bundle.mjs` y fixtures sintéticas.
   Conserva resúmenes de las pruebas bajo `.local/console/simulations/`.
6. Muestra resultados `LOCAL_SIMULATION` en Resumen, configuración de
   automatización y plan del cliente. Ninguna prueba contacta proveedores.

Requiere **Python 3.10+ y Node.js 20+** para las simulaciones.
Los elementos en `DESIGN_READY` nunca reciben etiqueta de funcionamiento.

Comandos opcionales:

```bash
python3 tools/console/tenant_seed.py --tenant chifaavperu
python3 tools/console/server.py --seed-tenant chifaavperu
python3 tools/console/server.py --skip-startup-simulations
python3 tools/console/server.py --no-tenant-seed
```

**Importante**: `SIMULATION_PASS` solo demuestra que el workflow ejecutó
código aprobado con datos ficticios y adaptadores en memoria.
**No demuestra que esté funcionando en el negocio real de AV Perú**.
Para eso necesitamos los proveedores reales, sus autorizaciones,
el esquema de sus procesos, una baseline acordada y pruebas end-to-end.
Está prohibido promover automáticamente `DRAFT` a `CLIENT_CONFIGURED` o
`CLIENT_ACCEPTED` a partir del seed o de estas simulaciones.

El plan del cliente enseña 233 entradas: 12 con bundles y 221 por desarrollar;
la tabla de instalaciones reales sigue mostrando únicamente los bundles.
## Qué funciona

1. **Resumen** de tenants e instalaciones locales, sin métricas inventadas.
2. **Biblioteca** precargada mediante seed SQLite desde `workflows/SAVINGS-WORKFLOW-REGISTRY.json`; distingue
   DESIGN_READY de APPROVED_BASELINE y solo permite instalar los aprobados.
3. **Nueva instalación**: reutiliza `tools/savings/install_approved.py`; genera
   el bundle DRAFT bajo `.local/installations/<tenant>/`.
4. **Editor**: lee `config.schema.json` exacto; genera campos y valida los
   tipos, límites, arrays y propiedades del esquema del paquete.
5. **Persistencia**: `config.json` se escribe atómicamente; un hash impide
   sobreescribir inadvertidamente cambios de otra sesión.
6. **Gate visible**: llama `diagnose()` real; muestra bloqueos de conectores,
   baseline y aceptación, sin modificar evidencias ni aprobaciones.
7. **Vista cliente**: proyección local sin ahorros ni ejecuciones ficticios.

## Pruebas

```bash
python3 -m unittest discover -s tools/console/tests -p 'test_*.py' -v
node --check tools/console/static/app.js
```

## Límites de seguridad y alcance

- El servidor escucha solo en `127.0.0.1`. Valida Host/Origin y exige un
  token de sesión local en escrituras. No exponer por proxies ni túneles.
- No implementa **autenticación real de usuarios, RLS, OAuth, permisos
  de operador ni aislamiento de tenants de producción**. La separación
  por carpetas locales no es un control de seguridad multiempresa.
- No permite crear credenciales ni falsear pruebas de conectores.
  Su estado se presenta sin exponer referencias ni tokens.
- `enabled=true` en config NO ACTIVA un workflow. Los bundles permanecen DRAFT.
- No existen endpoints para ejecutar proveedores, publicar, lanzar n8n o desplegar.
- No reemplaza `mk1_gate`, la aceptación del cliente, ni la estrategia de backups.
- Para alojar la plataforma real faltarán Auth/RLS, control plane, auditoría,
  historial de ejecuciones, conectores productivos y pruebas E2E.

## Principio de producto

`APPROVED_BASELINE` significa aprobado para **instalar y configurar**;
no significa activo para un cliente. Este prototipo preserva el
objetivo de costo fijo S/0 antes de conseguir ingresos (ADR-0007).
