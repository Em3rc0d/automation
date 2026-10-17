/* Runnable Chifa AV Perú local demo. No external APIs except this localhost console.
 * All dynamic user data is rendered with textContent, never innerHTML.
 */
globalThis.renderAvPeruDemo = async function renderAvPeruDemo(ctx) {
  const {root,api,N,button,badge,metric,panel,showFlash,titleRow} = ctx;
  const add = (parent,...children) => {
    children.filter(x => x !== undefined && x !== null).forEach(x => parent.append(x));
    return parent;
  };
  root.replaceChildren();
  root.append(titleRow("Chifa AV Perú · sistema demo funcional",
    "Registra pedidos, reserva inventario, genera alertas y tickets. Los cambios persisten en SQLite local."));
  const pillBar = N("div","demo-pill-bar");
  add(pillBar, badge("MOTOR PYTHON + SQLITE", "approved"),
    badge("SIN SERVICIOS EXTERNOS", "local"),
    badge("DATOS FICTICIOS", "draft"));
  root.append(pillBar);
  const tip = N("div","notice");
  add(tip,N("span","notice-icon","ⓘ"),
    N("span","", "Aquí sí puedes realizar operaciones reales dentro del sistema de demostración: crear pedidos, confirmar, descontar stock y auditar resultados. No procesa ventas reales, no conecta POS ni envía WhatsApp/correos."));
  root.append(tip);
  const controls = N("div","demo-controls");
  const resetButton = button("↺ Reiniciar datos de ejemplo", async () => {
    if (!globalThis.confirm("¿Reiniciar solo los pedidos, stock, tickets y alertas de la DEMO? Las instalaciones reales NO se modificarán.")) return;
    await action("/api/demo/reset", {confirm:"RESET_DEMO_ONLY"},
      "Datos de demostración reiniciados. Tus instalaciones y configuraciones no se tocaron.");
  }, "button secondary");
  controls.append(resetButton);
  root.append(controls);
  const area = N("div","demo-workspace");
  root.append(area);
  let busy = false;
  let draftCart = [];
  let draftAlias = "Mesa 3 (demo)";

  const money = cents => "S/ " + (cents / 100).toFixed(2);
  const chip = (text,type) => badge(text,type);
  const buildTable = (headers,rows) => {
    const wrap=N("div","table-wrap");
    const t=N("table"),thead=N("thead"),tr=N("tr");
    headers.forEach(h=>tr.append(N("th","",h)));
    thead.append(tr);t.append(thead);
    const tbody=N("tbody");
    rows.forEach(cells=>{
      const row=N("tr");
      cells.forEach(value=>{
        const td=N("td");
        if (value instanceof Node) td.append(value); else td.textContent=String(value ?? "—");
        row.append(td);
      });
      tbody.append(row);
    });
    t.append(tbody);wrap.append(t);return wrap;
  };
  const inputField=(id,label,value,maxLength) => {
    const field=N("div","field");
    const l=N("label","",label),input=N("input");
    l.htmlFor=id;input.id=id;input.value=value;input.maxLength=maxLength;input.required=true;
    add(field,l,input);return {field,input};
  };
  const sectionTitle=(name,details="")=>{
    const div=N("div","demo-title");
    add(div,N("h2","",name),N("span","muted",details));
    return div;
  };
  async function action(path,body,success) {
    if (busy) return;
    busy=true;
    try {
      await api(path,"POST",body);
      showFlash(success);
      await reload();
    } catch(e) {
      showFlash(e.message,true);
    } finally {busy=false;}
  }
  async function reload() {
    try {
      const data=await api("/api/demo/state");
      draw(data);
    } catch(e) {
      area.replaceChildren(N("p","", "Error leyendo el sistema demo: "+e.message));
      showFlash(e.message,true);
    }
  }
  function draw(data) {
    area.replaceChildren();
    const stats=N("div","cards");
    add(stats,
      metric("Pedidos",data.metrics.orders,"Registrados en SQLite"),
      metric("Confirmados",data.metrics.confirmed,"Con inventario descontado"),
      metric("Alertas generadas",data.metrics.alerts,"Al cruzar umbrales"),
      metric("Tickets abiertos",data.metrics.openTickets,"Atención operativa local"));
    area.append(stats);

    const grid=N("div","demo-main-grid");
    const orderBox=N("section","panel");
    const orderBody=N("div","panel-body");
    const orderForm=N("form","demo-order-form");
    const customer=inputField("demo-alias","Referencia del cliente ficticio",draftAlias,64);
    customer.input.addEventListener("input", () => { draftAlias = customer.input.value; });
    const pickRow=N("div","demo-item-picker");
    const skuField=N("div","field"),skuLabel=N("label","","Producto"),skuSelect=N("select");
    skuLabel.htmlFor="demo-sku";skuSelect.id="demo-sku";
    data.menu.forEach(p => skuSelect.add(new Option(
      p.name+" · "+money(p.price_cents)+" · Stock: "+p.stock,p.sku)));
    skuSelect.value="WANTAN";
    add(skuField,skuLabel,skuSelect);
    const qty=N("div","field");
    const qtyLabel=N("label","","Cantidad"),qtyInput=N("input");
    qtyLabel.htmlFor="demo-qty";qtyInput.id="demo-qty";
    qtyInput.type="number";qtyInput.step="1";qtyInput.min="1";qtyInput.max="50";
    qtyInput.value="1";qtyInput.required=true;
    add(qty,qtyLabel,qtyInput);
    const addButton=button("+ Agregar", () => {
      const quantity=Number(qtyInput.value);
      if (!Number.isInteger(quantity) || quantity<1 || quantity>50) {
        showFlash("Indica una cantidad entera entre 1 y 50.",true);
        return;
      }
      const sku=skuSelect.value;
      const current=draftCart.find(x=>x.sku===sku);
      if (current) {
        if (current.quantity + quantity > 50) {
          showFlash("Máximo 50 unidades del mismo producto por pedido.",true);
          return;
        }
        current.quantity+=quantity;
      } else {
        if (draftCart.length>=30) {
          showFlash("Máximo 30 productos distintos por pedido.",true);
          return;
        }
        draftCart.push({sku,quantity});
      }
      renderCart();
    }, "button secondary");
    addButton.classList.add("demo-add-item");
    add(pickRow,skuField,qty,addButton);
    const cartTitle=N("h3","","Detalle del pedido");
    const cartBody=N("div","demo-cart-body");
    const totalRow=N("div","demo-cart-total");
    const orderAction=N("button","button primary","Registrar pedido");
    orderAction.type="submit";
    function renderCart() {
      cartBody.replaceChildren();
      const rows=[];
      let total=0;
      for (const item of draftCart) {
        const product=data.menu.find(p=>p.sku===item.sku);
        if (!product) continue;
        const subtotal=product.price_cents * item.quantity;
        total+=subtotal;
        const quantityEditor=N("input","demo-cart-qty");
        quantityEditor.type="number";quantityEditor.min="1";quantityEditor.max="50";
        quantityEditor.step="1";quantityEditor.value=String(item.quantity);
        quantityEditor.setAttribute("aria-label","Cantidad de "+product.name);
        quantityEditor.addEventListener("change", () => {
          const next=Number(quantityEditor.value);
          if (!Number.isInteger(next) || next<1 || next>50) {
            showFlash("La cantidad debe ser un entero entre 1 y 50.",true);
            quantityEditor.value=String(item.quantity);
            return;
          }
          item.quantity=next;
          renderCart();
        });
        rows.push([
          N("strong","",product.name),
          money(product.price_cents),
          quantityEditor,
          money(subtotal),
          button("Quitar", () => {
            draftCart=draftCart.filter(x=>x.sku!==item.sku);
            renderCart();
          })
        ]);
      }
      if (rows.length) {
        cartBody.append(buildTable(["Producto","Precio","Cantidad","Subtotal",""],rows));
      } else {
        cartBody.append(N("p","demo-cart-empty",
          "Añade al menos un producto. Puedes combinar varios platos y bebidas en un solo pedido."));
      }
      totalRow.replaceChildren();
      add(totalRow,N("span","","Total del pedido"),
        N("strong","",money(total)));
      orderAction.disabled=rows.length===0;
      orderAction.textContent="Registrar pedido · "+money(total);
    }
    orderForm.addEventListener("submit",async e=>{
      e.preventDefault();
      if (!draftCart.length) {
        showFlash("Agrega al menos un producto al pedido.",true);
        return;
      }
      if (busy) return;
      busy=true;
      orderAction.disabled=true;
      try {
        const result=await api("/api/demo/orders","POST",{
          customerAlias:customer.input.value,
          items:draftCart.map(x=>({sku:x.sku,quantity:x.quantity}))
        });
        draftCart=[];
        draftAlias=customer.input.value;
        showFlash("Pedido #"+result.orderId+" registrado con "+result.itemCount+
          " productos. Confírmalo abajo para reservar todo el stock.");
        await reload();
      } catch(error) {
        showFlash(error.message,true);
        orderAction.disabled=false;
      } finally {busy=false;}
    });
    add(orderForm,customer.field,pickRow,cartTitle,cartBody,totalRow,orderAction);
    renderCart();
    add(orderBody,orderForm,N("p","help",
      "Ejemplo: Wantán × 4 + Gaseosa × 2. El stock se descuenta para todos los productos al confirmar, nunca al agregar al carrito."));
    add(orderBox,sectionTitle("01 · Nuevo pedido","Alta persistente"),orderBody);

    const ticketBox=N("section","panel");
    const ticketBody=N("div","panel-body"),ticketForm=N("form","demo-ticket-form");
    const subject=inputField("demo-subject","Motivo del ticket","Consulta de delivery",100);
    const detailField=N("div","field"),detailLabel=N("label","","Descripción"),detail=N("textarea");
    detail.id="demo-detail";detailLabel.htmlFor=detail.id;
    detail.value="El cliente de prueba solicita conocer el tiempo estimado de entrega.";
    detail.required=true;detail.maxLength=1200;detail.rows=3;
    add(detailField,detailLabel,detail);
    const ticketAction=N("button","button secondary","Crear ticket");
    ticketAction.type="submit";
    add(ticketForm,subject.field,detailField,ticketAction);
    ticketForm.addEventListener("submit",async e=>{
      e.preventDefault();
      await action("/api/demo/tickets",
        {subject:subject.input.value,detail:detail.value},
        "Ticket de soporte creado. Consulta su registro en el historial de actividad.");
    });
    add(ticketBody,ticketForm,N("p","help","Automatización demo: se registra el ticket y una notificación interna simulada. Sin envío externo."));
    add(ticketBox,sectionTitle("02 · Soporte","Flujo local"),ticketBody);
    add(grid,orderBox,ticketBox);
    area.append(grid);

    area.append(sectionTitle("Inventario · stock actualizado", "Cada confirmación modifica el stock real de la BD demo."));
    const invRows = data.menu.map(p => [
      N("strong","",p.name),p.sku,money(p.price_cents),
      String(p.stock),String(p.low_at),
      p.stock <= p.low_at ? chip("STOCK BAJO","blocked") : chip("NORMAL","approved")
    ]);
    area.append(panel("Inventario disponible",data.menu.length+" productos",
      buildTable(["Producto","SKU","Precio","Stock","Mínimo","Estado"],invRows)));

    area.append(sectionTitle("Pedidos", "Confirmar reserva stock en una sola transacción."));
    const orderRows=data.orders.map(o => {
      const lines=N("div","demo-order-lines");
      for (const item of o.items || []) {
        const row=N("div","demo-order-line");
        add(row,N("span","",item.name+" × "+item.quantity),
          N("small","muted",money(item.lineTotalCents)));
        lines.append(row);
      }
      if (!(o.items || []).length) lines.append(N("span","muted","Sin ítems registrados"));
      return [
        "#"+o.id,
        o.customer_alias,
        lines,
        money(o.total_cents),
        chip(o.status==="PENDING"?"PENDIENTE":"CONFIRMADO",o.status==="PENDING"?"blocked":"approved"),
        o.status==="PENDING"?
          button("✓ Confirmar",()=>action(
            "/api/demo/orders/confirm",{orderId:o.id},
            "Pedido #"+o.id+" confirmado: se reservó el stock de todas sus líneas."
          ),"button primary") : N("span","muted","Stock reservado")
      ];
    });
    area.append(panel("Órdenes registradas",data.orders.length+" últimas",
      orderRows.length ? buildTable(["ID","Cliente","Detalle","Total","Estado","Acción"],orderRows) :
        N("div","empty","Todavía no hay pedidos. Registra uno con el formulario superior.")));

    const bottom=N("div","demo-main-grid");
    const alerts=N("div","demo-list");
    if (!data.alerts.length) alerts.append(N("p","muted","Sin alertas. Prueba confirmar 4 wantanes."));
    data.alerts.forEach(a=>{
      const item=N("div","demo-feed-item");
      add(item,chip("ALERTA","blocked"),N("div","",a.message),
        N("small","muted","Pedido #"+a.order_id+" · "+a.created_at));
      alerts.append(item);
    });
    const outbox=N("div","demo-list");
    if (!data.outbox.length) outbox.append(N("p","muted","Aún no hay mensajes generados."));
    data.outbox.forEach(item=>{
      const el=N("div","demo-feed-item");
      add(el,chip("SIMULADO","local"),N("div","",item.message),
        N("small","muted",item.destination+" · "+item.event_type));
      outbox.append(el);
    });
    add(bottom,panel("Alertas automáticas",data.alerts.length+" alertas",alerts),
      panel("Bandeja de salida",data.outbox.length+" notificaciones no enviadas",outbox));
    area.append(bottom);
    const activity=N("div","demo-list");
    data.events.forEach(item=>{
      const el=N("div","demo-event");
      add(el,N("span","demo-event-dot"),
        N("strong","",item.kind.replaceAll("_"," ")),
        N("span","",item.message),
        N("small","muted",item.created_at));
      activity.append(el);
    });
    if (!data.events.length) activity.append(N("p","muted","Aún no hay actividad."));
    area.append(panel("Auditoría de automatizaciones",data.events.length+" eventos",activity));
    const ticketList=data.tickets.map(x=>["#"+x.id,x.subject,x.status,x.created_at]);
    area.append(panel("Tickets registrados",data.tickets.length+" tickets",
      ticketList.length ? buildTable(["ID","Asunto","Estado","Fecha"],ticketList) :
      N("div","empty","Sin tickets registrados.")));
    const refresh=button("↻ Actualizar datos",reload,"button secondary");
    area.append(refresh);
  }
  await reload();
};
