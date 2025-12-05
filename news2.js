// news2.js — calculate NEWS2 score and update the UI
(function(){
  function scoreRespiratoryRate(rr){
    if (rr <= 0 || isNaN(rr)) return 0;
    if (rr <= 8) return 3;
    if (rr >= 9 && rr <= 11) return 1;
    if (rr >= 12 && rr <= 20) return 0;
    if (rr >= 21 && rr <= 24) return 2;
    if (rr >= 25) return 3;
    return 0;
  }

  function scoreSpO2(spo2, scale){
    if (isNaN(spo2)) return 0;
    // Scale 1 (default)
    if (scale === 1){
      if (spo2 <= 91) return 3;
      if (spo2 <= 93) return 2;
      if (spo2 <= 95) return 1;
      return 0;
    }
    // Scale 2 (for known hypercapnic respiratory failure)
    if (scale === 2){
      if (spo2 <= 83) return 3;
      if (spo2 <= 85) return 2;
      if (spo2 <= 87) return 1;
      return 0;
    }
    return 0;
  }

  function scoreTemperature(temp){
    if (isNaN(temp)) return 0;
    if (temp <= 35.0) return 3;
    if (temp >= 35.1 && temp <= 36.0) return 1;
    if (temp >= 36.1 && temp <= 38.0) return 0;
    if (temp >= 38.1 && temp <= 39.0) return 1;
    if (temp >= 39.1) return 2;
    return 0;
  }

  function scoreSystolicBP(bp){
    if (isNaN(bp)) return 0;
    if (bp <= 90) return 3;
    if (bp >= 91 && bp <= 100) return 2;
    if (bp >= 101 && bp <= 110) return 1;
    if (bp >= 111 && bp <= 219) return 0;
    if (bp >= 220) return 3;
    return 0;
  }

  function scoreHeartRate(hr){
    if (isNaN(hr)) return 0;
    if (hr <= 40) return 3;
    if (hr >= 41 && hr <= 50) return 1;
    if (hr >= 51 && hr <= 90) return 0;
    if (hr >= 91 && hr <= 110) return 1;
    if (hr >= 111 && hr <= 130) return 2;
    if (hr >= 131) return 3;
    return 0;
  }

  function scoreConsciousness(code){
    // A = alert (0); V/P/U = 3
    if (!code) return 0;
    if (code === 'A') return 0;
    return 3;
  }

  function interpretScore(total){
    if (total === 0) return 'Low (0) — Continue routine monitoring';
    if (total <= 4) return 'Low to moderate — Clinical review advised';
    if (total === 5 || total === 6) return 'Medium (5-6) — Urgent response required';
    if (total >= 7) return 'High (≥7) — Emergency response required';
    return '';
  }

  function calculateAll(values){
    var rr = Number(values.respiratoryRate);
    var spo2 = Number(values.oxygenSat);
    var supp = values.suppO2 ? 2 : 0; // supplemental oxygen gives 2 points
    var scale = Number(values.spo2Scale) || 1;
    var temp = Number(values.temperature);
    var sbp = Number(values.systolicBP);
    var hr = Number(values.heartRate);
    var cons = values.consciousness;

    var r1 = scoreRespiratoryRate(rr);
    var s1 = scoreSpO2(spo2, scale);
    var t1 = scoreTemperature(temp);
    var b1 = scoreSystolicBP(sbp);
    var h1 = scoreHeartRate(hr);
    var c1 = scoreConsciousness(cons);

    var total = r1 + s1 + supp + t1 + b1 + h1 + c1;
    return {
      total: total,
      breakdown: {
        respiratoryRate: r1,
        oxygenSat: s1,
        supplementalO2: supp,
        temperature: t1,
        systolicBP: b1,
        heartRate: h1,
        consciousness: c1
      }
    };
  }

  // DOM wiring
  function $(id){ return document.getElementById(id); }

  function updateUI(result){
    var resEl = $('result');
    if (!resEl) return;
    
    var totalEl = $('total-score');
    var urgencyEl = $('urgency');
    var breakdownEl = $('breakdown');
    
    if (totalEl) {
      var totalSpan = totalEl.querySelector('span');
      if (totalSpan) totalSpan.textContent = result.total;
    }
    
    if (urgencyEl) {
      var urgencySpan = urgencyEl.querySelector('span');
      if (urgencySpan) urgencySpan.textContent = interpretScore(result.total);
    }
    
    if (breakdownEl) {
      breakdownEl.innerHTML = '';
      var map = result.breakdown;
      for (var k in map){
        var li = document.createElement('li');
        li.textContent = k + ': ' + map[k] + ' point' + (map[k] === 1 ? '' : 's');
        breakdownEl.appendChild(li);
      }
    }
    
    resEl.classList.remove('hidden');
  }

  function gatherValues(){
    var rr = $('respiratoryRate');
    var os = $('oxygenSat');
    var so = $('suppO2');
    var scale = $('spo2Scale');
    var temp = $('temperature');
    var bp = $('systolicBP');
    var hr = $('heartRate');
    var cons = $('consciousness');
    
    return {
      respiratoryRate: rr ? rr.value : '',
      oxygenSat: os ? os.value : '',
      suppO2: so ? so.checked : false,
      spo2Scale: scale ? scale.value : '1',
      temperature: temp ? temp.value : '',
      systolicBP: bp ? bp.value : '',
      heartRate: hr ? hr.value : '',
      consciousness: cons ? cons.value : 'A'
    };
  }

  function attach(){
    var calcBtn = $('calc-btn');
    var inputs = ['respiratoryRate', 'oxygenSat', 'suppO2', 'spo2Scale', 'temperature', 'systolicBP', 'heartRate', 'consciousness'];
    
    // Auto-calculate NEWS2 on any input change
    function autoCalculate(){
      var vals = gatherValues();
      var res = calculateAll(vals);
      updateUI(res);
      
      // Always show result section
      var resEl = $('result');
      if (resEl) resEl.classList.remove('hidden');
    }
    
    // Attach auto-calculate to all inputs
    inputs.forEach(function(id){
      var el = $(id);
      if (el){
        if (el.type === 'checkbox'){
          el.addEventListener('change', autoCalculate);
        } else {
          el.addEventListener('input', autoCalculate);
        }
      }
    });

    // Calculate immediately on page load
    setTimeout(autoCalculate, 100);

    // Hide manual calculate button (now automatic)
    var calcBtn = $('calc-btn');
    if (calcBtn) {
      calcBtn.style.display = 'none';
    }

    // Save NEWS2 result to history (for dashboard chart) if button present
    function saveNews2Log(result, values){ try{ var K='news2_logs_v1'; var arr = JSON.parse(localStorage.getItem(K)||'[]'); arr.push({ id: Date.now(), ts: (new Date()).toISOString(), score: Number(result.total||0), breakdown: result.breakdown, vitals: values }); localStorage.setItem(K, JSON.stringify(arr)); return true; }catch(e){ return false; } }
    var saveBtn = $('save-news2'); if (saveBtn) saveBtn.addEventListener('click', function(){ var vals = gatherValues(); var res = calculateAll(vals); if(saveNews2Log(res, vals)){ alert('Saved NEWS2 score: '+res.total); renderHistory(); } });

    var form = $('vitals-form');
    if (form) {
      form.addEventListener('reset', function(){
        setTimeout(function(){
          autoCalculate(); // Recalculate after reset
        }, 50);
      });
    }
    
    // Render vitals history
    function renderHistory(){
      var container = $('vitals-history');
      if (!container) return;
      try{
        var arr = JSON.parse(localStorage.getItem('news2_logs_v1')||'[]');
        if (!arr.length){
          container.innerHTML = '<p class="muted">No saved vitals yet.</p>';
          return;
        }
        var html = '';
        arr.slice().reverse().forEach(function(entry){
          var date = new Date(entry.ts).toLocaleString();
          var v = entry.vitals || {};
          html += '<div class="card entry" style="margin-bottom:12px">';
          html += '<div style="display:flex;justify-content:space-between;align-items:start">';
          html += '<div><strong>NEWS2: '+entry.score+'</strong> <span class="muted">'+date+'</span></div>';
          html += '<button class="btn btn-danger btn-sm delete-vital" data-id="'+entry.id+'">Delete</button>';
          html += '</div>';
          html += '<div class="muted" style="margin-top:8px;font-size:14px">';
          html += 'RR: '+(v.respiratoryRate||'—')+' | SpO₂: '+(v.oxygenSat||'—')+'% | Temp: '+(v.temperature||'—')+'°C | BP: '+(v.systolicBP||'—')+' | HR: '+(v.heartRate||'—')+' | Consciousness: '+(v.consciousness||'—');
          html += '</div></div>';
        });
        container.innerHTML = html;
      }catch(e){
        container.innerHTML = '<p class="muted">Error loading history.</p>';
      }
    }
    
    // Delete vital entry
    var historyContainer = $('vitals-history');
    if (historyContainer){
      historyContainer.addEventListener('click', function(ev){
        if (ev.target.classList.contains('delete-vital')){
          var id = ev.target.getAttribute('data-id');
          if (confirm('Delete this vital entry?')){
            try{
              var arr = JSON.parse(localStorage.getItem('news2_logs_v1')||'[]');
              arr = arr.filter(function(e){ return String(e.id) !== String(id); });
              localStorage.setItem('news2_logs_v1', JSON.stringify(arr));
              renderHistory();
            }catch(e){}
          }
        }
      });
    }
    
    // Clear all history
    var clearBtn = $('clear-vitals-history');
    if (clearBtn){
      clearBtn.addEventListener('click', function(){
        if (confirm('Clear all vitals history?')){
          localStorage.removeItem('news2_logs_v1');
          renderHistory();
        }
      });
    }
    
    renderHistory();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach);
  else attach();

})();
