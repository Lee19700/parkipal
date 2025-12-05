(function(){
  function qs(id){ return document.getElementById(id); }
  function fmt(n){ return (n===Infinity||isNaN(n))? '—' : String(n); }

  function loadMeds(){ try{ if (window.MedsStore && typeof window.MedsStore.load === 'function'){ return window.MedsStore.load().slice(); } }catch(e){}
    try{ return JSON.parse(localStorage.getItem('meds_v1')||'[]'); }catch(e){ return []; }
  }

  function populateMeds(){ var sel = qs('holiday-meds'); if (!sel) return; sel.innerHTML=''; var meds = loadMeds(); if(!meds||!meds.length){ var opt = document.createElement('option'); opt.textContent='(no meds found)'; opt.value=''; sel.appendChild(opt); return; }
    meds.forEach(function(m){ var opt = document.createElement('option'); opt.value = String(m.id||m.name||m._id||m._name||m.name); var label = (m.name||'') + (m.dose?(' — '+m.dose):''); opt.textContent = label; sel.appendChild(opt); });
  }

  function parseDates(){ var s = qs('trip-start').value; var e = qs('trip-end').value; if(!s || !e) return null; var sd = new Date(s + 'T00:00:00'); var ed = new Date(e + 'T00:00:00'); if (isNaN(sd)||isNaN(ed)||ed<sd) return null; // inclusive
    var diff = Math.floor((ed - sd) / (1000*60*60*24)) + 1; return {start:sd,end:ed,days:diff}; }

  function dosesPerDayFromTimes(times){ if(!times) return 1; var arr = String(times).split(',').map(function(x){ return x.trim(); }).filter(Boolean); if (!arr.length) return 1; return arr.length; }

  function findMedById(id){ var meds = loadMeds(); return meds.find(function(m){ return String(m.id||m.name) === String(id); }) || meds.find(function(m){ return String(m.id) === String(id); }) || null; }

  function autoSelectMeds(){
    var info = parseDates(); if(!info) return; // only auto-select when dates valid
    var sel = qs('holiday-meds'); if(!sel) return; var meds = loadMeds(); var count = 0;
    // selection criteria: med.stock > 0 OR med.times defined OR med.dose present
    for(var i=0;i<sel.options.length;i++){ var opt = sel.options[i]; var id = opt.value; var m = meds.find(function(x){ return String(x.id||x.name) === String(id) || String(x.name) === String(id); });
      if (!m){ opt.selected = false; continue; }
      var should = (Number(m.stock||0) > 0) || (m.times && String(m.times).trim()!=='') || (m.dose && String(m.dose).trim()!=='');
      opt.selected = !!should; if (opt.selected) count++; }
    qs('planner-status').textContent = 'Auto-selected '+count+' medication(s) based on current meds.';
  }

  function generate(){ var info = parseDates(); if(!info){ qs('planner-status').textContent = 'Please enter a valid start and end date (end on/after start).'; return; }
    var buffer = Math.max(0, Number(qs('buffer-days').value||0)); var days = info.days + buffer; var sel = qs('holiday-meds'); var chosen = Array.from(sel.selectedOptions).map(function(o){ return o.value; }); if(!chosen.length){ qs('planner-status').textContent = 'Please select at least one medication.'; return; }
    var rows = [];
    chosen.forEach(function(id){ var med = findMedById(id); if (!med) return; var name = med.name || id; var times = med.times || ''; var dosesPerDay = med.dosesPerDay || dosesPerDayFromTimes(times); var tabletsPerDose = (med.tabletsPerDose!==undefined?Number(med.tabletsPerDose): (med.tabletsPerPack?1:1)); // default 1
      var required = dosesPerDay * days * (tabletsPerDose || 1);
      var stock = Number(med.stock||0);
      var bring = required; // recommend bringing required; mark shortage if stock < required
      rows.push({ name: name, dose: med.dose||'', times: times, dosesPerDay: dosesPerDay, tabletsPerDose: tabletsPerDose, required: required, stock: stock, shortage: stock < required });
    });

    // Render table
    var out = qs('plan-results'); out.innerHTML = '';
    var h = document.createElement('div'); h.innerHTML = '<h3>Packing Plan ('+days+' days incl. buffer)</h3>';
    out.appendChild(h);
    var table = document.createElement('table'); table.className='table'; table.style.width='100%';
    var thead = document.createElement('thead'); thead.innerHTML = '<tr><th>Medication</th><th>Dose</th><th>Times</th><th>Doses/day</th><th>Tablets/dose</th><th>Required</th><th>Stock</th><th>Shortage</th></tr>'; table.appendChild(thead);
    var tbody = document.createElement('tbody');
    rows.forEach(function(r){ var tr = document.createElement('tr'); tr.innerHTML = '<td>'+escapeHtml(r.name)+'</td><td>'+escapeHtml(r.dose||'—')+'</td><td>'+escapeHtml(r.times||'—')+'</td><td>'+fmt(r.dosesPerDay)+'</td><td>'+fmt(r.tabletsPerDose)+'</td><td>'+fmt(r.required)+'</td><td>'+fmt(r.stock)+'</td><td>'+(r.shortage?('<span class="danger">Yes</span>'):'No')+'</td>'; tbody.appendChild(tr); });
    table.appendChild(tbody); out.appendChild(table);

    // Export/print controls
    var ctrls = document.createElement('div'); ctrls.style.marginTop='12px';
    var csvBtn = document.createElement('button'); csvBtn.className='btn btn-ghost'; csvBtn.textContent='Export CSV'; csvBtn.addEventListener('click', function(){ exportCSV(rows, days); });
    var printBtn = document.createElement('button'); printBtn.className='btn btn-primary'; printBtn.textContent='Print'; printBtn.addEventListener('click', function(){ window.print(); });
    ctrls.appendChild(csvBtn); ctrls.appendChild(printBtn); out.appendChild(ctrls);

    qs('planner-status').textContent = 'Plan generated.';
  }

  function exportCSV(rows, days){ var lines = []; lines.push(['Medication','Dose','Times','Doses/day','Tablets/dose','Required','Stock','Shortage','Days']); rows.forEach(function(r){ lines.push([r.name,r.dose||'',r.times||'',r.dosesPerDay,r.tabletsPerDose,r.required,r.stock,(r.shortage?'YES':'NO'),days]); }); var csv = lines.map(function(l){ return l.map(function(cell){ if (String(cell).indexOf(',')>=0) return '"'+String(cell).replace(/"/g,'""')+'"'; return String(cell); }).join(','); }).join('\n'); var blob = new Blob([csv], { type: 'text/csv' }); var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = 'holiday-plan.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }

  function escapeHtml(s){ if(!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // Wire up
  document.addEventListener('DOMContentLoaded', function(){ if (window.PPAuth && typeof window.PPAuth.requireAuth === 'function') window.PPAuth.requireAuth(); populateMeds(); qs('generate-plan').addEventListener('click', generate); qs('clear-plan').addEventListener('click', function(){ qs('plan-results').innerHTML=''; qs('planner-status').textContent=''; });
    // Auto-select meds when both dates are provided
    var start = qs('trip-start'), end = qs('trip-end'); if (start && end){ start.addEventListener('change', autoSelectMeds); end.addEventListener('change', autoSelectMeds); }
    // Also auto-select after populate
    setTimeout(autoSelectMeds, 120);
  });

})();
