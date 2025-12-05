// medical-history.js — Comprehensive medical history tracker
(function(){
  function qs(id){ return document.getElementById(id); }
  var KEY = 'pp_medical_history_v1';

  function load(){ try{ return JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){ return null; } }
  function save(data){ try{ localStorage.setItem(KEY, JSON.stringify(data)); return true; }catch(e){ return false; } }

  function showStatus(msg){ var el = qs('save-status'); if (el) el.textContent = msg; setTimeout(function(){ if (el) el.textContent = ''; }, 3000); }

  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function gatherHospitalDetails(){
    var hospitals = [];
    for (var i = 1; i <= 6; i++){
      var name = qs('hosp'+i+'-name').value.trim();
      var number = qs('hosp'+i+'-number').value.trim();
      var dept = qs('hosp'+i+'-dept').value.trim();
      if (name || number || dept){
        hospitals.push({ name: name, number: number, department: dept });
      }
    }
    return {
      hospitals: hospitals,
      nhsNumber: qs('nhs-number').value.trim()
    };
  }

  function gatherMedicalHistory(){
    return {
      diagnosisDate: qs('diagnosis-date').value,
      firstSymptoms: qs('first-symptoms').value.trim(),
      diagnosingDoctor: qs('diagnosing-doctor').value.trim(),
      otherConditions: qs('other-conditions').value.trim(),
      pastSurgeries: qs('past-surgeries').value.trim(),
      familyHistory: qs('family-history').value.trim(),
      familyOther: qs('family-other').value.trim(),
      smokingStatus: qs('smoking-status').value,
      smokingDetails: qs('smoking-details').value.trim(),
      alcoholStatus: qs('alcohol-status').value,
      exercise: qs('exercise').value.trim(),
      occupation: qs('occupation').value.trim(),
      drugAllergies: qs('drug-allergies').value.trim(),
      foodAllergies: qs('food-allergies').value.trim(),
      currentSymptoms: qs('current-symptoms').value.trim(),
      mobilityAids: qs('mobility-aids').value.trim(),
      careSupport: qs('care-support').value.trim(),
      bloodType: qs('blood-type').value,
      otherInfo: qs('other-info').value.trim()
    };
  }

  function populateForm(data){
    if (!data) return;

    // Hospital details
    if (data.hospitalDetails){
      var hospitals = data.hospitalDetails.hospitals || [];
      hospitals.forEach(function(h, i){
        var idx = i + 1;
        if (idx > 6) return;
        if (qs('hosp'+idx+'-name')) qs('hosp'+idx+'-name').value = h.name || '';
        if (qs('hosp'+idx+'-number')) qs('hosp'+idx+'-number').value = h.number || '';
        if (qs('hosp'+idx+'-dept')) qs('hosp'+idx+'-dept').value = h.department || '';
      });
      if (data.hospitalDetails.nhsNumber) qs('nhs-number').value = data.hospitalDetails.nhsNumber;
    }

    // Medical history
    if (data.medicalHistory){
      var mh = data.medicalHistory;
      if (mh.diagnosisDate) qs('diagnosis-date').value = mh.diagnosisDate;
      if (mh.firstSymptoms) qs('first-symptoms').value = mh.firstSymptoms;
      if (mh.diagnosingDoctor) qs('diagnosing-doctor').value = mh.diagnosingDoctor;
      if (mh.otherConditions) qs('other-conditions').value = mh.otherConditions;
      if (mh.pastSurgeries) qs('past-surgeries').value = mh.pastSurgeries;
      if (mh.familyHistory) qs('family-history').value = mh.familyHistory;
      if (mh.familyOther) qs('family-other').value = mh.familyOther;
      if (mh.smokingStatus) qs('smoking-status').value = mh.smokingStatus;
      if (mh.smokingDetails) qs('smoking-details').value = mh.smokingDetails;
      if (mh.alcoholStatus) qs('alcohol-status').value = mh.alcoholStatus;
      if (mh.exercise) qs('exercise').value = mh.exercise;
      if (mh.occupation) qs('occupation').value = mh.occupation;
      if (mh.drugAllergies) qs('drug-allergies').value = mh.drugAllergies;
      if (mh.foodAllergies) qs('food-allergies').value = mh.foodAllergies;
      if (mh.currentSymptoms) qs('current-symptoms').value = mh.currentSymptoms;
      if (mh.mobilityAids) qs('mobility-aids').value = mh.mobilityAids;
      if (mh.careSupport) qs('care-support').value = mh.careSupport;
      if (mh.bloodType) qs('blood-type').value = mh.bloodType;
      if (mh.otherInfo) qs('other-info').value = mh.otherInfo;
    }
  }

  function saveHospitalDetails(){
    var existing = load() || {};
    existing.hospitalDetails = gatherHospitalDetails();
    existing.lastModified = new Date().toISOString();
    if (save(existing)){
      showStatus('Hospital details saved');
      renderSummary();
    } else {
      showStatus('Failed to save hospital details');
    }
  }

  function saveMedicalHistory(){
    var existing = load() || {};
    existing.medicalHistory = gatherMedicalHistory();
    existing.lastModified = new Date().toISOString();
    if (save(existing)){
      showStatus('Medical history saved');
      renderSummary();
    } else {
      showStatus('Failed to save medical history');
    }
  }

  function renderSummary(){
    var data = load();
    var container = qs('summary-view');
    if (!container) return;

    if (!data){
      container.innerHTML = '<p class="muted">No medical history saved yet. Fill in the forms above and save.</p>';
      return;
    }

    var html = '<div style="font-size:15px">';

    // Hospital details
    if (data.hospitalDetails){
      html += '<h3>Hospital Numbers & NHS</h3>';
      if (data.hospitalDetails.nhsNumber){
        html += '<div style="margin-bottom:12px"><strong>NHS Number:</strong> ' + escapeHtml(data.hospitalDetails.nhsNumber) + '</div>';
      }
      if (data.hospitalDetails.hospitals && data.hospitalDetails.hospitals.length > 0){
        html += '<div style="margin-bottom:16px">';
        data.hospitalDetails.hospitals.forEach(function(h, i){
          html += '<div style="margin-bottom:8px;padding:8px;background:var(--bg);border-radius:6px">';
          html += '<strong>' + escapeHtml(h.name || 'Hospital ' + (i+1)) + '</strong><br>';
          if (h.number) html += 'Number: ' + escapeHtml(h.number) + '<br>';
          if (h.department) html += 'Department: ' + escapeHtml(h.department);
          html += '</div>';
        });
        html += '</div>';
      }
    }

    // Key medical info
    if (data.medicalHistory){
      var mh = data.medicalHistory;
      
      if (mh.diagnosisDate || mh.diagnosingDoctor){
        html += '<h3>Parkinson\'s Diagnosis</h3><div style="margin-bottom:16px">';
        if (mh.diagnosisDate){
          html += '<strong>Date:</strong> ' + new Date(mh.diagnosisDate).toLocaleDateString() + '<br>';
        }
        if (mh.diagnosingDoctor){
          html += '<strong>Diagnosed by:</strong> ' + escapeHtml(mh.diagnosingDoctor) + '<br>';
        }
        html += '</div>';
      }

      if (mh.drugAllergies){
        html += '<h3 style="color:#dc2626">⚠️ Drug Allergies</h3>';
        html += '<div style="margin-bottom:16px;padding:12px;background:#fff6f6;border:2px solid #fca5a5;border-radius:8px">';
        html += escapeHtml(mh.drugAllergies);
        html += '</div>';
      }

      if (mh.foodAllergies){
        html += '<h3>Food Allergies/Intolerances</h3>';
        html += '<div style="margin-bottom:16px">' + escapeHtml(mh.foodAllergies) + '</div>';
      }

      if (mh.otherConditions){
        html += '<h3>Other Medical Conditions</h3>';
        html += '<div style="margin-bottom:16px">' + escapeHtml(mh.otherConditions) + '</div>';
      }

      if (mh.currentSymptoms){
        html += '<h3>Current Symptoms</h3>';
        html += '<div style="margin-bottom:16px">' + escapeHtml(mh.currentSymptoms) + '</div>';
      }

      if (mh.mobilityAids){
        html += '<h3>Mobility Aids</h3>';
        html += '<div style="margin-bottom:16px">' + escapeHtml(mh.mobilityAids) + '</div>';
      }

      if (mh.bloodType && mh.bloodType !== 'unknown'){
        html += '<div style="margin-bottom:16px"><strong>Blood Type:</strong> ' + escapeHtml(mh.bloodType) + '</div>';
      }
    }

    if (data.lastModified){
      html += '<div class="muted" style="margin-top:16px;font-size:13px">Last updated: ' + new Date(data.lastModified).toLocaleString() + '</div>';
    }

    html += '</div>';
    container.innerHTML = html;
  }

  function printSummary(){
    var summaryHtml = qs('summary-view').innerHTML;
    var printWindow = window.open('', '_blank');
    printWindow.document.write('<html><head><title>Medical History Summary</title>');
    printWindow.document.write('<style>body{font-family:Arial,sans-serif;padding:20px;max-width:800px;margin:0 auto;}h3{color:#2563eb;margin-top:20px;}</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<h1>Medical History Summary</h1>');
    printWindow.document.write(summaryHtml);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  }

  function exportSummary(){
    var data = load();
    if (!data){
      alert('No data to export');
      return;
    }

    var text = 'MEDICAL HISTORY SUMMARY\n';
    text += '======================\n\n';
    text += 'Generated: ' + new Date().toLocaleString() + '\n\n';

    if (data.hospitalDetails){
      text += 'HOSPITAL DETAILS\n----------------\n';
      if (data.hospitalDetails.nhsNumber){
        text += 'NHS Number: ' + data.hospitalDetails.nhsNumber + '\n\n';
      }
      if (data.hospitalDetails.hospitals){
        data.hospitalDetails.hospitals.forEach(function(h, i){
          text += 'Hospital ' + (i+1) + ':\n';
          text += '  Name: ' + (h.name || 'Not specified') + '\n';
          text += '  Number: ' + (h.number || 'Not specified') + '\n';
          text += '  Department: ' + (h.department || 'Not specified') + '\n\n';
        });
      }
    }

    if (data.medicalHistory){
      var mh = data.medicalHistory;
      text += '\nMEDICAL HISTORY\n---------------\n';
      if (mh.diagnosisDate) text += 'Parkinson\'s Diagnosis Date: ' + new Date(mh.diagnosisDate).toLocaleDateString() + '\n';
      if (mh.diagnosingDoctor) text += 'Diagnosed By: ' + mh.diagnosingDoctor + '\n';
      if (mh.firstSymptoms) text += '\nFirst Symptoms:\n' + mh.firstSymptoms + '\n';
      if (mh.drugAllergies) text += '\n⚠️ DRUG ALLERGIES:\n' + mh.drugAllergies + '\n';
      if (mh.foodAllergies) text += '\nFood Allergies:\n' + mh.foodAllergies + '\n';
      if (mh.otherConditions) text += '\nOther Conditions:\n' + mh.otherConditions + '\n';
      if (mh.pastSurgeries) text += '\nPast Surgeries:\n' + mh.pastSurgeries + '\n';
      if (mh.familyHistory) text += '\nFamily History:\n' + mh.familyHistory + '\n';
      if (mh.currentSymptoms) text += '\nCurrent Symptoms:\n' + mh.currentSymptoms + '\n';
      if (mh.mobilityAids) text += '\nMobility Aids:\n' + mh.mobilityAids + '\n';
      if (mh.careSupport) text += '\nCare Support:\n' + mh.careSupport + '\n';
      if (mh.bloodType) text += '\nBlood Type: ' + mh.bloodType + '\n';
      if (mh.smokingStatus) text += '\nSmoking: ' + mh.smokingStatus + (mh.smokingDetails ? ' (' + mh.smokingDetails + ')' : '') + '\n';
      if (mh.alcoholStatus) text += 'Alcohol: ' + mh.alcoholStatus + '\n';
      if (mh.exercise) text += '\nExercise:\n' + mh.exercise + '\n';
      if (mh.occupation) text += '\nOccupation: ' + mh.occupation + '\n';
      if (mh.otherInfo) text += '\nOther Information:\n' + mh.otherInfo + '\n';
    }

    // Create download
    var blob = new Blob([text], { type: 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'medical-history-' + new Date().toISOString().split('T')[0] + '.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  function attach(){
    if (window.PPAuth && typeof window.PPAuth.requireAuth === 'function'){
      if (!window.PPAuth.requireAuth()) return;
    }

    // Load existing data
    var existing = load();
    populateForm(existing);
    renderSummary();

    // Save buttons
    qs('save-hospital-details').addEventListener('click', saveHospitalDetails);
    qs('save-medical-history').addEventListener('click', saveMedicalHistory);
    
    // Export buttons
    qs('print-summary').addEventListener('click', printSummary);
    qs('export-summary').addEventListener('click', exportSummary);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
})();
