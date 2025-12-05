// meds_popup.js — Show popup with medications due at current time
(function(){
  'use strict';

  function qs(id){ return document.getElementById(id); }

  // Parse time string like "08:00" to minutes since midnight
  function parseTime(timeStr){
    var parts = String(timeStr||'').trim().split(':');
    if (parts.length !== 2) return null;
    var h = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  // Get current time in minutes since midnight
  function getCurrentMinutes(){
    var now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  // Check if medication is due now (within ±15 minutes)
  function isDueNow(timeStr, currentMinutes){
    var medMinutes = parseTime(timeStr);
    if (medMinutes === null) return false;
    var diff = Math.abs(currentMinutes - medMinutes);
    return diff <= 15; // Within 15 minutes
  }

  // Get all medications due now
  function getMedicationsDueNow(){
    if (!window.MedsStore) return [];
    var allMeds = window.MedsStore.load();
    var currentMinutes = getCurrentMinutes();
    var dueNow = [];

    allMeds.forEach(function(med){
      var timesStr = med.times || '';
      var times = timesStr.split(',').map(function(t){ return t.trim(); });
      
      times.forEach(function(timeStr){
        if (isDueNow(timeStr, currentMinutes)){
          dueNow.push({
            id: med.id,
            name: med.name,
            dose: med.dose,
            time: timeStr,
            tabletsPerDose: med.tabletsPerDose || 0,
            stock: med.stock || 0,
            notes: med.notes || ''
          });
        }
      });
    });

    return dueNow;
  }

  // Format time for display
  function formatTime(timeStr){
    return timeStr || '--:--';
  }

  // Escape HTML
  function escapeHtml(s){ 
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); 
  }

  // Play alarm sound
  function playAlarm(){
    try{
      // Create audio context for beep sound
      var audioContext = new (window.AudioContext || window.webkitAudioContext)();
      var oscillator = audioContext.createOscillator();
      var gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Set frequency and type for a pleasant notification sound
      oscillator.frequency.value = 800; // Hz
      oscillator.type = 'sine';
      
      // Fade in and out
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      // Play three beeps
      setTimeout(function(){
        var osc2 = audioContext.createOscillator();
        var gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.value = 900;
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0, audioContext.currentTime);
        gain2.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.5);
      }, 600);
      
      setTimeout(function(){
        var osc3 = audioContext.createOscillator();
        var gain3 = audioContext.createGain();
        osc3.connect(gain3);
        gain3.connect(audioContext.destination);
        osc3.frequency.value = 1000;
        osc3.type = 'sine';
        gain3.gain.setValueAtTime(0, audioContext.currentTime);
        gain3.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
        gain3.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        osc3.start(audioContext.currentTime);
        osc3.stop(audioContext.currentTime + 0.5);
      }, 1200);
    } catch(e){
      console.log('Could not play alarm sound:', e);
    }
  }

  // Create and show popup
  function showMedicationPopup(playSound){
    var dueMeds = getMedicationsDueNow();
    
    // Remove existing popup if any
    var existing = qs('meds-popup-overlay');
    if (existing) existing.remove();

    // Play alarm if requested and there are medications due
    if (playSound !== false && dueMeds.length > 0){
      playAlarm();
    }

    // Create overlay
    var overlay = document.createElement('div');
    overlay.id = 'meds-popup-overlay';
    overlay.className = 'meds-popup-overlay';

    var popup = document.createElement('div');
    popup.className = 'meds-popup card';

    var html = '<div class="meds-popup-header">';
    html += '<h2>Medications Due Now</h2>';
    html += '<button class="meds-popup-close btn btn-ghost" id="close-meds-popup">×</button>';
    html += '</div>';

    html += '<div class="meds-popup-body">';

    if (dueMeds.length === 0){
      html += '<p class="muted">No medications are due at this time.</p>';
      html += '<p class="muted-small">Medications are shown when within 15 minutes of scheduled time.</p>';
    } else {
      html += '<p class="muted">You have <strong>' + dueMeds.length + '</strong> medication' + (dueMeds.length > 1 ? 's' : '') + ' due now:</p>';
      
      // Add "Take All" button for easy one-click taking
      var buttonText = dueMeds.length === 1 ? 'Take Medication' : 'Take All (' + dueMeds.length + ' medications)';
      html += '<button class="btn btn-primary btn-take-all" id="take-all-meds-btn" style="margin-bottom: 16px; font-size: 1.1rem; padding: 12px 24px;">' + buttonText + '</button>';
      
      dueMeds.forEach(function(med){
        html += '<div class="meds-popup-item">';
        html += '<div class="meds-popup-item-header">';
        html += '<strong>' + escapeHtml(med.name) + '</strong>';
        html += '<span class="meds-popup-time">' + formatTime(med.time) + '</span>';
        html += '</div>';
        
        if (med.dose){
          html += '<div class="meds-popup-dose">' + escapeHtml(med.dose) + '</div>';
        }
        
        var defaultTablets = med.tabletsPerDose > 0 ? med.tabletsPerDose : 1;
        
        html += '<div class="meds-popup-tablets-input" style="margin: 8px 0; display: flex; align-items: center; gap: 8px;">';
        html += '<label for="tablets-' + med.id + '" style="font-weight: 500;">Tablets to take:</label>';
        html += '<input type="number" id="tablets-' + med.id + '" class="tablets-input" data-med-id="' + med.id + '" min="1" max="' + med.stock + '" value="' + defaultTablets + '" style="width: 60px; padding: 4px 8px; border: 1px solid #d1d5db; border-radius: 4px;">';
        html += '</div>';
        
        if (med.stock > 0){
          html += '<div class="meds-popup-stock">Stock: ' + med.stock + ' tablets</div>';
        } else {
          html += '<div class="meds-popup-stock warning">⚠ Out of stock</div>';
        }
        
        if (med.notes){
          html += '<div class="meds-popup-notes">' + escapeHtml(med.notes) + '</div>';
        }
        
        html += '<button class="btn btn-primary btn-sm take-med-popup" data-id="' + med.id + '">Take Now</button>';
        html += '</div>';
      });
    }

    html += '</div>';

    html += '<div class="meds-popup-footer">';
    html += '<button class="btn btn-ghost" id="dismiss-meds-popup">Dismiss</button>';
    html += '<a href="medications.html" class="btn btn-primary">Go to Medications</a>';
    html += '</div>';

    popup.innerHTML = html;
    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    // Add event listeners
    qs('close-meds-popup').addEventListener('click', closeMedicationPopup);
    qs('dismiss-meds-popup').addEventListener('click', closeMedicationPopup);
    overlay.addEventListener('click', function(e){
      if (e.target === overlay) closeMedicationPopup();
    });

    // Handle "Take All" button
    var takeAllBtn = qs('take-all-meds-btn');
    if (takeAllBtn){
      takeAllBtn.addEventListener('click', function(){
        var medIds = [];
        var customTabletCounts = {}; // Track custom tablet counts per med
        
        takeBtns.forEach(function(btn){
          var medId = btn.getAttribute('data-id');
          medIds.push(medId);
          
          // Read custom tablet input if available
          var tabletsInput = document.getElementById('tablets-' + medId);
          if (tabletsInput) {
            customTabletCounts[medId] = parseInt(tabletsInput.value) || 1;
          }
        });
        
        // Take all medications
        medIds.forEach(function(medId){
          if (window.MedsStore && window.MedsStore.takeMed){
            window.MedsStore.takeMed(medId);
          }
        });
        
        // Mark all as taken visually and disable inputs
        var items = document.querySelectorAll('.meds-popup-item');
        items.forEach(function(item){
          item.style.opacity = '0.5';
        });
        
        takeBtns.forEach(function(btn){
          btn.textContent = 'Taken ✓';
          btn.disabled = true;
        });
        
        // Disable all tablet inputs
        medIds.forEach(function(medId){
          var tabletsInput = document.getElementById('tablets-' + medId);
          if (tabletsInput) tabletsInput.disabled = true;
        });
        
        // Update "Take All" button
        this.textContent = 'All Taken ✓';
        this.disabled = true;
        
        // Track that these medications were taken with custom counts
        markMedicationsTaken(medIds, customTabletCounts);
        
        // Close popup after 1 second
        setTimeout(closeMedicationPopup, 1000);
      });
    }
    
    // Handle individual "Take Now" buttons
    var takeBtns = document.querySelectorAll('.take-med-popup');
    takeBtns.forEach(function(btn){
      btn.addEventListener('click', function(){
        var medId = this.getAttribute('data-id');
        
        // Get the number of tablets from input
        var tabletsInput = document.getElementById('tablets-' + medId);
        var tabletsTaken = tabletsInput ? parseInt(tabletsInput.value) || 1 : 1;
        
        if (window.MedsStore && window.MedsStore.takeMed){
          // Take the medication (updates stock)
          window.MedsStore.takeMed(medId);
          
          // Track that this medication was taken with custom tablet count
          markMedicationsTaken([medId], tabletsTaken);
          
          // Remove the med from popup
          var item = this.closest('.meds-popup-item');
          if (item){
            item.style.opacity = '0.5';
            this.textContent = 'Taken ✓';
            this.disabled = true;
            if (tabletsInput) tabletsInput.disabled = true;
          }
          
          // Check if all meds taken
          var allTaken = true;
          takeBtns.forEach(function(b){
            if (!b.disabled) allTaken = false;
          });
          
          if (allTaken){
            setTimeout(closeMedicationPopup, 1000);
          }
        }
      });
    });
  }

  // Close popup
  function closeMedicationPopup(){
    var overlay = qs('meds-popup-overlay');
    if (overlay) overlay.remove();
  }

  // Track which medications have been taken (to prevent repeat reminders)
  function markMedicationsTaken(medIds, customTabletCount){
    var taken = getTakenMedications();
    var currentTime = getCurrentMinutes();
    
    medIds.forEach(function(medId){
      taken[medId + '_' + currentTime] = Date.now();
      
      // Log to immutable medication log with tablet and stock info
      if (window.MedLog && window.MedsStore){
        var meds = window.MedsStore.load();
        var med = meds.find(function(m){ return String(m.id) === String(medId); });
        
        if (med){
          // Determine tablets taken - handle both single value and map of custom counts
          var tabletsTaken;
          if (customTabletCount !== null && customTabletCount !== undefined) {
            // If customTabletCount is an object (map), look up this medId
            if (typeof customTabletCount === 'object' && !Array.isArray(customTabletCount)) {
              tabletsTaken = customTabletCount[medId] || Number(med.tabletsPerDose || 1);
            } else {
              // Single custom value for one medication
              tabletsTaken = customTabletCount;
            }
          } else {
            // No custom count provided, use default
            tabletsTaken = Number(med.tabletsPerDose || 1);
          }
          
          var stockAfter = Number(med.stock || 0);
          
          var logEntry = {
            medName: med.name,
            dose: med.dose,
            tabletsTaken: tabletsTaken,
            stockAfter: stockAfter,
            timestamp: new Date().toISOString(),
            method: 'popup',
            notes: 'Taken at scheduled time'
          };
          
          if (window.MedLog.append){
            window.MedLog.append(logEntry);
          }
        }
      }
    });
    
    localStorage.setItem('meds_taken_today_v1', JSON.stringify(taken));
  }
  
  function getTakenMedications(){
    try{
      var data = localStorage.getItem('meds_taken_today_v1');
      if (!data) return {};
      var taken = JSON.parse(data);
      
      // Clean up old entries (older than 2 hours)
      var now = Date.now();
      var cleaned = {};
      for (var key in taken){
        if (now - taken[key] < 7200000){ // 2 hours in milliseconds
          cleaned[key] = taken[key];
        }
      }
      
      return cleaned;
    } catch(e){
      return {};
    }
  }
  
  function wasMedicationTaken(medId, timeMinutes){
    var taken = getTakenMedications();
    return taken.hasOwnProperty(medId + '_' + timeMinutes);
  }
  
  // Get medications due that haven't been taken yet
  function getMedicationsDueNotTaken(){
    var dueMeds = getMedicationsDueNow();
    var currentMinutes = getCurrentMinutes();
    
    return dueMeds.filter(function(med){
      return !wasMedicationTaken(med.id, currentMinutes);
    });
  }

  // Auto-check for medications every minute
  var checkInterval = null;
  var lastAlertTime = null;
  function startAutoCheck(){
    if (checkInterval) clearInterval(checkInterval);
    checkInterval = setInterval(function(){
      var dueMeds = getMedicationsDueNotTaken(); // Only show medications not yet taken
      if (dueMeds.length > 0){
        var now = Date.now();
        // Only show if not already shown and not alerted in last 5 minutes
        if (!qs('meds-popup-overlay')){
          // Check if we already alerted recently for these meds
          if (!lastAlertTime || (now - lastAlertTime > 300000)){ // 5 minutes
            lastAlertTime = now;
            showMedicationPopup(true); // Play sound for auto-alerts
          }
        }
      }
    }, 60000); // Check every minute
  }

  // Initialize
  function init(){
    // Add button to show popup manually
    var btn = qs('show-meds-popup-btn');
    if (btn){
      btn.addEventListener('click', function(){
        showMedicationPopup(false); // Don't play sound for manual clicks
      });
    }

    // Start auto-check
    startAutoCheck();

    // Check immediately on load
    setTimeout(function(){
      var dueMeds = getMedicationsDueNow();
      // Auto-show only if there are medications due
      // Uncomment the next line if you want auto-show on page load with alarm
      // if (dueMeds.length > 0) showMedicationPopup(true);
    }, 1000);
  }

  // Expose to global scope
  window.MedsPopup = {
    show: showMedicationPopup,
    close: closeMedicationPopup,
    getDueNow: getMedicationsDueNow
  };

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
