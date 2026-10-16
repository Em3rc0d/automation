# Client Unit Economics (preflight, cero dependencias)

Calcula la **capacidad liberada estimada del cliente** y el **margen mensual del operador** antes de ofrecer una automatización. Complementa (no reemplaza) el Savings Engine y los gates de MK1; no abre conectores, no lee credenciales, no modifica workflows y no certifica ahorros reales.

```sh
node tools/economics/client-unit-economics.mjs tools/economics/scenario.example.json
node --test tools/economics/tests/*.test.mjs
```

## Interpretación

- `VIABLE_SCENARIO`: satisface los supuestos económicos introducidos, **no** es autorización de producción.
- `REVIEW`: revisar los `reasons`; exit code 2 (útil para gates comerciales).
- `providerMonthlyCostPen`: consumo, asignación fija, soporte y otros costos estimados.
- `clientEstimatedCapacityValuePen`: horas liberadas × costo horario. **No equivale a efectivo ahorrado**.
- `minimumFeeForTargetPen`: tarifa mínima estimada para el margen meta; no incluye impuestos ni otros costos no cargados.

El input es siempre un escenario hipotético: usar baselines acordados, no cifras inventadas como evidencia. No persiste PII ni accede a sistemas externos. La política de costo fijo ~S/0 pre-revenue en ADR-0007 se marca como bloqueo cuando `preRevenue=true`.
