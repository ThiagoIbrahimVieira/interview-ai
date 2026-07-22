async function renderProfilePage() {
  const app = document.getElementById('app');
  const user = store.get('user');

  app.innerHTML = `
    <div class="app-layout">
      <aside class="sidebar" id="sidebar"></aside>
      <div class="main-content">
        <header class="header" id="header"></header>
        <div class="page">
          <div class="page-header">
            <h1 class="page-title">Profile</h1>
            <p class="page-subtitle">Manage your account settings</p>
          </div>
          <div style="display:grid;gap:var(--space-6);max-width:640px;">
            <div class="card">
              <h3 style="margin-bottom:var(--space-5);">Account Information</h3>
              <form id="profile-form">
                <div style="display:grid;gap:var(--space-4);">
                  <div class="input-group">
                    <label>Full Name</label>
                    <input type="text" class="input" id="profile-name" value="${user?.full_name || ''}" placeholder="Your name">
                  </div>
                  <div class="input-group">
                    <label>Email</label>
                    <input type="email" class="input" value="${user?.email || ''}" disabled style="opacity:0.6;">
                  </div>
                  <div class="input-group">
                    <label>Job Title</label>
                    <input type="text" class="input" id="profile-job" placeholder="e.g. Software Developer">
                  </div>
                  <div class="input-group">
                    <label>Country</label>
                    <input type="text" class="input" id="profile-country" placeholder="e.g. United States">
                  </div>
                  <div class="input-group">
                    <label>Experience Level</label>
                    <select class="input" id="profile-level">
                      <option value="">Select level</option>
                      <option value="Junior">Junior</option>
                      <option value="Mid-Level">Mid-Level</option>
                      <option value="Senior">Senior</option>
                      <option value="Specialist">Specialist</option>
                    </select>
                  </div>
                  <div class="input-group">
                    <label>Bio</label>
                    <textarea class="input" id="profile-bio" rows="3" placeholder="Tell us about yourself..."></textarea>
                  </div>
                </div>
                <div style="display:flex;justify-content:flex-end;margin-top:var(--space-5);">
                  <button type="submit" class="btn btn-primary" id="save-profile-btn">Save Changes</button>
                </div>
              </form>
            </div>

            <div class="card">
              <h3 style="margin-bottom:var(--space-5);">Change Password</h3>
              <form id="password-form">
                <div style="display:grid;gap:var(--space-4);">
                  <div class="input-group">
                    <label>Current Password</label>
                    <input type="password" class="input" id="current-password" placeholder="Enter current password">
                  </div>
                  <div class="input-group">
                    <label>New Password</label>
                    <input type="password" class="input" id="new-password" placeholder="Min 8 characters" minlength="8">
                  </div>
                </div>
                <div style="display:flex;justify-content:flex-end;margin-top:var(--space-5);">
                  <button type="submit" class="btn btn-secondary">Update Password</button>
                </div>
              </form>
            </div>

            <div class="card" style="border-color:var(--color-error-muted);">
              <h3 style="margin-bottom:var(--space-2);color:var(--color-error);">Danger Zone</h3>
              <p style="font-size:var(--text-sm);color:var(--color-text-secondary);margin-bottom:var(--space-4);">
                These actions are irreversible.
              </p>
              <div style="display:flex;gap:var(--space-3);">
                <button class="btn btn-ghost" onclick="localStorage.clear(); router.navigate('/login');" style="color:var(--color-error);">
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const sidebar = new Sidebar(document.getElementById('sidebar'));
  sidebar.render('profile');
  const header = new Header(document.getElementById('header'));
  header.render('Profile');

  try {
    const profile = await api.getProfile();
    store.set('profile', profile);
    document.getElementById('profile-job').value = profile.job_title || '';
    document.getElementById('profile-country').value = profile.country || '';
    document.getElementById('profile-level').value = profile.experience_level || '';
    document.getElementById('profile-bio').value = profile.bio || '';
  } catch {}

  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-profile-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      await api.updateProfile({
        full_name: document.getElementById('profile-name').value.trim(),
        job_title: document.getElementById('profile-job').value.trim() || null,
        country: document.getElementById('profile-country').value.trim() || null,
        experience_level: document.getElementById('profile-level').value || null,
        bio: document.getElementById('profile-bio').value.trim() || null,
      });

      const updatedUser = await api.getMe();
      store.set('user', updatedUser);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Changes';
    }
  });

  document.getElementById('password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPw = document.getElementById('current-password').value;
    const newPw = document.getElementById('new-password').value;

    if (newPw.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      await api.put('/auth/change-password', {
        current_password: currentPw,
        new_password: newPw,
      });
      toast.success('Password updated!');
      document.getElementById('current-password').value = '';
      document.getElementById('new-password').value = '';
    } catch (err) {
      toast.error(err.message || 'Failed to change password');
    }
  });
}

window.renderProfilePage = renderProfilePage;
