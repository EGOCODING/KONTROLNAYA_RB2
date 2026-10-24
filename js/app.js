// ======================= КОНФИГ =======================
// Вставь свой access key с https://web3forms.com для реальной отправки заявок на email.
// Оставь пустым — форма будет работать в демо-режиме (показ "спасибо" без отправки).
const WEB3FORMS_ACCESS_KEY = "";

// ======================= УТИЛИТЫ =======================

function formatPrice(n) {
  return Number(n).toLocaleString("ru-RU") + " ₽";
}

function badgeColor(text) {
  const t = (text || "").toLowerCase();
  if (t.includes("хит")) return "success";
  if (t.includes("новинка")) return "primary";
  if (t.includes("скидка")) return "danger";
  return "secondary";
}

function normalizeProduct(p) {
  return {
    ...p,
    badge: p.badge ? { text: p.badge, color: badgeColor(p.badge) } : null
  };
}

async function loadCatalog() {
  const res = await fetch("data/catalog.json", { cache: "no-store" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  return data.map(normalizeProduct);
}

function ratingHTML(r) {
  return `<span class="text-warning">★</span> <span class="text-muted small">${Number(r).toFixed(1)}</span>`;
}

// ======================= КАРТОЧКА =======================

function productCardHTML(p, animate = false) {
  const animClass = animate ? "fade-up" : "";
  const badge = p.badge
    ? ` <span class="badge bg-${p.badge.color}">${p.badge.text}</span>`
    : "";
  const oldPrice = p.oldPrice
    ? ` <span class="text-muted text-decoration-line-through small">${formatPrice(p.oldPrice)}</span>`
    : "";
  const stockBadge = p.inStock
    ? ""
    : ` <span class="badge bg-secondary">Нет в наличии</span>`;

  return `
    <div class="col-12 col-md-6 col-lg-4 ${animClass}">
      <div class="card h-100 shadow-sm">
        <img src="${p.image}" class="card-img-top" alt="${p.title}"
             onerror="this.onerror=null;this.src='https://picsum.photos/seed/${p.article}/600/400'">
        <div class="card-body d-flex flex-column">
          <h5 class="card-title">${p.title}${badge}</h5>
          <div class="mb-2">${ratingHTML(p.rating)}${stockBadge}</div>
          <p class="card-text text-muted small flex-grow-1">${p.description}</p>
          <p class="fw-bold mb-2">${formatPrice(p.price)}${oldPrice}</p>
          <a href="product.html?id=${p.id}" class="btn btn-outline-primary">Подробнее</a>
        </div>
      </div>
    </div>`;
}

function revealCards(container) {
  if (!container) return;
  const cards = container.querySelectorAll(".fade-up");
  cards.forEach((card, i) => {
    card.style.transitionDelay = `${Math.min(i * 60, 400)}ms`;
    requestAnimationFrame(() => card.classList.add("visible"));
  });
}

// ======================= САЙДБАР =======================

function renderCategorySidebar() {
  const el = document.getElementById("categoryFilters");
  if (!el) return;

  const params = new URLSearchParams(window.location.search);
  const current = params.get("category") || "all";
  const cats = [...new Set(window.catalogData.map(p => p.category))];

  const counts = {};
  cats.forEach(c => {
    counts[c] = window.catalogData.filter(p => p.category === c).length;
  });

  el.innerHTML =
    `<li>
       <button class="filter-btn ${current === "all" ? "active" : ""}" data-category="all">
         Все <span class="count">${window.catalogData.length}</span>
       </button>
     </li>` +
    cats.map(c =>
      `<li>
         <button class="filter-btn ${current === c ? "active" : ""}" data-category="${c}">
           ${c} <span class="count">${counts[c]}</span>
         </button>
       </li>`
    ).join("");
}

// ======================= СПИСКИ =======================

function renderPopular(containerId, limit) {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = window.catalogData
    .filter(p => p.inStock)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit)
    .map(p => productCardHTML(p, true)).join("");

  revealCards(el);
}

function renderCatalog(containerId, category, sortBy = "default") {
  const el = document.getElementById(containerId);
  if (!el) return;

  let items = (!category || category === "all")
    ? [...window.catalogData]
    : window.catalogData.filter(p => p.category === category);

  if (sortBy === "price-asc") items.sort((a, b) => a.price - b.price);
  else if (sortBy === "price-desc") items.sort((a, b) => b.price - a.price);
  else if (sortBy === "rating") items.sort((a, b) => b.rating - a.rating);
  else if (sortBy === "new") items.sort((a, b) => b.id - a.id);

  el.innerHTML = items.length
    ? items.map(p => productCardHTML(p, true)).join("")
    : '<div class="col-12"><div class="alert alert-secondary text-center">Товаров в этой категории пока нет.</div></div>';

  revealCards(el);
}

function renderRelated(currentId, category) {
  const el = document.getElementById("relatedGrid");
  if (!el) return;

  const related = window.catalogData
    .filter(p => p.category === category && p.id !== currentId)
    .slice(0, 3);

  el.innerHTML = related.length
    ? related.map(p => productCardHTML(p, true)).join("")
    : '<div class="col-12"><div class="alert alert-secondary">Других товаров этой категории пока нет.</div></div>';

  revealCards(el);
}

// ======================= ФИЛЬТРЫ =======================

function setupCatalogFilters() {
  const filters = document.getElementById("categoryFilters");
  if (!filters) return;

  filters.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-category]");
    if (!btn) return;
    filters.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const sort = document.getElementById("sortSelect")?.value || "default";
    renderCatalog("catalogGrid", btn.dataset.category, sort);
  });
}

