import NutrientViewer from "@nutrient-sdk/viewer";
import { t, lang, applyStaticStrings } from "./i18n.js";
import { DEFAULT_PERSONAS, DEFAULT_CATEGORIES, DOCUMENTS, DEFAULT_DOC, SEED_ANNOTATIONS } from "./config.js";
import { loadInstantJson, saveInstantJson, clearAll, loadSettings, saveSettings } from "./store.js";
import { initTooltips } from "./tooltip.js";
import { initPanel } from "./panel.js";

applyStaticStrings();
initTooltips();
initPanel();

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const docId = DOCUMENTS[params.get("doc")] ? params.get("doc") : DEFAULT_DOC;
const doc = DOCUMENTS[docId];
$("doc-title").textContent = doc.title;

const state = {
  instance: null,
  personas: [],
  categories: [],
  personaId: null,
  categoryId: null,
  groupBy: "category",
  query: "",
  collapsed: new Set(), // tree branches folded by the user
  annotations: [], // view models for the tree
  selectedId: null,
  projecting: false,
  projection: { mode: "none", notes: false, toolbar: false },
  snapshot: null, // original noView/note of every annotation while projecting
};

// ---------- Helpers ----------
const hexToRgb = (hex) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};
const rgbToHex = ({ r, g, b }) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
const toColor = (hex) => new NutrientViewer.Color(hexToRgb(hex));
const persona = (id) => state.personas.find((p) => p.id === id);
const category = (id) => state.categories.find((c) => c.id === id);
const currentPersona = () => persona(state.personaId) || state.personas[0];
const currentTheme = () => category(state.categoryId) || state.categories[0];
const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
const newId = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

let toastTimer = null;
function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.add("hidden"), 2500);
}

// ---------- Settings (personas, categories, projection choices) ----------
async function loadAppSettings() {
  const saved = await loadSettings();
  state.personas = saved?.personas?.length ? saved.personas : structuredClone(DEFAULT_PERSONAS);
  state.categories = saved?.categories?.length ? saved.categories : structuredClone(DEFAULT_CATEGORIES);
  state.personaId = persona(saved?.personaId) ? saved.personaId : state.personas[0].id;
  state.categoryId = category(saved?.categoryId) ? saved.categoryId : state.categories[0].id;
  if (saved?.projection) state.projection = { ...state.projection, ...saved.projection };
}

const persistSettings = () =>
  saveSettings({
    personas: state.personas,
    categories: state.categories,
    personaId: state.personaId,
    categoryId: state.categoryId,
    projection: state.projection,
  });

function renderPickers() {
  $("persona-picker").innerHTML = state.personas
    .map(
      (p) => `<button class="chip ${p.id === state.personaId ? "active" : ""}" data-persona="${p.id}" style="--c:${p.color}">
        <span class="avatar" style="background:${p.color}">${escapeHtml(initials(p.name))}</span>${escapeHtml(p.name)}</button>`
    )
    .join("");
  $("category-picker").innerHTML = state.categories
    .map(
      (c) => `<button class="chip ${c.id === state.categoryId ? "active" : ""}" data-category="${c.id}" style="--c:${c.color}">
        <span class="cat-dot" style="background:${c.color}"></span>${escapeHtml(c.name)}</button>`
    )
    .join("") +
    `<button class="chip chip-add" data-action="add-theme" data-tip="${escapeHtml(t.addThemeTip)}">${escapeHtml(t.addCategory)}</button>`;
}

$("persona-picker").addEventListener("click", (e) => {
  const chip = e.target.closest("[data-persona]");
  if (!chip) return;
  state.personaId = chip.dataset.persona;
  persistSettings();
  renderPickers();
  applyDrawingStyle();
});
$("category-picker").addEventListener("click", (e) => {
  if (e.target.closest("[data-action=add-theme]")) return openThemeForm();
  const chip = e.target.closest("[data-category]");
  if (!chip) return;
  state.categoryId = chip.dataset.category;
  persistSettings();
  renderPickers();
  applyDrawingStyle();
});

function renderSettings() {
  const row = (kind, item) => `<li class="settings-row" data-kind="${kind}" data-id="${item.id}">
      <label class="color-swatch" style="background:${item.color}">
        <input type="color" value="${item.color}" data-field="color" aria-label="color" />
      </label>
      <input class="input" type="text" value="${escapeHtml(item.name)}" data-field="name" />
      <button class="icon-btn" data-action="remove" data-tip="${escapeHtml(t.remove)}" aria-label="${escapeHtml(t.remove)}">✕</button>
    </li>`;
  $("persona-list").innerHTML = state.personas.map((p) => row("persona", p)).join("");
  $("category-list").innerHTML = state.categories.map((c) => row("category", c)).join("");
}

function settingsItem(el) {
  const li = el.closest(".settings-row");
  if (!li) return {};
  const list = li.dataset.kind === "persona" ? state.personas : state.categories;
  return { li, kind: li.dataset.kind, item: list.find((x) => x.id === li.dataset.id) };
}

