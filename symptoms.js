// symptoms.js — simple localStorage-backed symptom tracker
(function(){
  var STORAGE_KEY = 'symptomLogs_v1';

  function qs(id){ return document.getElementById(id); }

  function nowLocalISOString(){
    var d = new Date();
    // produce datetime-local compatible value: YYYY-MM-DDTHH:MM
    function z(n){ return (n<10?'0':'')+n }
    return d.getFullYear() + '-' + z(d.getMonth()+1) + '-' + z(d.getDate()) + 'T' + z(d.getHours()) + ':' + z(d.getMinutes());
  }

  function load(){
    try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }catch(e){ return []; }
  }

  function save(arr){ localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }

  function createEntryFromForm(){
    var entryTime = qs('entryTime').value || nowLocalISOString();
    var entry = {
      id: Date.now(),
      time: entryTime,
      tremor: Number(qs('tremor').value)||0,
      bradykinesia: Number(qs('bradykinesia').value)||0,
      rigidity: Number(qs('rigidity').value)||0,
      gait: Number(qs('gait').value)||0,
      dyskinesia: Number(qs('dyskinesia').value)||0,
      sleep: Number(qs('sleep').value)||0,
      mood: Number(qs('mood').value)||0,
      cognition: Number(qs('cognition').value)||0,
      notes: qs('notes').value || ''
    };
    return entry;
  }

  function render(){
    var list = load();
    var container = qs('entries');
    if (!container) return; // Exit if element doesn't exist on this page
    container.innerHTML = '';
    if (list.length === 0){ container.innerHTML = '<p>No entries yet.</p>'; return; }

    list.slice().reverse().forEach(function(e){
      var el = document.createElement('div');
      el.className = 'entry card';
      var html = '<div style="display:flex;justify-content:space-between;align-items:flex-start">';
      html += '<div><strong>' + (e.time.replace('T',' ')) + '</strong><br/>';
      html += '<small>Tremor ' + e.tremor + ' · Bradykinesia ' + e.bradykinesia + ' · Rigidity ' + e.rigidity + ' · Gait ' + e.gait + '</small><br/>';
      html += '<small>Dyskinesia ' + e.dyskinesia + ' · Sleep ' + e.sleep + ' · Mood ' + e.mood + ' · Cognition ' + e.cognition + '</small>';
      if (e.notes) html += '<div><em>' + escapeHtml(e.notes) + '</em></div>';
      html += '</div>';
      html += '<div><button data-id="' + e.id + '" class="delete">Delete</button></div>';
      html += '</div>';
      el.innerHTML = html;
      container.appendChild(el);
    });
  }

  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function addEntry(){
    var entry = createEntryFromForm();
    var arr = load();
    arr.push(entry);
    save(arr);
    render();
    // clear notes but keep time for next
    qs('notes').value = '';
  }

  function deleteEntry(id){
    var arr = load().filter(function(e){ return String(e.id) !== String(id); });
    save(arr);
    render();
  }

  function clearAll(){
    if (!confirm('Clear all symptom entries? This cannot be undone.')) return;
    save([]);
    render();
  }

  function attach(){
    if (qs('entryTime') && !qs('entryTime').value) qs('entryTime').value = nowLocalISOString();
    var addBtn = qs('add-entry'); if (addBtn) addBtn.addEventListener('click', function(){ addEntry(); });
    var clearBtn = qs('clear-all'); if (clearBtn) clearBtn.addEventListener('click', clearAll);

    var entriesEl = qs('entries');
    if (entriesEl) {
      entriesEl.addEventListener('click', function(ev){
        var btn = ev.target;
        if (btn && btn.classList && btn.classList.contains('delete')){
          var id = btn.getAttribute('data-id');
          deleteEntry(id);
        }
      });
    }

    render();
    renderDashboardChart();
  }

  // Render symptoms chart on dashboard
  function renderDashboardChart(){
    var canvas = qs('symptoms-chart');
    if (!canvas) return; // Not on dashboard
    
    var ctx = canvas.getContext('2d');
    var list = load();
    
    if (list.length === 0){
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No symptom data yet', canvas.width/2, canvas.height/2);
      return;
    }
    
    // Get last 7 entries
    var recent = list.slice(-7);
    
    // Calculate average severity for each entry
    var data = recent.map(function(e){
      var avg = (e.tremor + e.bradykinesia + e.rigidity + e.gait + e.dyskinesia + e.sleep + e.mood + e.cognition) / 8;
      return {
        time: new Date(e.time),
        value: avg
      };
    });
    
    // Draw chart
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    var w = canvas.width;
    var h = canvas.height;
    var padding = 40;
    var graphW = w - padding * 2;
    var graphH = h - padding * 2;
    
    // Draw axes
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, h - padding);
    ctx.lineTo(w - padding, h - padding);
    ctx.stroke();
    
    // Draw severity labels
    ctx.fillStyle = '#64748b';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    for (var i = 0; i <= 10; i += 2){
      var y = h - padding - (i / 10) * graphH;
      ctx.fillText(i.toString(), padding - 10, y + 4);
    }
    
    // Draw line graph
    if (data.length > 1){
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      data.forEach(function(point, idx){
        var x = padding + (idx / (data.length - 1)) * graphW;
        var y = h - padding - (point.value / 10) * graphH;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      
      ctx.stroke();
      
      // Draw points
      ctx.fillStyle = '#3b82f6';
      data.forEach(function(point, idx){
        var x = padding + (idx / (data.length - 1)) * graphW;
        var y = h - padding - (point.value / 10) * graphH;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    
    // Draw title
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Symptom Severity Trend', padding, 20);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach);
  else attach();

})();
