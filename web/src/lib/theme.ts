const KEY = 'nexus_theme';

export function initTheme() {
  try {
    if (localStorage.getItem(KEY) === 'dark') document.documentElement.classList.add('dark-mode');
  } catch {
    /* localStorage indisponível (modo privado etc.) — segue com tema claro */
  }
}

export function toggleTheme() {
  const on = document.documentElement.classList.toggle('dark-mode');
  try {
    localStorage.setItem(KEY, on ? 'dark' : 'light');
  } catch {
    /* ignora */
  }
  return on;
}

export function isDark() {
  return document.documentElement.classList.contains('dark-mode');
}
