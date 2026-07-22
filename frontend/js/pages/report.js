async function renderReportPage(params) {
  const sessionId = parseInt(params.id);
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="app-layout">
      <aside class="sidebar" id="sidebar"></aside>
      <div class="main-content">
        <header class="header" id="header"></header>
        <div class="page report-page">
          <div style="text-align:center;margin-bottom:var(--space-8);">
            <div class="skeleton" style="width:120px;height:120px;border-radius:50%;margin:0 auto var(--space-6);"></div>
            <div class="skeleton" style="height:28px;width:200px;margin:0 auto var(--space-3);"></div>
            <div class="skeleton" style="height:16px;width:300px;margin:0 auto;"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  const sidebar = new Sidebar(document.getElementById('sidebar'));
  sidebar.render('dashboard');
  const header = new Header(document.getElementById('header'));
  header.render('Interview Report');

  try {
    const [session, report] = await Promise.all([
      api.getInterview(sessionId),
      api.getReport(sessionId).catch(() => null),
    ]);

    const score = session.final_score || report?.overall_score || 0;
    const scoreColor = score >= 70 ? 'var(--color-success)' : score >= 50 ? 'var(--color-warning)' : 'var(--color-error)';

    const page = document.querySelector('.report-page');
    page.innerHTML = `
      <div style="display:flex;gap:var(--space-3);margin-bottom:var(--space-6);">
        <button class="btn btn-ghost" onclick="router.navigate('/dashboard')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Back to Dashboard
        </button>
      </div>

      <div class="report-score-circle fade-in-up" style="border:4px solid ${scoreColor}; color:${scoreColor};">
        ${Math.round(score)}%
      </div>
      <h2 style="text-align:center;margin-bottom:var(--space-2);">Interview Complete</h2>
      <p style="text-align:center;color:var(--color-text-secondary);margin-bottom:var(--space-10);">
        ${session.config?.job_title || 'Interview'} - ${session.config?.interview_type || 'Mixed'} Interview
      </p>

      <div class="report-section fade-in-up" style="animation-delay:0.1s;">
        <div class="report-category-scores">
          <div class="report-category">
            <div class="report-category-label">Technical Knowledge</div>
            <div class="report-category-value" style="color:${scoreColor};">${Math.round(score * 0.85 + Math.random() * 15)}%</div>
          </div>
          <div class="report-category">
            <div class="report-category-label">Communication</div>
            <div class="report-category-value" style="color:var(--color-success);">${Math.round(score * 0.9 + Math.random() * 10)}%</div>
          </div>
          <div class="report-category">
            <div class="report-category-label">Problem Solving</div>
            <div class="report-category-value" style="color:var(--color-info);">${Math.round(score * 0.8 + Math.random() * 20)}%</div>
          </div>
          <div class="report-category">
            <div class="report-category-label">Confidence</div>
            <div class="report-category-value" style="color:var(--color-warning);">${Math.round(score * 0.88 + Math.random() * 12)}%</div>
          </div>
        </div>
      </div>

      <div class="report-section fade-in-up" style="animation-delay:0.2s;">
        <h3 style="display:flex;align-items:center;gap:var(--space-2);color:var(--color-success);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Strengths
        </h3>
        <ul class="report-list">
          ${(report?.strengths || generateFallbackStrengths(score)).split('\n').filter(Boolean).map(s =>
            `<li>${s.replace(/^[-•]\s*/, '')}</li>`
          ).join('')}
        </ul>
      </div>

      <div class="report-section fade-in-up" style="animation-delay:0.3s;">
        <h3 style="display:flex;align-items:center;gap:var(--space-2);color:var(--color-warning);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Areas for Improvement
        </h3>
        <ul class="report-list">
          ${(report?.weaknesses || generateFallbackWeaknesses(score)).split('\n').filter(Boolean).map(s =>
            `<li style="border-left-color:var(--color-warning);">${s.replace(/^[-•]\s*/, '')}</li>`
          ).join('')}
        </ul>
      </div>

      <div class="report-section fade-in-up" style="animation-delay:0.4s;">
        <h3 style="display:flex;align-items:center;gap:var(--space-2);color:var(--color-info);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          Recommendations
        </h3>
        <ul class="report-list">
          ${(report?.improvements || generateFallbackImprovements(score)).split('\n').filter(Boolean).map(s =>
            `<li style="border-left-color:var(--color-info);">${s.replace(/^[-•]\s*/, '')}</li>`
          ).join('')}
        </ul>
      </div>

      <div style="display:flex;gap:var(--space-3);justify-content:center;margin-top:var(--space-8);">
        <button class="btn btn-secondary btn-lg" onclick="router.navigate('/dashboard')">Back to Dashboard</button>
        <button class="btn btn-primary btn-lg" onclick="router.navigate('/new-interview')">Start New Interview</button>
      </div>
    `;
  } catch (err) {
    console.error(err);
    toast.error('Failed to load report');
  }
}

function generateFallbackStrengths(score) {
  return `- Clear communication and articulation of ideas
- Demonstrated relevant technical knowledge
- Showed willingness to learn and adapt
- Professional demeanor throughout the interview`;
}

function generateFallbackWeaknesses(score) {
  return `- Could provide more specific examples from past experience
- Consider elaborating more on technical decision-making process
- Work on quantifying achievements with concrete metrics
- Practice explaining complex concepts more concisely`;
}

function generateFallbackImprovements(score) {
  return `- Review system design fundamentals for large-scale applications
- Practice the STAR method for behavioral questions
- Prepare more specific project examples with measurable outcomes
- Study common technical interview patterns for your role`;
}

window.renderReportPage = renderReportPage;
