(function(){
  function qs(id){ return document.getElementById(id); }
  var USERS_KEY = 'pp_users_v1';
  var CURRENT_KEY = 'pp_current_user';
  var BIOMETRIC_KEY = 'pp_biometric_v1';

  function loadUsers(){ try{ return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }catch(e){ return []; } }
  function saveUsers(u){ localStorage.setItem(USERS_KEY, JSON.stringify(u)); }
  function getCurrent(){ try{ return JSON.parse(localStorage.getItem(CURRENT_KEY)); }catch(e){ return null; } }
  function setCurrent(u){ try{ localStorage.setItem(CURRENT_KEY, JSON.stringify(u)); }catch(e){} }

  function showStatus(msg){ var s = qs('pd-status'); if (!s) return; s.textContent = msg; }

  function getBiometricCredentials(){
    try{ return JSON.parse(localStorage.getItem(BIOMETRIC_KEY) || '{}'); }
    catch(e){ return {}; }
  }

  function hasBiometric(username){
    var creds = getBiometricCredentials();
    return !!creds[username];
  }

  function updateBiometricStatus(){
    var cur = getCurrent();
    if (!cur) return;
    
    var statusEl = qs('biometric-status');
    var enableBtn = qs('enable-biometric');
    var disableBtn = qs('disable-biometric');
    
    if (!statusEl || !enableBtn || !disableBtn) return;

    if (hasBiometric(cur.username)){
      statusEl.innerHTML = '✅ <strong>Biometric login is enabled</strong><br><span class="muted-small">You can use your fingerprint or Face ID to log in</span>';
      statusEl.className = 'biometric-status-text success';
      enableBtn.classList.add('hidden');
      disableBtn.classList.remove('hidden');
    } else {
      statusEl.innerHTML = '❌ <strong>Biometric login is not enabled</strong><br><span class="muted-small">Enable it for faster, more secure login</span>';
      statusEl.className = 'biometric-status-text';
      enableBtn.classList.remove('hidden');
      disableBtn.classList.add('hidden');
    }
  }

  // Don't redirect from personal page - it's the login page
  function requireAuthOrRedirect(){ 
    var cur = getCurrent();
    if (!cur) return false;
    return true;
  }

  function populate(){ 
    var cur = getCurrent(); 
    if (!cur) return; // Don't populate if not logged in
    var users = loadUsers(); 
    var stored = users.find(function(u){ return u.username === cur.username; }) || {};
    
    var usernameEl = qs('pd-username');
    var displayEl = qs('pd-display');
    var fullnameEl = qs('pd-fullname');
    var emailEl = qs('pd-email');
    var phoneEl = qs('pd-phone');
    var dobEl = qs('pd-dob');
    var emergencyEl = qs('pd-emergency');
    var notesEl = qs('pd-notes');
    
    if (usernameEl) usernameEl.value = stored.username || cur.username || '';
    if (displayEl) displayEl.value = stored.display || cur.display || '';
    if (fullnameEl) fullnameEl.value = stored.fullName || '';
    if (emailEl) emailEl.value = stored.email || '';
    if (phoneEl) phoneEl.value = stored.phone || '';
    if (dobEl) dobEl.value = stored.dob || '';
    if (emergencyEl) emergencyEl.value = stored.emergency || '';
    if (notesEl) notesEl.value = stored.notes || '';
    
    var cu = qs('current-username'); 
    if (cu) cu.textContent = (stored.display || stored.username || cur.username);
    
    updateBiometricStatus();
  }

  function save(){ 
    var cur = getCurrent(); 
    if (!cur) return alert('Not logged in'); 
    var users = loadUsers(); 
    var idx = users.findIndex(function(u){ return u.username === cur.username; });
    
    var displayEl = qs('pd-display');
    var fullnameEl = qs('pd-fullname');
    var emailEl = qs('pd-email');
    var phoneEl = qs('pd-phone');
    var dobEl = qs('pd-dob');
    var emergencyEl = qs('pd-emergency');
    var notesEl = qs('pd-notes');
    
    var up = {
      username: cur.username,
      passwordHash: (users[idx] && users[idx].passwordHash) || '',
      display: displayEl ? displayEl.value || cur.username : cur.username,
      fullName: fullnameEl ? fullnameEl.value || '' : '',
      email: emailEl ? emailEl.value || '' : '',
      phone: phoneEl ? phoneEl.value || '' : '',
      dob: dobEl ? dobEl.value || '' : '',
      emergency: emergencyEl ? emergencyEl.value || '' : '',
      notes: notesEl ? notesEl.value || '' : ''
    };
    if (idx === -1) { users.push(up); } else { users[idx] = Object.assign({}, users[idx], up); }
    saveUsers(users);
    // update current
    setCurrent({ username: up.username, display: up.display });
    showStatus('✅ All details saved successfully!');
    // update header username display
    var cu = qs('current-username'); if (cu) cu.textContent = up.display || up.username;
  }

  async function enableBiometric(){
    var cur = getCurrent();
    if (!cur) return alert('Not logged in');

    if (!window.PPAuth || !window.PPAuth.registerBiometric){
      alert('Biometric authentication is not available');
      return;
    }

    var result = await window.PPAuth.registerBiometric(cur.username);
    
    if (result.ok){
      showStatus('✅ ' + result.msg);
      updateBiometricStatus();
    } else {
      showStatus('❌ ' + result.msg);
    }
  }

  async function disableBiometric(){
    var cur = getCurrent();
    if (!cur) return;

    if (!confirm('Are you sure you want to disable biometric login?')) return;

    if (window.PPAuth && window.PPAuth.removeBiometricCredential){
      window.PPAuth.removeBiometricCredential(cur.username);
      showStatus('✅ Biometric login disabled');
      updateBiometricStatus();
    }
  }

  function attach(){ 
    document.addEventListener('DOMContentLoaded', function(){ 
      populate();
      
      var saveBtn = qs('pd-save'); 
      if (saveBtn) saveBtn.addEventListener('click', function(){ save(); });
      
      var cancelBtn = qs('pd-cancel'); 
      if (cancelBtn) cancelBtn.addEventListener('click', function(){ populate(); showStatus('No changes'); });
      
      var enableBioBtn = qs('enable-biometric');
      if (enableBioBtn) enableBioBtn.addEventListener('click', function(){ enableBiometric(); });
      
      var disableBioBtn = qs('disable-biometric');
      if (disableBioBtn) disableBioBtn.addEventListener('click', function(){ disableBiometric(); });
    }); 
  }

  attach();
})();