function setupSort() {
  const sortSelect = document.getElementById("sortSelect");
  if (!sortSelect) return;

  sortSelect.addEventListener("change", () => {
    const activeFilter = document.querySelector("#categoryFilters .filter-btn.active");
    const cat = activeFilter ? activeFilter.dataset.category : "all";
    renderCatalog("catalogGrid", cat, sortSelect.value);
  });
}

// ======================= ТОВАР =======================

function populateProductSelect(selectId, selectedId) {
  const el = document.getElementById(selectId);
  if (!el) return;

  const params = new URLSearchParams(window.location.search);
  const sel = selectedId || params.get("product");

  el.innerHTML = '<option value="">Выберите товар</option>' +
    window.catalogData.filter(p => p.inStock).map(p =>
      `<option value="${p.id}"${String(p.id) === String(sel) ? " selected" : ""}>${p.title} — ${formatPrice(p.price)}</option>`
    ).join("");
}

function renderProductDetail() {
  const el = document.getElementById("productDetail");
  if (!el) return;

  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get("id"), 10);
  const p = window.catalogData.find(x => x.id === id) || window.catalogData[0];

  if (!p) {
    el.innerHTML = '<div class="alert alert-warning">Товар не найден.</div>';
    return;
  }

  document.title = p.title + " - TechShop";

  const badge = p.badge
    ? ` <span class="badge bg-${p.badge.color}">${p.badge.text}</span>`
    : "";
  const oldPrice = p.oldPrice
    ? `<span class="product-old-price ms-2">${formatPrice(p.oldPrice)}</span>`
    : "";
  const stockBadge = p.inStock
    ? ""
    : `<span class="badge bg-secondary ms-2">Нет в наличии</span>`;

  const stockAlert = p.inStock
    ? `<div class="alert alert-success" role="alert">В наличии — можно заказать сейчас.</div>`
    : `<div class="alert alert-secondary" role="alert">Товара нет в наличии. Оставьте заявку — сообщим о поступлении.</div>`;

  const specs = p.description.split(",").map(s => s.trim()).filter(Boolean);
  const specsHTML = specs.map(s => `<li class="list-group-item">${s}</li>`).join("");

  const buyBtn = p.inStock
    ? `<button type="button" class="btn btn-primary btn-lg" data-bs-toggle="modal" data-bs-target="#orderModal">Купить</button>`
    : `<button type="button" class="btn btn-primary btn-lg" disabled>Нет в наличии</button>`;

  el.innerHTML = `
    <div class="row g-4">
      <div class="col-12 col-lg-6">
        <div class="product-gallery">
          <img src="${p.image}" class="product-main-img" alt="${p.title}"
               onerror="this.onerror=null;this.src='https://picsum.photos/seed/${p.article}/600/500'">
        </div>
      </div>
      <div class="col-12 col-lg-6">
        <div class="product-info">
          <h1 class="h3 mb-2">${p.title}${badge}</h1>
          <p class="product-meta mb-2">Артикул: ${p.article} &middot; Категория: ${p.category}</p>
          <p class="mb-3">${ratingHTML(p.rating)}${stockBadge}</p>
          <div class="mb-3">
            <span class="product-price">${formatPrice(p.price)}</span>${oldPrice}
          </div>
          <p>${p.description}</p>
          ${stockAlert}
          <div class="d-flex flex-wrap gap-2 my-4 product-actions">
            ${buyBtn}
            <a href="order.html?product=${p.id}" class="btn btn-outline-success btn-lg">Оформить заявку</a>
          </div>
          <div class="alert alert-info" role="alert">Бесплатная доставка при заказе от 5000 ₽</div>
        </div>
      </div>
    </div>
    <div class="row mt-5">
      <div class="col-12 col-lg-8">
        <h2 class="h4 mb-3">Характеристики</h2>
        <ul class="list-group mb-4">${specsHTML}</ul>
      </div>
    </div>`;

  populateProductSelect("modalProductSelect", p.id);
  renderRelated(p.id, p.category);
}

