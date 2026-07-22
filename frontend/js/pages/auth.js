function renderLoginPage() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="auth-page">
      <div class="auth-card fade-in-up">
        <div class="auth-logo">
          <h1>InterviewAI</h1>
          <p>AI-powered interview training platform</p>
        </div>
        <form class="auth-form" id="login-form">
          <div class="input-group">
            <label for="email">Email</label>
            <input type="email" id="email" class="input" placeholder="you@example.com" required autocomplete="email">
          </div>
          <div class="input-group">
            <label for="password">Password</label>
            <input type="password" id="password" class="input" placeholder="Enter your password" required autocomplete="current-password">
          </div>
          <button type="submit" class="btn btn-primary btn-lg" id="login-btn" style="width:100%;">
            Sign In
          </button>
        </form>
        <div class="auth-footer">
          Don't have an account? <a href="#/register">Create one</a>
        </div>
      </div>
    </div>
  `;

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Signing in...';

    try {
      await api.login(email, password);
      const user = await api.getMe();
      store.set('user', user);
      toast.success('Welcome back!');
      router.navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Login failed');
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  });
}

function renderRegisterPage() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="auth-page">
      <div class="auth-card fade-in-up">
        <div class="auth-logo">
          <h1>InterviewAI</h1>
          <p>Create your account</p>
        </div>
        <form class="auth-form" id="register-form">
          <div class="input-group">
            <label for="full_name">Full Name</label>
            <input type="text" id="full_name" class="input" placeholder="John Doe" autocomplete="name">
          </div>
          <div class="input-group">
            <label for="email">Email</label>
            <input type="email" id="email" class="input" placeholder="you@example.com" required autocomplete="email">
          </div>
          <div class="input-group">
            <label for="password">Password</label>
            <input type="password" id="password" class="input" placeholder="Min 8 characters" required minlength="8" autocomplete="new-password">
          </div>
          <div class="input-group">
            <label for="confirm_password">Confirm Password</label>
            <input type="password" id="confirm_password" class="input" placeholder="Repeat password" required autocomplete="new-password">
          </div>
          <button type="submit" class="btn btn-primary btn-lg" id="register-btn" style="width:100%;">
            Create Account
          </button>
        </form>
        <div class="auth-footer">
          Already have an account? <a href="#/login">Sign in</a>
        </div>
      </div>
    </div>
  `;

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('register-btn');
    const fullName = document.getElementById('full_name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm_password').value;

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Creating account...';

    try {
      await api.register(email, password, fullName);
      await api.login(email, password);
      const user = await api.getMe();
      store.set('user', user);
      toast.success('Account created successfully!');
      router.navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
  });
}

window.renderLoginPage = renderLoginPage;
window.renderRegisterPage = renderRegisterPage;
