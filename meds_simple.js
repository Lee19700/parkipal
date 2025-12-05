(function(){
  function qs(id){return document.getElementById(id)}
  var STORAGE = 'user_meds_simple_v1';

  function loadMap(){ try{ return JSON.parse(localStorage.getItem(STORAGE)||'{}'); }catch(e){ return {}; } }
  function saveMap(m){ try{ localStorage.setItem(STORAGE, JSON.stringify(m)); }catch(e){} }

  function removeSimpleStorage(){ try{ localStorage.removeItem(STORAGE); }catch(e){} }

  function findSaved(name){ var m = loadMap(); return m[name] || null; }
  function saveFor(name, times, stock){ var m = loadMap(); m[name] = { times: times, stock: Number(stock||0), savedAt: (new Date()).toISOString() }; saveMap(m); // also sync with MedsStore if available
    try{ if (window.MedsStore && typeof window.MedsStore.load === 'function'){
      var arr = window.MedsStore.load(); var found = arr.find(function(x){ return x.name === name; }); if (found){ window.MedsStore.updateMed(found.id, Object.assign({}, found, { times: times, stock: Number(stock||0) })); } else { window.MedsStore.addMed({ id: Date.now(), name: name, times: times, stock: Number(stock||0) }); }
    }}catch(e){}
  }

  // Migrate entries from simple storage to MedsStore and then remove the simple key
  function migrateSimpleToMeds(){
    try{
      var map = loadMap(); if (!map || Object.keys(map).length===0) return;
      if (!(window.MedsStore && typeof window.MedsStore.load === 'function')) return; // nothing to migrate to
      var arr = window.MedsStore.load();
      Object.keys(map).forEach(function(name){ var rec = map[name]; // try to match existing med by case-insensitive name
        var found = arr.find(function(x){ return String(x.name||'').trim().toLowerCase() === String(name||'').trim().toLowerCase(); });
        if (found){ window.MedsStore.updateMed(found.id, Object.assign({}, found, { times: rec.times||found.times, stock: Number(rec.stock||found.stock||0) })); }
        else { window.MedsStore.addMed({ id: Date.now()+Math.floor(Math.random()*1000), name: name, times: rec.times||'', stock: Number(rec.stock||0) }); }
      });
      // remove simple key
      removeSimpleStorage();
      try{ var s = qs('simple-status'); if (s) s.textContent = 'Migrated simple meds into central store.'; }catch(e){}
    }catch(e){}
  }

  function clearFor(name){ var m = loadMap(); if (m[name]) delete m[name]; saveMap(m); }

  function showStatus(msg){ var s = qs('simple-status'); if (!s) return; s.textContent = msg; }

  function attach(){
    var sel = qs('parkinsons-meds-select'); var timesIn = qs('med-times-simple'); var tabletsPerDoseIn = qs('med-tablets-per-dose-simple'); var stockIn = qs('med-stock-simple'); var btnSave = qs('btn-save-simple'); var btnClear = qs('btn-clear-simple');
    if (!sel) return;
    // when the meds list populates (meds_list.js) it sets the select; listen to changes
    sel.addEventListener('change', function(){ var name = sel.options[sel.selectedIndex] && sel.options[sel.selectedIndex].text; if (!name) return; // load saved data
      var saved = findSaved(name);
      if (saved){ timesIn.value = saved.times||''; stockIn.value = (saved.stock||''); showStatus('Loaded saved data for '+name); }
      else {
        // if MedsStore has a record, use that
        try{ if (window.MedsStore && typeof window.MedsStore.load === 'function'){ var rec = window.MedsStore.load().find(function(x){ return x.name === name; }); if (rec){ timesIn.value = rec.times||''; stockIn.value = rec.stock||''; showStatus('Loaded store data for '+name); return; } } }catch(e){}
        timesIn.value=''; stockIn.value=''; showStatus('');
      }
    });

    btnSave.addEventListener('click', function(){ 
      var opt = sel.options[sel.selectedIndex]; 
      if (!opt || !opt.text) return alert('Please choose a medication'); 
      var name = opt.text; 
      var times = timesIn.value||''; 
      var tabletsPerDose = Number(tabletsPerDoseIn.value||1);
      var stock = Number(stockIn.value||0); 
      
      // Save to MedsStore with tabletsPerDose
      try{ 
        if (window.MedsStore && typeof window.MedsStore.load === 'function'){
          var arr = window.MedsStore.load(); 
          var found = arr.find(function(x){ return x.name === name; }); 
          if (found){ 
            window.MedsStore.updateMed(found.id, Object.assign({}, found, { times: times, stock: stock, tabletsPerDose: tabletsPerDose })); 
          } else { 
            window.MedsStore.addMed({ id: Date.now(), name: name, times: times, stock: stock, tabletsPerDose: tabletsPerDose }); 
          }
        }
      }catch(e){}
      
      saveFor(name, times, stock); 
      showStatus('Saved '+name+' — '+stock+' tablets, '+tabletsPerDose+' per dose'); 
    });
    btnClear.addEventListener('click', function(){ var opt = sel.options[sel.selectedIndex]; if (!opt || !opt.text) return alert('Please choose a medication'); var name = opt.text; if (!confirm('Clear saved data for '+name+'?')) return; clearFor(name); timesIn.value=''; tabletsPerDoseIn.value='1'; stockIn.value=''; showStatus('Cleared saved data for '+name); });

    // if a med is preselected, trigger change to load
    setTimeout(function(){ if (sel && sel.value!==''){ var ev = new Event('change'); sel.dispatchEvent(ev); } }, 300);
  }

  // Render saved list of meds with times and stock and quick +/- controls
  function renderSavedList(){
    var container = qs('simple-list'); if(!container) return; container.innerHTML='';
    var meds = [];
    // Prefer central MedsStore if available (after migration it will be authoritative)
    try{ if (window.MedsStore && typeof window.MedsStore.load === 'function'){ meds = window.MedsStore.load().slice(); }
    }catch(e){}
    // Fallback to simple map if MedsStore empty
    if (!meds || meds.length===0){ var map = loadMap(); var names = Object.keys(map); if (!names.length){ container.innerHTML = '<p class="muted">No saved medications yet.</p>'; var totalEl = document.getElementById('total-tablets-today'); if (totalEl) totalEl.textContent = '0 tablets'; return; } meds = names.map(function(n){ return { name: n, times: map[n].times||'', stock: map[n].stock||0 }; }); }

    // Show any saved meds that have a name — don't hide entries missing times/stock
    meds = meds.filter(function(m){ return (m && (String(m.name||'').trim() !== '')); });
    
    // Track total tablets used today
    var totalTabletsToday = 0;
    if (!meds.length){
      container.innerHTML = '<p class="muted">No saved medications yet. <button id="add-sample-med" class="btn btn-ghost">Add sample med</button></p>';
      var addBtn = qs('add-sample-med'); if (addBtn) addBtn.addEventListener('click', function(){
        var sample = { id: Date.now(), name: 'Sample: Levodopa', times: '08:00,20:00', stock: 30, dose: '100/25 mg' };
        try{
          if (window.MedsStore && typeof window.MedsStore.addMed === 'function'){
            window.MedsStore.addMed(sample);
          }
        }catch(e){}
        try{ var map = loadMap(); map[sample.name] = { times: sample.times, stock: sample.stock, savedAt: (new Date()).toISOString() }; saveMap(map); }catch(e){}
        setTimeout(renderSavedList,120);
      });
      return;
    }

    // Helper: parse time string 'HH:MM' to minutes since midnight
    function parseHM(t){ if(!t) return NaN; var parts = String(t).trim().split(':'); if(parts.length<2) return NaN; var h = parseInt(parts[0],10); var m = parseInt(parts[1],10); if(isNaN(h)||isNaN(m)) return NaN; return h*60 + m; }
    function earliestMinutes(times){ if(!times) return Infinity; var arr = String(times).split(',').map(function(s){ return s.trim(); }).filter(Boolean); if(!arr.length) return Infinity; var mins = arr.map(parseHM).filter(function(x){ return !isNaN(x); }); if(!mins.length) return Infinity; return Math.min.apply(null, mins); }

    // sort meds by earliest scheduled time (meds without times go last)
    meds.sort(function(a,b){ var ta = earliestMinutes(a.times||''); var tb = earliestMinutes(b.times||''); if (ta === tb) return String((a.name||'')).localeCompare(String((b.name||''))); if (ta === Infinity) return 1; if (tb === Infinity) return -1; return ta - tb; });

    meds.forEach(function(med){ var name = med.name||''; var times = med.times||''; var stock = Number(med.stock||0);
      // attempt to find tabletsPerDose from MedsStore (already in med if from store)
      var tabletsPerDose = (med.tabletsPerDose!==undefined?med.tabletsPerDose:null);
      // dosage string: prefer med.dose (free text) then tabletsPerDose
      var dosageStr = '—';
      if (med.dose && String(med.dose).trim()!=='') dosageStr = String(med.dose).trim();
      else if (tabletsPerDose!==null && tabletsPerDose!==undefined) dosageStr = String(tabletsPerDose) + ' tablet' + (Number(tabletsPerDose)===1?'':'s') + ' per dose';

      var card = document.createElement('div'); card.className='med card';
      var header = document.createElement('div'); header.className = 'med-header';
      header.innerHTML = '<div><strong>'+escapeHtml(name)+'</strong></div>';
      card.appendChild(header);
      
      // Calculate tablets used today
      var tabletsUsedToday = 0;
      try{
        if (window.MedLog && typeof window.MedLog.getTodayEntries === 'function'){
          var todayEntries = window.MedLog.getTodayEntries();
          todayEntries.forEach(function(entry){
            if (entry.medName === name){
              tabletsUsedToday += Number(entry.tabletsUsed || 0);
            }
          });
        }
      }catch(e){}
      
      // Add to total
      totalTabletsToday += tabletsUsedToday;
      
      // Reorder display: Name, Dosage, Schedule, Current stock, Tablets used today
      var details = document.createElement('div'); details.className='med-details muted';
      details.innerHTML = 'Dosage: <strong>'+escapeHtml(dosageStr)+'</strong><br>Schedule: <strong>'+escapeHtml(times||'—')+'</strong><br>Current stock: <strong id="stock-'+hashId(name)+'">'+String(stock)+'</strong><br><span style="color:#1e40af;font-size:1.1rem;">💊 Tablets used today: <strong style="color:#3b82f6;font-size:1.2rem;">'+tabletsUsedToday+'</strong></span>';
      card.appendChild(details);

      var actions = document.createElement('div'); actions.className = 'med-actions-right';
      var btnDec = document.createElement('button'); btnDec.className='btn'; btnDec.textContent='−'; btnDec.title='Decrease tablets'; btnDec.addEventListener('click', function(){ changeStock(name, -1); });
      var btnInc = document.createElement('button'); btnInc.className='btn btn-primary'; btnInc.textContent='+'; btnInc.title='Increase tablets'; btnInc.addEventListener('click', function(){ changeStock(name, 1); });
      var btnEdit = document.createElement('button'); btnEdit.className='btn btn-ghost'; btnEdit.textContent='Edit'; btnEdit.addEventListener('click', function(){ // pre-fill
        var sel = qs('parkinsons-meds-select'); for(var i=0;i<sel.options.length;i++){ if (sel.options[i].text===name) { sel.selectedIndex = i; sel.dispatchEvent(new Event('change')); break; } }
      });
      var btnDelete = document.createElement('button'); btnDelete.className='btn btn-danger'; btnDelete.textContent='Delete'; btnDelete.title='Delete this medication'; btnDelete.addEventListener('click', function(){ deleteMedication(name); });
      actions.appendChild(btnDec); actions.appendChild(btnInc); actions.appendChild(btnEdit); actions.appendChild(btnDelete);
      card.appendChild(actions);

      container.appendChild(card);
    });
    
    // Update total display
    var totalEl = document.getElementById('total-tablets-today');
    if (totalEl) {
      totalEl.textContent = totalTabletsToday + ' tablet' + (totalTabletsToday === 1 ? '' : 's');
    }
  }

  function changeStock(name, delta){
    // Determine current stock from MedsStore if available, else from simple map
    var current = null;
    try{ if (window.MedsStore && typeof window.MedsStore.load === 'function'){ var found = window.MedsStore.load().find(function(x){ return String(x.name||'').trim().toLowerCase() === String(name||'').trim().toLowerCase(); }); if (found) current = Number(found.stock||0); } }catch(e){}
    var m = loadMap(); if (current===null){ if (m[name]!==undefined) current = Number(m[name].stock||0); else current = 0; }
    var newStock = Math.max(0, current + delta);
    // If decrementing to zero or below, confirm with user
    if (delta < 0 && newStock <= 0){ if (!confirm('This will reduce "'+name+'" to 0 tablets. Confirm?')) return; }

    // Save to MedsStore if available
    try{
      if (window.MedsStore && typeof window.MedsStore.load === 'function'){
        var arr = window.MedsStore.load(); var found = arr.find(function(x){ return String(x.name||'').trim().toLowerCase() === String(name||'').trim().toLowerCase(); });
        if (found){ window.MedsStore.updateMed(found.id, Object.assign({}, found, { stock: newStock })); }
        else { window.MedsStore.addMed({ id: Date.now(), name: name, stock: newStock }); }
      } else {
        // fallback to simple map
        if (!m[name]) m[name] = { times:'', stock:0 };
        m[name].stock = newStock; saveMap(m);
      }
    }catch(e){
      // fallback to simple map on error
      if (!m[name]) m[name] = { times:'', stock:0 };
      m[name].stock = newStock; saveMap(m);
    }

    // update UI
    var el = qs('stock-'+hashId(name)); if (el) el.textContent = String(newStock);
    showStatus('Updated '+name+' → '+newStock+' tablets');
    // re-render saved list to reflect store changes
    setTimeout(renderSavedList,120);
  }

  function deleteMedication(name){
    if (!confirm('Are you sure you want to delete "' + name + '"?\n\nThis will remove the medication and all its settings. This cannot be undone.')) {
      return;
    }
    
    // Delete from MedsStore
    try{
      if (window.MedsStore && typeof window.MedsStore.load === 'function'){
        var arr = window.MedsStore.load();
        var found = arr.find(function(x){ return String(x.name||'').trim().toLowerCase() === String(name||'').trim().toLowerCase(); });
        if (found && window.MedsStore.deleteMed){
          window.MedsStore.deleteMed(found.id);
          showStatus('Deleted ' + name);
        }
      }
    }catch(e){
      showStatus('Error deleting medication: ' + e.message);
    }
    
    // Also remove from simple storage map if present
    try{
      var m = loadMap();
      if (m[name]){
        delete m[name];
        saveMap(m);
      }
    }catch(e){}
    
    // Re-render the list
    setTimeout(renderSavedList, 100);
  }

  function hashId(s){ return 'h'+(String(s||'').replace(/[^a-z0-9]/gi,'').toLowerCase()); }

  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // Custom medication form handler
  function attachCustomForm(){
    var nameIn = qs('custom-med-name');
    var doseIn = qs('custom-med-dose');
    var timesIn = qs('custom-med-times');
    var tabletsPerDoseIn = qs('custom-med-tablets-per-dose');
    var stockIn = qs('custom-med-stock');
    var notesIn = qs('custom-med-notes');
    var btnSave = qs('btn-save-custom');
    var btnClear = qs('btn-clear-custom');
    var statusEl = qs('custom-status');

    if (!btnSave) return;

    function showCustomStatus(msg){
      if (statusEl) statusEl.textContent = msg;
    }

    btnSave.addEventListener('click', function(){
      var name = (nameIn ? nameIn.value.trim() : '');
      if (!name){
        alert('Please enter a medication name');
        return;
      }

      var dose = doseIn ? doseIn.value.trim() : '';
      var times = timesIn ? timesIn.value.trim() : '';
      var tabletsPerDose = tabletsPerDoseIn ? Number(tabletsPerDoseIn.value || 1) : 1;
      var stock = stockIn ? Number(stockIn.value || 0) : 0;
      var notes = notesIn ? notesIn.value.trim() : '';

      // Create medication object
      var med = {
        id: Date.now(),
        name: name,
        dose: dose,
        times: times,
        stock: stock,
        notes: notes,
        tabletsPerDose: tabletsPerDose,
        created: new Date().toISOString()
      };

      // Save to MedsStore
      try{
        if (window.MedsStore && typeof window.MedsStore.addMed === 'function'){
          window.MedsStore.addMed(med);
          showCustomStatus('Saved ' + name + ' — ' + stock + ' tablets');
          
          // Clear form
          if (nameIn) nameIn.value = '';
          if (doseIn) doseIn.value = '';
          if (timesIn) timesIn.value = '';
          if (tabletsPerDoseIn) tabletsPerDoseIn.value = '1';
          if (stockIn) stockIn.value = '';
          if (notesIn) notesIn.value = '';

          // Refresh the saved list
          setTimeout(renderSavedList, 100);
        } else {
          showCustomStatus('Error: MedsStore not available');
        }
      } catch(e){
        showCustomStatus('Error saving medication: ' + e.message);
      }
    });

    if (btnClear){
      btnClear.addEventListener('click', function(){
        if (nameIn) nameIn.value = '';
        if (doseIn) doseIn.value = '';
        if (timesIn) timesIn.value = '';
        if (tabletsPerDoseIn) tabletsPerDoseIn.value = '1';
        if (stockIn) stockIn.value = '';
        if (notesIn) notesIn.value = '';
        showCustomStatus('');
      });
    }
  }

  // ensure list updates after save/clear
  var origAttach = attach;
  attach = function(){ origAttach(); renderSavedList(); attachCustomForm(); // also refresh when save/clear buttons used
    var saveBtn = qs('btn-save-simple'); if (saveBtn) saveBtn.addEventListener('click', function(){ setTimeout(renderSavedList,100); });
    var clrBtn = qs('btn-clear-simple'); if (clrBtn) clrBtn.addEventListener('click', function(){ setTimeout(renderSavedList,100); });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach); else attach();
})();
