const SUPABASE_URL = "https://rzktfjcxogsqqtlxxsit.supabase.co";
const SUPABASE_KEY = "sb_publishable_EN8h1rcw1p1qtA8MoN6c6w_GSVSI26l";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let productosCache = [];
let ventasCache = [];
let filtroTexto = "";

const estadoBanner = document.getElementById("estado-mensaje");
const buscadorInput = document.getElementById("buscador");

const listaPrecios = document.getElementById("lista-precios");
const listaCompras = document.getElementById("lista-compras");
const listaGanancias = document.getElementById("lista-ganancias");
const resumenGanancias = document.getElementById("resumen-ganancias");

function mostrarEstado(texto, tipo = "info") {
  estadoBanner.textContent = texto;
  estadoBanner.className = `status-banner visible ${tipo}`;
}

function ocultarEstado() {
  estadoBanner.className = "status-banner";
  estadoBanner.textContent = "";
}

function formatMoneda(valor) {
  const num = Number(valor) || 0;
  return `S/ ${num.toFixed(2)}`;
}

function getProductoId(prod) {
  return prod.PRODUCTO_ID ?? prod.id;
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    document.querySelectorAll(".view-section").forEach((sec) => sec.classList.remove("active"));
    document.getElementById(`vista-${tab}`).classList.add("active");
  });
});

buscadorInput.addEventListener("input", (e) => {
  filtroTexto = e.target.value.trim().toLowerCase();
  renderTodo();
});

function abrirModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.hidden = false;
}

function cerrarModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.hidden = true;
}

document.querySelectorAll("[data-close]").forEach((el) => {
  el.addEventListener("click", () => cerrarModal(el.dataset.close));
});

document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) backdrop.hidden = true;
  });
});

async function cargarDatos() {
  mostrarEstado("Cargando datos desde Supabase...", "info");

  const { data: prods, error: errProds } = await supabaseClient
    .from("PRODUCTOS")
    .select("*")
    .order("NOMBRE", { ascending: true });

  if (errProds) {
    mostrarEstado("Error al cargar PRODUCTOS: " + errProds.message, "error");
    return;
  }

  productosCache = (prods || []).filter((p) => p.ACTIVO !== false);

  const { data: vtas, error: errVtas } = await supabaseClient
    .from("VENTAS")
    .select("*");

  if (errVtas) {
    mostrarEstado("Productos cargados, pero hubo un error en VENTAS: " + errVtas.message, "error");
    ventasCache = [];
  } else {
    ventasCache = vtas || [];
  }

  ocultarEstado();
  renderTodo();
}

function productosFiltrados() {
  if (!filtroTexto) return productosCache;
  return productosCache.filter((p) => {
    const nombre = String(p.NOMBRE || "").toLowerCase();
    const codigo = String(p.CODIGO || "").toLowerCase();
    return nombre.includes(filtroTexto) || codigo.includes(filtroTexto);
  });
}

function renderTodo() {
  const lista = productosFiltrados();
  renderVistaPrecios(lista);
  renderVistaCompras(lista);
  renderVistaGanancias(lista);
}

