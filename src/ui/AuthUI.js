class AuthUI {
    constructor() {
        this.setupUI();
    }

    setupUI() {
        const container = document.createElement('div');
        container.id = 'auth-screen';
        container.className = 'fullscreen-menu';
        container.innerHTML = `
            <div class="auth-container">
                <div class="auth-tabs">
                    <button class="tab active" data-tab="login">Login</button>
                    <button class="tab" data-tab="register">Register</button>
                </div>

                <div class="auth-forms">
                    <form id="login-form" class="active">
                        <h2>Login</h2>
                        <input type="email" placeholder="Email" required>
                        <input type="password" placeholder="Password" required>
                        <button type="submit">Login</button>
                    </form>

                    <form id="register-form">
                        <h2>Register</h2>
                        <input type="text" placeholder="Username" required>
                        <input type="email" placeholder="Email" required>
                        <input type="password" placeholder="Password" required>
                        <input type="password" placeholder="Confirm Password" required>
                        <button type="submit">Register</button>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(container);
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.auth-tabs .tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Login form
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const email = form.querySelector('input[type="email"]').value;
            const password = form.querySelector('input[type="password"]').value;

            try {
                await FirebaseAuth.loginUser(email, password);
                this.hide();
                game.start();
            } catch (error) {
                this.showError(error.message);
            }
        });

        // Register form
        document.getElementById('register-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const username = form.querySelector('input[type="text"]').value;
            const email = form.querySelector('input[type="email"]').value;
            const password = form.querySelector('input[type="password"]').value;
            const confirmPassword = form.querySelectorAll('input[type="password"]')[1].value;

            if (password !== confirmPassword) {
                this.showError('Passwords do not match');
                return;
            }

            try {
                await FirebaseAuth.registerUser(username, email, password);
                this.hide();
                game.start();
            } catch (error) {
                this.showError(error.message);
            }
        });
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.auth-tabs .tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update forms
        document.querySelectorAll('.auth-forms form').forEach(form => {
            form.classList.toggle('active', form.id === `${tabName}-form`);
        });
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'auth-error';
        errorDiv.textContent = message;
        
        const container = document.querySelector('.auth-container');
        container.insertBefore(errorDiv, container.querySelector('.auth-forms'));
        
        setTimeout(() => errorDiv.remove(), 3000);
    }

    show() {
        document.getElementById('auth-screen').classList.remove('hidden');
    }

    hide() {
        document.getElementById('auth-screen').classList.add('hidden');
    }
} 