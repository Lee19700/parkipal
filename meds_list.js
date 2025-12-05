// meds_list.js — render Parkinson's meds list, allow adding custom meds, and 'Add to my meds'
(function(){
  var STORAGE_KEY = 'parkinsonsMeds_v1';

  var defaultMeds = [
    {name:'Levodopa / Carbidopa', dose:'e.g. 100/25 mg per dose; multiple formulations (IR/CR/intest. gel)'},
    {name:'Pramipexole (dopamine agonist)', dose:'e.g. 0.125–1.5 mg daily (titrate per clinician)'},
    {name:'Ropinirole (dopamine agonist)', dose:'e.g. 0.25–8 mg daily (titrate per clinician)'},
    {name:'Rotigotine (patch)', dose:'e.g. 2–8 mg/24h patch (clinician determines dose)'},
    {name:'Selegiline (MAO-B inhibitor)', dose:'e.g. 5–10 mg daily (tablet or orally disintegrating)'},
    {name:'Rasagiline (MAO-B inhibitor)', dose:'e.g. 0.5–1 mg daily'},
    {name:'Entacapone (COMT inhibitor)', dose:'200 mg with each levodopa dose'},
    {name:'Opicapone (COMT inhibitor)', dose:'e.g. 50 mg at bedtime'},
    {name:'Amantadine', dose:'e.g. 100–300 mg daily (for dyskinesia/rigidity)'},
    {name:'Trihexyphenidyl (anticholinergic)', dose:'e.g. 1–15 mg/day (titrate carefully)'}
  ];

  function qs(id){ return document.getElementById(id); }

  function load(){ try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }catch(e){ return null; } }
  function save(v){ localStorage.setItem(STORAGE_KEY, JSON.stringify(v)); }

  function getMeds(){ var stored = load(); if (stored && Array.isArray(stored)) return stored; return defaultMeds.slice(); }

  function render(){
    var list = getMeds(); 
    var sel = qs('parkinsons-meds-select'); 
    if(!sel) return; 
    sel.innerHTML = '';
    
    // Add a placeholder option
    var placeholder = document.createElement('option'); 
    placeholder.value = ''; 
    placeholder.textContent = '-- choose a medication --'; 
    sel.appendChild(placeholder);
    
    // Get all saved medications from MedsStore
    var savedMeds = [];
    try {
      if (window.MedsStore && typeof window.MedsStore.load === 'function') {
        savedMeds = window.MedsStore.load();
      }
    } catch(e) {}
    
    // Add saved medications first (your actual medications)
    if (savedMeds && savedMeds.length > 0) {
      var group = document.createElement('optgroup');
      group.label = 'Your Medications';
      savedMeds.forEach(function(m, idx){
        var opt = document.createElement('option');
        opt.value = 'saved-' + idx;
        opt.textContent = m.name + (m.dose ? (' — ' + m.dose) : '');
        opt.dataset.medId = m.id;
        group.appendChild(opt);
      });
      sel.appendChild(group);
    }
    
    // Add common Parkinson's medications as suggestions
    var commonGroup = document.createElement('optgroup');
    commonGroup.label = 'Common Parkinson\'s Medications';
    list.forEach(function(m, idx){
      var opt = document.createElement('option');
      opt.value = 'default-' + idx;
      opt.textContent = m.name + (m.dose ? (' — ' + m.dose) : '');
      commonGroup.appendChild(opt);
    });
    sel.appendChild(commonGroup);
  }

  function escapeHtml(s){ if(!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function escapeAttr(s){ return String(s).replace(/"/g,'&quot;'); }

  // Undo stack for last auto-saved med
  var lastAutoSaved = null;
  function addToMyMeds(name, dose){
    var med = { id: Date.now(), name: name, dose: dose, created: new Date().toISOString() };
    try{
      // Save into the centralized meds store if available
      if (window.MedsStore && typeof window.MedsStore.addMed === 'function'){
        window.MedsStore.addMed(med);
      } else {
        // fallback: write to 'meds_v1'
        var key = 'meds_v1';
        var arr = JSON.parse(localStorage.getItem(key)||'[]');
        if (!arr.find(function(m){ return m.name === name; })) arr.push(med);
        localStorage.setItem(key, JSON.stringify(arr));
      }
      lastAutoSaved = med;
    }catch(e){ /* ignore storage errors */ }

    var medName = qs('med-name'); var medDose = qs('med-dose');
    if (medName) medName.value = name || '';
    if (medDose) medDose.value = dose || '';
    if (medName) medName.scrollIntoView({behavior:'smooth', block:'center'});

    // Attempt to auto-submit the med form (if present)
    var medForm = qs('med-form');
    if (medForm){
      try{ if (typeof medForm.requestSubmit === 'function') medForm.requestSubmit(); else medForm.dispatchEvent(new Event('submit', {cancelable:true})); }catch(e){}
    }

    // visual confirmation with Undo
    var note = document.createElement('div'); note.className = 'toast';
    note.innerHTML = 'Medication added. <button class="undo-auto">Undo</button>';
    document.body.appendChild(note);
    setTimeout(function(){ note.classList.add('show'); }, 10);

    var removeToast = function(){ note.classList.remove('show'); setTimeout(function(){ note.remove(); },300); };
    // handle undo
    note.addEventListener('click', function(ev){ if (ev.target && ev.target.classList && ev.target.classList.contains('undo-auto')){
      ev.preventDefault(); if (!lastAutoSaved) return; try{ if (window.MedsStore && typeof window.MedsStore.deleteMed === 'function') window.MedsStore.deleteMed(lastAutoSaved.id); else { var k='meds_v1'; var arr=JSON.parse(localStorage.getItem(k)||'[]'); arr=arr.filter(function(m){ return String(m.id)!==String(lastAutoSaved.id); }); localStorage.setItem(k, JSON.stringify(arr)); } lastAutoSaved = null; removeToast(); }catch(e){}
    }});

    setTimeout(function(){ removeToast(); }, 8000);
  }

  function addCustom(){
    var name = prompt('Medication name:'); if (!name) return;
    var dose = prompt('Typical dose / notes (optional):','');
    var list = getMeds(); list.push({name:name, dose:dose}); save(list); render();
  }

  function editAt(idx){ var list = getMeds(); var m = list[idx]; if(!m) return; var name = prompt('Edit name:', m.name); if(name===null) return; var dose = prompt('Edit dose/notes:', m.dose||''); m.name = name; m.dose = dose; save(list); render(); }

  function deleteAt(idx){ if (!confirm('Delete this medication from the informational list?')) return; var list = getMeds(); list.splice(idx,1); save(list); render(); }

  function attach(){
    var addBtns;
    // handle buttons
    document.addEventListener('click', function(ev){
      var t = ev.target;
      if (t.matches && t.matches('#add-custom-med')){ addCustom(); }
    });

    var addSelected = qs('add-selected-med');
    if (addSelected){ addSelected.addEventListener('click', function(){ var sel = qs('parkinsons-meds-select'); if (!sel) return; var idx = sel.value; if (idx==='') return alert('Please select a medication'); var list = getMeds(); var m = list[Number(idx)]; if (!m) return; addToMyMeds(m.name, m.dose); }); }
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach); else attach();

})();