function renderVistaPrecios(lista) {
  if (!lista.length) {
    listaPrecios.innerHTML = `<div class="empty-state">No hay productos para mostrar.</div>`;
    return;
  }

  listaPrecios.innerHTML = lista
    .map((p) => {
      const id = getProductoId(p);
      const uMayor = p.UNIDAD_MAYOR || "mayor";
      const uMenor = p.UNIDAD_MENOR || "menor";
      const stockMayor = Number(p.STOCK_MAYOR_ACTUAL) || 0;

      return `
        <article class="product-card">
          <div>
            <div class="card-top">
              <div>
                <h3 class="card-title">${escapeHTML(p.NOMBRE)}</h3>
                <div class="card-meta">${escapeHTML(uMayor)} · Equiv.: ${Number(p.EQUIVALENCIA) || 0} ${escapeHTML(uMenor)}</div>
              </div>
              <span class="card-code">${escapeHTML(p.CODIGO || "-")}</span>
            </div>

            <div class="metrics-row" style="margin-top: 10px;">
              <div class="metric-item">
                <small>Precio Mayor (${escapeHTML(uMayor)})</small>
                <strong class="price-highlight">${formatMoneda(p.PRECIO_MAYOR_ACTUAL)}</strong>
              </div>
              <div class="metric-item">
                <small>Precio Menor (${escapeHTML(uMenor)})</small>
                <strong class="price-highlight">${formatMoneda(p.PRECIO_MENOR_ACTUAL)}</strong>
              </div>
            </div>
          </div>

          <div class="card-footer">
            <span class="stock-badge">Stock: ${stockMayor} ${escapeHTML(uMayor)}</span>
            <button type="button" class="btn btn-accent btn-sm" onclick="prepararVenta(${id})">Vender</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderVistaCompras(lista) {
  if (!lista.length) {
    listaCompras.innerHTML = `<div class="empty-state">No hay productos para comparar en compras.</div>`;
    return;
  }

  listaCompras.innerHTML = lista
    .map((p) => {
      const id = getProductoId(p);
      const uMayor = p.UNIDAD_MAYOR || "mayor";
      const uMenor = p.UNIDAD_MENOR || "menor";

      return `
        <article class="product-card">
          <div>
            <div class="card-top">
              <div>
                <h3 class="card-title">${escapeHTML(p.NOMBRE)}</h3>
                <div class="card-meta">Referencia anterior (${escapeHTML(uMayor)} / ${escapeHTML(uMenor)})</div>
              </div>
              <span class="card-code">${escapeHTML(p.CODIGO || "-")}</span>
            </div>

            <div class="metrics-row" style="margin-top: 10px;">
              <div class="metric-item">
                <small>Costo anterior</small>
                <strong>${formatMoneda(p.COSTO_COMPRA_ACTUAL)}</strong>
              </div>
              <div class="metric-item">
                <small>P. Mayor anterior</small>
                <strong class="price-highlight">${formatMoneda(p.PRECIO_MAYOR_ACTUAL)}</strong>
              </div>
              <div class="metric-item">
                <small>P. Menor anterior</small>
                <strong class="price-highlight">${formatMoneda(p.PRECIO_MENOR_ACTUAL)}</strong>
              </div>
              <div class="metric-item">
                <small>Stock actual</small>
                <strong>${Number(p.STOCK_MAYOR_ACTUAL) || 0} ${escapeHTML(uMayor)}</strong>
              </div>
            </div>
          </div>

          <div class="card-footer">
            <span class="card-meta">Gan. fija: ${formatMoneda(p.GANANCIA_MAYOR_FIJA)} / ${formatMoneda(p.GANANCIA_MENOR_FIJA)}</span>
            <button type="button" class="btn btn-primary btn-sm" onclick="abrirModalCompra(${id})">+ Registrar Compra</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderVistaGanancias(lista) {
  const gananciaTotalVentas = ventasCache.reduce(
    (acc, v) => acc + (Number(v.GANANCIA_TOTAL) || 0),
    0
  );

  resumenGanancias.innerHTML = `
    <div class="summary-box">
      <span>Ganancia acumulada en ventas</span>
      <strong class="gain-highlight">${formatMoneda(gananciaTotalVentas)}</strong>
    </div>
    <div class="summary-box">
      <span>Productos activos</span>
      <strong>${productosCache.length}</strong>
    </div>
  `;

  if (!lista.length) {
    listaGanancias.innerHTML = `<div class="empty-state">No hay productos para mostrar ganancias.</div>`;
    return;
  }

  listaGanancias.innerHTML = lista
    .map((p) => {
      const id = getProductoId(p);
      const uMayor = p.UNIDAD_MAYOR || "mayor";
      const uMenor = p.UNIDAD_MENOR || "menor";

      const ganProdVentas = ventasCache
        .filter((v) => String(v.PRODUCTO_ID) === String(id))
        .reduce((acc, v) => acc + (Number(v.GANANCIA_TOTAL) || 0), 0);

      return `
        <article class="product-card">
          <div>
            <div class="card-top">
              <div>
                <h3 class="card-title">${escapeHTML(p.NOMBRE)}</h3>
                <div class="card-meta">Ganancias fijas por ${escapeHTML(uMayor)} y ${escapeHTML(uMenor)}</div>
              </div>
              <span class="card-code">${escapeHTML(p.CODIGO || "-")}</span>
            </div>

            <div class="metrics-row" style="margin-top: 10px;">
              <div class="metric-item">
                <small>Gan. fija Mayor</small>
                <strong class="gain-highlight">${formatMoneda(p.GANANCIA_MAYOR_FIJA)}</strong>
              </div>
              <div class="metric-item">
                <small>Gan. fija Menor</small>
                <strong class="gain-highlight">${formatMoneda(p.GANANCIA_MENOR_FIJA)}</strong>
              </div>
            </div>
          </div>

          <div class="card-footer">
            <div>
              <small style="color: var(--muted); display:block;">Ganancia en ventas</small>
              <strong class="gain-highlight">${formatMoneda(ganProdVentas)}</strong>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="abrirModalGanancia(${id})">Editar gan.</button>
          </div>
        </article>
      `;
    })
    .join("");
}

document.getElementById("btn-abrir-producto").addEventListener("click", () => {
  document.getElementById("form-producto").reset();
  abrirModal("modal-producto");
});

document.getElementById("form-producto").addEventListener("submit", async (e) => {
  e.preventDefault();

  const equivalencia = Number(document.getElementById("prod-equivalencia").value);
  const costoMayor = Number(document.getElementById("prod-costo").value);
  const ganMayor = Number(document.getElementById("prod-gan-mayor").value);
  const ganMenor = Number(document.getElementById("prod-gan-menor").value);
  const stockMayor = Number(document.getElementById("prod-stock").value);

  const costoMenor = equivalencia > 0 ? costoMayor / equivalencia : 0;
  const precioMayor = costoMayor + ganMayor;
  const precioMenor = costoMenor + ganMenor;

  const payload = {
    CODIGO: document.getElementById("prod-codigo").value.trim(),
    NOMBRE: document.getElementById("prod-nombre").value.trim(),
    UNIDAD_MAYOR: document.getElementById("prod-unidad-mayor").value.trim(),
    UNIDAD_MENOR: document.getElementById("prod-unidad-menor").value.trim(),
    EQUIVALENCIA: equivalencia,
    COSTO_COMPRA_ACTUAL: costoMayor,
    GANANCIA_MAYOR_FIJA: ganMayor,
    GANANCIA_MENOR_FIJA: ganMenor,
    PRECIO_MAYOR_ACTUAL: precioMayor,
    PRECIO_MENOR_ACTUAL: precioMenor,
    STOCK_MAYOR_ACTUAL: stockMayor,
    ACTIVO: true
  };

  mostrarEstado("Guardando producto...", "info");
  const { error } = await supabaseClient.from("PRODUCTOS").insert([payload]);

  if (error) {
    mostrarEstado("Error al guardar producto: " + error.message, "error");
    return;
  }

  cerrarModal("modal-producto");
  mostrarEstado("Producto guardado correctamente.", "ok");
  await cargarDatos();
});

let productoCompraActual = null;

function abrirModalCompra(productoId) {
  const prod = productosCache.find((p) => String(getProductoId(p)) === String(productoId));
  if (!prod) return;

  productoCompraActual = prod;
  document.getElementById("form-compra").reset();
  document.getElementById("compra-producto-id").value = getProductoId(prod);
  document.getElementById("compra-fecha").value = hoyISO();
  document.getElementById("compra-titulo").textContent = `Compra: ${prod.NOMBRE}`;

  document.getElementById("compra-comparativa").innerHTML = `
    <strong>Referencia anterior:</strong>
    Costo: <strong>${formatMoneda(prod.COSTO_COMPRA_ACTUAL)}</strong> ·
    P. Mayor: <strong>${formatMoneda(prod.PRECIO_MAYOR_ACTUAL)}</strong> ·
    P. Menor: <strong>${formatMoneda(prod.PRECIO_MENOR_ACTUAL)}</strong>
  `;

  actualizarPreviewCompra();
  abrirModal("modal-compra");
}

function actualizarPreviewCompra() {
  const preview = document.getElementById("compra-preview");
  if (!productoCompraActual) return;

  const nuevoCosto = Number(document.getElementById("compra-costo").value);
  const equiv = Number(productoCompraActual.EQUIVALENCIA) || 1;
  const ganMayor = Number(productoCompraActual.GANANCIA_MAYOR_FIJA) || 0;
  const ganMenor = Number(productoCompraActual.GANANCIA_MENOR_FIJA) || 0;

  if (!nuevoCosto && nuevoCosto !== 0) {
    preview.textContent = "Ingresa el nuevo costo para ver el precio resultante.";
    return;
  }

  const nuevoCostoMenor = equiv > 0 ? nuevoCosto / equiv : 0;
  const nuevoPrecioMayor = nuevoCosto + ganMayor;
  const nuevoPrecioMenor = nuevoCostoMenor + ganMenor;

  preview.innerHTML = `
    <strong>Nuevo cálculo:</strong>
    P. Mayor resultante: <strong>${formatMoneda(nuevoPrecioMayor)}</strong> ·
    P. Menor resultante: <strong>${formatMoneda(nuevoPrecioMenor)}</strong>
  `;
}

document.getElementById("compra-costo").addEventListener("input", actualizarPreviewCompra);

document.getElementById("form-compra").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!productoCompraActual) return;

  const prod = productoCompraActual;
  const id = getProductoId(prod);
  const fecha = document.getElementById("compra-fecha").value;
  const cantidadMayor = Number(document.getElementById("compra-cantidad").value);
  const nuevoCosto = Number(document.getElementById("compra-costo").value);

  const equiv = Number(prod.EQUIVALENCIA) || 1;
  const ganMayor = Number(prod.GANANCIA_MAYOR_FIJA) || 0;
  const ganMenor = Number(prod.GANANCIA_MENOR_FIJA) || 0;

  const nuevoCostoMenor = equiv > 0 ? nuevoCosto / equiv : 0;
  const nuevoPrecioMayor = nuevoCosto + ganMayor;
  const nuevoPrecioMenor = nuevoCostoMenor + ganMenor;
  const nuevoStock = (Number(prod.STOCK_MAYOR_ACTUAL) || 0) + cantidadMayor;

  mostrarEstado("Registrando compra y actualizando precios...", "info");

  const compraPayload = {
    PRODUCTO_ID: id,
    FECHA_COMPRA: fecha,
    CANTIDAD_MAYOR: cantidadMayor,
    COSTO_COMPRA_UNIT: nuevoCosto,
    GANANCIA_MAYOR_APLICADA: ganMayor,
    GANANCIA_MENOR_APLICADA: ganMenor,
    PRECIO_MAYOR_RESULTANTE: nuevoPrecioMayor,
    PRECIO_MENOR_RESULTANTE: nuevoPrecioMenor
  };

  const { error: errCompra } = await supabaseClient.from("COMPRAS").insert([compraPayload]);
  if (errCompra) {
    mostrarEstado("Error al guardar compra: " + errCompra.message, "error");
    return;
  }

  const { error: errUpdate } = await supabaseClient
    .from("PRODUCTOS")
    .update({
      COSTO_COMPRA_ACTUAL: nuevoCosto,
      PRECIO_MAYOR_ACTUAL: nuevoPrecioMayor,
      PRECIO_MENOR_ACTUAL: nuevoPrecioMenor,
      STOCK_MAYOR_ACTUAL: nuevoStock
    })
    .eq("PRODUCTO_ID", id);

  if (errUpdate) {
    mostrarEstado("Compra guardada, pero falló actualizar producto: " + errUpdate.message, "error");
    return;
  }

  cerrarModal("modal-compra");
  mostrarEstado("Compra registrada y precios actualizados.", "ok");
  await cargarDatos();
});

