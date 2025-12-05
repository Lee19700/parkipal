(function(){
  // archive.js — client-side monthly archiving and search helper
  function nowMonth(){ var d=new Date(); return d.getFullYear() + '-' + ('0'+(d.getMonth()+1)).slice(-2); }
  function qs(id){ return document.getElementById(id); }
  var ARCHIVE_KEY = 'pp_archives_v1';
  var LAST_KEY = 'pp_last_archive_month';
  // keys to include in snapshot
  var KEYS = ['meds_v1','user_meds_simple_v1','meds_history_v1','parkinsonsMeds_v1','symptomLogs_v1','fluidLogs_v1','foodLogs_v1','pp_users_v1'];

  function loadArchives(){ try{ return JSON.parse(localStorage.getItem(ARCHIVE_KEY)||'[]'); }catch(e){ return []; } }
  function saveArchives(a){ try{ localStorage.setItem(ARCHIVE_KEY, JSON.stringify(a)); }catch(e){} }

  function snapshot(){ var out = { id: Date.now(), ts: (new Date()).toISOString(), month: nowMonth(), data: {} };
    KEYS.forEach(function(k){ try{ out.data[k] = JSON.parse(localStorage.getItem(k)||'null'); }catch(e){ out.data[k] = null; } });
    return out;
  }

  function runArchiveNow(){ try{
      var archives = loadArchives(); var snap = snapshot(); archives.push(snap); saveArchives(archives); localStorage.setItem(LAST_KEY, snap.month); console.info('Archive created:', snap.id); return snap;
    }catch(e){ console.error('Archive failed', e); return null; } }

  function archiveIfNeeded(){ try{ var last = localStorage.getItem(LAST_KEY); var cur = nowMonth(); if (last !== cur){ var snap = runArchiveNow(); if (snap) console.info('Monthly archive completed for', cur); } }catch(e){ console.error(e); } }

  function listArchives(){ return loadArchives().slice().reverse(); }
  function getArchive(id){ var a = loadArchives(); return a.find(function(x){ return String(x.id) === String(id); }) || null; }

  function searchAll(query){ // case-insensitive search across current keys and archives
    if (!query || !String(query).trim()) return [];
    var q = String(query).toLowerCase(); var results = [];
    // current storage
    KEYS.forEach(function(k){ try{ var raw = localStorage.getItem(k); if (!raw) return; if (raw.toLowerCase().indexOf(q) >= 0) results.push({ source:'current', key:k, snippet: excerpt(raw, q) }); }catch(e){} });
    // archives
    var archives = loadArchives(); archives.forEach(function(a){ var ser = JSON.stringify(a.data||{}); if (String(ser).toLowerCase().indexOf(q) >= 0) results.push({ source:'archive', id:a.id, ts:a.ts, key:'archive('+a.month+')', snippet: excerpt(ser, q) }); });
    return results;
  }

  function excerpt(text, q, len){ try{ var t = String(text).toLowerCase(); var idx = t.indexOf(q); if (idx === -1) return ''; var start = Math.max(0, idx-40); var snip = String(text).substr(start, (len||200)); return (start>0? '...':'') + snip.replace(/\n/g,' ') + (snip.length < String(text).length ? '...':'' ); }catch(e){ return ''; } }

  // Expose API
  window.AppArchive = { archiveIfNeeded: archiveIfNeeded, runArchiveNow: runArchiveNow, listArchives: listArchives, getArchive: getArchive, searchAll: searchAll };

  // Run check on load
  document.addEventListener('DOMContentLoaded', function(){ try{ archiveIfNeeded(); // also add a small manual control in footer if present
      var footer = document.querySelector('footer'); if (footer){ var btn = document.createElement('button'); btn.className='btn btn-ghost'; btn.style.marginLeft='8px'; btn.textContent='Archive now'; btn.addEventListener('click', function(){ var s = runArchiveNow(); alert('Archive completed: '+(s?new Date(s.ts).toLocaleString():'failed')); }); footer.appendChild(btn); }
      // Wire up sidebar archive button if present
      try{ var sideBtn = document.getElementById('sidebar-archive-btn'); if (sideBtn){ sideBtn.addEventListener('click', function(e){ e.preventDefault(); var s = runArchiveNow(); alert('Archive completed: '+(s?new Date(s.ts).toLocaleString():'failed')); }); }
      }catch(e){}
    }catch(e){} });

})();
