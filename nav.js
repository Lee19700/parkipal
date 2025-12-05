// nav.js - simple nav dropdown toggles
(function(){
  function qs(sel){return document.querySelector(sel)}
  function qsa(sel){return Array.from(document.querySelectorAll(sel))}
  document.addEventListener('click', function(ev){
    var t = ev.target;
    // top dropdown toggle
    var topToggle = t.closest && t.closest('.top-dropdown') ? t.closest('.top-dropdown') : null;
    qsa('.top-dropdown').forEach(function(d){ if (d!==topToggle) d.classList.remove('open'); });
    if (topToggle && (t.classList.contains('drop-btn') || t.closest('.drop-btn'))){ topToggle.classList.toggle('open'); ev.preventDefault(); return; }

    // sidebar dropdown toggles
    if (t.classList && t.classList.contains('dropdown-toggle')){
      var parent = t.parentElement; var dd = parent.querySelector('.dropdown'); if (dd) dd.classList.toggle('open'); return;
    }
  });

  // close dropdowns on escape
  document.addEventListener('keydown', function(ev){ if (ev.key === 'Escape'){ qsa('.top-dropdown, .sidebar .dropdown').forEach(function(n){ n.classList.remove('open'); }); } });
})();