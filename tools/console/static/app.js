/* MK1 local operator console. No third-party scripts, no HTML built from untrusted data. */
const state = {
  token: "", view: "overview", tenant: "", overview: null, catalog: [],
  detail: null, search: "", stage: "all"
};
const $ = selector => document.querySelector(selector);
const N = (tag, cls = "", text = null) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== null) e.textContent = String(text);
  return e;
};
const add = (parent, ...children) => {
  for (const child of children) {
    if (child !== null && child !== undefined) parent.append(child);
  }
  return parent;
};
const button = (text, action, cls = "text-button") => {
  const b = N("button", cls, text);
  b.type = "button";
  b.addEventListener("click", action);
  return b;
};
const badge = (text, kind = "draft") => {
  const e = N("span", "tag " + kind);
  add(e, N("span", "dot"), N("span", "", text));
  return e;
};
const paragraph = text => N("p", "subtitle", text);
const titleRow = (title, description, action = null) => {
  const row = N("div", "heading-row");
  const labels = N("div");
  add(labels, N("div", "eyebrow", "AUTOMATION OPERATIONS"), N("h1", "", title), paragraph(description));
  add(row, labels, action);
  return row;
};
const panel = (title, subtitle = "", body = null) => {
  const p = N("section", "panel");
  const head = N("div", "panel-header");
  add(head, N("h3", "", title), N("small", "", subtitle));
  add(p, head);
  if (body) p.append(body);
  return p;
};
const metric = (label, value, foot) => {
  const e = N("div", "metric");
  add(e, N("span", "metric-label", label), N("span", "metric-value", value), N("span", "metric-foot", foot));
  return e;
};
const empty = (title, description, action = null) => {
  const e = N("div", "empty");
  add(e, N("div", "empty-icon", "◇"), N("strong", "", title), N("span", "", description));
  if (action) add(e, N("div", "", ""), action);
  return e;
};
const table = (headers, rows) => {
  const wrapper = N("div", "table-wrap");
  const t = N("table");
  const thead = N("thead"), thr = N("tr");
  headers.forEach(x => add(thr, N("th", "", x)));
  add(thead, thr);
  const tbody = N("tbody");
  rows.forEach(row => {
    const tr = N("tr");
    row.forEach(cell => {
      const td = N("td");
      if (cell instanceof Node) td.append(cell);
      else td.textContent = String(cell ?? "—");
      tr.append(td);
    });
    tbody.append(tr);
  });
  add(t, thead, tbody);
  wrapper.append(t);
  return wrapper;
};
const nameCell = item => {
  const e = N("div");
  add(e, N("strong", "", item.name), N("code", "key", item.key));
  return e;
};
const statusCell = item => badge(
  item.ready ? "Sin bloqueos" : "Pendiente · " + item.blockerCount,
  item.ready ? "approved" : "blocked"
);
const showFlash = (message, isError = false) => {
  const f = $("#flash");
  f.className = isError ? "error" : "";
  f.textContent = message;
};
const clearFlash = () => { $("#flash").textContent = ""; $("#flash").className = ""; };
async function api(path, method = "GET", body = null) {
  const options = {method, headers: {"Accept":"application/json"}};
  if (method !== "GET") {
    options.headers["Content-Type"] = "application/json";
    options.headers["X-Console-Token"] = state.token;
    options.body = JSON.stringify(body);
  }
  const response = await fetch(path, options);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Error inesperado en la consola");
  return result;
}
const viewTitles = {overview:"Resumen",automations:"Instalaciones",catalog:"Biblioteca",portal:"Vista del cliente"};
function currentContent() {
  const area = $("#content");
  area.replaceChildren();
  $("#page-crumb").textContent = state.detail ? "Configurar workflow" : viewTitles[state.view];
  document.querySelectorAll("[data-view]").forEach(el => {
    el.classList.toggle("selected", el.dataset.view === state.view);
  });
  return area;
}
async function refresh() {
  const [overview, catalog] = await Promise.all([api("/api/overview"), api("/api/catalog")]);
  state.overview = overview;
  state.catalog = catalog.entries;
  const picker = $("#tenant-select"), desired = state.tenant;
  picker.replaceChildren(new Option("Todos los clientes", ""));
  overview.tenants.forEach(tenant => picker.add(new Option(tenant, tenant)));
  state.tenant = overview.tenants.includes(desired) ? desired :
    (overview.tenants.includes(overview.tenantSeed?.tenantId) ? overview.tenantSeed.tenantId : "");
  picker.value = state.tenant;
}
function getFiltered() {
  const all = state.overview.installations || [];
  return state.tenant ? all.filter(x => x.tenantId === state.tenant) : all;
}
function renderOverview() {
  const root = currentContent(), items = getFiltered();
  root.append(titleRow("Centro de operaciones", "Controla tus instalaciones y su preparación por cliente."));
  const cards = N("div", "cards");
  const uniqueTenants = new Set(items.map(x => x.tenantId));
  add(cards,
    metric("Clientes", state.tenant ? uniqueTenants.size : state.overview.tenants.length, "Tenants locales con bundles"),
    metric("Automatizaciones instaladas", items.length, "Instancias en almacenamiento local"),
    metric("Baselines aprobados", state.overview.approvedTotal, "Disponibles para instalar"),
    metric("Instalaciones con bloqueos", items.filter(x => !x.ready).length, "Pendientes de configuración / evidencia")
  );
  root.append(cards);
  const grid = N("div", "grid-two");
  const activity = N("div");
  const rows = items.slice(0, 9).map(item => [
    nameCell(item), item.tenantId, badge(item.state || "DRAFT", "draft"), statusCell(item),
    button("Configurar →", () => openDetail(item.tenantId, item.key))
  ]);
  activity.append(items.length ? table(["Automatización", "Cliente", "Estado", "Gate", ""], rows) :
    empty("Aún no hay instalaciones", "Crea tu primer cliente e instala un baseline aprobado.",
      button("+ Crear instalación", () => openInstall(), "button primary")));
  const recent = panel("Instalaciones existentes", items.length + " bundles", activity);
  const steps = N("div", "panel-body");
  [
    ["01","Selecciona un baseline","Solo versiones APPROVED_BASELINE son instalables."],
    ["02","Configura por cliente","Edita parámetros validados sin modificar el template original."],
    ["03","Cierra los bloqueos","Conectores, baseline y aceptación requieren evidencia externa."],
    ["04","Activa después de certificar","El demo local nunca habilita producción automáticamente."]
  ].forEach(([number, heading, desc]) => {
    const row = N("div", "step");
    const words = N("div");
    add(words, N("strong", "", heading), N("p", "", desc));
    add(row, N("div", "step-icon", number), words);
    steps.append(row);
  });
  add(grid, recent, panel("Ruta hacia producción", "Gate MK1", steps));
  root.append(grid);
}
function renderInstallations() {
  const root = currentContent(), items = getFiltered();
  root.append(titleRow("Instalaciones por cliente", "Parámetros, estado y diagnóstico de cada workflow.",
    button("+ Instalar baseline", () => openInstall(), "button secondary")));
  const body = items.length ? table(
    ["Automatización", "Tenant", "Versión", "Estado", "Diagnóstico", ""],
    items.map(item => [
      nameCell(item), item.tenantId, item.version, badge(item.state, "draft"),
      statusCell(item), button("Abrir →", () => openDetail(item.tenantId, item.key))
    ])
  ) : empty("No hay instalaciones para esta selección",
    "Instala una automatización aprobada y luego configura sus parámetros.",
    button("Crear instalación", () => openInstall(), "button primary"));
  root.append(panel("Instalaciones", items.length + " resultados", body));
}
function renderCatalog() {
  const root = currentContent();
  root.append(titleRow("Biblioteca de automatizaciones",
    "Catálogo cargado automáticamente al iniciar. Las propuestas DESIGN_READY no pueden instalarse."));
  const toolbar = N("div", "toolbar");
  const search = N("input", "search");
  search.type = "search"; search.placeholder = "Buscar automatización o proceso";
  search.setAttribute("aria-label", "Buscar en el catálogo");
  search.value = state.search;
  const select = N("select");
  select.setAttribute("aria-label", "Filtrar por certificación");
  select.add(new Option("Todas las etapas", "all"));
  select.add(new Option("Aprobadas para instalar", "approved"));
  select.add(new Option("Solo propuestas", "drafts"));
  select.value = state.stage;
  const right = N("div", "right");
  add(right, N("span", "muted", state.catalog.length + " cargadas al iniciar · " + state.overview.approvedTotal + " aprobadas"), select);
  add(toolbar, search, right);
  root.append(toolbar);
  const grid = N("div", "catalog-grid");
  root.append(grid);
  const fill = () => {
    grid.replaceChildren();
    const q = state.search.trim().toLowerCase();
    const list = state.catalog.filter(item => {
      const match = (item.name + " " + item.key + " " + item.domain + " " + item.manualWorkReduced).toLowerCase().includes(q);
      return match && (state.stage === "all" || (state.stage === "approved" ? item.installable : !item.installable));
    });
    if (!list.length) { grid.append(empty("Sin coincidencias", "Prueba con otro término o filtro.")); return; }
    list.forEach(item => {
      const card = N("article", "catalog-card");
      add(card, N("div", "card-domain", item.domain.replaceAll("_", " · ")), N("h3", "", item.name),
        N("p", "", item.manualWorkReduced));
      const foot = N("footer"), labels = N("div");
      add(labels, badge(item.installable ? "APROBADA" : item.stage, item.installable ? "approved" : "draft"));
      add(foot, labels,
        item.installable ? button("Instalar →", () => openInstall(item.key)) : N("small", "", "No instalable"));
      add(card, foot);
      grid.append(card);
    });
  };
  search.addEventListener("input", () => { state.search = search.value; fill(); });
  select.addEventListener("change", () => { state.stage = select.value; fill(); });
  fill();
}
function makeField(key, property, value) {
  const wrap = N("div", "field");
  if (property.type === "array" || property.type === "object" || Array.isArray(property.type)) wrap.classList.add("wide");
  const label = N("label", "", key);
  let input;
  const type = Array.isArray(property.type) ? "nullable-object" : (property.type || (property.enum ? "enum" : "string"));
  if (property.enum) {
    input = N("select");
    property.enum.forEach(x => input.add(new Option(String(x), String(x))));
    input.value = value == null ? "" : String(value);
  } else if (type === "boolean") {
    input = N("input");
    input.type = "checkbox";
    input.checked = value === true;
  } else if (type === "array" || type === "object" || type === "nullable-object") {
    input = N("textarea");
    input.value = JSON.stringify(value === undefined ? (type === "array" ? [] : (type === "nullable-object" ? null : {})) : value, null, 2);
  } else {
    input = N("input");
    input.type = type === "number" || type === "integer" ? "number" : "text";
    input.step = type === "integer" ? "1" : "any";
    if (property.minimum !== undefined) input.min = String(property.minimum);
    if (property.maximum !== undefined) input.max = String(property.maximum);
    input.value = value == null ? "" : String(value);
  }
  input.id = "field-" + key;
  input.dataset.configKey = key;
  input.dataset.configType = type;
  label.htmlFor = input.id;
  wrap.append(label);
  if (type === "boolean") {
    const row = N("div", "checkbox-row");
    add(row, input, N("span", "muted", value === true ? "Activado en configuración" : "Desactivado"));
    wrap.append(row);
  } else wrap.append(input);
  if (property.description) wrap.append(N("div", "hint", property.description));
  return wrap;
}
async function saveCurrentConfig(event) {
  event.preventDefault();
  const detail = state.detail;
  const config = {};
  try {
    for (const input of document.querySelectorAll("#config-form [data-config-key]")) {
      const type = input.dataset.configType, key = input.dataset.configKey;
      if (type === "boolean") config[key] = input.checked;
      else if (type === "integer" || type === "number") {
        if (input.value.trim() === "") throw new Error("Campo numérico requerido: " + key);
        config[key] = Number(input.value);
      } else if (type === "array" || type === "object" || type === "nullable-object") {
        try { config[key] = JSON.parse(input.value); }
        catch { throw new Error("JSON inválido: " + key); }
      } else config[key] = input.value;
    }
    const query = new URLSearchParams({tenant:detail.tenantId,key:detail.key});
    state.detail = await api("/api/config?" + query, "PUT", {config,configVersion:detail.configVersion});
    await refresh();
    renderDetail();
    showFlash("Configuración guardada localmente. El flujo sigue sin activar.");
  } catch (err) { showFlash(err.message, true); }
}
function renderDetail() {
  const root = currentContent(), d = state.detail;
  root.append(button("← Volver a instalaciones", () => { state.detail = null; state.view = "automations"; render(); }, "breadcrumb-back"));
  const head = titleRow(d.name, d.tenantId + " · " + d.key + " · " + d.installation.runtimeProfile,
    badge(d.installation.state || "DRAFT", "draft"));
  root.append(head);
  const grid = N("div", "detail-grid");
  const editor = N("div", "panel-body");
  const form = N("form");
  form.id = "config-form";
  const fields = N("div", "field-grid");
  Object.entries(d.schema.properties || {}).forEach(([key, prop]) =>
    fields.append(makeField(key, prop, d.config[key])));
  add(form, fields);
  const actions = N("div", "detail-footer");
  add(actions, button("Guardar configuración", () => form.requestSubmit(), "button primary"),
    N("span", "details-help", "Guardado atómico · no se ejecuta ninguna acción externa"));
  add(form, actions);
  form.addEventListener("submit", saveCurrentConfig);
  editor.append(form);
  const right = N("div");
  const diag = N("div", "panel-body");
  add(diag, badge(d.diagnostics.ready ? "SIN BLOQUEOS" : "BLOQUEADO PARA CLIENT_CONFIGURED",
    d.diagnostics.ready ? "approved" : "blocked"));
  if (d.diagnostics.blockers.length) {
    const list = N("ul", "blockers");
    d.diagnostics.blockers.forEach(x => list.append(N("li", "", x)));
    diag.append(list);
  } else diag.append(paragraph("Sin bloqueos de configuración; aún se requiere certificación de producción."));
  const conns = N("div", "panel-body");
  if (!d.connectors.length) conns.append(paragraph("No hay conectores declarados."));
  d.connectors.forEach(x => {
    const row = N("div", "connector");
    add(row, N("strong", "", x.capability || "Conector"),
      N("small", "", (x.provider || "Sin proveedor") + " · " + (x.status || "unbound")));
    conns.append(row);
  });
  add(right, panel("Gate de instalación", d.diagnostics.blockers.length + " bloqueos", diag),
    N("div", "", ""));
  right.append(panel("Conectores", "Estado observado, solo lectura", conns));
  const simulation = N("div", "panel-body");
  add(simulation, paragraph("Ejecuta el workflow real con una fixture sintética y adaptadores en memoria. No envía mensajes ni usa datos del cliente."));
  const resultSlot = N("div", "simulation-result");
  const tryButton = button("▶ Probar localmente", async () => {
    try {
      tryButton.disabled = true;
      tryButton.textContent = "Ejecutando...";
      const result = await api("/api/simulate", "POST", {tenantId:d.tenantId,workflowKey:d.key});
      showSimulationResult(resultSlot, result);
      showFlash(result.status === "SIMULATION_PASS" ?
        "Simulación completada con datos ficticios. El workflow sigue sin estar activo." :
        "Simulación requiere revisión.", result.status !== "SIMULATION_PASS");
    } catch (err) { showFlash(err.message, true); }
    finally { tryButton.disabled = false; tryButton.textContent = "▶ Probar localmente"; }
  }, "button secondary");
  add(simulation, tryButton, resultSlot);
  right.append(panel("Prueba del runtime", "Solo LOCAL_SIMULATION", simulation));
  const runQuery = new URLSearchParams({tenant:d.tenantId,key:d.key});
  api("/api/simulation?" + runQuery).then(x => {
    if (state.detail?.tenantId === d.tenantId && state.detail?.key === d.key && x.result)
      showSimulationResult(resultSlot, x.result);
  }).catch(() => {});
  add(grid, panel("Parámetros del workflow", "Versión local · validada contra schema", editor), right);
  root.append(grid);
}
async function openDetail(tenant, key) {
  try {
    clearFlash();
    state.detail = await api("/api/installation?" + new URLSearchParams({tenant,key}));
    state.view = "automations";
    renderDetail();
  } catch (err) { showFlash(err.message, true); }
}
function showSimulationResult(parent, result) {
  parent.replaceChildren();
  if (!result) return;
  parent.append(badge(result.status === "SIMULATION_PASS" ? "SIMULACIÓN OK" : "REVISAR SIMULACIÓN",
    result.status === "SIMULATION_PASS" ? "approved" : "blocked"));
  const list = N("div", "simulation-metrics");
  add(list,
    N("small", "", "Procesos: " + (result.processRecords ?? 0)),
    N("small", "", "Mensajes simulados: " + (result.simulatedMessages ?? 0)),
    N("small", "", "Incidentes: " + (result.incidents ?? 0)));
  parent.append(list);
  parent.append(N("p", "help", "Prueba sintética · no demuestra operación con proveedores reales."));
}
async function simulateTenant(tenant, action) {
  action.disabled = true;
  const old = action.textContent;
  action.textContent = "Ejecutando pruebas...";
  try {
    const result = await api("/api/simulate-all", "POST", {tenantId:tenant});
    showFlash("Simulaciones locales: " + result.passed + "/" + result.tested +
      " correctas; " + result.failed + " por revisar. No hay activaciones en producción.",
      result.failed > 0);
    return result;
  } catch (error) {
    showFlash(error.message, true);
    return null;
  } finally {
    action.disabled = false;
    action.textContent = old;
  }
}
function renderPortal() {
  const root = currentContent();
  root.append(titleRow("Portal del cliente · vista previa",
    "Plan completo de automatizaciones del tenant. Sin login, datos productivos ni activaciones."));
  const tenant = state.tenant || state.overview.tenantSeed?.tenantId || state.overview.tenants[0];
  if (!tenant) {
    root.append(empty("No hay un cliente de prueba", "Crea una instalación desde Operator Console."));
    return;
  }
  const items = state.overview.installations.filter(x => x.tenantId === tenant);
  const hero = N("div", "portal-hero");
  add(hero, N("div", "eyebrow", "ESPACIO CLIENTE · DEMOSTRACIÓN"),
    N("h2", "", tenant),
    N("p", "", "Los flujos aprobados pueden ejecutarse en simulación. Los que están en diseño NO funcionan aún."));
  const cards = N("div", "portal-cards");
  add(cards,
    metric("Instaladas como borrador", items.length, "No equivale a automatizaciones activas"),
    metric("Configuradas", items.filter(x => x.ready).length, "Sin bloqueos de instalación"),
    metric("Pendientes", items.filter(x => !x.ready).length, "Conectores, baseline y aceptación"));
  root.append(hero, cards);
  const ops = N("div", "toolbar");
  const runAll = button("▶ Probar baselines en local", async () => {
    const result = await simulateTenant(tenant, runAll);
    if (result && state.view === "portal") {
      const slot = $("#tenant-simulation-status");
      if (slot) {
        slot.replaceChildren();
        slot.append(badge(result.failed === 0 ? "SIMULACIONES COMPLETADAS" : "SIMULACIONES PARCIALES",
          result.failed === 0 ? "approved" : "blocked"));
        slot.append(N("span", "muted", " " + result.passed + "/" + result.tested +
          " baselines. No hay ejecuciones reales."));
      }
    }
  }, "button secondary");
  const label = N("span", "muted", "Pruebas solo con fixtures sintéticas y runtime aprobado");
  add(ops, label, runAll);
  root.append(ops);
  const simulationStatus = N("div");
  simulationStatus.id = "tenant-simulation-status";
  root.append(simulationStatus);
  const body = items.length ? table(["Proceso", "Estado", "Preparación", ""], items.map(x => [
    nameCell(x), badge(x.state, "draft"), statusCell(x),
    button("Configurar →", () => openDetail(x.tenantId, x.key))
  ])) : empty("Sin automatizaciones configuradas", "Este cliente no tiene bundles locales.");
  root.append(panel("Mis instalaciones", "No equivale a producción", body));
  const loading = N("div", "tenant-roadmap");
  loading.append(paragraph("Cargando las automatizaciones asociadas al cliente..."));
  root.append(loading);
  api("/api/tenant-plan?" + new URLSearchParams({tenant})).then(plan => {
    if (state.view !== "portal" || (state.tenant && state.tenant !== tenant)) return;
    loading.replaceChildren();
    if (!plan.assignedTotal) {
      loading.append(panel("Plan de automatizaciones", "Sin seed para el tenant",
        empty("No hay planificación inicializada", "Inicia el servidor con --seed-tenant " + tenant)));
      return;
    }
    const heading = N("div", "heading-row roadmap-title");
    const words = N("div");
    add(words, N("h2", "", "Plan completo de automatización"),
      paragraph(plan.assignedTotal + " automatizaciones asociadas a " + tenant +
        " · " + plan.installedTotal + " con bundle · " + plan.designOnlyTotal + " en diseño"));
    heading.append(words);
    loading.append(heading);
    const filterBar = N("div", "toolbar");
    const search = N("input", "search");
    search.type = "search"; search.placeholder = "Buscar entre las " + plan.assignedTotal + " automatizaciones";
    search.setAttribute("aria-label", "Buscar automatizaciones asociadas");
    const select = N("select");
    select.setAttribute("aria-label", "Filtrar estado del plan");
    select.add(new Option("Todas", "all"));
    select.add(new Option("Instalables", "approved"));
    select.add(new Option("En diseño", "design"));
    add(filterBar, search, select);
    loading.append(filterBar);
    const view = N("div", "panel");
    loading.append(view);
    function fill() {
      const q = search.value.trim().toLowerCase();
      const filtered = plan.entries.filter(x =>
        (select.value === "all" || (select.value === "approved" ? x.installable : !x.installable)) &&
        (x.name + " " + x.key + " " + x.domain).toLowerCase().includes(q));
      const rows = filtered.map(x => [
        nameCell(x), x.domain.replaceAll("_", " · "),
        badge(x.state === "DESIGN_ONLY" ? "POR DESARROLLAR" : x.state,
          x.state === "DESIGN_ONLY" ? "draft" : "blocked"),
        x.installable ? button("Configurar →", () => openDetail(tenant, x.key)) :
          N("span", "muted", "Sin runtime aprobado")
      ]);
      view.replaceChildren(panel("Automatizaciones de " + tenant, filtered.length + " resultados",
        rows.length ? table(["Automatización", "Área", "Estado real", ""], rows) :
          empty("Sin resultados", "Prueba otra búsqueda.")));
    }
    search.addEventListener("input", fill);
    select.addEventListener("change", fill);
    fill();
  }).catch(err => {
    if (state.view === "portal") loading.replaceChildren(empty("No fue posible cargar el plan", err.message));
  });
}
function render() {
  if (state.detail) return renderDetail();
  if (state.view === "catalog") return renderCatalog();
  if (state.view === "automations") return renderInstallations();
  if (state.view === "portal") return renderPortal();
  return renderOverview();
}
function openInstall(key = "") {
  $("#install-dialog").showModal();
  $("#new-tenant").value = state.tenant || "";
  const picker = $("#new-workflow");
  picker.replaceChildren(new Option("Selecciona una automatización", ""));
  state.catalog.filter(x => x.installable).forEach(x => picker.add(new Option(x.name + " · " + x.key, x.key)));
  picker.value = key || "";
  $("#new-tenant").focus();
}
async function submitInstall(e) {
  e.preventDefault();
  const submit = $("#install-submit");
  submit.disabled = true;
  try {
    const tenantId = $("#new-tenant").value.trim();
    const workflowKey = $("#new-workflow").value;
    const detail = await api("/api/install", "POST", {tenantId,workflowKey});
    $("#install-dialog").close();
    await refresh();
    state.tenant = tenantId;
    $("#tenant-select").value = tenantId;
    state.detail = detail;
    state.view = "automations";
    renderDetail();
    showFlash("Bundle DRAFT creado. Completa los parámetros y las evidencias para continuar.");
  } catch (err) { showFlash(err.message, true); }
  finally { submit.disabled = false; }
}
async function initialize() {
  document.querySelectorAll("[data-view]").forEach(link => link.addEventListener("click", () => {
    state.view = link.dataset.view;
    state.detail = null;
    clearFlash();
    render();
  }));
  $("#tenant-select").addEventListener("change", e => {
    state.tenant = e.target.value;
    state.detail = null;
    render();
  });
  $("#install-open").addEventListener("click", () => openInstall());
  $("#install-close").addEventListener("click", () => $("#install-dialog").close());
  $("#install-cancel").addEventListener("click", () => $("#install-dialog").close());
  $("#install-form").addEventListener("submit", submitInstall);
  try {
    const bootstrap = await api("/api/bootstrap");
    state.token = bootstrap.token;
    await refresh();
    render();
  } catch (err) {
    showFlash("No se pudo iniciar la consola local: " + err.message, true);
  }
}
document.addEventListener("DOMContentLoaded", initialize);
