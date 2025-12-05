// Migration script to move localStorage data to API server
// Run this once after setting up the backend server

(function() {
  
  async function migrateData() {
    console.log('Starting data migration...');
    
    if (!window.PPApiClient) {
      alert('API Client not loaded. Make sure api-client.js is included.');
      return;
    }

    if (!window.PPApiClient.isAuthenticated()) {
      alert('Please log in first before migrating data.');
      return;
    }

    try {
      let migrated = {
        medications: 0,
        medLogs: 0,
        vitals: 0,
        symptoms: 0,
        fluids: 0,
        foods: 0,
        exercises: 0,
        appointments: 0
      };

      // Migrate Medications
      console.log('Migrating medications...');
      const meds = JSON.parse(localStorage.getItem('pp_meds_v1') || '[]');
      for (const med of meds) {
        try {
          await window.PPApiClient.addMedication({
            name: med.name,
            dosage: med.dosage,
            times: med.times,
            stock: med.stock,
            notes: med.notes
          });
          migrated.medications++;
        } catch (e) {
          console.error('Failed to migrate medication:', med.name, e);
        }
      }

      // Migrate Med Logs
      console.log('Migrating medication logs...');
      const medLogs = JSON.parse(localStorage.getItem('pp_med_log_v1') || '[]');
      for (const log of medLogs) {
        try {
          await window.PPApiClient.addMedLog({
            med_name: log.medName,
            tablets_used: log.tabletsUsed,
            timestamp: log.ts
          });
          migrated.medLogs++;
        } catch (e) {
          console.error('Failed to migrate med log:', e);
        }
      }

      // Migrate Vitals/NEWS2
      console.log('Migrating vitals...');
      const vitals = JSON.parse(localStorage.getItem('news2_logs_v1') || '[]');
      for (const vital of vitals) {
        try {
          await window.PPApiClient.addVital({
            systolic: vital.systolic,
            diastolic: vital.diastolic,
            heart_rate: vital.hr,
            temperature: vital.temp,
            oxygen: vital.o2,
            respiratory_rate: vital.rr,
            consciousness: vital.consciousness,
            news2_score: vital.score,
            timestamp: vital.ts
          });
          migrated.vitals++;
        } catch (e) {
          console.error('Failed to migrate vital:', e);
        }
      }

      // Migrate Symptoms
      console.log('Migrating symptoms...');
      const symptoms = JSON.parse(localStorage.getItem('symptomLogs_v1') || '[]');
      for (const symptom of symptoms) {
        try {
          await window.PPApiClient.addSymptom({
            tremor: symptom.tremor,
            bradykinesia: symptom.bradykinesia,
            rigidity: symptom.rigidity,
            gait: symptom.gait,
            dyskinesia: symptom.dyskinesia,
            sleep: symptom.sleep,
            mood: symptom.mood,
            cognition: symptom.cognition,
            notes: symptom.notes,
            timestamp: symptom.ts
          });
          migrated.symptoms++;
        } catch (e) {
          console.error('Failed to migrate symptom:', e);
        }
      }

      // Migrate Fluids
      console.log('Migrating fluids...');
      const fluids = JSON.parse(localStorage.getItem('fluidLogs_v1') || '[]');
      for (const fluid of fluids) {
        try {
          await window.PPApiClient.addFluid({
            type: fluid.type,
            amount: fluid.amount,
            notes: fluid.notes,
            timestamp: fluid.time
          });
          migrated.fluids++;
        } catch (e) {
          console.error('Failed to migrate fluid:', e);
        }
      }

      // Migrate Foods
      console.log('Migrating foods...');
      const foods = JSON.parse(localStorage.getItem('foodLogs_v1') || '[]');
      for (const food of foods) {
        try {
          await window.PPApiClient.addFood({
            meal_type: food.mealType,
            food_items: food.foodItems,
            protein: food.protein,
            notes: food.notes,
            timestamp: food.ts
          });
          migrated.foods++;
        } catch (e) {
          console.error('Failed to migrate food:', e);
        }
      }

      // Migrate Exercises
      console.log('Migrating exercises...');
      const exercises = JSON.parse(localStorage.getItem('exerciseLogs_v1') || '[]');
      for (const exercise of exercises) {
        try {
          await window.PPApiClient.addExercise({
            exercise_type: exercise.type,
            duration: exercise.duration,
            intensity: exercise.intensity,
            notes: exercise.notes,
            timestamp: exercise.ts
          });
          migrated.exercises++;
        } catch (e) {
          console.error('Failed to migrate exercise:', e);
        }
      }

      // Migrate Appointments
      console.log('Migrating appointments...');
      const appointments = JSON.parse(localStorage.getItem('appointments_v1') || '[]');
      for (const appt of appointments) {
        try {
          await window.PPApiClient.addAppointment({
            title: appt.title,
            timestamp: appt.ts,
            location: appt.location,
            notes: appt.notes
          });
          migrated.appointments++;
        } catch (e) {
          console.error('Failed to migrate appointment:', e);
        }
      }

      console.log('Migration complete!', migrated);
      alert(`Migration successful!\n\nMigrated:\n- ${migrated.medications} medications\n- ${migrated.medLogs} med logs\n- ${migrated.vitals} vitals\n- ${migrated.symptoms} symptoms\n- ${migrated.fluids} fluids\n- ${migrated.foods} foods\n- ${migrated.exercises} exercises\n- ${migrated.appointments} appointments`);

      // Ask if user wants to clear localStorage
      if (confirm('Data migrated successfully! Would you like to clear the old localStorage data? (Recommended after verifying everything works)')) {
        const keysToKeep = ['pp_auth_token', 'pp_current_user'];
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && !keysToKeep.includes(key)) {
            localStorage.removeItem(key);
          }
        }
        alert('Old data cleared. Your app now uses the server database.');
      }

    } catch (error) {
      console.error('Migration failed:', error);
      alert('Migration failed: ' + error.message);
    }
  }

  // Expose migration function
  window.migrateToAPI = migrateData;

  console.log('Migration script loaded. Call migrateToAPI() to start migration.');
})();