for (const listId of ["persona-list", "category-list"]) {
  // Live preview while dragging in the color picker.
  $(listId).addEventListener("input", (e) => {
    const { item, li } = settingsItem(e.target);
    if (!item || e.target.dataset.field !== "color") return;
    item.color = e.target.value;
    li.querySelector(".color-swatch").style.background = item.color;
    renderPickers();
  });
  $(listId).addEventListener("change", async (e) => {
    const { item, kind } = settingsItem(e.target);
    if (!item) return;
    if (e.target.dataset.field === "name") item.name = e.target.value.trim() || item.name;
    if (e.target.dataset.field === "color") item.color = e.target.value;
    await persistSettings();
    renderPickers();
    if (kind === "persona") await syncPersonaAnnotations(item);
    else await syncThemeAnnotations(item);
  });
  $(listId).addEventListener("click", async (e) => {
    if (!e.target.closest('[data-action="remove"]')) return;
    const { item, kind } = settingsItem(e.target);
    if (!item) return;
    const list = kind === "persona" ? state.personas : state.categories;
    if (list.length === 1) return toast(kind === "persona" ? t.lastPersona : t.lastCategory);
    if (!confirm(kind === "persona" ? t.confirmDeletePersona : t.confirmDeleteCategory)) return;
    list.splice(list.indexOf(item), 1);
    if (!persona(state.personaId)) state.personaId = state.personas[0].id;
    if (!category(state.categoryId)) state.categoryId = state.categories[0].id;
    await persistSettings();
    renderSettings();
    renderPickers();
    applyDrawingStyle();
    renderTree();
  });
}

// Light highlighter colors for themes, darker colors for persona avatars (white initials).
const PALETTES = {
  category: ["#FFD43B", "#74C0FC", "#8CE99A", "#FF8787", "#B197FC", "#FFA94D", "#63E6BE", "#F783AC", "#C0EB75", "#E599F7"],
  persona: ["#364FC7", "#0B7285", "#862E9C", "#C2255C", "#2B8A3E", "#D9480F", "#5F3DC4", "#1864AB", "#A61E4D", "#495057"],
};
const nextColor = (kind, list) => {
  const palette = PALETTES[kind];
  return palette.find((c) => !list.some((x) => x.color.toLowerCase() === c.toLowerCase())) || palette[list.length % palette.length];
};

function addSettingsItem(kind) {
  const list = kind === "persona" ? state.personas : state.categories;
  const item = {
    id: newId(kind === "persona" ? "p" : "t"),
    name: kind === "persona" ? t.newPersona : t.newCategory,
    color: nextColor(kind, list),
  };
  list.push(item);
  persistSettings();
  renderSettings();
  renderPickers();
  const input = document.querySelector(`.settings-row[data-id="${item.id}"] input[data-field="name"]`);
  input?.focus();
  input?.select();
}
$("add-persona").addEventListener("click", () => addSettingsItem("persona"));

// Quick theme creation from the composer: name + color, then it becomes the current theme.
function openThemeForm() {
  $("theme-form").classList.remove("hidden");
  $("theme-name").value = "";
  $("theme-color").value = nextColor("category", state.categories);
  $("theme-swatch").style.background = $("theme-color").value;
  $("theme-name").focus();
}
const closeThemeForm = () => $("theme-form").classList.add("hidden");
$("theme-color").addEventListener("input", (e) => ($("theme-swatch").style.background = e.target.value));
$("theme-cancel").addEventListener("click", closeThemeForm);
$("theme-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = $("theme-name").value.trim();
  if (!name) return $("theme-name").focus();
  const item = { id: newId("t"), name, color: $("theme-color").value };
  state.categories.push(item);
  state.categoryId = item.id;
  await persistSettings();
  closeThemeForm();
  renderSettings();
  renderPickers();
  applyDrawingStyle();
  renderTree();
  toast(t.themeCreated.replace("{name}", name));
});
$("add-category").addEventListener("click", () => addSettingsItem("category"));

$("reset-demo").addEventListener("click", async () => {
  if (!confirm(t.confirmReset)) return;
  await clearAll();
  location.href = `${location.pathname}${location.search}`;
});

// Tabs
document.querySelectorAll(".tab").forEach((tab) =>
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("active", x === tab));
    $("tab-annotations").classList.toggle("hidden", tab.dataset.tab !== "annotations");
    $("tab-settings").classList.toggle("hidden", tab.dataset.tab !== "settings");
  })
);

// ---------- Viewer ----------
// preloadWorker and load must receive the same baseUrl and licenseKey.
const SDK_CONFIG = {
  baseUrl: `${location.origin}/`,
  licenseKey: import.meta.env.VITE_NUTRIENT_LICENSE_KEY || undefined,
};
NutrientViewer.preloadWorker({ ...SDK_CONFIG }).catch(() => {});

