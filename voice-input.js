// voice-input.js — Voice-to-text input for accessibility
(function(){
  'use strict';

  var recognition = null;
  var isListening = false;
  var currentInput = null;
  var voiceButton = null;

  // Check if browser supports speech recognition
  function isSupported(){
    return ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  }

  // Initialize speech recognition
  function initRecognition(){
    if (!isSupported()) return null;

    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    var recog = new SpeechRecognition();
    
    recog.continuous = false;
    recog.interimResults = false;
    recog.lang = 'en-US';
    
    return recog;
  }

  // Create voice button element
  function createVoiceButton(){
    var btn = document.createElement('button');
    btn.className = 'voice-btn';
    btn.innerHTML = '🎤';
    btn.type = 'button';
    btn.title = 'Click to speak';
    btn.setAttribute('aria-label', 'Voice input');
    return btn;
  }

  // Start listening
  function startListening(input, button){
    if (!recognition || isListening) return;

    currentInput = input;
    voiceButton = button;
    
    try{
      recognition.start();
      isListening = true;
      button.classList.add('listening');
      button.innerHTML = '⏺️';
      button.title = 'Listening... Click to stop';
      
      // Show visual feedback
      showFeedback('Listening... Speak now', 'info');
    } catch(e){
      console.error('Failed to start recognition:', e);
      showFeedback('Failed to start voice input', 'error');
    }
  }

  // Stop listening
  function stopListening(){
    if (!recognition || !isListening) return;
    
    try{
      recognition.stop();
    } catch(e){
      // Already stopped
    }
    
    resetButton();
  }

  // Reset button state
  function resetButton(){
    isListening = false;
    if (voiceButton){
      voiceButton.classList.remove('listening');
      voiceButton.innerHTML = '🎤';
      voiceButton.title = 'Click to speak';
    }
  }

  // Show feedback message
  function showFeedback(message, type){
    var existing = document.querySelector('.voice-feedback');
    if (existing) existing.remove();

    var feedback = document.createElement('div');
    feedback.className = 'voice-feedback voice-feedback-' + (type || 'info');
    feedback.textContent = message;
    document.body.appendChild(feedback);

    setTimeout(function(){
      feedback.classList.add('show');
    }, 10);

    setTimeout(function(){
      feedback.classList.remove('show');
      setTimeout(function(){
        feedback.remove();
      }, 300);
    }, 3000);
  }

  // Add voice button to input/textarea
  function addVoiceButton(input){
    if (!isSupported()) return;
    if (input.classList.contains('voice-enabled')) return;

    var wrapper = document.createElement('div');
    wrapper.className = 'voice-input-wrapper';
    
    var button = createVoiceButton();
    
    // Wrap input
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    wrapper.appendChild(button);
    
    input.classList.add('voice-enabled');

    // Button click handler
    button.addEventListener('click', function(e){
      e.preventDefault();
      e.stopPropagation();
      
      if (isListening){
        stopListening();
      } else {
        startListening(input, button);
      }
    });
  }

  // Process voice commands for special actions
  function processCommand(text, input){
    var lower = text.toLowerCase().trim();
    
    // Clear/delete commands
    if (lower === 'clear' || lower === 'delete all' || lower === 'erase'){
      input.value = '';
      showFeedback('Cleared', 'success');
      return true;
    }
    
    // Submit/save commands
    if (lower === 'save' || lower === 'submit' || lower === 'done'){
      var form = input.closest('form');
      if (form){
        var submitBtn = form.querySelector('button[type="submit"], .btn-primary');
        if (submitBtn){
          submitBtn.click();
          showFeedback('Submitted', 'success');
          return true;
        }
      }
    }
    
    // Cancel command
    if (lower === 'cancel' || lower === 'nevermind'){
      input.value = '';
      showFeedback('Cancelled', 'info');
      return true;
    }
    
    return false;
  }

  // Initialize voice input for all text inputs and textareas
  function initVoiceInputs(){
    if (!isSupported()){
      console.log('Speech recognition not supported in this browser');
      return;
    }

    recognition = initRecognition();
    if (!recognition) return;

    // Handle recognition results
    recognition.onresult = function(event){
      var transcript = event.results[0][0].transcript;
      
      if (currentInput){
        // Check for commands first
        if (!processCommand(transcript, currentInput)){
          // Append text to input
          if (currentInput.value && !currentInput.value.endsWith(' ')){
            currentInput.value += ' ';
          }
          currentInput.value += transcript;
          
          // Trigger input event for form validation
          var inputEvent = new Event('input', { bubbles: true });
          currentInput.dispatchEvent(inputEvent);
          
          showFeedback('Added: "' + transcript + '"', 'success');
        }
      }
    };

    recognition.onerror = function(event){
      console.error('Speech recognition error:', event.error);
      
      var message = 'Voice input error';
      if (event.error === 'no-speech'){
        message = 'No speech detected. Please try again.';
      } else if (event.error === 'audio-capture'){
        message = 'Microphone not found. Please check your device.';
      } else if (event.error === 'not-allowed'){
        message = 'Microphone permission denied. Please allow microphone access.';
      }
      
      showFeedback(message, 'error');
      resetButton();
    };

    recognition.onend = function(){
      resetButton();
    };

    // Add voice buttons to all text inputs and textareas
    var inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="search"], input:not([type]), textarea');
    
    inputs.forEach(function(input){
      // Skip password fields and hidden inputs
      if (input.type === 'password' || input.type === 'hidden') return;
      if (input.readOnly || input.disabled) return;
      
      addVoiceButton(input);
    });
  }

  // Add voice button to dynamically created inputs
  function observeNewInputs(){
    if (!isSupported()) return;

    var observer = new MutationObserver(function(mutations){
      mutations.forEach(function(mutation){
        mutation.addedNodes.forEach(function(node){
          if (node.nodeType === 1){ // Element node
            if (node.matches && (node.matches('input[type="text"], input:not([type]), textarea'))){
              if (node.type !== 'password' && !node.readOnly && !node.disabled){
                addVoiceButton(node);
              }
            }
            
            var inputs = node.querySelectorAll && node.querySelectorAll('input[type="text"], input:not([type]), textarea');
            if (inputs){
              inputs.forEach(function(input){
                if (input.type !== 'password' && !input.readOnly && !input.disabled){
                  addVoiceButton(input);
                }
              });
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Add keyboard shortcut (Ctrl+Shift+V or Cmd+Shift+V)
  function addKeyboardShortcut(){
    document.addEventListener('keydown', function(e){
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V'){
        e.preventDefault();
        
        var activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')){
          var wrapper = activeElement.closest('.voice-input-wrapper');
          if (wrapper){
            var voiceBtn = wrapper.querySelector('.voice-btn');
            if (voiceBtn) voiceBtn.click();
          }
        } else {
          showFeedback('Click on a text field first, then press Ctrl+Shift+V', 'info');
        }
      }
    });
  }

  // Show help tip on first load
  function showHelpTip(){
    var hasSeenTip = localStorage.getItem('voice_input_tip_seen');
    if (hasSeenTip) return;

    setTimeout(function(){
      showFeedback('💡 Tip: Click the 🎤 button next to any text field to use voice input', 'info');
      localStorage.setItem('voice_input_tip_seen', 'true');
    }, 2000);
  }

  // Initialize
  function init(){
    if (!isSupported()){
      console.log('Voice input not available on this browser/device');
      return;
    }

    initVoiceInputs();
    observeNewInputs();
    addKeyboardShortcut();
    showHelpTip();
  }

  // Expose API
  window.VoiceInput = {
    isSupported: isSupported,
    addToInput: addVoiceButton
  };

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
