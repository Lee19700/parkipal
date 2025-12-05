// missed_meds.js — Check for missed medications and prompt user
(function(){
  'use strict';

  var LAST_CHECK_KEY = 'last_med_check_v1';
  var MISSED_MEDS_KEY = 'missed_meds_temp_v1';

  function qs(id){ return document.getElementById(id); }

  // Get last check timestamp
  function getLastCheck(){
    try{
      var lastCheck = localStorage.getItem(LAST_CHECK_KEY);
      return lastCheck ? new Date(lastCheck) : null;
    } catch(e){
      return null;
    }
  }

  // Update last check timestamp
  function updateLastCheck(){
    try{
      localStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());
    } catch(e){}
  }

  // Parse time string "HH:MM" to minutes since midnight
  function parseTime(timeStr){
    var parts = String(timeStr || '').trim().split(':');
    if (parts.length !== 2) return null;
    var h = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  // Get minutes since midnight for a date
  function getMinutes(date){
    return date.getHours() * 60 + date.getMinutes();
  }

  // Check if a scheduled time was missed
  function wasMissed(scheduledTime, lastCheck, now){
    var scheduledMinutes = parseTime(scheduledTime);
    if (scheduledMinutes === null) return false;

    var nowMinutes = getMinutes(now);
    var lastCheckMinutes = lastCheck ? getMinutes(lastCheck) : 0;

    // If scheduled time is between last check and now, it was missed
    // Handle day rollover
    if (lastCheck && lastCheck.toDateString() !== now.toDateString()){
      // Check if scheduled time was after last check on previous day
      if (scheduledMinutes >= lastCheckMinutes){
        return true;
      }
      // Check if scheduled time is before now on current day
      if (scheduledMinutes <= nowMinutes){
        return true;
      }
    } else {
      // Same day
      if (scheduledMinutes > lastCheckMinutes && scheduledMinutes <= nowMinutes){
        return true;
      }
    }

    return false;
  }

  // Find all missed medications
  function findMissedMedications(){
    if (!window.MedsStore) return [];

    var lastCheck = getLastCheck();
    var now = new Date();
    var meds = window.MedsStore.load();
    var missed = [];

    // If never checked before or last check was more than 24 hours ago, don't overwhelm user
    if (!lastCheck || (now - lastCheck) > 86400000){
      // Just check last 4 hours
      lastCheck = new Date(now.getTime() - 14400000);
    }

    meds.forEach(function(med){
      if (!med.times) return;

      var times = med.times.split(',').map(function(t){ return t.trim(); });

      times.forEach(function(timeStr){
        if (wasMissed(timeStr, lastCheck, now)){
          missed.push({
            id: med.id,
            name: med.name,
            dose: med.dose || '',
            scheduledTime: timeStr,
            tabletsPerDose: med.tabletsPerDose || 1
          });
        }
      });
    });

    return missed;
  }

  // Play alarm sound
  function playMissedAlarm(){
    try{
      var audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Play a more urgent 5-beep pattern
      for (var i = 0; i < 5; i++){
        (function(index){
          setTimeout(function(){
            var osc = audioContext.createOscillator();
            var gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.frequency.value = 700 + (index * 50); // Ascending tones
            osc.type = 'sine';
            gain.gain.setValueAtTime(0, audioContext.currentTime);
            gain.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
            osc.start(audioContext.currentTime);
            osc.stop(audioContext.currentTime + 0.4);
          }, index * 500);
        })(i);
      }
    } catch(e){
      console.log('Could not play missed alarm:', e);
    }
  }

  // Show missed medications popup
  function showMissedMedicationsPopup(missedMeds){
    // Remove existing popup if any
    var existing = qs('missed-meds-overlay');
    if (existing) existing.remove();

    // Play alarm
    playMissedAlarm();

    // Create overlay
    var overlay = document.createElement('div');
    overlay.id = 'missed-meds-overlay';
    overlay.className = 'missed-meds-overlay';

    var popup = document.createElement('div');
    popup.className = 'missed-meds-popup card';

    var html = '<div class="missed-meds-header">';
    html += '<h2>⚠️ Missed Medication Check</h2>';
    html += '</div>';

    html += '<div class="missed-meds-body">';
    html += '<p><strong>You were away from your computer during scheduled medication times.</strong></p>';
    html += '<p>Did you take these medications on time?</p>';

    missedMeds.forEach(function(med, index){
      html += '<div class="missed-med-item" id="missed-item-' + index + '">';
      html += '<div class="missed-med-header">';
      html += '<strong>' + escapeHtml(med.name) + '</strong>';
      html += '<span class="missed-time-badge">' + med.scheduledTime + '</span>';
      html += '</div>';
      if (med.dose){
        html += '<div class="missed-med-dose">' + escapeHtml(med.dose) + '</div>';
      }
      html += '<div class="missed-med-actions">';
      html += '<button class="btn btn-primary btn-sm missed-yes" data-index="' + index + '" data-id="' + med.id + '" data-time="' + med.scheduledTime + '">Yes, Took It</button>';
      html += '<button class="btn btn-danger btn-sm missed-no" data-index="' + index + '">No, Missed It</button>';
      html += '</div>';
      html += '</div>';
    });

    html += '</div>';

    html += '<div class="missed-meds-footer">';
    html += '<button class="btn btn-ghost" id="missed-close-all">I\'ll Check Later</button>';
    html += '</div>';

    popup.innerHTML = html;
    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    // Store missed meds temporarily
    try{
      localStorage.setItem(MISSED_MEDS_KEY, JSON.stringify(missedMeds));
    } catch(e){}

    // Add event listeners
    var yesBtns = document.querySelectorAll('.missed-yes');
    yesBtns.forEach(function(btn){
      btn.addEventListener('click', function(){
        var index = parseInt(this.getAttribute('data-index'), 10);
        var medId = this.getAttribute('data-id');
        var scheduledTime = this.getAttribute('data-time');
        var med = missedMeds[index];

        // Log as manual entry with scheduled time
        if (window.MedLog){
          var today = new Date();
          var timeParts = scheduledTime.split(':');
          if (timeParts.length === 2){
            var logTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 
                                   parseInt(timeParts[0], 10), parseInt(timeParts[1], 10));
            
            // If scheduled time is in the future today, it was yesterday
            if (logTime > today){
              logTime.setDate(logTime.getDate() - 1);
            }

            var entry = {
              medicationName: med.name,
              dose: med.dose,
              tablets: med.tabletsPerDose,
              timestamp: logTime.toISOString(),
              method: 'manual',
              notes: 'Taken on time (confirmed after system startup)'
            };

            // Append to log
            var log = window.MedLog.getLog();
            entry.logId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            entry.immutable = true;
            log.push(entry);
            try{
              localStorage.setItem('meds_immutable_log_v1', JSON.stringify(log));
            } catch(e){}
          }
        }

        // Mark as handled
        var item = qs('missed-item-' + index);
        if (item){
          item.style.opacity = '0.5';
          item.innerHTML = '<div class="missed-confirmed">✓ Confirmed: ' + escapeHtml(med.name) + ' at ' + scheduledTime + '</div>';
        }

        // Check if all handled
        checkAllHandled();
      });
    });

    var noBtns = document.querySelectorAll('.missed-no');
    noBtns.forEach(function(btn){
      btn.addEventListener('click', function(){
        var index = parseInt(this.getAttribute('data-index'), 10);
        var med = missedMeds[index];

        // Mark as missed (just acknowledge)
        var item = qs('missed-item-' + index);
        if (item){
          item.style.opacity = '0.5';
          item.innerHTML = '<div class="missed-skipped">⚠ Missed: ' + escapeHtml(med.name) + ' at ' + med.scheduledTime + '</div>';
        }

        // Check if all handled
        checkAllHandled();
      });
    });

    var closeBtn = qs('missed-close-all');
    if (closeBtn){
      closeBtn.addEventListener('click', function(){
        closeMissedPopup();
      });
    }

    // Prevent closing by clicking overlay
    overlay.addEventListener('click', function(e){
      if (e.target === overlay){
        // Don't close - force user to respond
        playMissedAlarm();
      }
    });
  }

  function checkAllHandled(){
    var items = document.querySelectorAll('.missed-med-item');
    var allHandled = true;
    items.forEach(function(item){
      if (item.querySelector('.missed-med-actions')){
        allHandled = false;
      }
    });

    if (allHandled){
      setTimeout(closeMissedPopup, 2000);
    }
  }

  function closeMissedPopup(){
    var overlay = qs('missed-meds-overlay');
    if (overlay) overlay.remove();
    
    // Clear temp storage
    try{
      localStorage.removeItem(MISSED_MEDS_KEY);
    } catch(e){}
  }

  function escapeHtml(s){
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Check on page load
  function checkOnStartup(){
    // Wait a bit for MedsStore to load
    setTimeout(function(){
      var missedMeds = findMissedMedications();
      
      if (missedMeds.length > 0){
        showMissedMedicationsPopup(missedMeds);
      }
      
      // Update last check time
      updateLastCheck();
    }, 1000);
  }

  // Initialize
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', checkOnStartup);
  } else {
    checkOnStartup();
  }

  // Expose API
  window.MissedMeds = {
    check: findMissedMedications,
    show: showMissedMedicationsPopup
  };

})();
