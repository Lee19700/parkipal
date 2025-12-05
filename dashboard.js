(function(){
  function qs(id){ return document.getElementById(id); }
  function fmtName(u){ return (u && (u.display||u.username)) || 'there'; }

  function requireAuthOrRedirect(){ if (window.PPAuth && typeof window.PPAuth.requireAuth === 'function'){ var ok = window.PPAuth.requireAuth(); return ok; } return true; }

  // Appointment helpers: read from appointments_v1 and show nearest upcoming
  function loadAppointments(){ try{ return JSON.parse(localStorage.getItem('appointments_v1')||'[]'); }catch(e){ return []; } }

  function nextAppointment(){ try{ var arr = loadAppointments().slice(); if (!arr || arr.length===0) return null; var now = new Date(); var candidates = arr.map(function(a){ return { id: a.id, title: a.title, ts: new Date(a.ts) }; }).filter(function(x){ return x.ts > now; }); if (!candidates || candidates.length===0) return null; candidates.sort(function(a,b){ return a.ts - b.ts; }); return candidates[0]; }catch(e){ return null; } }

  function updateCountdown(){ 
    var ap = nextAppointment(); 
    var details = qs('appt-details'); 
    var none = qs('appt-none'); 
    var titleEl = qs('appt-title-display'); 
    var cd = qs('appt-countdown'); 
    
    console.log('Countdown update - Appointment:', ap); // Debug
    
    if (!ap || !ap.ts){ 
      if (details) details.classList.add('hidden'); 
      if (none) none.classList.remove('hidden'); 
      if (cd) cd.textContent = '—'; 
      return; 
    }
    
    var dt = new Date(ap.ts); 
    var now = new Date(); 
    var diff = dt - now; 
    
    console.log('Time difference (ms):', diff); // Debug
    
    if (diff <= 0){ // appointment passed
      if (titleEl) titleEl.textContent = ap.title + ' — now'; 
      if (details) details.classList.remove('hidden'); 
      if (none) none.classList.add('hidden'); 
      if (cd) cd.textContent = 'Now'; 
      return; 
    }
    
    var days = Math.floor(diff / (1000*60*60*24)); 
    var hrs = Math.floor((diff%(1000*60*60*24))/(1000*60*60)); 
    var mins = Math.floor((diff%(1000*60*60))/(1000*60)); 
    var secs = Math.floor((diff%(1000*60))/1000);
    
    if (titleEl) titleEl.textContent = ap.title || 'Appointment'; 
    if (details) details.classList.remove('hidden'); 
    if (none) none.classList.add('hidden'); 
    if (cd) cd.textContent = days+'d '+hrs+'h '+mins+'m '+secs+'s'; 
  }

  // Next medication: find nearest upcoming time from MedsStore
  function findNextMedication(){ try{ if (window.MedsStore && typeof window.MedsStore.load === 'function'){ var meds = window.MedsStore.load() || []; var now = new Date(); var soon = null; meds.forEach(function(m){ if (!m.times) return; var parts = String(m.times).split(',').map(function(s){ return s.trim(); }).filter(Boolean); parts.forEach(function(t){ var hm = t.split(':'); if (hm.length<2) return; var h = parseInt(hm[0],10), mi = parseInt(hm[1],10); if (isNaN(h)||isNaN(mi)) return; // create date for today at that time
          var cand = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, mi, 0);
          if (cand < now) cand = new Date(cand.getTime() + 24*60*60*1000); // tomorrow
          if (!soon || cand < soon.time){ soon = { time: cand, med: m }; }
        }); }); if (soon) return soon; } }catch(e){}
    return null;
  }

  // NEWS2 chart: read stored NEWS2 logs if present
  function loadNews2Logs(){ try{ return JSON.parse(localStorage.getItem('news2_logs_v1')||'[]'); }catch(e){ return []; } }

  function drawNews2Chart(){ var canvas = qs('news2-chart'); var msg = qs('news2-msg'); var scoreEl = qs('news2-current-score'); if (!canvas) return; var ctx = canvas.getContext('2d'); var data = loadNews2Logs(); if (!data || data.length===0){ if (msg) msg.textContent = 'No NEWS2 history recorded. Visit Vitals to record NEWS2 scores.'; if (scoreEl) scoreEl.textContent = '—'; // clear canvas
      ctx.clearRect(0,0,canvas.width,canvas.height); return; }
    msg.textContent = '';
    // Show latest score
    var latest = data[data.length - 1];
    if (scoreEl && latest) {
      var score = Number(latest.score || 0);
      var riskText = score === 0 ? 'Low risk' : score <= 4 ? 'Low-Medium risk' : score <= 6 ? 'Medium risk' : 'High risk';
      scoreEl.innerHTML = 'Current Score: <span style="color:' + (score <= 4 ? '#10b981' : score <= 6 ? '#f59e0b' : '#ef4444') + '">' + score + '</span> — ' + riskText;
    }
    // sort by timestamp
    data = data.slice().sort(function(a,b){ return new Date(a.ts) - new Date(b.ts); });
    var w = canvas.width; var h = canvas.height; ctx.clearRect(0,0,w,h);
    // padding
    var pad = 30; var innerW = w - pad*2; var innerH = h - pad*2;
    // x scale by index
    var n = data.length; var xs = function(i){ return pad + (i/(Math.max(1,n-1)))*innerW; };
    var maxScore = Math.max.apply(null, data.map(function(d){ return Number(d.score||0); }).concat([10]));
    var ys = function(val){ var v = Number(val||0); return pad + innerH - (v/maxScore)*innerH; };
    // axes
    ctx.strokeStyle = '#dfe6ee'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad, pad); ctx.lineTo(pad, pad+innerH); ctx.lineTo(pad+innerW, pad+innerH); ctx.stroke();
    // line
    ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2; ctx.beginPath(); data.forEach(function(d,i){ var x = xs(i); var y = ys(d.score); if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); }); ctx.stroke();
    // points
    ctx.fillStyle = '#0ea5e9'; data.forEach(function(d,i){ var x = xs(i); var y = ys(d.score); ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill(); });
    // labels (min/max)
    ctx.fillStyle = '#6b7280'; ctx.font = '12px Inter, Arial'; ctx.fillText('Score', 6, pad+10);
  }

  // Symptoms summary
  function renderSymptomsSummary(){ 
    var el = qs('symptoms-summary'); 
    if (!el) return; 
    
    try{ 
      var arr = JSON.parse(localStorage.getItem('symptomLogs_v1')||'[]'); 
      if (!arr || arr.length===0){ 
        el.textContent = 'No symptom entries yet.'; 
        return; 
      } 
      
      // Compute averages across fields
      var symptomLabels = {
        'tremor': 'Tremor',
        'bradykinesia': 'Bradykinesia',
        'rigidity': 'Rigidity',
        'gait': 'Gait',
        'dyskinesia': 'Dyskinesia',
        'sleep': 'Sleep',
        'mood': 'Mood',
        'cognition': 'Cognition'
      };
      
      var keys = ['tremor','bradykinesia','rigidity','gait','dyskinesia','sleep','mood','cognition']; 
      var sums = {}; 
      keys.forEach(function(k){ sums[k]=0; }); 
      arr.forEach(function(a){ 
        keys.forEach(function(k){ 
          sums[k] += Number(a[k]||0); 
        }); 
      }); 
      
      var avg = {}; 
      keys.forEach(function(k){ 
        avg[k] = (sums[k]/arr.length); 
      }); 
      
      // Render nicely formatted
      var html = '<div class="sym-grid" style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:12px;">'; 
      keys.forEach(function(k){ 
        var v = Math.round(avg[k]*10)/10; 
        html += '<div style="padding:6px;background:#f8fafc;border-radius:4px;"><strong>' + symptomLabels[k] + ':</strong> <span style="color:#3b82f6;font-size:1.1em;">' + v + '</span>/10</div>'; 
      }); 
      html += '</div>'; 
      el.innerHTML = html; 
    } catch(e){ 
      el.textContent = 'Error loading symptoms.'; 
    } 
  }

  // Next medication render
  function renderNextMed(){ var el = qs('next-med'); if (!el) return; var soon = findNextMedication(); if (!soon){ el.textContent = 'No scheduled medications with times found.'; return; } var name = soon.med.name || 'Medication'; var t = soon.time; var now = new Date(); var diff = Math.max(0, t - now); var hrs = Math.floor(diff/(1000*60*60)); var mins = Math.floor((diff%(1000*60*60))/(1000*60)); el.innerHTML = '<div><strong>'+escapeHtml(name)+'</strong></div><div class="muted">In '+hrs+'h '+mins+'m at '+t.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})+'</div><div class="muted">Stock: '+(soon.med.stock||'—')+' tablets</div>'; }

  // small helper
  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function getGreeting(){
    var hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  function attach(){ if (!requireAuthOrRedirect()) return; var cur = window.PPAuth && window.PPAuth.getCurrent ? window.PPAuth.getCurrent() : null; var name = fmtName(cur); var welcome = qs('welcome-text'); var welcomeSub = qs('welcome-sub'); if (welcome) welcome.textContent = getGreeting() + ', '+ (name); if (welcomeSub) welcomeSub.textContent = 'Here is your health overview.'; // appointment handlers
    // initialize countdown (reads from appointments list)
    updateCountdown(); if (window._apptInterval) clearInterval(window._apptInterval); window._apptInterval = setInterval(updateCountdown, 1000);

    // NEWS2 chart
    drawNews2Chart(); // try rerender on interval in case logs change elsewhere
    setInterval(drawNews2Chart, 5000);

    // symptoms
    renderSymptomsSummary(); setInterval(renderSymptomsSummary, 5000);

    // next med
    renderNextMed(); setInterval(renderNextMed, 30*1000);

    // AI check-in
    qs('ai-send').addEventListener('click', function(){ var text = qs('ai-input').value||''; var resp = qs('ai-response'); if (!text.trim()){ alert('Tell me a little about how you are feeling.'); return; } // generate a simple empathetic reply
      var greeting = 'Thanks for sharing — '+ (cur && (cur.display||cur.username) ? (cur.display||cur.username) : 'friend') + '.';
      var tone = 'I hear you. If this is urgent or you feel unwell, please contact your clinician or emergency services.';
      var advice = 'Try to note when symptoms are worst and any triggers (medications, sleep, hydration).';
      resp.innerHTML = '<strong>'+escapeHtml(greeting)+'</strong><div class="section-gap">'+escapeHtml(tone)+'</div><div class="muted">'+escapeHtml(advice)+'</div>'; qs('ai-input').value = ''; });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach); else attach();

})();
