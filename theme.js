// theme.js — Global theme loader for day/night mode
(function(){
  function loadAndApplyTheme(){
    try{
      var theme = JSON.parse(localStorage.getItem('pp_theme_v1') || 'null');
      if (!theme) return; // No saved theme
      
      var root = document.documentElement;
      
      // Apply custom colors
      if (theme.accent) root.style.setProperty('--accent', theme.accent);
      if (theme.bg) root.style.setProperty('--bg', theme.bg);
      
      // Apply mode-specific colors
      if (theme.mode === 'night'){
        root.style.setProperty('--surface', '#0f172a');
        root.style.setProperty('--text', '#e6eef8');
        root.style.setProperty('--muted', '#9aa4b2');
        root.style.setProperty('--border', '#1e293b');
      } else {
        root.style.setProperty('--surface', '#ffffff');
        root.style.setProperty('--text', '#0f172a');
        root.style.setProperty('--muted', '#6b7280');
        root.style.setProperty('--border', '#e5e7eb');
      }
    }catch(e){
      // Silent fail - use default theme
    }
  }
  
  // Apply theme immediately (before page render)
  loadAndApplyTheme();
  
  // Also apply on DOMContentLoaded in case of timing issues
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', loadAndApplyTheme);
  }
})();
