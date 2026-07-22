async function renderDashboardPage() {
  const app = document.getElementById('app');
  const user = store.get('user');

  app.innerHTML = `
    <div class="app-layout">
      <aside class="sidebar" id="sidebar"></aside>
      <div class="main-content">
        <header class="header" id="header"></header>
        <div class="page">
          <div class="page-header">
            <h1 class="page-title">Dashboard</h1>
            <p class="page-subtitle">Welcome back, ${user?.full_name || 'there'}!</p>
          </div>
          <div class="dashboard-stats" id="stats-container">
            <div class="stat-card"><div class="skeleton" style="height:20px;width:60%;"></div><div class="skeleton" style="height:36px;width:40%;margin-top:8px;"></div></div>
            <div class="stat-card"><div class="skeleton" style="height:20px;width:60%;"></div><div class="skeleton" style="height:36px;width:40%;margin-top:8px;"></div></div>
            <div class="stat-card"><div class="skeleton" style="height:20px;width:60%;"></div><div class="skeleton" style="height:36px;width:40%;margin-top:8px;"></div></div>
            <div class="stat-card"><div class="skeleton" style="height:20px;width:60%;"></div><div class="skeleton" style="height:36px;width:40%;margin-top:8px;"></div></div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-5);">
            <h2 style="font-size:var(--text-xl);font-weight:var(--weight-semibold);">Recent Interviews</h2>
            <button class="btn btn-primary" onclick="router.navigate('/new-interview')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New Interview
            </button>
          </div>
          <div id="interviews-container">
            <div class="skeleton" style="height:120px;margin-bottom:var(--space-4);"></div>
            <div class="skeleton" style="height:120px;"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  const sidebar = new Sidebar(document.getElementById('sidebar'));
  sidebar.render('dashboard');
  const header = new Header(document.getElementById('header'));
  header.render('Dashboard');

  try {
    const [stats, interviewsData] = await Promise.all([
      api.getDashboardStats().catch(() => ({ total_interviews: 0, average_score: 0, streak: 0, improvement: 0 })),
      api.getInterviews(1, 5).catch(() => ({ sessions: [], total: 0 })),
    ]);

    const improvementVal = stats.improvement || 0;
    const improvementColor = improvementVal >= 0 ? 'var(--color-success)' : 'var(--color-error)';
    const improvementPrefix = improvementVal >= 0 ? '+' : '';

    document.getElementById('stats-container').innerHTML = `
      <div class="stat-card fade-in-up">
        <div class="stat-card-label">Total Interviews</div>
        <div class="stat-card-value">${stats.total_interviews || 0}</div>
      </div>
      <div class="stat-card fade-in-up" style="animation-delay:0.05s;">
        <div class="stat-card-label">Average Score</div>
        <div class="stat-card-value">${Math.round(stats.average_score || 0)}%</div>
      </div>
      <div class="stat-card fade-in-up" style="animation-delay:0.1s;">
        <div class="stat-card-label">Current Streak</div>
        <div class="stat-card-value">${stats.streak || 0} days</div>
      </div>
      <div class="stat-card fade-in-up" style="animation-delay:0.15s;">
        <div class="stat-card-label">Improvement</div>
        <div class="stat-card-value" style="color:${improvementColor};">${improvementPrefix}${Math.round(improvementVal)}%</div>
      </div>
    `;

    renderInterviewsList(interviewsData.sessions);
  } catch (err) {
    console.error(err);
  }
}

function renderInterviewsList(sessions) {
  const container = document.getElementById('interviews-container');
  if (!sessions || sessions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor"/>
          </svg>
        </div>
        <h3 class="empty-state-title">No interviews yet</h3>
        <p class="empty-state-text">Start your first interview to begin tracking your progress.</p>
        <button class="btn btn-primary" style="margin-top:var(--space-4);" onclick="router.navigate('/new-interview')">
          Start First Interview
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="interview-grid">
      ${sessions.map((s, i) => `
        <div class="interview-card fade-in-up" style="animation-delay:${i * 0.05}s;" onclick="router.navigate('/interview/${s.id}')">
          <div class="interview-card-header">
            <div class="interview-card-title">${utils.escapeHtml(s.config?.job_title || 'Interview')}</div>
            <span class="badge ${s.status === 'completed' ? 'badge-success' : 'badge-warning'}">${s.status}</span>
          </div>
          <div class="interview-card-meta">
            <span class="badge badge-info">${s.config?.interview_type || 'Mixed'}</span>
            <span class="badge badge-info">${s.config?.difficulty || 'Medium'}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:var(--space-3);">
            <span style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${utils.formatDate(s.created_at)}</span>
            <span class="interview-card-score" style="color:${(s.final_score||0) >= 70 ? 'var(--color-success)' : (s.final_score||0) >= 50 ? 'var(--color-warning)' : 'var(--color-error)'};">${utils.formatScore(s.final_score)}%</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

window.renderDashboardPage = renderDashboardPage;
