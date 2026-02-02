(function(){
  const STORAGE_KEY = "ui_theme"; // "light" | "dark"
  const root = document.documentElement;

  function prefersDark(){
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function apply(theme){
    root.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
    renderIcon(theme);
  }

  function renderIcon(theme){
    const host = document.getElementById("themeIcon");
    if(!host) return;
    host.innerHTML = (theme === "dark")
      ? `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
          <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3a7 7 0 1 0 11.5 11.5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
        </svg>`
      : `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
          <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" stroke="currentColor" stroke-width="1.7"/>
          <path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
            stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        </svg>`;
  }

  function init(){
    const saved = localStorage.getItem(STORAGE_KEY);
    const theme = saved || (prefersDark() ? "dark" : "light");
    root.setAttribute("data-theme", theme);
    renderIcon(theme);

    const btn = document.getElementById("btnTheme");
    if(btn){
      btn.addEventListener("click", () => {
        const cur = root.getAttribute("data-theme") || theme;
        apply(cur === "dark" ? "light" : "dark");
      });
    }
  }

  window.__theme = { init, apply };
})();
