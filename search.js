(function(){
  function qs(id){ return document.getElementById(id); }
  function renderResults(results){ var out = qs('search-results'); out.innerHTML = '';
    if (!results || !results.length){ out.innerHTML = '<p class="muted">No matches found.</p>'; return; }
    results.forEach(function(r){ var card = document.createElement('div'); card.className='card'; var title = r.source==='current'? r.key : (r.key + ' @ ' + (new Date(r.ts||'').toLocaleString()));
      var html = '<strong>'+escapeHtml(title)+'</strong><div class="muted">Source: '+escapeHtml(r.source)+'</div><pre style="white-space:pre-wrap;max-height:160px;overflow:auto;">'+escapeHtml(r.snippet||'')+'</pre>';
      card.innerHTML = html; out.appendChild(card);
    });
  }

  function escapeHtml(s){ if (s===null||s===undefined) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  document.addEventListener('DOMContentLoaded', function(){ var btn = qs('search-btn'); var qin = qs('search-query'); var clear = qs('search-clear'); var status = qs('search-status');
    if (btn){ btn.addEventListener('click', function(){ var q = (qin.value||'').trim(); if (!q){ status.textContent = 'Enter a search term.'; return; } status.textContent = 'Searching...'; try{ var res = window.AppArchive && typeof window.AppArchive.searchAll === 'function' ? window.AppArchive.searchAll(q) : []; renderResults(res); status.textContent = 'Found '+res.length+' result(s).'; }catch(e){ status.textContent = 'Search error'; console.error(e); } }); }
    if (clear){ clear.addEventListener('click', function(){ qin.value=''; qs('search-results').innerHTML=''; qs('search-status').textContent=''; }); }
  });
})();