async function start() {
  if (params.has("reset")) {
    await clearAll();
    params.delete("reset");
    history.replaceState(null, "", `${location.pathname}${params.toString() ? "?" + params : ""}${location.hash}`);
  }
  await loadAppSettings();
  renderPickers();
  renderSettings();

  let stored = await loadInstantJson(docId);
  if (!stored || typeof stored.format !== "string") stored = null;
  // Annotations are keyed by docId, so drop the PDF fingerprint: a re-exported copy of the same file keeps its notes.
  if (stored) delete stored.pdfId;

  const instance = await NutrientViewer.load({
    container: "#viewer",
    document: doc.url,
    ...SDK_CONFIG,
    instantJSON: stored || undefined,
    locale: document.documentElement.lang,
    toolbarItems: [
      { type: "sidebar-thumbnails" },
      { type: "pager" },
      { type: "zoom-out" },
      { type: "zoom-in" },
      { type: "zoom-mode" },
      { type: "spacer" },
      { type: "text-highlighter" },
      { type: "search" },
    ],
  });
  state.instance = instance;
  window.nutrientInstance = instance; // handy for debugging in the console

  applyDrawingStyle();
  if (!stored) await seedAnnotations();

  instance.addEventListener("annotations.create", onAnnotationsCreated);
  instance.addEventListener("annotations.change", onAnnotationsChanged);
  instance.addEventListener("annotationSelection.change", (selected) => {
    const first = selected && selected.first ? selected.first() : null;
    if (first) selectAnnotation(first.id);
  });

  await refreshAnnotations();
  await openFromHash();
  window.addEventListener("hashchange", openFromHash);
}

// Highlights made with the toolbar or the text selection popup take the current theme's color.
// The current persona is recorded as the author.
function applyDrawingStyle() {
  const { instance } = state;
  if (!instance) return;
  instance.setAnnotationCreatorName(currentPersona().name);
  instance.setAnnotationPresets((presets) => ({
    ...presets,
    highlight: { ...(presets.highlight || {}), color: toColor(currentTheme().color) },
  }));
}

async function onAnnotationsCreated(created) {
  const { instance } = state;
  const p = currentPersona();
  const theme = currentTheme();
  const updates = [];
  for (const annotation of created.toArray()) {
    if (!(annotation instanceof NutrientViewer.Annotations.HighlightAnnotation)) continue;
    if (annotation.customData?.personaId) continue; // seeded or imported
    let text = "";
    try {
      text = (await instance.getMarkupAnnotationText(annotation)) || "";
    } catch {
      /* text extraction is best effort */
    }
    updates.push(
      annotation
        .set("color", toColor(theme.color))
        .set("creatorName", p.name)
        .set("customData", { personaId: p.id, categoryId: theme.id, label: text.trim().slice(0, 80) })
    );
  }
  if (updates.length) {
    await instance.update(updates);
    await refreshAnnotations();
    selectAnnotation(updates[0].id);
  }
}

let saveTimer = null;
async function onAnnotationsChanged() {
  if (state.projecting) return; // changes made for the projection are never saved
  await refreshAnnotations();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const json = await state.instance.exportInstantJSON();
    await saveInstantJson(docId, json);
  }, 300);
}

async function seedAnnotations() {
  const { instance } = state;
  const annotations = [];
  for (const seed of SEED_ANNOTATIONS) {
    const hit = (await instance.search(seed.text)).first();
    const p = persona(seed.persona);
    const theme = category(seed.theme);
    if (!hit || !p || !theme) {
      console.warn("Seed skipped:", seed.text);
      continue;
    }
    annotations.push(
      new NutrientViewer.Annotations.HighlightAnnotation({
        id: seed.id,
        pageIndex: hit.pageIndex,
        rects: hit.rectsOnPage,
        boundingBox: NutrientViewer.Geometry.Rect.union(hit.rectsOnPage),
        color: toColor(theme.color),
        creatorName: p.name,
        note: seed.note || null,
        customData: { personaId: p.id, categoryId: theme.id, label: seed.label },
      })
    );
  }
  if (annotations.length) await instance.create(annotations);
  await saveInstantJson(docId, await instance.exportInstantJSON());
}

async function getAllAnnotations() {
  const { instance } = state;
  const pages = await Promise.all(Array.from({ length: instance.totalPageCount }, (_, i) => instance.getAnnotations(i)));
  return pages.flatMap((list) => list.toArray()).filter((a) => a instanceof NutrientViewer.Annotations.HighlightAnnotation);
}

// Renaming a persona updates the author name of the highlights they already made.
async function syncPersonaAnnotations(p) {
  if (!state.instance) return;
  const mine = (await getAllAnnotations()).filter((a) => a.customData?.personaId === p.id && a.creatorName !== p.name);
  if (mine.length) await state.instance.update(mine.map((a) => a.set("creatorName", p.name)));
  applyDrawingStyle();
  await refreshAnnotations();
}

// Recoloring a theme recolors every highlight in that theme.
async function syncThemeAnnotations(theme) {
  if (!state.instance) return;
  const inTheme = (await getAllAnnotations()).filter((a) => a.customData?.categoryId === theme.id);
  if (inTheme.length) await state.instance.update(inTheme.map((a) => a.set("color", toColor(theme.color))));
  applyDrawingStyle();
  await refreshAnnotations();
}

