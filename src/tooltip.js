// Tooltips for any element with a data-tip attribute.
// Shown after the pointer rests on the element for 1 second with no click; hidden on leave, click or key press.
const DELAY_MS = 1000;

export function initTooltips() {
  const tip = document.getElementById("tooltip");
  let timer = null;
  let target = null;

  const hide = () => {
    clearTimeout(timer);
    timer = null;
    tip.classList.add("hidden");
  };

  const show = (el) => {
    tip.textContent = el.dataset.tip;
    tip.classList.remove("hidden");
    const r = el.getBoundingClientRect();
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    let left = r.left + r.width / 2 - w / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    let top = r.bottom + 8;
    if (top + h > window.innerHeight - 8) top = r.top - h - 8;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  };

  document.addEventListener("pointerover", (e) => {
    const el = e.target.closest?.("[data-tip]");
    if (el === target) return;
    hide();
    target = el;
    if (el && el.dataset.tip) timer = setTimeout(() => show(el), DELAY_MS);
  });
  document.addEventListener("pointerout", (e) => {
    if (target && !target.contains(e.relatedTarget)) {
      target = null;
      hide();
    }
  });
  document.addEventListener("pointerdown", () => {
    hide();
    target = null;
  });
  document.addEventListener("keydown", hide);
  window.addEventListener("scroll", hide, true);
}
