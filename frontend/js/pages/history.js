async function renderHistoryPage() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="app-layout">
      <aside class="sidebar" id="sidebar"></aside>
      <div class="main-content">
        <header class="header" id="header"></header>
        <div class="page">
          <div class="page-header">
            <h1 class="page-title">Interview History</h1>
            <p class="page-subtitle">Review your past interview sessions</p>
          </div>
          <div id="history-container">
            <div class="skeleton" style="height:120px;margin-bottom:var(--space-4);"></div>
            <div class="skeleton" style="height:120px;margin-bottom:var(--space-4);"></div>
            <div class="skeleton" style="height:120px;"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  const sidebar = new Sidebar(document.getElementById('sidebar'));
  sidebar.render('history');
  const header = new Header(document.getElementById('header'));
  header.render('History');

  try {
    const data = await api.getInterviews(1, 50);
    const container = document.getElementById('history-container');

    if (!data.sessions || data.sessions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <h3 class="empty-state-title">No interviews yet</h3>
          <p class="empty-state-text">Complete your first interview to see it here.</p>
          <button class="btn btn-primary" style="margin-top:var(--space-4);" onclick="router.navigate('/new-interview')">
            Start Interview
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="interview-grid">
        ${data.sessions.map((s, i) => `
          <div class="interview-card fade-in-up" style="animation-delay:${i * 0.03}s;" onclick="navigateToItem('${s.status}', ${s.id})">
            <div class="interview-card-header">
              <div class="interview-card-title">${escapeHtmlH(s.config?.job_title || 'Interview')}</div>
              <span class="badge ${s.status === 'completed' ? 'badge-success' : 'badge-warning'}">${s.status}</span>
            </div>
            <div class="interview-card-meta">
              <span class="badge badge-info">${s.config?.interview_type || 'Mixed'}</span>
              <span class="badge badge-info">${s.config?.difficulty || 'Medium'}</span>
              <span class="badge badge-info">${s.config?.experience_level || 'Mid-Level'}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:var(--space-3);">
              <span style="font-size:var(--text-xs);color:var(--color-text-tertiary);">
                ${formatDateH(s.created_at)} &middot; ${formatDurationH(s.duration_seconds)}
              </span>
              <span class="interview-card-score" style="color:${(s.final_score||0) >= 70 ? 'var(--color-success)' : (s.final_score||0) >= 50 ? 'var(--color-warning)' : 'var(--color-error)'};">${s.final_score != null ? Math.round(s.final_score) + '%' : '--'}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    console.error(err);
  }
}

function navigateToItem(status, id) {
  if (status === 'completed') {
    router.navigate(`/report/${id}`);
  } else {
    router.navigate(`/interview/${id}`);
  }
}

function escapeHtmlH(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDateH(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDurationH(s) {
  if (!s) return '0m';
  const m = Math.floor(s / 60);
  return `${m}m`;
}

window.renderHistoryPage = renderHistoryPage;
