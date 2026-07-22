document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  async function initApp() {
    const token = localStorage.getItem('access_token');

    if (!token) {
      router.navigate('/login');
      return;
    }

    try {
      const user = await api.getMe();
      store.set('user', user);
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      router.navigate('/login');
      return;
    }
  }

  router
    .route('/login', () => renderLoginPage())
    .route('/register', () => renderRegisterPage())
    .route('/dashboard', async () => {
      await guardAuth();
      renderDashboardPage();
    })
    .route('/new-interview', () => {
      guardAuth();
      renderNewInterviewPage();
    })
    .route('/interview/:id', (params) => {
      guardAuth();
      renderInterviewPage(params);
    })
    .route('/report/:id', (params) => {
      guardAuth();
      renderReportPage(params);
    })
    .route('/history', () => {
      guardAuth();
      renderHistoryPage();
    })
    .route('/profile', () => {
      guardAuth();
      renderProfilePage();
    });

  initApp();
});

function guardAuth() {
  if (!localStorage.getItem('access_token')) {
    router.navigate('/login');
    return false;
  }
  return true;
}