async function refreshAnnotations() {
  const all = await getAllAnnotations();
  state.annotations = all
    .map((a) => ({
      id: a.id,
      pageIndex: a.pageIndex,
      top: a.boundingBox.top,
      personaId: a.customData?.personaId || null,
      authorName: a.creatorName || t.unknownPersona,
      color: a.color ? rgbToHex(a.color) : "#cccccc",
      label: a.customData?.label || t.untitled,
      categoryId: a.customData?.categoryId || null,
      note: a.note || "",
      visible: !a.noView,
    }))
    .sort((x, y) => x.pageIndex - y.pageIndex || x.top - y.top);
  $("count-badge").textContent = state.annotations.length;
  renderTree();
}

// ---------- Visual tree ----------
// Two levels of branches, then the annotations as leaves. Every level has a checkbox that shows or hides
// its highlights in the document; the projection can reuse that choice.
const LEVELS = {
  category: {
    key: (a) => (category(a.categoryId) ? a.categoryId : "__none"),
    head: (k) => {
      const c = category(k);
      return { name: c ? c.name : t.noCategory, color: c ? c.color : "#adb5bd" };
    },
    order: () => [...state.categories.map((c) => c.id), "__none"],
  },
  persona: {
    key: (a) => (persona(a.personaId) ? a.personaId : "__none"),
    head: (k) => {
      const p = persona(k);
      return { name: p ? p.name : t.unknownPersona, color: p ? p.color : "#adb5bd", avatar: true };
    },
    order: () => [...state.personas.map((p) => p.id), "__none"],
  },
  page: {
    key: (a) => String(a.pageIndex),
    head: (k) => ({ name: `Page ${Number(k) + 1}`, color: null, icon: "📄" }),
    order: null,
  },
};
const SUBLEVEL = { category: "page", persona: "category", page: "category" };

function groupItems(items, level) {
  const def = LEVELS[level];
  const map = new Map();
  for (const a of items) {
    const k = def.key(a);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(a);
  }
  const order = def.order ? def.order() : null;
  return [...map.entries()].sort(([x], [y]) => (order ? order.indexOf(x) - order.indexOf(y) : Number(x) - Number(y)));
}

const checkState = (items) => {
  const n = items.filter((a) => a.visible).length;
  return n === 0 ? "none" : n === items.length ? "all" : "some";
};

function branchRow(path, head, items, depth) {
  const collapsed = state.collapsed.has(path);
  const visibleCount = items.filter((a) => a.visible).length;
  const marker = head.avatar
    ? `<span class="avatar xs" style="background:${head.color}">${escapeHtml(initials(head.name))}</span>`
    : head.color
      ? `<span class="vt-dot" style="background:${head.color}"></span>`
      : `<span class="vt-icon">${head.icon || ""}</span>`;
  return `<div class="vt-row vt-branch depth-${depth}" data-path="${escapeHtml(path)}" style="--c:${head.color || "#adb5bd"}">
      <button class="vt-toggle ${collapsed ? "" : "open"}" data-action="toggle" aria-label="toggle"></button>
      <input type="checkbox" class="vt-check" data-ids="${items.map((a) => a.id).join(",")}" data-state="${checkState(items)}" data-tip="${escapeHtml(t.visibleTip)}" />
      ${marker}
      <span class="vt-name" data-action="toggle">${escapeHtml(head.name)}</span>
      <span class="vt-count">${visibleCount < items.length ? `${visibleCount}/` : ""}${items.length}</span>
    </div>`;
}

function leafHtml(a) {
  const p = persona(a.personaId);
  const c = category(a.categoryId);
  const selected = a.id === state.selectedId;
  const authorName = p ? p.name : a.authorName;
  return `<li class="vt-leaf ${selected ? "selected" : ""} ${a.visible ? "" : "is-hidden"}" data-id="${a.id}" style="--hl:${a.color}">
    <div class="vt-row vt-leaf-row">
      <input type="checkbox" class="vt-check" data-ids="${a.id}" data-state="${a.visible ? "all" : "none"}" data-tip="${escapeHtml(t.visibleTip)}" />
      <div class="leaf-card" data-action="open">
        <span class="leaf-mark" style="background:${a.color}"></span>
        <div class="leaf-text">
          <div class="leaf-label">${escapeHtml(a.label)}</div>
          <div class="leaf-meta">
            <span class="avatar xs" style="background:${p ? p.color : "#868e96"}">${escapeHtml(initials(authorName))}</span>${escapeHtml(authorName)}
            <span>· ${t.page} ${a.pageIndex + 1}</span>
            ${c && state.groupBy !== "category" ? `<span class="tag" style="--c:${c.color}">${escapeHtml(c.name)}</span>` : ""}
            ${a.note ? `<span class="note-flag" data-tip="${escapeHtml(a.note)}">💬</span>` : ""}
            ${a.visible ? "" : `<span class="hidden-flag">${t.hiddenInDoc}</span>`}
          </div>
        </div>
      </div>
    </div>
    ${selected ? editorHtml(a, c) : ""}
  </li>`;
}

