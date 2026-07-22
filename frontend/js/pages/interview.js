let interviewState = {
  sessionId: null,
  isRecording: false,
  mediaRecorder: null,
  audioChunks: [],
  recognition: null,
  aiSpeaking: false,
  messages: [],
};

function renderInterviewPage(params) {
  const sessionId = parseInt(params.id);
  interviewState.sessionId = sessionId;
  interviewState.messages = [];

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="interview-page">
      <header class="header" id="interview-header" style="border-bottom:1px solid var(--color-border-primary);">
        <div style="display:flex;align-items:center;gap:var(--space-3);">
          <button class="btn btn-ghost btn-icon" onclick="exitInterview()" title="Exit interview">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>
          <span class="header-title">Interview Session</span>
          <span class="badge badge-success" id="session-status">Active</span>
        </div>
        <div class="header-actions">
          <span style="font-size:var(--text-sm);color:var(--color-text-secondary);" id="interview-timer">00:00</span>
          <button class="btn btn-danger btn-sm" id="end-interview-btn" onclick="endInterviewSession()">End Interview</button>
        </div>
      </header>
      <div class="interview-container">
        <div class="interview-messages" id="messages-container">
          <div class="message fade-in-up">
            <div class="message-avatar ai" style="width:36px;height:36px;border-radius:var(--radius-full);display:flex;align-items:center;justify-content:center;color:white;font-size:var(--text-sm);font-weight:600;flex-shrink:0;">AI</div>
            <div class="message-body">
              <div class="message-role" style="color:var(--color-accent-primary);">AI Interviewer</div>
              <div class="message-content">Welcome to your interview session! I'll be your interviewer today. Let's begin. Could you start by telling me about yourself and your experience?</div>
            </div>
          </div>
        </div>
        <div class="interview-input-area">
          <div class="interview-input-wrapper">
            <button class="voice-btn idle" id="voice-btn" onclick="toggleVoice()" title="Toggle microphone">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                <path d="M19 10v2a7 7 0 01-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
            <textarea class="interview-input" id="message-input" placeholder="Type your answer or press the mic to speak..." rows="1"></textarea>
            <button class="btn btn-primary btn-icon" id="send-btn" onclick="sendMessage()" title="Send message">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  startInterviewTimer();
  initSpeechRecognition();
  loadExistingMessages(sessionId);

  const input = document.getElementById('message-input');
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 150) + 'px';
  });
}

let interviewTimerInterval = null;

function startInterviewTimer() {
  let seconds = 0;
  const timerEl = document.getElementById('interview-timer');
  interviewTimerInterval = setInterval(() => {
    seconds++;
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    if (timerEl) timerEl.textContent = `${m}:${s}`;
  }, 1000);
}

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  interviewState.recognition = new SpeechRecognition();
  interviewState.recognition.continuous = true;
  interviewState.recognition.interimResults = true;
  interviewState.recognition.lang = 'en-US';

  interviewState.recognition.onresult = (event) => {
    const input = document.getElementById('message-input');
    let finalTranscript = '';
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    if (finalTranscript) {
      input.value = (input.value + ' ' + finalTranscript).trim();
    } else if (interimTranscript) {
      input.placeholder = 'Hearing: ' + interimTranscript;
    }
  };

  interviewState.recognition.onerror = (event) => {
    if (event.error !== 'no-speech') {
      console.warn('Speech recognition error:', event.error);
    }
  };

  interviewState.recognition.onend = () => {
    if (interviewState.isRecording) {
      try { interviewState.recognition.start(); } catch {}
    }
  };
}

function toggleVoice() {
  const btn = document.getElementById('voice-btn');

  if (interviewState.isRecording) {
    interviewState.isRecording = false;
    if (interviewState.recognition) {
      try { interviewState.recognition.stop(); } catch {}
    }
    btn.className = 'voice-btn idle';
    const input = document.getElementById('message-input');
    if (input) input.placeholder = 'Type your answer or press the mic to speak...';
  } else {
    interviewState.isRecording = true;
    if (interviewState.recognition) {
      try { interviewState.recognition.start(); } catch {}
    }
    btn.className = 'voice-btn recording';
  }
}

