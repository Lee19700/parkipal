// meds_store.js — central med storage and UI wiring (saves to `meds_v1`)
(function(){
  var KEY = 'meds_v1';

  function qs(id){ return document.getElementById(id); }

  function load(){ try{ return JSON.parse(localStorage.getItem(KEY)||'[]'); }catch(e){ return []; } }
  function save(arr){ localStorage.setItem(KEY, JSON.stringify(arr)); }

  function renderList(){
    var list = load(); var container = qs('meds'); var namesList = qs('med-names-list'); if(!container) return; container.innerHTML = '';
    if (namesList) { namesList.innerHTML = ''; }
    if (list.length===0){ container.innerHTML = '<p>No medications saved.</p>'; if(namesList) namesList.innerHTML = '<p>No current medications.</p>'; return; }
    list.forEach(function(m){
      if (namesList){ var li = document.createElement('div'); li.className='med-name'; li.textContent = m.name; namesList.appendChild(li); }
      var el = document.createElement('div'); el.className='med card';
      var tabletsPerDose = Number(m.tabletsPerDose||0);
      var stock = Number(m.stock||0);
      var taken = Number(m.takenToday||0);
      var html = '';
      html += '<div class="med-top"><div><strong>' + escapeHtml(m.name) + '</strong><div><small>' + escapeHtml(m.dose||'') + '</small></div></div>';
      html += '<div class="med-meta"><small>Stock: ' + escapeHtml(String(stock)) + ' tablets</small></div></div>';
      html += '<div class="med-details">Times: <em>' + escapeHtml(m.times||'') + '</em></div>';
      html += '<div class="med-details">Tablets per dose: ' + escapeHtml(String(tabletsPerDose)) + ' | Doses/day: ' + escapeHtml(String(m.dosesPerDay||'')) + '</div>';
      html += '<div class="med-actions" style="margin-top:10px"><button class="take-med btn btn-primary" data-id="'+m.id+'">Take now</button><button class="undo-take btn btn-ghost" data-id="'+m.id+'">Undo</button><button class="edit-med btn btn-ghost" data-id="'+m.id+'">Edit</button><button class="del-med btn btn-danger" data-id="'+m.id+'">Delete</button><div style="margin-left:auto;color:var(--muted)">Taken today: <strong>' + escapeHtml(String(taken)) + '</strong></div></div>';
      el.innerHTML = html;
      container.appendChild(el);
    });
  }

  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    function addMed(med){ var arr = load(); arr.push(med); save(arr); renderList(); }
    function addHistoryEvent(ev){ try{ var K='meds_history_v1'; var h = JSON.parse(localStorage.getItem(K)||'[]'); h.push(ev); localStorage.setItem(K, JSON.stringify(h)); }catch(e){} }

    function updateMed(id, fields){ var arr = load(); var found=false; var before=null; arr = arr.map(function(m){ if(String(m.id)===String(id)){ found=true; before = m; return Object.assign({}, m, fields); } return m; }); if (!found) arr.push(Object.assign({id:id}, fields)); save(arr); try{ addHistoryEvent({ id: id, name: (fields && fields.name) || (before && before.name) || '', action: 'update', timestamp: (new Date()).toISOString(), before: before, after: fields }); }catch(e){} renderList(); }
    function deleteMed(id){ var arr0 = load(); var removed = arr0.filter(function(m){ return String(m.id)===String(id); }); var arr = arr0.filter(function(m){ return String(m.id)!==String(id); }); save(arr); try{ if (removed && removed.length) addHistoryEvent({ id:id, name: removed[0].name||'', action:'delete', timestamp:(new Date()).toISOString(), details: removed[0] }); }catch(e){} renderList(); }

    function takeMed(id){ var arr = load(); var changed=false; var details=null; arr = arr.map(function(m){ if(String(m.id)===String(id)){ var tabletsPerDose = Number(m.tabletsPerDose||0); var stock = Number(m.stock||0); var taken = Number(m.takenToday||0); if (tabletsPerDose>0 && stock>=tabletsPerDose){ stock = stock - tabletsPerDose; taken = taken + 1; } else if (tabletsPerDose===0 && stock>0){ stock = stock - 1; taken = taken + 1; } else { /* no stock */ }
      changed=true; details = { name: m.name, tabletsPerDose: tabletsPerDose, beforeStock: m.stock, afterStock: stock }; return Object.assign({}, m, { stock: stock, takenToday: taken }); } return m; }); if (changed){ save(arr); try{ addHistoryEvent({ id:id, name: details && details.name||'', action:'take', timestamp:(new Date()).toISOString(), details: details }); }catch(e){} renderList(); } }

    function undoTake(id){ var arr = load(); var changed=false; var details=null; arr = arr.map(function(m){ if(String(m.id)===String(id)){ var tabletsPerDose = Number(m.tabletsPerDose||0); var stock = Number(m.stock||0); var taken = Number(m.takenToday||0); if (taken>0){ taken = taken - 1; if (tabletsPerDose>0) stock = stock + tabletsPerDose; else stock = stock + 1; } changed=true; details = { name: m.name, tabletsPerDose: tabletsPerDose, beforeStock: m.stock, afterStock: stock }; return Object.assign({}, m, { stock: stock, takenToday: taken }); } return m; }); if (changed){ save(arr); try{ addHistoryEvent({ id:id, name: details && details.name||'', action:'undo', timestamp:(new Date()).toISOString(), details: details }); }catch(e){} renderList(); } }

  function attach(){
    // debug: indicate meds_store attached
    try{ var dbg = qs('med-debug'); if (dbg) dbg.textContent = 'meds_store: initializing...'; }catch(e){}
    var form = qs('med-form');
    if (form){
      form.addEventListener('submit', function(ev){ ev.preventDefault(); var id = qs('med-id').value || Date.now(); var med = { id: id, name: qs('med-name').value||'', dose: qs('med-dose').value||'', times: qs('med-times').value||'', notes: qs('med-notes').value||'', tabletsPerPackage: qs('med-tablets-per-package')?Number(qs('med-tablets-per-package').value||0):0, tabletsPerDose: qs('med-tablets-per-dose')?Number(qs('med-tablets-per-dose').value||0):0, dosesPerDay: qs('med-doses-per-day')?Number(qs('med-doses-per-day').value||0):0, stock: qs('med-stock')?Number(qs('med-stock').value||0):0, takenToday: 0 };
        // if editing existing med, update instead of pushing duplicate
        if (qs('med-id').value){ updateMed(id, med); }
        else { addMed(med); }
        form.reset();
      });
    }

    document.addEventListener('click', function(ev){ var t = ev.target; if (!t) return; if (t.classList && t.classList.contains('del-med')){ deleteMed(t.getAttribute('data-id')); } else if (t.classList && t.classList.contains('take-med')){ takeMed(t.getAttribute('data-id')); } else if (t.classList && t.classList.contains('undo-take')){ undoTake(t.getAttribute('data-id')); } else if (t.classList && t.classList.contains('edit-med')){ var id = t.getAttribute('data-id'); var arr = load(); var m = arr.find(function(x){ return String(x.id)===String(id); }); if (m){ qs('med-id').value = m.id; qs('med-name').value = m.name||''; qs('med-dose').value = m.dose||''; qs('med-times').value = m.times||''; qs('med-notes').value = m.notes||''; if (qs('med-tablets-per-package')) qs('med-tablets-per-package').value = m.tabletsPerPackage||''; if (qs('med-tablets-per-dose')) qs('med-tablets-per-dose').value = m.tabletsPerDose||''; if (qs('med-doses-per-day')) qs('med-doses-per-day').value = m.dosesPerDay||''; if (qs('med-stock')) qs('med-stock').value = m.stock||''; window.scrollTo({top:0,behavior:'smooth'}); } } });

    renderList();
  }

  // Expose addMed for external use (e.g. meds_list auto-save) and attach
  function getHistory(){ try{ return JSON.parse(localStorage.getItem('meds_history_v1')||'[]'); }catch(e){ return []; } }
  function clearHistory(){ try{ localStorage.removeItem('meds_history_v1'); }catch(e){} }

  window.MedsStore = { addMed: addMed, deleteMed: deleteMed, load: load, updateMed: updateMed, takeMed: takeMed, undoTake: undoTake, getHistory: getHistory, clearHistory: clearHistory };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach); else attach();

})();