function editorHtml(a, c) {
  return `<div class="leaf-editor">
    <label class="field"><span>${t.title}</span>
      <input class="input" type="text" data-field="label" value="${escapeHtml(a.label)}" /></label>
    <label class="field"><span>${t.category}</span>
      <select class="input" data-field="category">
        ${state.categories.map((x) => `<option value="${x.id}" ${x.id === a.categoryId ? "selected" : ""}>${escapeHtml(x.name)}</option>`).join("")}
        ${c ? "" : `<option value="" selected>${t.noCategory}</option>`}
      </select></label>
    <label class="field"><span>${t.comment}</span>
      <textarea class="input" rows="3" data-field="note" placeholder="${escapeHtml(t.commentPlaceholder)}">${escapeHtml(a.note)}</textarea></label>
    <div class="card-actions">
      <button class="btn btn-small" data-action="copy" data-tip="${escapeHtml(t.copyLinkTip)}">🔗 ${t.copyLink}</button>
      <button class="btn btn-small btn-danger-ghost" data-action="delete">${t.delete}</button>
    </div>
  </div>`;
}

function renderTree() {
  const q = state.query.toLowerCase();
  const items = state.annotations.filter((a) => !q || a.label.toLowerCase().includes(q) || a.note.toLowerCase().includes(q));

  // Keep focus and caret if the user is typing in the inline editor.
  const active = document.activeElement;
  const focusField = active?.closest?.(".vt-leaf")?.dataset.id === state.selectedId ? active.dataset.field : null;
  const caret = focusField && "selectionStart" in active ? active.selectionStart : null;

  if (!items.length) {
    $("tree").innerHTML = `<p class="empty">${state.annotations.length ? t.noMatch : t.empty}</p>`;
    return;
  }

  const top = state.groupBy;
  const sub = SUBLEVEL[top];
  const html = groupItems(items, top)
    .map(([k, groupItemsList]) => {
      const path = `${top}:${k}`;
      const children = groupItems(groupItemsList, sub)
        .map(([sk, leaves]) => {
          const subPath = `${path}/${sub}:${sk}`;
          return `<li class="vt-node">
            ${branchRow(subPath, LEVELS[sub].head(sk), leaves, 2)}
            ${state.collapsed.has(subPath) ? "" : `<ul class="vt-children">${leaves.map(leafHtml).join("")}</ul>`}
          </li>`;
        })
        .join("");
      const head = LEVELS[top].head(k);
      return `<li class="vt-node vt-root" style="--c:${head.color || "#adb5bd"}">
        ${branchRow(path, head, groupItemsList, 1)}
        ${state.collapsed.has(path) ? "" : `<ul class="vt-children">${children}</ul>`}
      </li>`;
    })
    .join("");
  $("tree").innerHTML = `<ul class="vtree">${html}</ul>`;

  // Tri-state checkboxes.
  $("tree").querySelectorAll(".vt-check").forEach((cb) => {
    cb.checked = cb.dataset.state === "all";
    cb.indeterminate = cb.dataset.state === "some";
  });

  if (focusField) {
    const el = document.querySelector(`.vt-leaf[data-id="${CSS.escape(state.selectedId)}"] [data-field="${focusField}"]`);
    el?.focus();
    if (el && caret != null) el.setSelectionRange(caret, caret);
  }
}

$("tree").addEventListener("click", async (e) => {
  const action = e.target.closest("[data-action]")?.dataset.action;
  if (action === "toggle") {
    const path = e.target.closest(".vt-branch").dataset.path;
    state.collapsed.has(path) ? state.collapsed.delete(path) : state.collapsed.add(path);
    renderTree();
    return;
  }
  const id = e.target.closest(".vt-leaf")?.dataset.id;
  if (!id) return;
  if (action === "open") goToAnnotation(id);
  if (action === "copy") copyLink(id);
  if (action === "delete") {
    await state.instance.delete(id);
    state.selectedId = null;
  }
});

$("tree").addEventListener("change", (e) => {
  if (e.target.classList.contains("vt-check")) {
    setVisible(e.target.dataset.ids.split(","), e.target.checked);
    return;
  }
  const field = e.target.dataset.field;
  const id = e.target.closest(".vt-leaf")?.dataset.id;
  if (!field || !id) return;
  const value = e.target.value;
  patchAnnotation(id, (a) => {
    if (field === "note") return a.set("note", value || null);
    if (field === "category") {
      // Moving a highlight to another theme also gives it that theme's color.
      const theme = category(value);
      const moved = a.set("customData", { ...(a.customData || {}), categoryId: value || null });
      return theme ? moved.set("color", toColor(theme.color)) : moved;
    }
    return a.set("customData", { ...(a.customData || {}), label: value || null });
  });
});

async function setVisible(ids, visible) {
  const set = new Set(ids);
  const targets = (await getAllAnnotations()).filter((a) => set.has(a.id) && a.noView === visible);
  if (targets.length) await state.instance.update(targets.map((a) => a.set("noView", !visible)));
}

