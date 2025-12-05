// med_log.js — Immutable medication log with manual entry support
(function(){
  'use strict';

  var LOG_KEY = 'meds_immutable_log_v1';
  var LOW_STOCK_THRESHOLD = 7; // Alert when less than 7 tablets

  function qs(id){ return document.getElementById(id); }

  // Load immutable log (append-only)
  function loadLog(){
    try{
      return JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    } catch(e){
      return [];
    }
  }

  // Append entry to log (cannot be modified or deleted)
  function appendToLog(entry){
    try{
      var log = loadLog();
      entry.logId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      entry.timestamp = entry.timestamp || new Date().toISOString();
      entry.immutable = true;
      log.push(entry);
      localStorage.setItem(LOG_KEY, JSON.stringify(log));
      return entry;
    } catch(e){
      console.error('Failed to append to log:', e);
      return null;
    }
  }

  // Check stock levels and return low stock medications
  function checkLowStock(){
    if (!window.MedsStore) return [];
    var meds = window.MedsStore.load();
    var lowStock = [];
    
    meds.forEach(function(med){
      var stock = Number(med.stock || 0);
      var tabletsPerDose = Number(med.tabletsPerDose || 1);
      var dosesPerDay = Number(med.dosesPerDay || (med.times ? med.times.split(',').length : 1));
      var daysRemaining = tabletsPerDose > 0 ? Math.floor(stock / (tabletsPerDose * dosesPerDay)) : stock;
      
      if (daysRemaining <= LOW_STOCK_THRESHOLD && stock > 0){
        lowStock.push({
          name: med.name,
          stock: stock,
          daysRemaining: daysRemaining
        });
      } else if (stock === 0){
        lowStock.push({
          name: med.name,
          stock: 0,
          daysRemaining: 0
        });
      }
    });
    
    return lowStock;
  }

  // Render low stock alerts
  function renderLowStockAlerts(){
    var container = qs('low-stock-alerts');
    if (!container) return;
    
    var lowStock = checkLowStock();
    
    if (lowStock.length === 0){
      container.innerHTML = '<p class="muted">All medications have adequate stock.</p>';
      return;
    }
    
    var html = '<div class="alert-list">';
    lowStock.forEach(function(item){
      if (item.stock === 0){
        html += '<div class="alert-item alert-danger">';
        html += '<strong>⚠ ' + escapeHtml(item.name) + '</strong>';
        html += '<div>OUT OF STOCK - Refill immediately!</div>';
        html += '</div>';
      } else {
        html += '<div class="alert-item alert-warning">';
        html += '<strong>⚠ ' + escapeHtml(item.name) + '</strong>';
        html += '<div>Low stock: ' + item.stock + ' tablets remaining (~' + item.daysRemaining + ' days)</div>';
        html += '</div>';
      }
    });
    html += '</div>';
    
    container.innerHTML = html;
    
    // Also update top banner
    renderTopBanner(lowStock);
  }

  // Render top banner notification
  function renderTopBanner(lowStock){
    var banner = qs('low-stock-banner');
    if (!banner) return;
    
    if (!lowStock) lowStock = checkLowStock();
    
    if (lowStock.length === 0){
      banner.style.display = 'none';
      return;
    }
    
    banner.style.display = 'block';
    
    var outOfStock = lowStock.filter(function(item){ return item.stock === 0; });
    var lowStockItems = lowStock.filter(function(item){ return item.stock > 0; });
    
    var html = '<div class="banner-content">';
    html += '<div class="banner-icon">⚠️</div>';
    html += '<div class="banner-text">';
    
    if (outOfStock.length > 0){
      html += '<strong>Medication Alert: ' + outOfStock.length + ' medication' + (outOfStock.length > 1 ? 's' : '') + ' out of stock!</strong> ';
      html += outOfStock.map(function(item){ return escapeHtml(item.name); }).join(', ');
      if (lowStockItems.length > 0){
        html += ' | ';
      }
    }
    
    if (lowStockItems.length > 0){
      if (outOfStock.length === 0){
        html += '<strong>Low Stock Alert:</strong> ';
      }
      html += lowStockItems.map(function(item){ 
        return escapeHtml(item.name) + ' (' + item.daysRemaining + ' days left)';
      }).join(', ');
    }
    
    html += '</div>';
    html += '<button class="banner-close" onclick="document.getElementById(\'low-stock-banner\').style.display=\'none\'">×</button>';
    html += '</div>';
    
    banner.innerHTML = html;
  }

  // Render medication log (read-only)
  function renderMedicationLog(){
    var container = qs('medication-log-list');
    if (!container) return;
    
    var log = loadLog();
    
    if (log.length === 0){
      container.innerHTML = '<p class="muted">No medication entries logged yet.</p>';
      return;
    }
    
    // Sort by timestamp descending (newest first)
    log.sort(function(a, b){
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    var html = '';
    log.forEach(function(entry){
      var date = new Date(entry.timestamp);
      var dateStr = date.toLocaleDateString();
      var timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
      
      html += '<div class="log-entry">';
      html += '<div class="log-entry-header">';
      html += '<strong>' + escapeHtml(entry.medicationName || 'Unknown') + '</strong>';
      html += '<span class="log-entry-time">' + dateStr + ' ' + timeStr + '</span>';
      html += '</div>';
      
      if (entry.dose){
        html += '<div class="log-entry-detail">Dose: ' + escapeHtml(entry.dose) + '</div>';
      }
      
      if (entry.tablets){
        html += '<div class="log-entry-detail">Tablets taken: ' + escapeHtml(String(entry.tablets)) + '</div>';
      }
      
      if (entry.method === 'manual'){
        html += '<div class="log-entry-badge log-entry-manual">Manual Entry</div>';
      } else {
        html += '<div class="log-entry-badge log-entry-auto">Auto Logged</div>';
      }
      
      if (entry.notes){
        html += '<div class="log-entry-notes">' + escapeHtml(entry.notes) + '</div>';
      }
      
      html += '<div class="log-entry-id">Log ID: ' + escapeHtml(entry.logId) + '</div>';
      html += '</div>';
    });
    
    container.innerHTML = html;
  }

  // Manual log entry form
  function attachManualLogForm(){
    var medSelect = qs('manual-log-med');
    var dateInput = qs('manual-log-date');
    var timeInput = qs('manual-log-time');
    var notesInput = qs('manual-log-notes');
    var btnSubmit = qs('btn-submit-manual-log');
    var statusEl = qs('manual-log-status');
    
    if (!btnSubmit) return;
    
    // Populate medication dropdown
    if (medSelect && window.MedsStore){
      var meds = window.MedsStore.load();
      medSelect.innerHTML = '<option value="">-- Select medication --</option>';
      meds.forEach(function(med){
        var opt = document.createElement('option');
        opt.value = med.id;
        opt.textContent = med.name + (med.dose ? ' (' + med.dose + ')' : '');
        opt.setAttribute('data-name', med.name);
        opt.setAttribute('data-dose', med.dose || '');
        opt.setAttribute('data-tablets', med.tabletsPerDose || '1');
        medSelect.appendChild(opt);
      });
    }
    
    // Set default date/time to now
    if (dateInput && timeInput){
      var now = new Date();
      dateInput.value = now.toISOString().split('T')[0];
      timeInput.value = now.toTimeString().substr(0, 5);
    }
    
    btnSubmit.addEventListener('click', function(){
      if (!medSelect || !medSelect.value){
        alert('Please select a medication');
        return;
      }
      
      var selectedOpt = medSelect.options[medSelect.selectedIndex];
      var medName = selectedOpt.getAttribute('data-name');
      var medDose = selectedOpt.getAttribute('data-dose');
      var tablets = selectedOpt.getAttribute('data-tablets');
      
      var date = dateInput ? dateInput.value : '';
      var time = timeInput ? timeInput.value : '';
      var notes = notesInput ? notesInput.value : '';
      
      if (!date || !time){
        alert('Please enter date and time');
        return;
      }
      
      // Find the medication to get current stock info
      var med = null;
      if (window.MedsStore){
        var allMeds = window.MedsStore.load();
        med = allMeds.find(function(m){ return m.name === medName; });
      }
      
      // Combine date and time
      var timestamp = new Date(date + 'T' + time).toISOString();
      
      // Create log entry with tablets and stock info
      var entry = {
        medName: medName,
        dose: medDose,
        tabletsTaken: tablets,
        stockAfter: med ? Number(med.stock || 0) : undefined,
        timestamp: timestamp,
        method: 'manual',
        notes: notes
      };
      
      // Append to immutable log
      var logged = appendToLog(entry);
      
      if (logged){
        if (statusEl) statusEl.textContent = 'Manual entry logged: ' + medName + ' at ' + time;
        
        // Clear form
        if (medSelect) medSelect.selectedIndex = 0;
        if (notesInput) notesInput.value = '';
        
        // Reset to current time
        var now = new Date();
        if (dateInput) dateInput.value = now.toISOString().split('T')[0];
        if (timeInput) timeInput.value = now.toTimeString().substr(0, 5);
        
        // Refresh log display
        setTimeout(renderMedicationLog, 100);
      } else {
        if (statusEl) statusEl.textContent = 'Error logging entry';
      }
    });
  }

  // Hook into MedsStore.takeMed to auto-log
  function interceptTakeMed(){
    if (!window.MedsStore || !window.MedsStore.takeMed) return;
    
    var originalTakeMed = window.MedsStore.takeMed;
    
    window.MedsStore.takeMed = function(medId){
      // Get med details before taking
      var meds = window.MedsStore.load();
      var med = meds.find(function(m){ return String(m.id) === String(medId); });
      
      if (med){
        // Log to immutable log
        var entry = {
          medicationName: med.name,
          dose: med.dose || '',
          tablets: med.tabletsPerDose || 1,
          timestamp: new Date().toISOString(),
          method: 'auto',
          notes: 'Taken via system'
        };
        appendToLog(entry);
      }
      
      // Call original function
      originalTakeMed.call(this, medId);
      
      // Refresh displays
      setTimeout(function(){
        renderMedicationLog();
        renderLowStockAlerts();
      }, 200);
    };
  }

  function escapeHtml(s){
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Initialize
  function init(){
    interceptTakeMed();
    renderMedicationLog();
    renderLowStockAlerts();
    attachManualLogForm();
    
    // Refresh alerts every 5 minutes
    setInterval(renderLowStockAlerts, 300000);
  }

  // Expose API
  window.MedLog = {
    getAll: loadLog,
    getLog: loadLog,
    append: appendToLog,
    checkLowStock: checkLowStock,
    refresh: function(){
      renderMedicationLog();
      renderLowStockAlerts();
    }
  };

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