async function loadExistingMessages(sessionId) {
  try {
    const messages = await api.getMessages(sessionId);
    if (messages && messages.length > 0) {
      const container = document.getElementById('messages-container');
      messages.forEach(msg => appendMessage(msg.role, msg.content, false));
      scrollToBottom();
    }
  } catch {}
}

async function sendMessage() {
  const input = document.getElementById('message-input');
  const content = input.value.trim();
  if (!content) return;

  input.value = '';
  input.style.height = 'auto';

  appendMessage('user', content);
  scrollToBottom();

  showTypingIndicator();

  try {
    await api.sendMessage(interviewState.sessionId, content);

    const aiResponse = await generateAIResponse(content);
    removeTypingIndicator();
    appendMessage('assistant', aiResponse);
    scrollToBottom();

    await api.sendMessage(interviewState.sessionId, aiResponse);
  } catch (err) {
    removeTypingIndicator();
    appendMessage('assistant', 'I apologize, there was an issue. Could you please repeat your answer?');
    scrollToBottom();
  }
}

async function generateAIResponse(userMessage) {
  try {
    if (typeof puter !== 'undefined' && puter.ai) {
      const history = interviewState.messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }));

      const systemPrompt = buildSystemPrompt();
      const response = await puter.ai.chat([
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: userMessage },
      ]);

      const text = typeof response === 'string' ? response : response?.message?.content || response?.toString() || '';
      interviewState.messages.push({ role: 'user', content: userMessage });
      interviewState.messages.push({ role: 'assistant', content: text });
      return text;
    }
  } catch (err) {
    console.warn('Puter.js failed, using fallback:', err);
  }

  const fallback = getFallbackResponse(userMessage);
  interviewState.messages.push({ role: 'user', content: userMessage });
  interviewState.messages.push({ role: 'assistant', content: fallback });
  return fallback;
}

function buildSystemPrompt() {
  const session = store.get('currentSession');
  const config = session?.config || {};

  return `You are a professional AI interviewer conducting a ${config.interview_type || 'Mixed'} interview for a ${config.experience_level || 'Mid-Level'} ${config.job_title || 'Software Developer'} position.

Company style: ${config.company_style || 'Big Tech'}
Difficulty: ${config.difficulty || 'Medium'}
Language: ${config.language || 'English'}
${config.country ? `Country: ${config.country}` : ''}
${config.custom_instructions ? `Special instructions: ${config.custom_instructions}` : ''}

Rules:
- Ask one question at a time
- Be professional but friendly
- Ask follow-up questions based on answers
- Evaluate technical knowledge, communication skills, and problem-solving ability
- Do not repeat questions
- Keep questions relevant to the role and experience level
- After 10-15 questions, transition to wrapping up
- Be natural and conversational, like a real interview`;
}

function getFallbackResponse(userMessage) {
  const lower = userMessage.toLowerCase();
  const questionCount = interviewState.messages.filter(m => m.role === 'assistant').length;

  if (questionCount >= 12) {
    interviewState.messages._end = true;
    return "Thank you for your time today. You've given thoughtful responses. I'll now compile your evaluation report. Is there anything else you'd like to add before we conclude?";
  }

  if (lower.includes('experience') || lower.includes('background')) {
    return "Thank you for sharing that. Can you describe a challenging project you worked on recently and how you handled it?";
  }

  if (lower.includes('project') || lower.includes('challenge')) {
    return "Interesting approach. How did you collaborate with your team during that project? What was your specific role?";
  }

  if (lower.includes('team') || lower.includes('collaborate')) {
    return "Team collaboration is important. How do you handle disagreements with team members about technical decisions?";
  }

  if (lower.includes('disagree') || lower.includes('conflict')) {
    return "Good answer. Let's switch to technical questions. Can you explain the difference between REST and GraphQL APIs?";
  }

  if (lower.includes('rest') || lower.includes('graphql') || lower.includes('api')) {
    return "Solid explanation. How would you design a system that needs to handle millions of requests per day?";
  }

  if (lower.includes('system') || lower.includes('design') || lower.includes('scale')) {
    return "Good thinking about scalability. What databases would you choose for different use cases, and why?";
  }

  if (lower.includes('database') || lower.includes('sql') || lower.includes('nosql')) {
    return "Well explained. Now tell me about a time you had to debug a difficult production issue. What was your approach?";
  }

  if (lower.includes('debug') || lower.includes('bug') || lower.includes('production')) {
    return "Debugging skills are crucial. How do you ensure the quality of your code before deploying to production?";
  }

  if (lower.includes('test') || lower.includes('quality') || lower.includes('deploy')) {
    return "Great practices. Finally, where do you see yourself in five years, and what are you doing to reach those goals?";
  }

  if (lower.includes('goal') || lower.includes('future') || lower.includes('year')) {
    interviewState.messages._end = true;
    return "Thank you for sharing your vision. That concludes our interview. I've evaluated your responses and will prepare a detailed report. Great job today!";
  }

  return "That's a great point. Can you elaborate more on your approach? What specific tools or methodologies did you use?";
}

