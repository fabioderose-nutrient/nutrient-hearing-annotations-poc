// Right-hand panel: drag its left edge to resize, toggle it from the top bar.
// Wide screens: the panel sits next to the document. Narrow screens (< 1024 px): it slides over the document as a drawer.
const DEFAULT_WIDTH = 400;
const MIN_WIDTH = 300;
const NARROW = window.matchMedia("(max-width: 1023px)");

const prefs = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(`panel.${key}`);
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(`panel.${key}`, JSON.stringify(value));
    } catch {
      /* storage unavailable: keep the default */
    }
  },
};

export function initPanel() {
  const sidebar = document.getElementById("sidebar");
  const handle = document.getElementById("resize-handle");
  const toggle = document.getElementById("panel-toggle");
  const scrim = document.getElementById("scrim");

  let wideOpen = prefs.get("open", true);
  let narrowOpen = false;

  const maxWidth = () => Math.max(MIN_WIDTH, Math.floor(window.innerWidth * (NARROW.matches ? 0.94 : 0.6)));
  const setWidth = (w) => {
    const width = Math.min(Math.max(w, MIN_WIDTH), maxWidth());
    document.documentElement.style.setProperty("--panel-width", `${width}px`);
    return width;
  };

  const render = () => {
    const open = NARROW.matches ? narrowOpen : wideOpen;
    document.body.classList.toggle("narrow", NARROW.matches);
    document.body.classList.toggle("panel-open", open);
    document.body.classList.toggle("panel-closed", !open);
    toggle.classList.toggle("active", open);
    setWidth(prefs.get("width", DEFAULT_WIDTH));
  };

  toggle.addEventListener("click", () => {
    if (NARROW.matches) narrowOpen = !narrowOpen;
    else {
      wideOpen = !wideOpen;
      prefs.set("open", wideOpen);
    }
    render();
  });
  scrim.addEventListener("click", () => {
    narrowOpen = false;
    render();
  });
  NARROW.addEventListener("change", render);
  window.addEventListener("resize", () => setWidth(prefs.get("width", DEFAULT_WIDTH)));

  // Drag to resize.
  handle.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    document.body.classList.add("resizing");
    const onMove = (ev) => prefs.set("width", setWidth(window.innerWidth - ev.clientX));
    const onUp = () => {
      document.body.classList.remove("resizing");
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
  });
  handle.addEventListener("dblclick", () => {
    prefs.set("width", DEFAULT_WIDTH);
    setWidth(DEFAULT_WIDTH);
  });

  render();
  // Let the viewer know it can open an annotation in a closed drawer.
  return {
    open() {
      if (NARROW.matches) narrowOpen = true;
      else wideOpen = true;
      render();
    },
  };
}
