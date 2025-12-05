// foods.js — simple food/meals tracker using localStorage
(function(){
  var KEY = 'foodLogs_v1';

  function qs(id){ return document.getElementById(id); }
  function nowLocalISOString(){
    var d = new Date(); function z(n){ return (n<10?'0':'')+n }
    return d.getFullYear() + '-' + z(d.getMonth()+1) + '-' + z(d.getDate()) + 'T' + z(d.getHours()) + ':' + z(d.getMinutes());
  }

  function load(){ try{ return JSON.parse(localStorage.getItem(KEY)||'[]'); }catch(e){ return []; } }
  function save(arr){ localStorage.setItem(KEY, JSON.stringify(arr)); }

  function createFromForm(){
    return {
      id: Date.now(),
      time: qs('food-time').value || nowLocalISOString(),
      type: qs('meal-type').value,
      items: qs('items').value || '',
      calories: Number(qs('calories').value) || 0,
      notes: qs('food-notes').value || ''
    };
  }

  function renderHistory(){
    var arr = load(); var container = qs('food-entries'); container.innerHTML = '';
    if (!arr || arr.length===0){ container.innerHTML = '<p>No meals logged yet.</p>'; return; }
    arr.slice().reverse().forEach(function(e){
      var el = document.createElement('div'); el.className = 'entry card';
      var html = '<div style="display:flex;justify-content:space-between">';
      html += '<div><strong>' + (e.time.replace('T',' ')) + '</strong><br/>' + e.type + ' · ' + escapeHtml(e.items);
      if (e.calories) html += '<div><small>' + e.calories + ' kcal</small></div>';
      if (e.notes) html += '<div><small>' + escapeHtml(e.notes) + '</small></div>';
      html += '</div>';
      html += '<div><button data-id="' + e.id + '" class="delete">Delete</button></div>';
      html += '</div>';
      el.innerHTML = html; container.appendChild(el);
    });
  }

  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function addMeal(){
    var entry = createFromForm();
    var arr = load(); arr.push(entry); save(arr);
    qs('items').value = ''; qs('calories').value = ''; qs('food-notes').value = '';
    renderHistory(); renderTotals();
  }

  function deleteMeal(id){ var arr = load().filter(function(e){ return String(e.id) !== String(id); }); save(arr); renderHistory(); renderTotals(); }

  function clearAll(){ if (!confirm('Clear all meal entries?')) return; save([]); renderHistory(); renderTotals(); }

  function startOfDayISO(d){ var date = new Date(d); date.setHours(0,0,0,0); function z(n){ return (n<10?'0':'')+n } return date.getFullYear() + '-' + z(date.getMonth()+1) + '-' + z(date.getDate()) + 'T00:00'; }

  function renderTotals(){
    var arr = load(); var now = new Date(); var start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var todayArr = arr.filter(function(e){ return new Date(e.time) >= start; });
    var meals = todayArr.length;
    var cal = todayArr.reduce(function(acc,e){ return acc + (Number(e.calories)||0); },0);
    qs('meals-today').textContent = meals;
    qs('calories-today').textContent = cal;
  }

  function attach(){ if (qs('food-time') && !qs('food-time').value) qs('food-time').value = nowLocalISOString();
    qs('add-food').addEventListener('click', addMeal);
    qs('clear-foods').addEventListener('click', clearAll);
    qs('food-entries').addEventListener('click', function(ev){ var b = ev.target; if (b && b.classList && b.classList.contains('delete')) deleteMeal(b.getAttribute('data-id')); });
    renderHistory(); renderTotals(); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach); else attach();

})();