$("show-all").addEventListener("click", () => setVisible(state.annotations.map((a) => a.id), true));
$("hide-all").addEventListener("click", () => setVisible(state.annotations.map((a) => a.id), false));
$("expand-all").addEventListener("click", () => {
  state.collapsed.clear();
  renderTree();
});
$("collapse-all").addEventListener("click", () => {
  document.querySelectorAll(".vt-branch.depth-1").forEach((row) => state.collapsed.add(row.dataset.path));
  renderTree();
});

async function patchAnnotation(id, fn) {
  const annotation = (await getAllAnnotations()).find((a) => a.id === id);
  if (annotation) await state.instance.update(fn(annotation));
}

$("search").addEventListener("input", (e) => {
  state.query = e.target.value;
  renderTree();
});
document.querySelectorAll("#group-switch button").forEach((btn) =>
  btn.addEventListener("click", () => {
    document.querySelectorAll("#group-switch button").forEach((b) => b.classList.toggle("active", b === btn));
    state.groupBy = btn.dataset.group;
    state.collapsed.clear();
    renderTree();
  })
);

function selectAnnotation(id) {
  if (state.selectedId === id) return;
  state.selectedId = id;
  // Unfold the branches that contain it.
  const a = state.annotations.find((x) => x.id === id);
  if (a) {
    const top = `${state.groupBy}:${LEVELS[state.groupBy].key(a)}`;
    const sub = SUBLEVEL[state.groupBy];
    state.collapsed.delete(top);
    state.collapsed.delete(`${top}/${sub}:${LEVELS[sub].key(a)}`);
  }
  renderTree();
  document.querySelector(`.vt-leaf[data-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "nearest" });
}

async function goToAnnotation(id, { updateHash = true } = {}) {
  const annotation = (await getAllAnnotations()).find((a) => a.id === id);
  if (!annotation) {
    toast(t.notFound);
    return false;
  }
  state.instance.jumpToRect(annotation.pageIndex, annotation.boundingBox);
  if (!state.projecting && !annotation.noView) state.instance.setSelectedAnnotations(NutrientViewer.Immutable.List([id]));
  selectAnnotation(id);
  if (updateHash) history.replaceState(null, "", `${location.pathname}${location.search}#a=${encodeURIComponent(id)}`);
  return true;
}

// Deep link format: /?doc=<docId>#a=<annotationId>
// ---------- Sharing ----------
// Annotations live in each browser, so a share link carries them: the annotations (Instant JSON objects),
// plus the themes and personas they use, compressed in the URL hash. The hash never reaches the server.
// Format: /?doc=<docId>#a=<annotationId>&s=<payload>  (a: annotation to open, s: shared annotations)
const toBase64Url = (bytes) => {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromBase64Url = (text) => Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const pipe = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());

async function encodeShare(annotations) {
  const themeIds = new Set(annotations.map((a) => a.customData?.categoryId));
  const personaIds = new Set(annotations.map((a) => a.customData?.personaId));
  const payload = {
    v: 1,
    themes: state.categories.filter((c) => themeIds.has(c.id)),
    personas: state.personas.filter((p) => personaIds.has(p.id)),
    annotations: annotations.map((a) => {
      const json = NutrientViewer.Annotations.toSerializableObject(a);
      delete json.pdfObjectId;
      return json;
    }),
  };
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  return toBase64Url(await pipe(bytes, new CompressionStream("deflate-raw")));
}

async function decodeShare(text) {
  const bytes = await pipe(fromBase64Url(text), new DecompressionStream("deflate-raw"));
  return JSON.parse(new TextDecoder().decode(bytes));
}

// Adds the shared annotations to this browser (updating the ones that already exist) and keeps them.
async function importShare(payload) {
  const { instance } = state;
  let settingsChanged = false;
  for (const theme of payload.themes || []) {
    if (!category(theme.id)) {
      state.categories.push(theme);
      settingsChanged = true;
    }
  }
  for (const p of payload.personas || []) {
    if (!persona(p.id)) {
      state.personas.push(p);
      settingsChanged = true;
    }
  }
  if (settingsChanged) {
    await persistSettings();
    renderSettings();
    renderPickers();
  }
  const existing = new Map((await getAllAnnotations()).map((a) => [a.id, a]));
  const toCreate = [];
  const toUpdate = [];
  for (const json of payload.annotations || []) {
    // Keep the sender's id: the link points to it, and a second import updates instead of duplicating.
    const shared = NutrientViewer.Annotations.fromSerializableObject(json).set("id", json.id);
    (existing.has(shared.id) ? toUpdate : toCreate).push(shared);
  }
  if (toCreate.length) await instance.create(toCreate);
  if (toUpdate.length) await instance.update(toUpdate);
  await saveInstantJson(docId, await instance.exportInstantJSON());
  await refreshAnnotations();
  return toCreate.length + toUpdate.length;
}

async function openFromHash() {
  const params = new URLSearchParams(location.hash.slice(1));
  const shared = params.get("s");
  if (shared) {
    try {
      const n = await importShare(await decodeShare(shared));
      toast(t.sharedImported.replace("{n}", n));
    } catch (err) {
      console.error(err);
      toast(t.sharedInvalid);
    }
    // Keep only the annotation id in the address bar once the shared annotations are stored.
    params.delete("s");
    history.replaceState(null, "", `${location.pathname}${location.search}${params.toString() ? "#" + params : ""}`);
  }
  const id = params.get("a");
  if (id) await goToAnnotation(id, { updateHash: false });
}

// The language is part of the link: each language has its own demo case file.
const shareUrl = (hash) => `${location.origin}${location.pathname}?lang=${lang}&doc=${docId}${hash ? "#" + hash : ""}`;

async function copyToClipboard(url, message) {
  try {
    await navigator.clipboard.writeText(url);
    toast(message);
  } catch {
    prompt(t.copyLink, url);
  }
}

// One annotation: the link opens the case file on it, for anyone.
async function copyLink(id) {
  const annotation = (await getAllAnnotations()).find((a) => a.id === id);
  if (!annotation) return;
  const payload = await encodeShare([annotation]);
  await copyToClipboard(shareUrl(`a=${encodeURIComponent(id)}&s=${payload}`), t.linkCopied);
}

// The whole case file with all its annotations.
$("share-btn").addEventListener("click", async () => {
  if (!state.instance) return;
  const all = await getAllAnnotations();
  const payload = all.length ? await encodeShare(all) : "";
  await copyToClipboard(shareUrl(payload ? `s=${payload}` : ""), t.shareCopied.replace("{n}", all.length));
});

// ---------- Projection ----------
// The dialog chooses what the courtroom sees: no highlights, the ones ticked in the tree, or all of them,
// plus comments and the toolbar. Original values are kept in a snapshot and restored on exit; nothing is saved.
function openProjectionDialog() {
  const visible = state.annotations.filter((a) => a.visible).length;
  $("proj-tree-label").textContent = `${t.projTree} (${visible})`;
  $("proj-all-label").textContent = `${t.projAll} (${state.annotations.length})`;
  document.querySelector(`input[name="proj-mode"][value="${state.projection.mode}"]`).checked = true;
  $("proj-notes").checked = state.projection.notes;
  $("proj-toolbar").checked = state.projection.toolbar;
  $("proj-start").textContent = state.projecting ? t.projApply : t.projStart;
  syncProjectionOptions();
  $("projection-dialog").classList.remove("hidden");
  $("proj-start").focus();
}
const closeProjectionDialog = () => $("projection-dialog").classList.add("hidden");
// Comments only make sense when some highlights are shown.
function syncProjectionOptions() {
  const none = document.querySelector('input[name="proj-mode"]:checked')?.value === "none";
  $("proj-notes").disabled = none;
  $("proj-notes").closest(".option").classList.toggle("disabled", none);
}
document.querySelectorAll('input[name="proj-mode"]').forEach((r) => r.addEventListener("change", syncProjectionOptions));

$("projection-btn").addEventListener("click", openProjectionDialog);
$("projection-edit").addEventListener("click", openProjectionDialog);
$("proj-cancel").addEventListener("click", closeProjectionDialog);
$("projection-dialog").addEventListener("click", (e) => {
  if (e.target.id === "projection-dialog") closeProjectionDialog();
});
$("proj-start").addEventListener("click", async () => {
  state.projection = {
    mode: document.querySelector('input[name="proj-mode"]:checked').value,
    notes: $("proj-notes").checked,
    toolbar: $("proj-toolbar").checked,
  };
  persistSettings();
  closeProjectionDialog();
  await applyProjection();
});

async function applyProjection() {
  const { instance } = state;
  const all = await getAllAnnotations();
  if (!state.projecting) {
    state.snapshot = new Map(all.map((a) => [a.id, { noView: a.noView, note: a.note }]));
    state.projecting = true;
  }
  const { mode, notes, toolbar } = state.projection;
  instance.setSelectedAnnotations(null);
  let shown = 0;
  const updates = [];
  for (const a of all) {
    const orig = state.snapshot.get(a.id) || { noView: a.noView, note: a.note };
    const show = mode === "all" || (mode === "tree" && !orig.noView);
    if (show) shown++;
    const note = show && notes ? orig.note : null;
    if (a.noView !== !show || a.note !== note) updates.push(a.set("noView", !show).set("note", note));
  }
  if (updates.length) await instance.update(updates);
  instance.setViewState((v) => v.set("showToolbar", toolbar).set("sidebarMode", null));
  document.body.classList.add("projecting");
  $("projection-banner").classList.remove("hidden");
  $("projection-status").textContent = shown ? t.projectingSome.replace("{n}", shown) : t.projectingNone;
}

async function exitProjection() {
  if (!state.projecting) return;
  const { instance } = state;
  const all = await getAllAnnotations();
  const updates = all
    .filter((a) => state.snapshot.has(a.id))
    .map((a) => {
      const orig = state.snapshot.get(a.id);
      return a.set("noView", orig.noView).set("note", orig.note);
    });
  if (updates.length) await instance.update(updates);
  state.projecting = false;
  state.snapshot = null;
  instance.setViewState((v) => v.set("showToolbar", true));
  document.body.classList.remove("projecting");
  $("projection-banner").classList.add("hidden");
  await refreshAnnotations();
}
$("projection-exit").addEventListener("click", exitProjection);
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!$("projection-dialog").classList.contains("hidden")) closeProjectionDialog();
  else if (state.projecting) exitProjection();
});

