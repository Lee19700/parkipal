// auth.js — client-side demo auth: register, login, logout, gate pages
(function(){
  var USERS_KEY = 'pp_users_v1';
  var CURRENT_KEY = 'pp_current_user';

  function qs(id){ return document.getElementById(id); }
  function loadUsers(){ try{ return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }catch(e){ return []; } }
  function saveUsers(u){ localStorage.setItem(USERS_KEY, JSON.stringify(u)); }
  // Persist current user across restarts (localStorage)
  function setCurrent(user){ localStorage.setItem(CURRENT_KEY, JSON.stringify(user)); }
  function clearCurrent(){ localStorage.removeItem(CURRENT_KEY); }
  function getCurrent(){ try{ return JSON.parse(localStorage.getItem(CURRENT_KEY)); }catch(e){ return null; } }

  // Gate pages: redirect to login.html if not logged in
  function requireAuth(){
    var cur = getCurrent();
    if (!cur || !cur.username){
      // Redirect to login page, but avoid redirect loop
      var currentPage = location.pathname.toLowerCase();
      if (!currentPage.endsWith('login.html') && !currentPage.endsWith('login2.html')){
        location.href = 'login2.html';
      }
      return false;
    }
    return true;
  }

  // Simple registration / login helpers (demo only — not secure)
  // Hashing helper using Web Crypto
  function hashPassword(password){
    if (!password) return Promise.resolve('');
    var enc = new TextEncoder();
    return crypto.subtle.digest('SHA-256', enc.encode(password)).then(function(buf){
      return Array.from(new Uint8Array(buf)).map(function(b){ return ('00'+b.toString(16)).slice(-2); }).join('');
    });
  }

  async function registerUser(username, password, display){
    if (!username || !password) return {ok:false, msg:'Username and password required'};
    var users = loadUsers();
    if (users.find(function(u){ return u.username === username;})) return {ok:false, msg:'Username already exists'};
    var hashed = await hashPassword(password);
    var u = {username:username, passwordHash:hashed, display: display||username};
    users.push(u); saveUsers(users); setCurrent({username:u.username, display:u.display});
    try{ logAuthEvent(u.username, 'register'); }catch(e){}
    window.location.href = 'dashboard.html';
    return {ok:true, user:u};
  }

  async function loginUser(username, password){
    var users = loadUsers();
    var hashed = await hashPassword(password);
    var u = users.find(function(x){ return x.username === username && x.passwordHash === hashed; });
    if (!u) return {ok:false, msg:'Invalid credentials'};
    setCurrent({username:u.username, display:u.display});
    try{ logAuthEvent(u.username, 'login'); }catch(e){}
    window.location.href = 'dashboard.html';
    return {ok:true, user:u};
  }

  function logout(){ 
    clearCurrent(); 
    try{ 
      var cur=getCurrent(); 
      if (cur && cur.username) logAuthEvent(cur.username, 'logout'); 
    }catch(e){}
    
    // Redirect to login2.html
    window.location.href = 'login2.html';
  }

  // Biometric Authentication (WebAuthn)
  var BIOMETRIC_KEY = 'pp_biometric_v1';

  function getBiometricCredentials(){
    try{
      return JSON.parse(localStorage.getItem(BIOMETRIC_KEY) || '{}');
    } catch(e){
      return {};
    }
  }

  function saveBiometricCredential(username, credentialId){
    try{
      var creds = getBiometricCredentials();
      creds[username] = credentialId;
      localStorage.setItem(BIOMETRIC_KEY, JSON.stringify(creds));
    } catch(e){
      console.error('Failed to save biometric credential:', e);
    }
  }

  function removeBiometricCredential(username){
    try{
      var creds = getBiometricCredentials();
      delete creds[username];
      localStorage.setItem(BIOMETRIC_KEY, JSON.stringify(creds));
    } catch(e){}
  }

  async function registerBiometric(username){
    // Check if WebAuthn is supported
    if (!window.PublicKeyCredential) {
      return {ok: false, msg: 'Biometric authentication not supported on this device'};
    }

    try{
      var challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      var publicKeyOptions = {
        challenge: challenge,
        rp: {
          name: "Parkinson's Pal",
          id: location.hostname
        },
        user: {
          id: new TextEncoder().encode(username),
          name: username,
          displayName: username
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },  // ES256
          { type: "public-key", alg: -257 } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required"
        },
        timeout: 60000,
        attestation: "none"
      };

      var credential = await navigator.credentials.create({
        publicKey: publicKeyOptions
      });

      if (credential) {
        var credentialId = btoa(String.fromCharCode.apply(null, new Uint8Array(credential.rawId)));
        saveBiometricCredential(username, credentialId);
        return {ok: true, msg: 'Biometric authentication enabled!'};
      }
    } catch(e){
      console.error('Biometric registration failed:', e);
      if (e.name === 'NotAllowedError'){
        return {ok: false, msg: 'Biometric registration was cancelled'};
      }
      return {ok: false, msg: 'Failed to register biometric: ' + e.message};
    }

    return {ok: false, msg: 'Failed to register biometric'};
  }

  async function loginWithBiometric(username){
    if (!window.PublicKeyCredential) {
      return {ok: false, msg: 'Biometric authentication not supported'};
    }

    var creds = getBiometricCredentials();
    if (!creds[username]){
      return {ok: false, msg: 'No biometric registered for this user'};
    }

    try{
      var challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      var credentialId = Uint8Array.from(atob(creds[username]), function(c){ return c.charCodeAt(0); });

      var publicKeyOptions = {
        challenge: challenge,
        allowCredentials: [{
          id: credentialId,
          type: 'public-key',
          transports: ['internal']
        }],
        timeout: 60000,
        userVerification: "required"
      };

      var assertion = await navigator.credentials.get({
        publicKey: publicKeyOptions
      });

      if (assertion){
        var users = loadUsers();
        var u = users.find(function(x){ return x.username === username; });
        if (!u) return {ok: false, msg: 'User not found'};
        
        setCurrent({username: u.username, display: u.display});
        try{ logAuthEvent(u.username, 'biometric-login'); }catch(e){}
        return {ok: true, user: u};
      }
    } catch(e){
      console.error('Biometric login failed:', e);
      if (e.name === 'NotAllowedError'){
        return {ok: false, msg: 'Biometric authentication was cancelled'};
      }
      return {ok: false, msg: 'Biometric authentication failed: ' + e.message};
    }

    return {ok: false, msg: 'Biometric authentication failed'};
  }

  // Login/register/logout event logging
  function loadLoginLog(){ try{ return JSON.parse(localStorage.getItem('pp_login_log_v1')||'[]'); }catch(e){ return []; } }
  function saveLoginLog(arr){ try{ localStorage.setItem('pp_login_log_v1', JSON.stringify(arr)); }catch(e){} }
  function logAuthEvent(username, action){ var arr = loadLoginLog(); arr.push({ id: Date.now(), username: username, action: action, ts: (new Date()).toISOString() }); saveLoginLog(arr); }

  // Wire up index.html auth form elements if present
  function attachIndexAuth(){
    var showLogin = qs('show-login');
    var showRegister = qs('show-register');
    var loginBtn = qs('login-btn');
    var regBtn = qs('register-btn');
    var cancelReg = qs('cancel-register');
    var logoutBtn = qs('btn-logout');
    var statusWhenLoggedIn = qs('status-when-logged-in');
    var statusWhenLoggedOut = qs('status-when-logged-out');
    var currentUsername = qs('current-username');

    function updateUIForUser(){
      var cur = getCurrent();
      if (cur){
        if (statusWhenLoggedIn) statusWhenLoggedIn.classList.remove('hidden');
        if (statusWhenLoggedOut) statusWhenLoggedOut.classList.add('hidden');
        var appMain = qs('app-main'); if (appMain) appMain.classList.remove('hidden');
        if (currentUsername) currentUsername.textContent = cur.display || cur.username;
        // remove centered auth view if present and hide auth card
        try{ document.body.classList.remove('auth-view'); }catch(e){}
        try{ var authEl = qs('auth'); if (authEl) authEl.classList.add('hidden'); }catch(e){}
      } else {
        if (statusWhenLoggedIn) statusWhenLoggedIn.classList.add('hidden');
        if (statusWhenLoggedOut) statusWhenLoggedOut.classList.remove('hidden');
        var appMain = qs('app-main'); if (appMain) appMain.classList.add('hidden');
        // show centered auth view and ensure auth card is visible
        try{ document.body.classList.add('auth-view'); }catch(e){}
        try{ var authEl = qs('auth'); if (authEl) authEl.classList.remove('hidden'); }catch(e){}
        // ensure the login form is visible by default when logged out
        try{
          var lf = qs('login-form'); if (lf) lf.classList.remove('hidden');
          var rf = qs('register-form'); if (rf) rf.classList.add('hidden');
          var ff = qs('forgot-form'); if (ff) ff.classList.add('hidden');
        }catch(e){}
      }
    }

    if (showLogin){ showLogin.addEventListener('click', function(){
      qs('login-form').classList.remove('hidden'); qs('register-form').classList.add('hidden'); qs('forgot-form').classList.add('hidden');
    }); }
    // Fallback button (always visible in case other UI is hidden)
    var fallbackBtn = qs('show-login-fallback');
    if (fallbackBtn){ fallbackBtn.classList.remove('hidden'); fallbackBtn.addEventListener('click', function(){
      document.body.classList.add('auth-view'); var authEl = qs('auth'); if (authEl) authEl.classList.remove('hidden'); qs('login-form').classList.remove('hidden'); qs('register-form').classList.add('hidden'); qs('forgot-form').classList.add('hidden');
    }); }
    if (showRegister){ showRegister.addEventListener('click', function(){
      qs('register-form').classList.remove('hidden'); qs('login-form').classList.add('hidden'); qs('forgot-form').classList.add('hidden');
    }); }
    if (loginBtn){ loginBtn.addEventListener('click', function(){
      console.log('Login button clicked');
      (async function(){
        var u = qs('login-username').value; 
        var p = qs('login-password').value;
        console.log('Username:', u, 'Password length:', p ? p.length : 0);
        
        if (!u || !p){
          var errEl = qs('login-error');
          if (errEl){ errEl.textContent = 'Please enter username and password'; errEl.classList.remove('hidden'); }
          return;
        }
        
        var r = await loginUser(u,p);
        console.log('Login result:', r);
        
        if (!r.ok) { 
          var errEl = qs('login-error');
          if (errEl){ errEl.textContent = r.msg; errEl.classList.remove('hidden'); }
          else alert(r.msg); 
        }
        // Note: if login succeeds, loginUser redirects to dashboard.html
      })();
    }); }

    // Biometric login button
    var biometricLoginBtn = qs('biometric-login-btn');
    if (biometricLoginBtn){
      biometricLoginBtn.addEventListener('click', function(){
        (async function(){
          var u = qs('login-username').value;
          if (!u){
            var errEl = qs('login-error');
            if (errEl){ errEl.textContent = 'Please enter your username first'; errEl.classList.remove('hidden'); }
            else alert('Please enter your username first');
            return;
          }
          var r = await loginWithBiometric(u);
          if (!r.ok) {
            var errEl = qs('login-error');
            if (errEl){ errEl.textContent = r.msg; errEl.classList.remove('hidden'); }
            else alert(r.msg);
          } else { updateUIForUser(); }
        })();
      });
    }

    if (regBtn){ regBtn.addEventListener('click', function(){
      (async function(){
        var u = qs('reg-username').value; var p = qs('reg-password').value; var d = qs('reg-display').value;
        var r = await registerUser(u,p,d);
        if (!r.ok) {
          var errEl = qs('register-error');
          if (errEl){ errEl.textContent = r.msg; errEl.classList.remove('hidden'); }
          else alert(r.msg);
        } else { updateUIForUser(); }
      })();
    }); }
    if (cancelReg){ cancelReg.addEventListener('click', function(){ qs('register-form').classList.add('hidden'); qs('login-form').classList.remove('hidden'); }); }
    if (logoutBtn){ logoutBtn.addEventListener('click', function(){ if (confirm('Log out?')) logout(); }); }

    // Account settings handlers
    var acctBtn = qs('account-settings-btn');
    var acctSection = qs('account-settings');
    var acctDisplay = qs('account-display');
    var saveAcct = qs('save-account');
    var clearData = qs('clear-data');
    var enableBiometric = qs('enable-biometric');
    var disableBiometric = qs('disable-biometric');
    var biometricStatus = qs('biometric-status');

    if (acctBtn){ acctBtn.addEventListener('click', function(){ 
      if (acctSection) acctSection.classList.toggle('hidden'); 
      var cur = getCurrent(); 
      if (acctDisplay && cur) acctDisplay.value = cur.display || cur.username;
      
      // Update biometric status
      if (cur && biometricStatus){
        var creds = getBiometricCredentials();
        if (creds[cur.username]){
          biometricStatus.textContent = '✓ Biometric authentication enabled';
          biometricStatus.style.color = '#059669';
          if (enableBiometric) enableBiometric.classList.add('hidden');
          if (disableBiometric) disableBiometric.classList.remove('hidden');
        } else {
          biometricStatus.textContent = '✗ Biometric authentication not enabled';
          biometricStatus.style.color = '#dc2626';
          if (enableBiometric) enableBiometric.classList.remove('hidden');
          if (disableBiometric) disableBiometric.classList.add('hidden');
        }
      }
    }); }

    if (enableBiometric){
      enableBiometric.addEventListener('click', function(){
        (async function(){
          var cur = getCurrent();
          if (!cur) return alert('Not logged in');
          var r = await registerBiometric(cur.username);
          if (r.ok){
            alert(r.msg);
            if (acctBtn) acctBtn.click(); // Refresh status
          } else {
            alert(r.msg);
          }
        })();
      });
    }

    if (disableBiometric){
      disableBiometric.addEventListener('click', function(){
        var cur = getCurrent();
        if (!cur) return alert('Not logged in');
        if (confirm('Disable biometric authentication?')){
          removeBiometricCredential(cur.username);
          alert('Biometric authentication disabled');
          if (acctBtn) acctBtn.click(); // Refresh status
        }
      });
    }

    if (acctBtn){ acctBtn.addEventListener('click', function(){ if (acctSection) acctSection.classList.toggle('hidden'); var cur = getCurrent(); if (acctDisplay && cur) acctDisplay.value = cur.display || cur.username; }); }
    if (saveAcct){ saveAcct.addEventListener('click', function(){ var newDisplay = acctDisplay.value || ''; var cur = getCurrent(); if (!cur) return alert('Not logged in'); // update users list
      var users = loadUsers(); var u = users.find(function(x){ return x.username === cur.username; }); if (u){ u.display = newDisplay; saveUsers(users); setCurrent({ username: u.username, display: u.display }); updateUIForUser(); alert('Saved'); } else alert('User not found'); }); }
    if (clearData){ clearData.addEventListener('click', function(){ if (!confirm('Clear local app data and log out?')) return; // clear keys we created
      ['meds_v1','symptomLogs_v1','fluidLogs_v1','foodLogs_v1','parkinsonsMeds_v1','user_meds_v1'].forEach(function(k){ localStorage.removeItem(k); });
      // remove users and current
      localStorage.removeItem(USERS_KEY); clearCurrent(); location.reload(); }); }

    updateUIForUser();
  }

  // Expose requireAuth globally for pages to call
  window.PPAuth = { 
    requireAuth: requireAuth, 
    getCurrent: getCurrent,
    registerBiometric: registerBiometric,
    loginWithBiometric: loginWithBiometric,
    removeBiometricCredential: removeBiometricCredential,
    hasBiometric: function(username){ 
      var creds = getBiometricCredentials(); 
      return !!creds[username]; 
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attachIndexAuth);
  else attachIndexAuth();

})();
