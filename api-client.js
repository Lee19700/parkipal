// API Client for Parkinson's Pal
// This replaces localStorage with server API calls

(function() {
  // CONFIGURATION - Update this with your NAS IP address
  const API_BASE_URL = 'http://192.168.0.48:3000/api'; // NAS IP address
  
  const TOKEN_KEY = 'pp_auth_token';
  const USER_KEY = 'pp_current_user';

  // Helper function to get auth token
  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  // Helper function to get headers with auth
  function getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // Generic API request handler
  async function apiRequest(endpoint, options = {}) {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      const config = {
        ...options,
        headers: getHeaders()
      };

      const response = await fetch(url, config);
      
      if (response.status === 401 || response.status === 403) {
        // Token expired or invalid - redirect to login
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        window.location.href = 'login2.html';
        throw new Error('Authentication required');
      }

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // API Client object
  window.PPApiClient = {
    
    // ============================================
    // AUTH
    // ============================================
    
    async register(username, password, display_name) {
      const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password, display_name })
      });
      
      // Store token and user info
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      
      return data;
    },

    async login(username, password) {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      
      // Store token and user info
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      
      return data;
    },

    logout() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      window.location.href = 'login2.html';
    },

    getCurrentUser() {
      try {
        return JSON.parse(localStorage.getItem(USER_KEY));
      } catch (e) {
        return null;
      }
    },

    isAuthenticated() {
      return !!getToken();
    },

    // ============================================
    // USER PROFILE
    // ============================================
    
    async getProfile() {
      return await apiRequest('/user/profile');
    },

    async updateProfile(profileData) {
      return await apiRequest('/user/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData)
      });
    },

    // ============================================
    // MEDICATIONS
    // ============================================
    
    async getMedications() {
      return await apiRequest('/medications');
    },

    async addMedication(medData) {
      return await apiRequest('/medications', {
        method: 'POST',
        body: JSON.stringify(medData)
      });
    },

    async updateMedication(id, medData) {
      return await apiRequest(`/medications/${id}`, {
        method: 'PUT',
        body: JSON.stringify(medData)
      });
    },

    async deleteMedication(id) {
      return await apiRequest(`/medications/${id}`, {
        method: 'DELETE'
      });
    },

    // ============================================
    // MEDICATION LOGS
    // ============================================
    
    async getMedLogs() {
      return await apiRequest('/medlogs');
    },

    async addMedLog(logData) {
      return await apiRequest('/medlogs', {
        method: 'POST',
        body: JSON.stringify(logData)
      });
    },

    async deleteMedLog(id) {
      return await apiRequest(`/medlogs/${id}`, {
        method: 'DELETE'
      });
    },

    // ============================================
    // VITALS
    // ============================================
    
    async getVitals() {
      return await apiRequest('/vitals');
    },

    async addVital(vitalData) {
      return await apiRequest('/vitals', {
        method: 'POST',
        body: JSON.stringify(vitalData)
      });
    },

    // ============================================
    // SYMPTOMS
    // ============================================
    
    async getSymptoms() {
      return await apiRequest('/symptoms');
    },

    async addSymptom(symptomData) {
      return await apiRequest('/symptoms', {
        method: 'POST',
        body: JSON.stringify(symptomData)
      });
    },

    async deleteSymptom(id) {
      return await apiRequest(`/symptoms/${id}`, {
        method: 'DELETE'
      });
    },

    // ============================================
    // FLUIDS
    // ============================================
    
    async getFluids() {
      return await apiRequest('/fluids');
    },

    async addFluid(fluidData) {
      return await apiRequest('/fluids', {
        method: 'POST',
        body: JSON.stringify(fluidData)
      });
    },

    async deleteFluid(id) {
      return await apiRequest(`/fluids/${id}`, {
        method: 'DELETE'
      });
    },

    // ============================================
    // FOODS
    // ============================================
    
    async getFoods() {
      return await apiRequest('/foods');
    },

    async addFood(foodData) {
      return await apiRequest('/foods', {
        method: 'POST',
        body: JSON.stringify(foodData)
      });
    },

    async deleteFood(id) {
      return await apiRequest(`/foods/${id}`, {
        method: 'DELETE'
      });
    },

    // ============================================
    // EXERCISES
    // ============================================
    
    async getExercises() {
      return await apiRequest('/exercises');
    },

    async addExercise(exerciseData) {
      return await apiRequest('/exercises', {
        method: 'POST',
        body: JSON.stringify(exerciseData)
      });
    },

    async deleteExercise(id) {
      return await apiRequest(`/exercises/${id}`, {
        method: 'DELETE'
      });
    },

    // ============================================
    // APPOINTMENTS
    // ============================================
    
    async getAppointments() {
      return await apiRequest('/appointments');
    },

    async addAppointment(appointmentData) {
      return await apiRequest('/appointments', {
        method: 'POST',
        body: JSON.stringify(appointmentData)
      });
    },

    async updateAppointment(id, appointmentData) {
      return await apiRequest(`/appointments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(appointmentData)
      });
    },

    async deleteAppointment(id) {
      return await apiRequest(`/appointments/${id}`, {
        method: 'DELETE'
      });
    }
  };

  console.log('API Client loaded. Base URL:', API_BASE_URL);
})();
