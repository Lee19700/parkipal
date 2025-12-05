(function(){
  function qs(id){ return document.getElementById(id); }
  var KEY = 'appointments_v1';

  function load(){ try{ return JSON.parse(localStorage.getItem(KEY)||'[]'); }catch(e){ return []; } }
  function save(arr){ try{ localStorage.setItem(KEY, JSON.stringify(arr)); }catch(e){} }

  function renderList(){ var list = load().slice().sort(function(a,b){ return new Date(a.ts) - new Date(b.ts); }); var container = qs('appts-list'); container.innerHTML = ''; if (!list.length){ container.innerHTML = '<p class="muted">No appointments yet.</p>'; return; }
    list.forEach(function(ap){ var el = document.createElement('div'); el.className = 'entry card'; var t = new Date(ap.ts); var html = '<div class="med-header"><div><strong>'+escapeHtml(ap.title||'')+'</strong><div class="muted-small">'+escapeHtml(t.toLocaleString())+'</div></div><div class="med-actions-right">';
    html += '<button class="edit-appt btn btn-ghost" data-id="'+ap.id+'">Edit</button><button class="del-appt btn btn-danger" data-id="'+ap.id+'">Delete</button></div></div>';
    el.innerHTML = html; container.appendChild(el); }); }

  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function addOrUpdate(){ var id = qs('appt-id').value || String(Date.now()); var title = qs('appt-title').value||''; var dt = qs('appt-datetime').value; if (!title || !dt) return alert('Enter title and date/time'); var iso = new Date(dt).toISOString(); var arr = load(); var found = arr.find(function(a){ return String(a.id)===String(id); }); if (found){ found.title = title; found.ts = iso; } else { arr.push({ id: id, title: title, ts: iso }); }
    save(arr); qs('appt-form').reset(); renderList(); alert('Appointment saved'); }

  function del(id){ if (!confirm('Delete appointment?')) return; var arr = load().filter(function(a){ return String(a.id)!==String(id); }); save(arr); renderList(); }

  function edit(id){ var arr = load(); var a = arr.find(function(x){ return String(x.id)===String(id); }); if (!a) return; qs('appt-id').value = a.id; qs('appt-title').value = a.title || ''; qs('appt-datetime').value = new Date(a.ts).toISOString().slice(0,16); window.scrollTo({top:0,behavior:'smooth'}); }

  function attach(){ if (window.PPAuth && typeof window.PPAuth.requireAuth === 'function') if(!window.PPAuth.requireAuth()) return; qs('save-appt').addEventListener('click', addOrUpdate); qs('clear-appt').addEventListener('click', function(){ qs('appt-form').reset(); qs('appt-id').value=''; });
    qs('appts-list').addEventListener('click', function(ev){ var t = ev.target; if (!t) return; if (t.classList && t.classList.contains('del-appt')){ del(t.getAttribute('data-id')); } else if (t.classList && t.classList.contains('edit-appt')){ edit(t.getAttribute('data-id')); } });
    renderList(); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach); else attach();

})();
