// exercises.js — Exercise video tracking and management
(function(){
  'use strict';

  var STORAGE_KEY = 'pp_exercises_v1';
  var currentVideoData = null;

  function qs(id){ return document.getElementById(id); }

  // Load exercises from storage
  function loadExercises(){
    try{
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch(e){
      return [];
    }
  }

  // Save exercises to storage
  function saveExercises(exercises){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(exercises));
    } catch(e){
      console.error('Failed to save exercises:', e);
    }
  }

  // Convert video file to base64
  function videoToBase64(file, callback){
    var reader = new FileReader();
    reader.onload = function(e){
      callback(e.target.result);
    };
    reader.onerror = function(){
      callback(null);
    };
    reader.readAsDataURL(file);
  }

  // Show video preview
  function showVideoPreview(file){
    var preview = qs('video-preview');
    if (!preview) return;

    var video = document.createElement('video');
    video.controls = true;
    video.className = 'video-preview';
    video.style.maxWidth = '100%';
    video.style.borderRadius = '10px';
    video.src = URL.createObjectURL(file);

    preview.innerHTML = '';
    preview.appendChild(video);
  }

  // Handle video file selection
  function handleVideoSelect(){
    var input = qs('exercise-video');
    if (!input) return;

    input.addEventListener('change', function(e){
      var file = e.target.files[0];
      if (!file) return;

      // Check file size (limit to 100MB for localStorage)
      if (file.size > 100 * 1024 * 1024){
        alert('Video file is too large. Please use a file smaller than 100MB.');
        input.value = '';
        return;
      }

      showVideoPreview(file);

      // Convert to base64 for storage
      videoToBase64(file, function(base64){
        if (base64){
          currentVideoData = base64;
        } else {
          alert('Failed to process video file');
        }
      });
    });
  }

  // Save exercise
  function saveExercise(){
    var title = qs('exercise-title').value.trim();
    var type = qs('exercise-type').value;
    var date = qs('exercise-date').value;
    var duration = parseInt(qs('exercise-duration').value, 10);
    var notes = qs('exercise-notes').value.trim();
    var statusEl = qs('upload-status');

    if (!title){
      alert('Please enter an exercise title');
      return;
    }

    if (!type){
      alert('Please select an exercise type');
      return;
    }

    if (!date){
      alert('Please select a date');
      return;
    }

    if (!currentVideoData){
      alert('Please select a video file');
      return;
    }

    var exercise = {
      id: Date.now(),
      title: title,
      type: type,
      date: date,
      duration: duration || 0,
      notes: notes,
      videoData: currentVideoData,
      created: new Date().toISOString()
    };

    var exercises = loadExercises();
    exercises.push(exercise);
    saveExercises(exercises);

    if (statusEl){
      statusEl.textContent = 'Exercise video saved successfully!';
    }

    // Clear form
    clearForm();

    // Refresh display
    setTimeout(function(){
      renderExercises();
      updateStats();
      if (statusEl) statusEl.textContent = '';
    }, 100);
  }

  // Clear form
  function clearForm(){
    qs('exercise-title').value = '';
    qs('exercise-type').value = '';
    qs('exercise-date').value = new Date().toISOString().split('T')[0];
    qs('exercise-duration').value = '';
    qs('exercise-notes').value = '';
    qs('exercise-video').value = '';
    qs('video-preview').innerHTML = '';
    currentVideoData = null;
  }

  // Render exercises
  function renderExercises(){
    var container = qs('exercise-list');
    if (!container) return;

    var exercises = loadExercises();
    var filterType = qs('filter-exercise-type').value;

    // Filter
    if (filterType){
      exercises = exercises.filter(function(ex){ return ex.type === filterType; });
    }

    // Sort by date descending
    exercises.sort(function(a, b){
      return new Date(b.date) - new Date(a.date);
    });

    if (exercises.length === 0){
      container.innerHTML = '<p class="muted">No exercise videos recorded yet.</p>';
      return;
    }

    container.innerHTML = '';

    exercises.forEach(function(exercise){
      var card = document.createElement('div');
      card.className = 'exercise-card';

      var video = document.createElement('video');
      video.className = 'exercise-video';
      video.controls = true;
      video.src = exercise.videoData;

      var info = document.createElement('div');
      info.className = 'exercise-info';

      var title = document.createElement('h3');
      title.textContent = exercise.title;

      var type = document.createElement('div');
      type.className = 'exercise-type-badge';
      type.textContent = formatType(exercise.type);

      var date = document.createElement('div');
      date.className = 'exercise-date';
      date.textContent = new Date(exercise.date).toLocaleDateString();

      if (exercise.duration){
        var duration = document.createElement('div');
        duration.className = 'exercise-duration';
        duration.textContent = exercise.duration + ' minutes';
        info.appendChild(duration);
      }

      if (exercise.notes){
        var notes = document.createElement('div');
        notes.className = 'exercise-notes';
        notes.textContent = exercise.notes;
        info.appendChild(notes);
      }

      var actions = document.createElement('div');
      actions.className = 'exercise-actions';

      var btnDownload = document.createElement('a');
      btnDownload.className = 'btn btn-ghost btn-sm';
      btnDownload.textContent = 'Download';
      btnDownload.href = exercise.videoData;
      btnDownload.download = exercise.title + '.mp4';

      var btnDelete = document.createElement('button');
      btnDelete.className = 'btn btn-danger btn-sm';
      btnDelete.textContent = 'Delete';
      btnDelete.addEventListener('click', function(){
        if (confirm('Delete this exercise video?')){
          deleteExercise(exercise.id);
        }
      });

      actions.appendChild(btnDownload);
      actions.appendChild(btnDelete);

      info.appendChild(title);
      info.appendChild(type);
      info.appendChild(date);
      info.appendChild(actions);

      card.appendChild(video);
      card.appendChild(info);

      container.appendChild(card);
    });
  }

  // Delete exercise
  function deleteExercise(id){
    var exercises = loadExercises();
    exercises = exercises.filter(function(ex){ return ex.id !== id; });
    saveExercises(exercises);
    renderExercises();
    updateStats();
  }

  // Format exercise type
  function formatType(type){
    var types = {
      'walking': 'Walking',
      'balance': 'Balance',
      'strength': 'Strength',
      'flexibility': 'Flexibility',
      'hand-coordination': 'Hand Coordination',
      'speech': 'Speech',
      'physiotherapy': 'Physiotherapy',
      'other': 'Other'
    };
    return types[type] || type;
  }

  // Update statistics
  function updateStats(){
    var exercises = loadExercises();
    
    var totalVideos = exercises.length;
    var totalDuration = exercises.reduce(function(sum, ex){ return sum + (ex.duration || 0); }, 0);
    
    // Count this week
    var now = new Date();
    var weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    var thisWeek = exercises.filter(function(ex){
      return new Date(ex.date) >= weekAgo;
    }).length;

    if (qs('total-videos')) qs('total-videos').textContent = totalVideos;
    if (qs('total-duration')) qs('total-duration').textContent = totalDuration;
    if (qs('this-week')) qs('this-week').textContent = thisWeek;
  }

  // Export report
  function exportReport(){
    var exercises = loadExercises();
    
    if (exercises.length === 0){
      alert('No exercises to export');
      return;
    }

    var report = 'EXERCISE PROGRESS REPORT\n';
    report += '========================\n\n';
    report += 'Generated: ' + new Date().toLocaleString() + '\n\n';
    
    report += 'SUMMARY\n';
    report += '-------\n';
    report += 'Total Videos: ' + exercises.length + '\n';
    report += 'Total Duration: ' + exercises.reduce(function(sum, ex){ return sum + (ex.duration || 0); }, 0) + ' minutes\n\n';

    report += 'EXERCISE LOG\n';
    report += '------------\n\n';

    exercises.sort(function(a, b){ return new Date(b.date) - new Date(a.date); });

    exercises.forEach(function(ex){
      report += 'Date: ' + new Date(ex.date).toLocaleDateString() + '\n';
      report += 'Exercise: ' + ex.title + '\n';
      report += 'Type: ' + formatType(ex.type) + '\n';
      if (ex.duration) report += 'Duration: ' + ex.duration + ' minutes\n';
      if (ex.notes) report += 'Notes: ' + ex.notes + '\n';
      report += '\n';
    });

    // Download as text file
    var blob = new Blob([report], { type: 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'exercise-report-' + new Date().toISOString().split('T')[0] + '.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Initialize
  function init(){
    // Set default date
    var dateInput = qs('exercise-date');
    if (dateInput){
      dateInput.value = new Date().toISOString().split('T')[0];
    }

    // Handle video selection
    handleVideoSelect();

    // Save button
    var btnSave = qs('btn-upload-exercise');
    if (btnSave){
      btnSave.addEventListener('click', saveExercise);
    }

    // Clear button
    var btnClear = qs('btn-clear-exercise');
    if (btnClear){
      btnClear.addEventListener('click', clearForm);
    }

    // Export button
    var btnExport = qs('btn-export-exercises');
    if (btnExport){
      btnExport.addEventListener('click', exportReport);
    }

    // Filter
    var filterType = qs('filter-exercise-type');
    if (filterType){
      filterType.addEventListener('change', renderExercises);
    }

    // Initial render
    renderExercises();
    updateStats();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
