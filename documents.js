// documents.js — Store and analyze medical documents
(function(){
  function qs(id){ return document.getElementById(id); }
  var KEY = 'pp_documents_v1';
  var currentDocForQuestion = null;

  function load(){ try{ return JSON.parse(localStorage.getItem(KEY)||'[]'); }catch(e){ return []; } }
  function save(arr){ try{ localStorage.setItem(KEY, JSON.stringify(arr)); }catch(e){} }

  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function analyzeDocument(content, title, type){
    // Simple AI-powered analysis breakdown
    var analysis = {
      summary: '',
      keyPoints: [],
      medications: [],
      appointments: [],
      actionItems: [],
      concerns: []
    };

    var text = String(content||'').toLowerCase();
    var lines = content.split('\n').filter(function(l){ return l.trim(); });

    // Generate summary (first 200 chars or first few sentences)
    var sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    analysis.summary = sentences.slice(0, 3).join(' ').substring(0, 300) + '...';

    // Extract key medical terms
    var medicalTerms = ['parkinson', 'tremor', 'bradykinesia', 'dyskinesia', 'levodopa', 'dopamine', 'diagnosis', 'symptoms', 'treatment', 'medication', 'dose', 'prescription'];
    var foundTerms = [];
    medicalTerms.forEach(function(term){
      if (text.includes(term) && !foundTerms.includes(term)){
        foundTerms.push(term);
      }
    });
    if (foundTerms.length > 0){
      analysis.keyPoints.push('Document mentions: ' + foundTerms.join(', '));
    }

    // Extract medication mentions
    var commonMeds = ['levodopa', 'carbidopa', 'sinemet', 'ropinirole', 'pramipexole', 'rasagiline', 'selegiline', 'amantadine', 'entacapone'];
    lines.forEach(function(line){
      var lowerLine = line.toLowerCase();
      commonMeds.forEach(function(med){
        if (lowerLine.includes(med)){
          analysis.medications.push(line.trim());
        }
      });
    });

    // Look for dates (potential appointments)
    var datePattern = /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/gi;
    var dateMatches = content.match(datePattern);
    if (dateMatches && dateMatches.length > 0){
      dateMatches.forEach(function(date){
        analysis.appointments.push('Mentioned date: ' + date);
      });
    }

    // Look for action words
    var actionWords = ['follow up', 'review', 'monitor', 'increase', 'decrease', 'start', 'stop', 'continue', 'refer', 'contact', 'schedule', 'adjust'];
    lines.forEach(function(line){
      var lowerLine = line.toLowerCase();
      actionWords.forEach(function(action){
        if (lowerLine.includes(action)){
          analysis.actionItems.push(line.trim());
        }
      });
    });

    // Look for concerning phrases
    var concernPhrases = ['side effect', 'concern', 'urgent', 'emergency', 'deterioration', 'worsening', 'adverse'];
    lines.forEach(function(line){
      var lowerLine = line.toLowerCase();
      concernPhrases.forEach(function(phrase){
        if (lowerLine.includes(phrase)){
          analysis.concerns.push(line.trim());
        }
      });
    });

    // Remove duplicates
    analysis.medications = Array.from(new Set(analysis.medications)).slice(0, 5);
    analysis.actionItems = Array.from(new Set(analysis.actionItems)).slice(0, 5);
    analysis.concerns = Array.from(new Set(analysis.concerns)).slice(0, 3);

    return analysis;
  }

  function renderAnalysis(analysis){
    var html = '<div class="muted" style="font-size:15px">';
    
    if (analysis.summary){
      html += '<div style="margin-bottom:16px"><strong>Summary:</strong><br>' + escapeHtml(analysis.summary) + '</div>';
    }

    if (analysis.keyPoints.length > 0){
      html += '<div style="margin-bottom:16px"><strong>Key Medical Terms:</strong><ul>';
      analysis.keyPoints.forEach(function(point){
        html += '<li>' + escapeHtml(point) + '</li>';
      });
      html += '</ul></div>';
    }

    if (analysis.medications.length > 0){
      html += '<div style="margin-bottom:16px"><strong>Medications Mentioned:</strong><ul>';
      analysis.medications.forEach(function(med){
        html += '<li>' + escapeHtml(med) + '</li>';
      });
      html += '</ul></div>';
    }

    if (analysis.appointments.length > 0){
      html += '<div style="margin-bottom:16px"><strong>Dates/Appointments:</strong><ul>';
      analysis.appointments.forEach(function(appt){
        html += '<li>' + escapeHtml(appt) + '</li>';
      });
      html += '</ul></div>';
    }

    if (analysis.actionItems.length > 0){
      html += '<div style="margin-bottom:16px"><strong>Action Items:</strong><ul>';
      analysis.actionItems.forEach(function(action){
        html += '<li>' + escapeHtml(action) + '</li>';
      });
      html += '</ul></div>';
    }

    if (analysis.concerns.length > 0){
      html += '<div style="margin-bottom:16px"><strong>Points of Concern:</strong><ul style="color:#dc2626">';
      analysis.concerns.forEach(function(concern){
        html += '<li>' + escapeHtml(concern) + '</li>';
      });
      html += '</ul></div>';
    }

    html += '</div>';
    return html;
  }

  function answerQuestion(question, docContent){
    // Simple question answering based on keyword matching
    var qLower = question.toLowerCase();
    var content = docContent.toLowerCase();
    var answer = '';

    // Find relevant sentences
    var sentences = docContent.split(/[.!?]+/).filter(function(s){ return s.trim().length > 10; });
    var relevant = [];

    // Extract keywords from question
    var keywords = question.toLowerCase().split(/\s+/).filter(function(word){
      return word.length > 3 && !['what', 'when', 'where', 'which', 'about', 'does', 'have', 'this', 'that', 'with', 'from'].includes(word);
    });

    // Find sentences containing keywords
    sentences.forEach(function(sentence){
      var sLower = sentence.toLowerCase();
      var matchCount = 0;
      keywords.forEach(function(kw){
        if (sLower.includes(kw)) matchCount++;
      });
      if (matchCount > 0){
        relevant.push({ text: sentence.trim(), score: matchCount });
      }
    });

    // Sort by relevance
    relevant.sort(function(a, b){ return b.score - a.score; });

    if (relevant.length > 0){
      answer = '<strong>Based on the document:</strong><br><br>';
      relevant.slice(0, 3).forEach(function(r){
        answer += '• ' + escapeHtml(r.text) + '.<br><br>';
      });
    } else {
      answer = 'I couldn\'t find specific information about "' + escapeHtml(question) + '" in this document. Try rephrasing your question or check if the information is mentioned in different terms.';
    }

    return answer;
  }

  function renderList(){
    var arr = load();
    var filterType = qs('filter-type').value;
    
    if (filterType){
      arr = arr.filter(function(doc){ return doc.type === filterType; });
    }

    var container = qs('documents-list');
    container.innerHTML = '';

    if (arr.length === 0){
      container.innerHTML = '<p class="muted">No documents saved yet.</p>';
      return;
    }

    arr.slice().reverse().forEach(function(doc){
      var el = document.createElement('div');
      el.className = 'card entry';
      
      var typeLabel = doc.type.charAt(0).toUpperCase() + doc.type.slice(1);
      var date = doc.date ? new Date(doc.date).toLocaleDateString() : 'No date';
      
      var preview = String(doc.content||'').substring(0, 150) + '...';
      
      var html = '<div style="margin-bottom:12px">';
      html += '<div style="display:flex;justify-content:space-between;align-items:start">';
      html += '<div><strong>' + escapeHtml(doc.title||'Untitled') + '</strong>';
      html += '<div class="muted-small">' + typeLabel + ' • ' + date + '</div></div>';
      html += '<div class="med-actions-right">';
      html += '<button class="btn btn-ghost view-doc" data-id="'+doc.id+'">View</button>';
      html += '<button class="btn btn-ghost analyze-saved" data-id="'+doc.id+'">Analyze</button>';
      html += '<button class="btn btn-ghost edit-doc" data-id="'+doc.id+'">Edit</button>';
      html += '<button class="btn btn-danger delete-doc" data-id="'+doc.id+'">Delete</button>';
      html += '</div></div>';
      html += '<div class="muted" style="margin-top:8px">' + escapeHtml(preview) + '</div>';
      if (doc.notes){
        html += '<div class="muted-small" style="margin-top:8px"><em>Notes: ' + escapeHtml(doc.notes) + '</em></div>';
      }
      html += '</div>';
      
      el.innerHTML = html;
      container.appendChild(el);
    });
  }

  function clearForm(){
    qs('doc-id').value = '';
    qs('doc-title').value = '';
    qs('doc-date').value = '';
    qs('doc-type').value = 'letter';
    qs('doc-content').value = '';
    qs('doc-notes').value = '';
    qs('analysis-section').style.display = 'none';
    qs('question-section').style.display = 'none';
  }

  function saveDocument(analyze){
    var id = qs('doc-id').value || String(Date.now());
    var title = qs('doc-title').value;
    var date = qs('doc-date').value;
    var type = qs('doc-type').value;
    var content = qs('doc-content').value;
    var notes = qs('doc-notes').value;

    if (!title || !content){
      alert('Please enter a title and content');
      return;
    }

    var arr = load();
    var existing = arr.find(function(d){ return String(d.id) === String(id); });

    var doc = {
      id: id,
      title: title,
      date: date,
      type: type,
      content: content,
      notes: notes,
      created: existing ? existing.created : new Date().toISOString(),
      modified: new Date().toISOString()
    };

    if (analyze){
      doc.analysis = analyzeDocument(content, title, type);
    }

    if (existing){
      Object.assign(existing, doc);
    } else {
      arr.push(doc);
    }

    save(arr);
    renderList();

    if (analyze && doc.analysis){
      currentDocForQuestion = doc;
      qs('analysis-result').innerHTML = renderAnalysis(doc.analysis);
      qs('analysis-section').style.display = 'block';
      var analysisEl = document.getElementById('analysis-section');
      if (analysisEl) {
        window.scrollTo({top: analysisEl.offsetTop - 20, behavior: 'smooth'});
      }
    } else {
      alert('Document saved successfully');
      clearForm();
    }
  }

  function viewDocument(id){
    var arr = load();
    var doc = arr.find(function(d){ return String(d.id) === String(id); });
    if (!doc) return;

    var modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px';
    
    var content = document.createElement('div');
    content.style.cssText = 'background:var(--surface);padding:24px;border-radius:12px;max-width:800px;width:100%;max-height:90vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3)';
    
    var typeLabel = doc.type.charAt(0).toUpperCase() + doc.type.slice(1);
    var date = doc.date ? new Date(doc.date).toLocaleDateString() : 'No date';
    
    content.innerHTML = '<h2>' + escapeHtml(doc.title) + '</h2>';
    content.innerHTML += '<div class="muted" style="margin-bottom:16px">' + typeLabel + ' • ' + date + '</div>';
    content.innerHTML += '<div style="white-space:pre-wrap;margin-bottom:16px;padding:16px;background:var(--bg);border-radius:8px">' + escapeHtml(doc.content) + '</div>';
    if (doc.notes){
      content.innerHTML += '<div class="muted"><strong>Notes:</strong> ' + escapeHtml(doc.notes) + '</div>';
    }
    content.innerHTML += '<div class="form-actions" style="margin-top:16px"><button class="btn" id="close-modal">Close</button></div>';
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    document.getElementById('close-modal').addEventListener('click', function(){
      document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', function(e){
      if (e.target === modal) document.body.removeChild(modal);
    });
  }

  function editDocument(id){
    var arr = load();
    var doc = arr.find(function(d){ return String(d.id) === String(id); });
    if (!doc) return;

    qs('doc-id').value = doc.id;
    qs('doc-title').value = doc.title;
    qs('doc-date').value = doc.date || '';
    qs('doc-type').value = doc.type;
    qs('doc-content').value = doc.content;
    qs('doc-notes').value = doc.notes || '';
    
    window.scrollTo({top: 0, behavior: 'smooth'});
  }

  function deleteDocument(id){
    if (!confirm('Delete this document permanently?')) return;
    var arr = load();
    arr = arr.filter(function(d){ return String(d.id) !== String(id); });
    save(arr);
    renderList();
  }

  function analyzeSaved(id){
    var arr = load();
    var doc = arr.find(function(d){ return String(d.id) === String(id); });
    if (!doc) return;

    var analysis = analyzeDocument(doc.content, doc.title, doc.type);
    doc.analysis = analysis;
    save(arr);

    currentDocForQuestion = doc;
    qs('analysis-result').innerHTML = renderAnalysis(analysis);
    qs('analysis-section').style.display = 'block';
    var analysisEl = document.getElementById('analysis-section');
    if (analysisEl) {
      window.scrollTo({top: analysisEl.offsetTop - 20, behavior: 'smooth'});
    }
  }

  function attach(){
    if (window.PPAuth && typeof window.PPAuth.requireAuth === 'function'){
      if (!window.PPAuth.requireAuth()) return;
    }

    qs('save-doc').addEventListener('click', function(){ saveDocument(false); });
    qs('analyze-doc').addEventListener('click', function(){ saveDocument(true); });
    qs('clear-doc').addEventListener('click', clearForm);
    
    qs('close-analysis').addEventListener('click', function(){
      qs('analysis-section').style.display = 'none';
      currentDocForQuestion = null;
    });

    qs('ask-question-btn').addEventListener('click', function(){
      qs('question-section').style.display = 'block';
      qs('question-input').focus();
    });

    qs('cancel-question').addEventListener('click', function(){
      qs('question-section').style.display = 'none';
      qs('question-input').value = '';
      qs('answer-result').innerHTML = '';
    });

    qs('submit-question').addEventListener('click', function(){
      var question = qs('question-input').value.trim();
      if (!question){
        alert('Please enter a question');
        return;
      }
      if (!currentDocForQuestion){
        alert('No document selected for questions');
        return;
      }

      var answer = answerQuestion(question, currentDocForQuestion.content);
      qs('answer-result').innerHTML = '<div class="card" style="background:var(--bg);padding:16px;margin-top:12px">' + answer + '</div>';
    });

    qs('filter-type').addEventListener('change', renderList);

    qs('documents-list').addEventListener('click', function(ev){
      var t = ev.target;
      if (!t.classList) return;
      
      if (t.classList.contains('view-doc')){
        viewDocument(t.getAttribute('data-id'));
      } else if (t.classList.contains('analyze-saved')){
        analyzeSaved(t.getAttribute('data-id'));
      } else if (t.classList.contains('edit-doc')){
        editDocument(t.getAttribute('data-id'));
      } else if (t.classList.contains('delete-doc')){
        deleteDocument(t.getAttribute('data-id'));
      }
    });

    renderList();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
})();
