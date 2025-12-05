(function(){
  function qs(id){return document.getElementById(id)}
  function render(){
    var list = [];
    try{ if (window.MedsStore && typeof window.MedsStore.getHistory === 'function') list = window.MedsStore.getHistory(); else list = JSON.parse(localStorage.getItem('meds_history_v1')||'[]'); }catch(e){ list = []; }
    var container = qs('history-list'); if(!container) return; container.innerHTML='';
    if (!list.length){ container.innerHTML = '<p class="muted">No events recorded yet.</p>'; return; }
    var filter = (qs('filter-text') && qs('filter-text').value||'').toLowerCase();
    list.slice().reverse().forEach(function(ev){
      if (filter){ if (((ev.name||'')+ ' ' + (ev.action||'')).toLowerCase().indexOf(filter)===-1) return; }
      var el = document.createElement('div'); el.className='entry';
      var t = new Date(ev.timestamp||Date.now()).toLocaleString();
      var title = '<div style="display:flex;justify-content:space-between;align-items:center"><div><strong>' + escapeHtml(ev.name||'(unknown)') + '</strong> <div class="muted">' + escapeHtml(ev.action||'') + '</div></div><div class="muted">' + escapeHtml(t) + '</div></div>';
      var details = '';
      try{ if (ev.details) details = '<pre style="white-space:pre-wrap;margin-top:8px;border-radius:8px;padding:8px;background:#f7fbff;border:1px solid #eef6ff;font-size:13px">' + escapeHtml(JSON.stringify(ev.details,null,2)) + '</pre>'; }catch(e){}
      el.innerHTML = title + details;
      container.appendChild(el);
    });
  }
  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  document.addEventListener('DOMContentLoaded', function(){
    render();
    var f = qs('filter-text'); if (f){ f.addEventListener('input', render); }
    var btn = qs('btn-clear-history'); if (btn){ btn.addEventListener('click', function(){ if (!confirm('Clear all history? This cannot be undone.')) return; try{ if (window.MedsStore && typeof window.MedsStore.clearHistory === 'function') window.MedsStore.clearHistory(); else localStorage.removeItem('meds_history_v1'); }catch(e){} render(); }); }
  });
})();