// ======================= СВОДКА ЗАКАЗА =======================

function updateOrderSummary() {
  const el = document.getElementById("orderSummaryBody");
  const select = document.getElementById("orderProductSelect");
  if (!el || !select) return;

  const update = () => {
    const id = parseInt(select.value, 10);
    const p = window.catalogData.find(x => x.id === id);

    if (!p) {
      el.innerHTML = '<p class="text-muted small mb-0">Выберите товар, чтобы увидеть итоговую стоимость.</p>';
      return;
    }

    const delivery = p.price >= 5000 ? 0 : 300;
    const total = p.price + delivery;

    el.innerHTML = `
      <div class="d-flex gap-3 mb-3">
        <img src="${p.image}" alt="${p.title}"
             style="width:70px;height:70px;object-fit:cover;border-radius:10px;background:#eef2f7"
             onerror="this.onerror=null;this.src='https://picsum.photos/seed/${p.article}/70/70'">
        <div class="flex-grow-1">
          <div class="fw-semibold small">${p.title}</div>
          <div class="text-muted small">${p.category}</div>
        </div>
      </div>
      <div class="summary-row"><span>Товар</span><span>${formatPrice(p.price)}</span></div>
      <div class="summary-row"><span>Доставка</span><span>${delivery === 0 ? "Бесплатно" : formatPrice(delivery)}</span></div>
      <div class="summary-total"><span>Итого</span><span>${formatPrice(total)}</span></div>`;
  };

  select.addEventListener("change", update);
  update();
}

// ======================= ОТПРАВКА ФОРМ =======================

async function submitForm(form) {
  const formData = new FormData(form);

  // Демо-режим: ключ не задан — просто показываем "спасибо".
  if (!WEB3FORMS_ACCESS_KEY) {
    await new Promise(r => setTimeout(r, 400)); // имитация запроса
    return { ok: true, mock: true };
  }

  // Реальная отправка через Web3Forms.
  formData.append("access_key", WEB3FORMS_ACCESS_KEY);
  formData.append("subject", "Новая заявка с TechShop");
  formData.append("from_name", "TechShop");

  try {
    const res = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      body: formData
    });
    const data = await res.json();
    return { ok: !!data.success, mock: false };
  } catch (err) {
    console.error("Ошибка отправки формы:", err);
    return { ok: false, mock: false };
  }
}

