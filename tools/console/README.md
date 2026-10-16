# Operator Console · MK1 local

Primera plataforma **interactiva** de Automation para operadores. Se apoya en el catálogo real
de Savings Workflows y en el instalador de baselines aprobados; no inventa
automatizaciones operativas.

## Ejecutar

```bash
python3 tools/console/server.py
# Abrir http://127.0.0.1:8765
```

Sin pip, npm, n8n, Railway ni Supabase. Solo Python 3.10+.

Para utilizar otra raíz de instalaciones locales:

```bash
python3 tools/console/server.py --installations-root .local/installations --port 8765
```

## Qué funciona

1. **Resumen** de tenants e instalaciones locales, sin métricas inventadas.
2. **Biblioteca** conectada a `workflows/SAVINGS-WORKFLOW-REGISTRY.json`; distingue
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