// ---------- Offline ----------
// "Prepare offline" downloads every file listed in /offline-manifest.json (written at build time) into the
// service worker cache. The app is ready offline only when the cached manifest matches the deployed one.
const OFFLINE_CACHE = "hearing-annotations-v3";
const OFFLINE_FLAG = "offline.version";
let offlineBusy = false;

function renderOfflineState(ready, progress = null) {
  const online = navigator.onLine;
  $("offline-dot").className = `dot ${!online ? "dot-off" : ready ? "dot-ready" : progress != null ? "dot-busy" : ""}`;
  $("offline-label").textContent =
    progress != null ? t.offlineProgress.replace("{p}", progress) : !online ? t.offlineNow : ready ? t.offlineReady : t.makeOffline;
}

async function fetchManifest() {
  try {
    const res = await fetch("/offline-manifest.json", { cache: "no-store" });
    if (res.ok) return await res.json();
  } catch {
    /* offline: fall back to the cached copy */
  }
  const cached = "caches" in window ? await caches.match("/offline-manifest.json") : null;
  return cached ? cached.json() : null;
}

async function isOfflineReady() {
  if (!("caches" in window) || !navigator.serviceWorker?.controller) return false;
  const manifest = await fetchManifest();
  let flag = null;
  try {
    flag = localStorage.getItem(OFFLINE_FLAG);
  } catch {
    /* storage blocked */
  }
  return !!manifest && flag === manifest.version && !!(await caches.match(doc.url));
}