function showSubmitState(button, state) {
  const originalText = button.dataset.originalText || button.textContent;
  button.dataset.originalText = originalText;

  if (state === "loading") {
    button.disabled = true;
    button.textContent = "Отправка...";
  } else {
    button.disabled = false;
    button.textContent = originalText;
  }
}

// ======================= ФОРМЫ =======================

function setupForms() {
  // Форма заказа на order.html
  const orderForm = document.getElementById("orderForm");
  if (orderForm) {
    orderForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!orderForm.checkValidity()) return;

      const btn = orderForm.querySelector('button[type="submit"]');
      showSubmitState(btn, "loading");

      const result = await submitForm(orderForm);

      showSubmitState(btn, "idle");

      const successEl = document.getElementById("successAlert");
      const errorEl = document.getElementById("errorAlert");

      if (result.ok) {
        successEl?.classList.remove("d-none");
        errorEl?.classList.add("d-none");
        orderForm.reset();
        const summary = document.getElementById("orderSummaryBody");
        if (summary) summary.innerHTML = '<p class="text-muted small mb-0">Выберите товар, чтобы увидеть итоговую стоимость.</p>';
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        errorEl?.classList.remove("d-none");
      }
    });
  }

  // Модальные формы
  document.querySelectorAll("form[data-modal-form]").forEach(form => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) return;

      const btn = form.querySelector('button[type="submit"]');
      showSubmitState(btn, "loading");

      const result = await submitForm(form);

      showSubmitState(btn, "idle");

      if (result.ok) {
        const modalEl = form.closest(".modal");
        const instance = bootstrap.Modal.getInstance(modalEl);
        if (instance) instance.hide();
        form.reset();
        alert("Спасибо! Ваша заявка отправлена.");
      } else {
        alert("Не удалось отправить заявку. Попробуйте позже.");
      }
    });
  });
}

// ======================= АНИМАЦИИ =======================

function setupScrollAnimations() {
  const els = document.querySelectorAll(".fade-up:not(.visible)");
  if (!els.length) return;

  if (!("IntersectionObserver" in window)) {
    els.forEach(el => el.classList.add("visible"));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

  els.forEach(el => io.observe(el));
}

// ======================= ОШИБКИ =======================

function showError(message) {
  document.querySelectorAll("main.container").forEach(main => {
    const div = document.createElement("div");
    div.className = "alert alert-danger";
    div.innerHTML = message;
    main.prepend(div);
  });
}

// ======================= ИНИЦИАЛИЗАЦИЯ =======================

async function initPage() {
  if (document.getElementById("popularGrid")) {
    renderPopular("popularGrid", 3);
  }

  if (document.getElementById("catalogGrid")) {
    renderCategorySidebar();
    const params = new URLSearchParams(window.location.search);
    const initialCat = params.get("category") || "all";
    renderCatalog("catalogGrid", initialCat, "default");
    setupCatalogFilters();
    setupSort();
  }

  if (document.getElementById("productDetail")) {
    renderProductDetail();
  } else if (document.getElementById("modalProductSelect")) {
    populateProductSelect("modalProductSelect");
  }

  if (document.getElementById("orderProductSelect")) {
    populateProductSelect("orderProductSelect");
    updateOrderSummary();
  }

  setupForms();
  setupScrollAnimations();
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    window.catalogData = await loadCatalog();
    await initPage();
  } catch (err) {
    console.error("Не удалось загрузить каталог:", err);
    showError(
      "<strong>Не удалось загрузить каталог.</strong><br>" +
      "Откройте проект через локальный сервер: <code>python -m http.server 8000</code>, " +
      "или VS Code → <em>Open with Live Server</em>, или GitHub Pages."
    );
  }
});