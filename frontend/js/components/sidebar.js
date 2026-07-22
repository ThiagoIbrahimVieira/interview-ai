class Sidebar {
  constructor(container) {
    this.container = container;
    this.isOpen = false;
  }

  render(currentPage) {
    const user = store.get('user');
    const initial = user?.full_name?.[0] || user?.email?.[0] || 'U';

    this.container.innerHTML = `
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-primary)" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polygon points="10 8 16 12 10 16 10 8" fill="var(--color-accent-primary)"/>
          </svg>
          InterviewAI
        </div>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-item ${currentPage === 'dashboard' ? 'active' : ''}" data-page="dashboard">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
          Dashboard
        </div>
        <div class="nav-item ${currentPage === 'new-interview' ? 'active' : ''}" data-page="new-interview">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          New Interview
        </div>
        <div class="nav-item ${currentPage === 'history' ? 'active' : ''}" data-page="history">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          History
        </div>
        <div class="nav-item ${currentPage === 'profile' ? 'active' : ''}" data-page="profile">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          Profile
        </div>
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-user" id="sidebar-user-menu">
          <div class="avatar">${initial.toUpperCase()}</div>
          <div style="flex:1; min-width:0;">
            <div style="font-size: var(--text-sm); font-weight: var(--weight-medium); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${user?.full_name || user?.email || 'User'}
            </div>
            <div style="font-size: var(--text-xs); color: var(--color-text-tertiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${user?.email || ''}
            </div>
          </div>
        </div>
      </div>
    `;

    this.container.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const page = item.dataset.page;
        router.navigate(`/${page}`);
      });
    });

    const userMenu = document.getElementById('sidebar-user-menu');
    if (userMenu) {
      userMenu.addEventListener('click', () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        router.navigate('/login');
      });
    }
  }
}

window.Sidebar = Sidebar;
