(function(){
  function qs(id){ return document.getElementById(id); }
  function showStatus(msg){ var s = qs('admin-status'); if (s) s.textContent = msg; }
  function showPasswordStatus(msg){ var s = qs('password-status'); if (s) s.textContent = msg; }

  var USERS_KEY = 'pp_users_v1';
  var CURRENT_KEY = 'pp_current_user';
  var TEMP_ACCOUNTS_KEY = 'pp_temp_accounts_v1';
  var ADMIN_USERNAME = 'Lee'; // CHANGE THIS to your username

  function loadUsers(){ try{ return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }catch(e){ return []; } }
  function saveUsers(u){ localStorage.setItem(USERS_KEY, JSON.stringify(u)); }
  function getCurrent(){ try{ return JSON.parse(localStorage.getItem(CURRENT_KEY)); }catch(e){ return null; } }

  function loadTempAccounts(){ try{ return JSON.parse(localStorage.getItem(TEMP_ACCOUNTS_KEY) || '[]'); }catch(e){ return []; } }
  function saveTempAccounts(arr){ localStorage.setItem(TEMP_ACCOUNTS_KEY, JSON.stringify(arr)); }

  // Check if current user is admin
  function isAdmin(){
    var cur = getCurrent();
    console.log('Admin check - Current user:', cur);
    console.log('Admin check - Expected username:', ADMIN_USERNAME);
    console.log('Admin check - Match result:', cur && cur.username === ADMIN_USERNAME);
    return cur && cur.username === ADMIN_USERNAME;
  }

  // Block access if not admin
  function requireAdmin(){
    var cur = getCurrent();
    console.log('Admin access check - Current user:', cur);
    console.log('Admin access check - Required username:', ADMIN_USERNAME);
    
    if (!cur || cur.username !== ADMIN_USERNAME){
      var msg = 'You are logged in as: ' + (cur ? cur.username : 'not logged in') + '. Admin access requires username: ' + ADMIN_USERNAME;
      console.error('Admin access denied:', msg);
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:Arial,sans-serif;text-align:center;"><div><h1 style="color:#ef4444;">Access Denied</h1><p style="color:#6b7280;margin:20px 0;">' + msg + '</p><a href="dashboard.html" style="color:#2563eb;text-decoration:none;">Return to Dashboard</a></div></div>';
      throw new Error('Admin access required');
    }
    console.log('Admin access granted for user:', cur.username);
  }

  function hashPassword(password){
    if (!password) return Promise.resolve('');
    var enc = new TextEncoder();
    return crypto.subtle.digest('SHA-256', enc.encode(password)).then(function(buf){
      return Array.from(new Uint8Array(buf)).map(function(b){ return ('00'+b.toString(16)).slice(-2); }).join('');
    });
  }

  async function changePassword(){
    var cur = getCurrent();
    if (!cur) { showPasswordStatus('Not logged in'); return; }

    var currentPass = qs('admin-current-pass').value;
    var newPass = qs('admin-new-pass').value;
    var confirmPass = qs('admin-confirm-pass').value;

    if (!currentPass || !newPass || !confirmPass){
      showPasswordStatus('All fields required');
      return;
    }

    if (newPass !== confirmPass){
      showPasswordStatus('New passwords do not match');
      return;
    }

    if (newPass.length < 4){
      showPasswordStatus('Password must be at least 4 characters');
      return;
    }

    var users = loadUsers();
    var user = users.find(function(u){ return u.username === cur.username; });
    if (!user){
      showPasswordStatus('User not found');
      return;
    }

    var currentHash = await hashPassword(currentPass);
    if (currentHash !== user.passwordHash){
      showPasswordStatus('Current password is incorrect');
      return;
    }

    var newHash = await hashPassword(newPass);
    user.passwordHash = newHash;
    saveUsers(users);

    qs('admin-current-pass').value = '';
    qs('admin-new-pass').value = '';
    qs('admin-confirm-pass').value = '';
    showPasswordStatus('✅ Password changed successfully!');
  }

  function generateRandomPassword(){
    var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var pass = '';
    for (var i = 0; i < 12; i++){
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    qs('temp-password').value = pass;
  }

  async function createTempAccess(){
    var username = qs('temp-username').value.trim();
    var password = qs('temp-password').value;
    var expiry = qs('temp-expiry').value;
    var readonly = qs('temp-readonly').checked;

    if (!username || !password){
      alert('Username and password required');
      return;
    }

    if (!expiry){
      alert('Please set an expiry date');
      return;
    }

    var expiryDate = new Date(expiry);
    if (expiryDate <= new Date()){
      alert('Expiry date must be in the future');
      return;
    }

    var users = loadUsers();
    if (users.find(function(u){ return u.username === username; })){
      alert('Username already exists');
      return;
    }

    var passwordHash = await hashPassword(password);
    var tempAccount = {
      username: username,
      passwordHash: passwordHash,
      display: username,
      createdBy: getCurrent().username,
      createdAt: new Date().toISOString(),
      expiresAt: expiryDate.toISOString(),
      readonly: readonly,
      isTemp: true
    };

    users.push(tempAccount);
    saveUsers(users);

    var tempAccounts = loadTempAccounts();
    tempAccounts.push({
      id: Date.now(),
      username: username,
      password: password,
      expiresAt: expiryDate.toISOString(),
      readonly: readonly
    });
    saveTempAccounts(tempAccounts);

    qs('temp-username').value = '';
    qs('temp-password').value = '';
    qs('temp-expiry').value = '';

    alert('Temporary access created!\n\nUsername: ' + username + '\nPassword: ' + password + '\n\nShare these credentials with your healthcare provider.');
    renderTempAccounts();
  }

  function revokeTempAccess(username){
    if (!confirm('Revoke access for ' + username + '?')) return;

    var users = loadUsers();
    users = users.filter(function(u){ return u.username !== username; });
    saveUsers(users);

    var tempAccounts = loadTempAccounts();
    tempAccounts = tempAccounts.filter(function(a){ return a.username !== username; });
    saveTempAccounts(tempAccounts);

    renderTempAccounts();
    showStatus('Access revoked for ' + username);
  }

  function renderTempAccounts(){
    var container = qs('temp-accounts-list');
    if (!container) return;

    var tempAccounts = loadTempAccounts();
    var now = new Date();

    // Remove expired accounts
    var active = tempAccounts.filter(function(a){
      return new Date(a.expiresAt) > now;
    });

    // Clean up expired from storage
    if (active.length !== tempAccounts.length){
      saveTempAccounts(active);
      var users = loadUsers();
      var expiredUsernames = tempAccounts.filter(function(a){ return new Date(a.expiresAt) <= now; }).map(function(a){ return a.username; });
      users = users.filter(function(u){ return expiredUsernames.indexOf(u.username) === -1; });
      saveUsers(users);
    }

    if (active.length === 0){
      container.innerHTML = '<p class="muted">No active temporary accounts</p>';
      return;
    }

    var html = '<div class="temp-accounts">';
    active.forEach(function(acc){
      var expires = new Date(acc.expiresAt);
      html += '<div class="entry card" style="margin-bottom:10px">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center">';
      html += '<div>';
      html += '<strong>' + escapeHtml(acc.username) + '</strong><br>';
      html += '<small class="muted">Password: ' + escapeHtml(acc.password) + '</small><br>';
      html += '<small class="muted">Expires: ' + expires.toLocaleDateString() + ' ' + expires.toLocaleTimeString() + '</small><br>';
      html += '<small class="muted">' + (acc.readonly ? 'Read-only' : 'Full access') + '</small>';
      html += '</div>';
      html += '<button class="btn btn-danger" onclick="window.revokeTempAccess(\'' + acc.username + '\')">Revoke</button>';
      html += '</div></div>';
    });
    html += '</div>';
    container.innerHTML = html;
  }

  // Expose revoke function globally for onclick
  window.revokeTempAccess = revokeTempAccess;

  function applyTheme(theme){ try{
    // theme: { mode: 'day'|'night', accent: '#xxxxxx', bg: '#xxxxxx' }
    var root = document.documentElement;
    if (theme.accent) root.style.setProperty('--accent', theme.accent);
    if (theme.bg) root.style.setProperty('--bg', theme.bg);
    if (theme.mode === 'night'){
      root.style.setProperty('--surface', '#0f172a');
      root.style.setProperty('--text', '#e6eef8');
      root.style.setProperty('--muted', '#9aa4b2');
    } else {
      root.style.setProperty('--surface', '#ffffff');
      root.style.setProperty('--text', '#0f172a');
      root.style.setProperty('--muted', '#6b7280');
    }
    localStorage.setItem('pp_theme_v1', JSON.stringify(theme));
    showStatus('Theme applied');
  }catch(e){ console.error(e); showStatus('Failed to apply theme'); } }

  function loadTheme(){ try{ var t = JSON.parse(localStorage.getItem('pp_theme_v1')||'null'); return t; }catch(e){ return null; } }

  function renderLog(){ var out = qs('login-log'); if(!out) return; out.innerHTML=''; try{ var log = JSON.parse(localStorage.getItem('pp_login_log_v1')||'[]'); if(!log.length){ out.innerHTML = '<p class="muted">No login events recorded.</p>'; return; } var tbl = document.createElement('div'); log.slice().reverse().forEach(function(r){ var e = document.createElement('div'); e.className='entry'; e.innerHTML = '<strong>'+escapeHtml(r.username)+'</strong> — <span class="muted">'+escapeHtml(r.action)+'</span><br><small>'+new Date(r.ts).toLocaleString()+'</small>'; tbl.appendChild(e); }); out.appendChild(tbl); }catch(e){ out.innerHTML = '<p class="muted">Failed to load log.</p>'; } }

  function escapeHtml(s){ if(!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function attach(){ 
    // Password management
    var changePassBtn = qs('admin-change-password');
    if (changePassBtn) changePassBtn.addEventListener('click', changePassword);

    // Temporary access
    var genPassBtn = qs('generate-temp-password');
    if (genPassBtn) genPassBtn.addEventListener('click', generateRandomPassword);

    var createTempBtn = qs('create-temp-access');
    if (createTempBtn) createTempBtn.addEventListener('click', createTempAccess);

    // Set default expiry to 7 days from now
    var expiryField = qs('temp-expiry');
    if (expiryField){
      var defaultExpiry = new Date();
      defaultExpiry.setDate(defaultExpiry.getDate() + 7);
      expiryField.value = defaultExpiry.toISOString().split('T')[0];
    }

    renderTempAccounts();

    // Archive
    var aBtn = qs('admin-archive-now'); 
    if (aBtn) aBtn.addEventListener('click', function(){ 
      try{ 
        var s = window.AppArchive && typeof window.AppArchive.runArchiveNow === 'function' ? window.AppArchive.runArchiveNow() : null; 
        alert('Archive '+(s?('created: '+new Date(s.ts).toLocaleString()):'failed')); 
        showStatus('Archive run'); 
      }catch(e){ 
        alert('Archive failed'); 
      } 
    });

    // Theme
    var applyBtn = qs('admin-apply-theme'); 
    if (applyBtn) applyBtn.addEventListener('click', function(){ 
      var mode = qs('admin-mode').value; 
      var accent = qs('admin-accent').value; 
      var bg = qs('admin-bg').value; 
      applyTheme({mode:mode, accent:accent, bg:bg}); 
    });
    
    var resetBtn = qs('admin-reset-theme'); 
    if (resetBtn) resetBtn.addEventListener('click', function(){ 
      localStorage.removeItem('pp_theme_v1'); 
      location.reload(); 
    });

    var clearLog = qs('admin-clear-log'); 
    if (clearLog) clearLog.addEventListener('click', function(){ 
      if (!confirm('Clear login log?')) return; 
      localStorage.removeItem('pp_login_log_v1'); 
      renderLog(); 
      showStatus('Login log cleared'); 
    });

    // populate theme controls
    var t = loadTheme(); 
    if (t){ 
      if (qs('admin-mode')) qs('admin-mode').value = t.mode||'day'; 
      if (qs('admin-accent')) qs('admin-accent').value = t.accent||'#2563eb'; 
      if (qs('admin-bg')) qs('admin-bg').value = t.bg||'#f6f8fb'; 
      applyTheme(t); 
    }
  }

  // Initialize and check admin access
  function init(){
    requireAdmin(); // Block non-admins
    attach();
    renderLog();
    renderTempAccounts();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