async function prepareOffline({ silent = false } = {}) {
  if (offlineBusy) return;
  const reg = await registerServiceWorker();
  if (!reg) return silent ? null : toast(t.noOfflineSupport);
  offlineBusy = true;
  try {
    await navigator.serviceWorker.ready;
    const res = await fetch("/offline-manifest.json", { cache: "no-store" });
    if (!res.ok) throw new Error("offline-manifest.json not found");
    const manifest = await res.json();
    const cache = await caches.open(OFFLINE_CACHE);
    const files = [...manifest.files, "/offline-manifest.json"];
    const missing = [];
    for (const path of files) {
      // The page, the case files and the manifest are refreshed every time; versioned files only when missing.
      const always = path === "/" || path.startsWith("/samples/") || path === "/offline-manifest.json";
      if (always || !(await cache.match(path))) missing.push(path);
    }
    let done = 0;
    const next = async () => {
      while (missing.length) {
        const path = missing.shift();
        // Each file gets 90 seconds and one retry, so a stalled request cannot block the whole download.
        let response = null;
        for (let attempt = 0; attempt < 2 && !response?.ok; attempt++) {
          try {
            response = await fetch(path, { cache: "no-cache", signal: AbortSignal.timeout(90000) });
          } catch {
            response = null;
          }
        }
        if (!response?.ok) throw new Error(`${path}: ${response ? response.status : "timeout"}`);
        await cache.put(path, response);
        done += 1;
        renderOfflineState(false, Math.round((done / (done + missing.length)) * 100));
      }
    };
    await Promise.all(Array.from({ length: 6 }, next));
    try {
      localStorage.setItem(OFFLINE_FLAG, manifest.version);
    } catch {
      /* storage blocked */
    }
    renderOfflineState(true);
    if (!silent) toast(t.offlineDone);
  } catch (err) {
    console.error(err);
    renderOfflineState(false);
    if (!silent) toast(t.offlineFailed);
  } finally {
    offlineBusy = false;
  }
}

window.addEventListener("online", async () => renderOfflineState(await isOfflineReady()));
window.addEventListener("offline", async () => renderOfflineState(await isOfflineReady()));

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || import.meta.env.DEV) return null;
  return navigator.serviceWorker.register("/sw.js");
}

$("offline-btn").addEventListener("click", () => prepareOffline());
registerServiceWorker().then(async () => {
  const ready = await isOfflineReady();
  renderOfflineState(ready);
  // A new version was deployed after the user prepared offline: refresh the cache in the background.
  let flag = null;
  try {
    flag = localStorage.getItem(OFFLINE_FLAG);
  } catch {
    /* storage blocked */
  }
  if (!ready && flag && navigator.onLine) prepareOffline({ silent: true });
});

start().catch((err) => {
  console.error(err);
  $("viewer").innerHTML = `<pre class="error">${escapeHtml(err.message || err)}</pre>`;
});
