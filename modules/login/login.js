class LoginForm {
    constructor() {
        this.passwordInput = document.getElementById('password');
        this.toggleBtn = document.querySelector('.toggle-password');
        this.form = document.getElementById('login-form');
    }

    init() {
        if (window.lucide) lucide.createIcons();
        this.toggleBtn.addEventListener('click', () => this.#togglePassword());
        
        this.form.addEventListener('submit', (e) => this.#handleLogin(e));
    }

    #togglePassword() {
        const isHidden = this.passwordInput.type === 'password';

        this.passwordInput.type = isHidden ? 'text' : 'password';
        this.toggleBtn.innerHTML = isHidden
            ? '<i data-lucide="eye-off"></i>'
            : '<i data-lucide="eye"></i>';

        if (window.lucide) lucide.createIcons();
    }

    async #handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('https://localhost:7035/api/Auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('token', result.data.token);
                localStorage.setItem('username', result.data.userName);
                localStorage.setItem('firstName', result.data.firstName);
                localStorage.setItem('lastName', result.data.lastName);
                localStorage.setItem('email', result.data.email);

                if (result.data.roles && result.data.roles.length > 0) {
                    localStorage.setItem('rol', result.data.roles[0]);
                }
                
                window.location.href = '/modules/dashboard/dashboard.html';
            }
            else {
                Swal.fire({
                    title: 'Acceso Denegado',
                    text: result.message || result.errorMessage || 'Error al iniciar sesión',
                    icon: 'warning',
                    confirmButtonColor: '#10b981'
                });
            }
        }
        catch (error) {
            console.error("Error al conectar con la API", error);
            Swal.fire({
                title: 'Error de conexión',
                text: 'No se puede conectar con el servidor, verifica que la API se esté ejecutando',
                icon: 'error',
                confirmButtonColor: '#10b981'
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = new LoginForm();
    loginForm.init();
    
    loadBusinessBranding();
});


async function loadBusinessBranding() {
    try {
        const response = await fetch('https://localhost:7035/api/BusinessProfile');
        if (response.ok) {
            const data = await response.json();
            
            // CORRECCIÓN: Clases exactas de tu login.html
            if (data.name) {
                const titleEl = document.querySelector('.brand-content h1');
                if (titleEl) titleEl.textContent = data.name;
            }
            if (data.logoUrl) {
                const imgEl = document.querySelector('.brand-logo-container img');
                if (imgEl) imgEl.src = `https://localhost:7035${data.logoUrl}`;
            }
        }
    } catch (error) {
        console.log("No se pudo cargar el diseño de la empresa:", error);
    }
}