document.getElementById("btn-abrir-venta").addEventListener("click", () => prepararVenta());

function prepararVenta(productoIdPreseleccionado = null) {
  const selectProd = document.getElementById("venta-producto");
  selectProd.innerHTML = productosCache
    .map((p) => {
      const id = getProductoId(p);
      return `<option value="${id}">${escapeHTML(p.NOMBRE)} (Stock: ${Number(p.STOCK_MAYOR_ACTUAL) || 0} ${escapeHTML(p.UNIDAD_MAYOR || "")})</option>`;
    })
    .join("");

  document.getElementById("venta-fecha").value = hoyISO();
  document.getElementById("venta-cantidad").value = "";
  document.getElementById("venta-tipo").value = "MAYOR";

  if (productoIdPreseleccionado) {
    selectProd.value = String(productoIdPreseleccionado);
  }

  actualizarResumenVenta();
  abrirModal("modal-venta");
}

function actualizarResumenVenta() {
  const id = document.getElementById("venta-producto").value;
  const tipo = document.getElementById("venta-tipo").value;
  const cantidad = Number(document.getElementById("venta-cantidad").value) || 0;
  const resumen = document.getElementById("venta-resumen");

  const prod = productosCache.find((p) => String(getProductoId(p)) === String(id));
  if (!prod) {
    resumen.textContent = "";
    return;
  }

  const precioUnit =
    tipo === "MAYOR"
      ? Number(prod.PRECIO_MAYOR_ACTUAL) || 0
      : Number(prod.PRECIO_MENOR_ACTUAL) || 0;

  const ganUnit =
    tipo === "MAYOR"
      ? Number(prod.GANANCIA_MAYOR_FIJA) || 0
      : Number(prod.GANANCIA_MENOR_FIJA) || 0;

  const total = precioUnit * cantidad;
  const ganTotal = ganUnit * cantidad;

  resumen.innerHTML = `
    Precio unitario: <strong>${formatMoneda(precioUnit)}</strong> ·
    Total: <strong>${formatMoneda(total)}</strong> ·
    Ganancia estimada: <strong class="gain-highlight">${formatMoneda(ganTotal)}</strong>
  `;
}