function appendMessage(role, content, animate = true) {
  const container = document.getElementById('messages-container');
  const isAI = role === 'assistant';
  const initial = isAI ? 'AI' : 'U';

  const div = document.createElement('div');
  div.className = `message ${animate ? 'fade-in-up' : ''}`;
  div.innerHTML = `
    <div class="message-avatar ${isAI ? 'ai' : 'user'}" style="width:36px;height:36px;border-radius:var(--radius-full);display:flex;align-items:center;justify-content:center;color:${isAI ? 'white' : 'var(--color-text-secondary)'};font-size:var(--text-sm);font-weight:600;flex-shrink:0;background:${isAI ? 'linear-gradient(135deg, var(--color-accent-primary), #a855f7)' : 'var(--color-bg-tertiary)'};">${initial}</div>
    <div class="message-body">
      <div class="message-role" style="color:${isAI ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)'};">${isAI ? 'AI Interviewer' : 'You'}</div>
      <div class="message-content">${escapeHtmlSimple(content)}</div>
    </div>
  `;
  container.appendChild(div);
}

function escapeHtmlSimple(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showTypingIndicator() {
  const container = document.getElementById('messages-container');
  const div = document.createElement('div');
  div.id = 'typing-indicator';
  div.className = 'message fade-in';
  div.innerHTML = `
    <div class="message-avatar ai" style="width:36px;height:36px;border-radius:var(--radius-full);display:flex;align-items:center;justify-content:center;color:white;font-size:var(--text-sm);font-weight:600;flex-shrink:0;background:linear-gradient(135deg, var(--color-accent-primary), #a855f7);">AI</div>
    <div class="message-body">
      <div class="message-role" style="color:var(--color-accent-primary);">AI Interviewer</div>
      <div class="typing-indicator"><span></span><span></span><span></span></div>
    </div>
  `;
  container.appendChild(div);
  scrollToBottom();
}

function removeTypingIndicator() {
  document.getElementById('typing-indicator')?.remove();
}

function scrollToBottom() {
  const container = document.getElementById('messages-container');
  if (container) {
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }
}

function exitInterview() {
  if (interviewTimerInterval) clearInterval(interviewTimerInterval);
  if (interviewState.recognition) {
    try { interviewState.recognition.stop(); } catch {}
  }
  interviewState.isRecording = false;
  router.navigate('/dashboard');
}

async function endInterviewSession() {
  if (interviewTimerInterval) clearInterval(interviewTimerInterval);
  if (interviewState.recognition) {
    try { interviewState.recognition.stop(); } catch {}
  }

  try {
    await api.endInterview(interviewState.sessionId);
    toast.success('Interview completed!');
    router.navigate(`/report/${interviewState.sessionId}`);
  } catch (err) {
    toast.error('Failed to end interview');
    router.navigate('/dashboard');
  }
}

window.renderInterviewPage = renderInterviewPage;
window.toggleVoice = toggleVoice;
window.sendMessage = sendMessage;
window.exitInterview = exitInterview;
window.endInterviewSession = endInterviewSession;
