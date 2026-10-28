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
            // CORRECCIÓN 1: Se reemplaza fetch('https://localhost:7035...') por ApiService.post
            // ApiService ya maneja los headers y convierte la respuesta JSON
            const data = await ApiService.post('/Auth/login', {
                username: username,
                password: password
            });

            // Si ApiService.post no lanza un error, significa que success fue true
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', data.userName);
            localStorage.setItem('firstName', data.firstName);
            localStorage.setItem('lastName', data.lastName);
            localStorage.setItem('email', data.email);

            if (data.roles && data.roles.length > 0) {
                localStorage.setItem('rol', data.roles[0]);
            }
            
            window.location.href = '/modules/dashboard/dashboard.html';

        } catch (error) {
            console.error("Error al conectar con la API", error);
            Swal.fire({
                title: 'Error de acceso',
                text: error.message || 'Error al iniciar sesión',
                icon: 'warning',
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
        // CORRECCIÓN 2: Se reemplaza fetch por ApiService.get y getApiOrigin() para las imágenes
        const data = await ApiService.get('/BusinessProfile');
        
        if (data) {
            if (data.name) {
                const titleEl = document.querySelector('.brand-content h1');
                if (titleEl) titleEl.textContent = data.name;
            }
            if (data.logoUrl) {
                const imgEl = document.querySelector('.brand-logo-container img');
                // Se concatena con el origen de Azure en lugar de localhost
                if (imgEl) imgEl.src = `${ApiService.getApiOrigin()}${data.logoUrl}`;
            }
        }
    } catch (error) {
        console.log("No se pudo cargar el diseño de la empresa:", error);
    }
}