document.getElementById("venta-producto").addEventListener("change", actualizarResumenVenta);
document.getElementById("venta-tipo").addEventListener("change", actualizarResumenVenta);
document.getElementById("venta-cantidad").addEventListener("input", actualizarResumenVenta);

document.getElementById("form-venta").addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("venta-producto").value;
  const fecha = document.getElementById("venta-fecha").value;
  const tipo = document.getElementById("venta-tipo").value;
  const cantidad = Number(document.getElementById("venta-cantidad").value);

  const prod = productosCache.find((p) => String(getProductoId(p)) === String(id));
  if (!prod || cantidad <= 0) return;

  const precioUnit =
    tipo === "MAYOR"
      ? Number(prod.PRECIO_MAYOR_ACTUAL) || 0
      : Number(prod.PRECIO_MENOR_ACTUAL) || 0;

  const ganUnit =
    tipo === "MAYOR"
      ? Number(prod.GANANCIA_MAYOR_FIJA) || 0
      : Number(prod.GANANCIA_MENOR_FIJA) || 0;

  const totalVenta = precioUnit * cantidad;
  const gananciaTotal = ganUnit * cantidad;

  const equiv = Number(prod.EQUIVALENCIA) || 1;
  const descuentoMayor = tipo === "MAYOR" ? cantidad : (equiv > 0 ? cantidad / equiv : 0);
  const nuevoStockMayor = Math.max(0, (Number(prod.STOCK_MAYOR_ACTUAL) || 0) - descuentoMayor);

  mostrarEstado("Registrando venta...", "info");

  const { error: errVenta } = await supabaseClient.from("VENTAS").insert([
    {
      PRODUCTO_ID: Number(id) || id,
      FECHA_VENTA: fecha,
      TIPO_VENTA: tipo,
      CANTIDAD: cantidad,
      PRECIO_UNIT_VENTA: precioUnit,
      GANANCIA_UNIT_APLICADA: ganUnit,
      TOTAL_VENTA: totalVenta,
      GANANCIA_TOTAL: gananciaTotal
    }
  ]);

  if (errVenta) {
    mostrarEstado("Error al registrar venta: " + errVenta.message, "error");
    return;
  }

  const { error: errStock } = await supabaseClient
    .from("PRODUCTOS")
    .update({ STOCK_MAYOR_ACTUAL: nuevoStockMayor })
    .eq("PRODUCTO_ID", Number(id) || id);

  if (errStock) {
    mostrarEstado("Venta guardada, pero hubo un error al descontar stock: " + errStock.message, "error");
    return;
  }

  cerrarModal("modal-venta");
  mostrarEstado("Venta registrada correctamente.", "ok");
  await cargarDatos();
});

