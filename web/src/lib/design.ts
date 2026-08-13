const KEY = 'nexus_design';

export type DesignStyle = 'classic' | 'modern';

/**
 * Estilo visual do app: "classic" (visual corporativo original do NEXUS) ou
 * "modern" (inspirado em macOS/iOS — vidro translúcido, cantos arredondados,
 * tipografia do sistema Apple). Independente do dark mode (lib/theme.ts);
 * as duas classes convivem em <html> (ex: "design-modern dark-mode").
 */
export function initDesign() {
  try {
    const saved = localStorage.getItem(KEY) as DesignStyle | null;
    applyDesign(saved ?? 'modern');
  } catch {
    applyDesign('modern');
  }
}

export function getDesign(): DesignStyle {
  return document.documentElement.classList.contains('design-modern') ? 'modern' : 'classic';
}

export function setDesign(style: DesignStyle) {
  applyDesign(style);
  try {
    localStorage.setItem(KEY, style);
  } catch {
    /* localStorage indisponível — a preferência só vale para esta sessão */
  }
}

function applyDesign(style: DesignStyle) {
  document.documentElement.classList.toggle('design-modern', style === 'modern');
}
