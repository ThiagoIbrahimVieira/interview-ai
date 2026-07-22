function renderNewInterviewPage() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="app-layout">
      <aside class="sidebar" id="sidebar"></aside>
      <div class="main-content">
        <header class="header" id="header"></header>
        <div class="page">
          <div class="page-header">
            <h1 class="page-title">New Interview</h1>
            <p class="page-subtitle">Configure your interview session</p>
          </div>
          <div class="config-form card">
            <form id="config-form">
              <div class="config-grid">
                <div class="input-group">
                  <label for="job_title">Job Title</label>
                  <input type="text" id="job_title" class="input" placeholder="e.g. Software Developer" required>
                </div>
                <div class="input-group">
                  <label for="language">Language</label>
                  <select id="language" class="input">
                    <option value="English">English</option>
                    <option value="Spanish">Spanish</option>
                    <option value="Portuguese">Portuguese</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                    <option value="Japanese">Japanese</option>
                    <option value="Chinese">Chinese</option>
                  </select>
                </div>
                <div class="input-group">
                  <label for="country">Country</label>
                  <input type="text" id="country" class="input" placeholder="e.g. United States">
                </div>
                <div class="input-group">
                  <label for="experience_level">Experience Level</label>
                  <select id="experience_level" class="input">
                    <option value="Junior">Junior</option>
                    <option value="Mid-Level" selected>Mid-Level</option>
                    <option value="Senior">Senior</option>
                    <option value="Specialist">Specialist</option>
                  </select>
                </div>
                <div class="input-group">
                  <label for="interview_type">Interview Type</label>
                  <select id="interview_type" class="input">
                    <option value="Technical">Technical</option>
                    <option value="Behavioral">Behavioral</option>
                    <option value="HR">HR</option>
                    <option value="Mixed" selected>Mixed</option>
                  </select>
                </div>
                <div class="input-group">
                  <label for="company_style">Company Style</label>
                  <select id="company_style" class="input">
                    <option value="Startup">Startup</option>
                    <option value="Big Tech" selected>Big Tech</option>
                    <option value="Bank">Bank</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Government">Government</option>
                    <option value="Retail">Retail</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <div class="input-group">
                  <label for="difficulty">Difficulty</label>
                  <select id="difficulty" class="input">
                    <option value="Easy">Easy</option>
                    <option value="Medium" selected>Medium</option>
                    <option value="Hard">Hard</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>
                <div class="input-group">
                  <label for="duration_minutes">Duration (minutes)</label>
                  <input type="number" id="duration_minutes" class="input" value="30" min="5" max="120">
                </div>
                <div class="input-group full-width">
                  <label for="custom_instructions">Custom Instructions (optional)</label>
                  <textarea id="custom_instructions" class="input" rows="3" placeholder="Any specific instructions for the AI interviewer..."></textarea>
                </div>
              </div>
              <div style="display:flex;gap:var(--space-3);justify-content:flex-end;margin-top:var(--space-6);">
                <button type="button" class="btn btn-secondary" onclick="router.navigate('/dashboard')">Cancel</button>
                <button type="submit" class="btn btn-primary btn-lg" id="start-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/>
                  </svg>
                  Start Interview
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;

  const sidebar = new Sidebar(document.getElementById('sidebar'));
  sidebar.render('new-interview');
  const header = new Header(document.getElementById('header'));
  header.render('New Interview');

  document.getElementById('config-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('start-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Starting...';

    const config = {
      job_title: document.getElementById('job_title').value.trim(),
      language: document.getElementById('language').value,
      country: document.getElementById('country').value.trim() || null,
      experience_level: document.getElementById('experience_level').value,
      interview_type: document.getElementById('interview_type').value,
      company_style: document.getElementById('company_style').value,
      difficulty: document.getElementById('difficulty').value,
      duration_minutes: parseInt(document.getElementById('duration_minutes').value),
      custom_instructions: document.getElementById('custom_instructions').value.trim() || null,
    };

    try {
      const session = await api.startInterview(config);
      store.set('currentSession', session);
      router.navigate(`/interview/${session.id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to start interview');
      btn.disabled = false;
      btn.innerHTML = 'Start Interview';
    }
  });
}

window.renderNewInterviewPage = renderNewInterviewPage;
