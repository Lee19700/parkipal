// fluids.js — record intake/output, store in localStorage, update person visual
(function(){
  var KEY = 'fluidLogs_v1';
  var MIN_NET = -2000; // mL -> bottom of visual
  var MAX_NET = 4000;  // mL -> top of visual
  var bodyImage = null;
  var canvas = null;
  var ctx = null;

  function qs(id){ return document.getElementById(id); }

  function load(){ try{ return JSON.parse(localStorage.getItem(KEY)||'[]'); }catch(e){ return []; } }
  function save(arr){ localStorage.setItem(KEY, JSON.stringify(arr)); }

  function totals(list){
    var intake = 0, output = 0;
    list.forEach(function(e){ if (e.type === 'intake') intake += Number(e.amount||0); else output += Number(e.amount||0); });
    return {intake:intake, output:output, net: intake - output};
  }

  function nowLocalISOString(){
    var d = new Date(); function z(n){ return (n<10?'0':'')+n }
    return d.getFullYear() + '-' + z(d.getMonth()+1) + '-' + z(d.getDate()) + 'T' + z(d.getHours()) + ':' + z(d.getMinutes());
  }

  function renderTotals(){
    var list = load(); var t = totals(list);
    qs('total-intake').textContent = t.intake;
    qs('total-output').textContent = t.output;
    qs('net-balance').textContent = t.net;
    // Only update fill if we have data, otherwise show empty body
    if (list.length > 0) {
      updatePersonFill(t.net);
    } else {
      // Show empty body outline
      if (canvas && ctx && bodyImage) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bodyImage, 0, 0, canvas.width, canvas.height);
      }
    }
  }

  function renderHistory(){
    var list = load(); var container = qs('fluid-entries'); container.innerHTML = '';
    if (!list || list.length===0){ container.innerHTML = '<p>No records yet.</p>'; return; }
    list.slice().reverse().forEach(function(e){
      var el = document.createElement('div'); el.className = 'entry card';
      var html = '<div style="display:flex;justify-content:space-between">';
      html += '<div><strong>' + (e.time.replace('T',' ')) + '</strong><br/>' + (e.type === 'intake' ? 'Intake' : 'Output') + ': ' + e.amount + ' mL';
      if (e.notes) html += '<div><small>' + escapeHtml(e.notes) + '</small></div>';
      html += '</div>';
      html += '<div><button data-id="' + e.id + '" class="delete">Delete</button></div>';
      html += '</div>';
      el.innerHTML = html; container.appendChild(el);
    });
  }

  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function addRecord(){
    var type = qs('fluid-type').value;
    var amount = Number(qs('amount').value) || 0;
    if (amount <= 0){ alert('Enter an amount in mL'); return; }
    var time = qs('fluid-time').value || nowLocalISOString();
    var notes = qs('fluid-notes').value || '';
    var entry = { id: Date.now(), type:type, amount:amount, time:time, notes:notes };
    var arr = load(); arr.push(entry); save(arr);
    qs('amount').value = '250'; qs('fluid-notes').value = '';
    renderHistory(); renderTotals();
  }

  function deleteRecord(id){ var arr = load().filter(function(e){ return String(e.id) !== String(id); }); save(arr); renderHistory(); renderTotals(); }

  function clearAll(){ if (!confirm('Clear all fluid records?')) return; save([]); renderHistory(); renderTotals(); }

  function mapNetToPercent(net){
    var clamped = Math.max(MIN_NET, Math.min(MAX_NET, net));
    return (clamped - MIN_NET) / (MAX_NET - MIN_NET); // 0..1
  }

  function updatePersonFill(net){
    if (!canvas || !ctx || !bodyImage) return;
    
    var perc = mapNetToPercent(net);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate fill height from bottom
    var fillHeight = canvas.height * perc;
    var fillY = canvas.height - fillHeight;
    
    // Create gradient for fill
    var gradient = ctx.createLinearGradient(0, fillY, 0, canvas.height);
    if (net >= 0) {
      gradient.addColorStop(0, '#3b82f6');
      gradient.addColorStop(1, '#60a5fa');
    } else {
      gradient.addColorStop(0, '#fb923c');
      gradient.addColorStop(1, '#fbbf24');
    }
    
    // Draw the fill color first
    ctx.fillStyle = gradient;
    ctx.fillRect(0, fillY, canvas.width, fillHeight);
    
    // Use the body image as a mask (only keep fill where image exists)
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(bodyImage, 0, 0, canvas.width, canvas.height);
    
    // Reset composite mode and draw the body outline on top with reduced opacity
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.3;
    ctx.drawImage(bodyImage, 0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1.0;
  }

  function initCanvas(){
    canvas = qs('body-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    
    bodyImage = new Image();
    bodyImage.onload = function(){
      // Clear any existing fill when image loads
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bodyImage, 0, 0, canvas.width, canvas.height);
      renderTotals();
    };
    bodyImage.src = 'people-3d-icon-free-png.webp';
  }

  function attach(){
    initCanvas();
    if (qs('fluid-time') && !qs('fluid-time').value) qs('fluid-time').value = nowLocalISOString();
    qs('add-fluid').addEventListener('click', addRecord);
    qs('clear-fluids').addEventListener('click', clearAll);
    qs('fluid-entries').addEventListener('click', function(ev){ var b = ev.target; if (b && b.classList && b.classList.contains('delete')) deleteRecord(b.getAttribute('data-id')); });
    renderHistory(); 
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach); else attach();

})();
