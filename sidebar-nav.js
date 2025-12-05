// sidebar-nav.js - Enhanced sidebar with dropdown navigation
(function(){
  function createSidebarNav(){
    return `
      <div class="nav-group">
        <a href="dashboard.html" class="side-link">🏠 Dashboard</a>
      </div>

      <div class="nav-group">
        <div class="dropdown-toggle" onclick="toggleDropdown('health-dropdown')">
          <span>💊 Health Tracking</span>
          <span class="dropdown-arrow">▼</span>
        </div>
        <div id="health-dropdown" class="dropdown">
          <a href="medications.html" class="side-link">Medications</a>
          <a href="medication-logs.html" class="side-link">Medication Logs</a>
          <a href="vitals.html" class="side-link">Vitals</a>
          <a href="symptoms.html" class="side-link">Symptoms</a>
          <a href="fluids.html" class="side-link">Fluid Balance</a>
          <a href="foods.html" class="side-link">Food Tracker</a>
          <a href="exercises.html" class="side-link">Exercises</a>
        </div>
      </div>

      <div class="nav-group">
        <div class="dropdown-toggle" onclick="toggleDropdown('records-dropdown')">
          <span>📋 Records & Planning</span>
          <span class="dropdown-arrow">▼</span>
        </div>
        <div id="records-dropdown" class="dropdown">
          <a href="documents.html" class="side-link">Documents</a>
          <a href="medical-history.html" class="side-link">Medical History</a>
          <a href="appointments.html" class="side-link">Appointments</a>
          <a href="holiday.html" class="side-link">Holiday Planner</a>
        </div>
      </div>

      <div class="nav-group">
        <div class="dropdown-toggle" onclick="toggleDropdown('settings-dropdown')">
          <span>⚙️ Settings & Tools</span>
          <span class="dropdown-arrow">▼</span>
        </div>
        <div id="settings-dropdown" class="dropdown">
          <a href="personal.html" class="side-link">Personal Details</a>
          <a href="search.html" class="side-link">Search</a>
          <a href="admin.html" class="side-link" id="admin-link">Admin</a>
        </div>
      </div>

      <div class="nav-group">
        <a href="#" id="sidebar-archive-btn" class="side-link">💾 Archive Now</a>
      </div>
    `;
  }

  // Check if user is admin and show admin link
  function checkAdminAccess(){
    var ADMIN_USERNAME = 'Lee'; // CHANGE THIS to match admin.js
    try {
      var current = JSON.parse(localStorage.getItem('pp_current_user'));
      if (current && current.username === ADMIN_USERNAME) {
        var adminLink = document.getElementById('admin-link');
        if (adminLink) {
          adminLink.style.display = 'block';
        }
      }
    } catch(e) {}
  }

  window.toggleDropdown = function(id){
    var dropdown = document.getElementById(id);
    if (!dropdown) return;
    
    var isOpen = dropdown.classList.contains('open');
    
    // Close all other dropdowns
    var allDropdowns = document.querySelectorAll('.sidebar .dropdown');
    allDropdowns.forEach(function(d){ d.classList.remove('open'); });
    
    // Toggle this dropdown
    if (!isOpen) dropdown.classList.add('open');
    
    // Rotate arrow
    var toggle = dropdown.previousElementSibling;
    if (toggle){
      var arrow = toggle.querySelector('.dropdown-arrow');
      if (arrow) arrow.textContent = isOpen ? '▼' : '▲';
    }
  };

  // Initialize sidebar on page load
  function initSidebar(){
    var sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    
    var navHTML = createSidebarNav();
    sidebar.innerHTML = navHTML;
    
    // Expand the dropdown that contains the current page
    var currentPath = window.location.pathname;
    var allLinks = sidebar.querySelectorAll('.dropdown a.side-link');
    allLinks.forEach(function(link){
      if (currentPath.includes(link.getAttribute('href'))){
        link.classList.add('active');
        var dropdown = link.closest('.dropdown');
        if (dropdown) dropdown.classList.add('open');
        
        // Update arrow
        var toggle = dropdown.previousElementSibling;
        if (toggle){
          var arrow = toggle.querySelector('.dropdown-arrow');
          if (arrow) arrow.textContent = '▲';
        }
      }
    });
    
    // Check admin access and show/hide admin link
    checkAdminAccess();
    
    // Re-check admin access after delays to allow auth.js to load
    setTimeout(checkAdminAccess, 100);
    setTimeout(checkAdminAccess, 500);
    setTimeout(checkAdminAccess, 1000);
    setTimeout(checkAdminAccess, 2000);
    
    // Mark dashboard as active if on dashboard
    if (currentPath.includes('dashboard.html')){
      var dashLink = sidebar.querySelector('a[href="dashboard.html"]');
      if (dashLink) dashLink.classList.add('active');
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initSidebar);
  } else {
    initSidebar();
  }
})();
