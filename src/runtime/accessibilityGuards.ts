const APP_SHORTCUT_KEYS = new Set([
  ' ', '1', '2', '3', '4', '5', 't', 'c', 'v', '/', '?'
]);

const isInteractiveTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('button, a, input, textarea, select, summary, [contenteditable="true"], [role="button"], [role="menuitem"], [role="option"]'));
};

const modalIsOpen = (): boolean => Boolean(document.querySelector('.fixed.inset-0.z-50'));

/**
 * WORLDSEED historically used Tab as an application shortcut. That prevents the
 * browser from moving focus through real controls. This guard is installed
 * before React so it can stop the legacy window-level shortcut without
 * preventing the browser's default focus traversal.
 */
export const installAccessibilityGuards = () => {
  if ((window as any).__worldseedAccessibilityGuardsInstalled) return;
  (window as any).__worldseedAccessibilityGuardsInstalled = true;

  window.addEventListener('keydown', event => {
    if (event.key === 'Tab') {
      event.stopImmediatePropagation();
      return;
    }

    const normalized = event.key.toLowerCase();
    const appShortcut = APP_SHORTCUT_KEYS.has(normalized) || ((event.metaKey || event.ctrlKey) && normalized === 'k');

    if (appShortcut && (isInteractiveTarget(event.target) || modalIsOpen())) {
      event.stopImmediatePropagation();
    }
  });
};