function abrirModalGanancia(productoId) {
  const prod = productosCache.find((p) => String(getProductoId(p)) === String(productoId));
  if (!prod) return;

  document.getElementById("ganancia-producto-id").value = getProductoId(prod);
  document.getElementById("ganancia-titulo").textContent = `Ganancias: ${prod.NOMBRE}`;
  document.getElementById("ganancia-mayor-input").value = Number(prod.GANANCIA_MAYOR_FIJA) || 0;
  document.getElementById("ganancia-menor-input").value = Number(prod.GANANCIA_MENOR_FIJA) || 0;
  abrirModal("modal-ganancia");
}

document.getElementById("form-ganancia").addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("ganancia-producto-id").value;
  const ganMayor = Number(document.getElementById("ganancia-mayor-input").value);
  const ganMenor = Number(document.getElementById("ganancia-menor-input").value);

  const prod = productosCache.find((p) => String(getProductoId(p)) === String(id));
  if (!prod) return;

  const costoMayor = Number(prod.COSTO_COMPRA_ACTUAL) || 0;
  const equiv = Number(prod.EQUIVALENCIA) || 1;
  const costoMenor = equiv > 0 ? costoMayor / equiv : 0;

  const nuevoPrecioMayor = costoMayor + ganMayor;
  const nuevoPrecioMenor = costoMenor + ganMenor;

  mostrarEstado("Actualizando ganancias y precios...", "info");

  const { error } = await supabaseClient
    .from("PRODUCTOS")
    .update({
      GANANCIA_MAYOR_FIJA: ganMayor,
      GANANCIA_MENOR_FIJA: ganMenor,
      PRECIO_MAYOR_ACTUAL: nuevoPrecioMayor,
      PRECIO_MENOR_ACTUAL: nuevoPrecioMenor
    })
    .eq("PRODUCTO_ID", Number(id) || id);

  if (error) {
    mostrarEstado("Error al actualizar ganancias: " + error.message, "error");
    return;
  }

  cerrarModal("modal-ganancia");
  mostrarEstado("Ganancias y precios actualizados.", "ok");
  await cargarDatos();
});

function escapeHTML(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

cargarDatos();