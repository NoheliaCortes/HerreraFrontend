class TopBar {
  constructor() {
    this.container = document.getElementById('topbar-placeholder');
  }

  async load() {
    if (!this.container) return;

    try {
      const response = await fetch('/modules/shared/components/topbar/topbar.html');

      if (!response.ok) {
        throw new Error(`Error loading topbar: ${response.status}`);
      }

      const html = await response.text();
      this.container.innerHTML = html;

      if (window.lucide) lucide.createIcons();

      this.#setupEvents();
      this.#loadUserData(); 

    } catch (error) {
      console.error('Topbar error:', error);
      this.container.innerHTML = `<p style="color:red; padding:1rem;">Error al cargar el menú</p>`;
    }
  }

  #loadUserData() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const decoded = JSON.parse(jsonPayload);
      console.log("Token JWT decodificado:", decoded);

      const role = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] 
                || decoded.role || decoded.Role || decoded.RoleName || 'Usuario';
      let username = "Usuario";
      
      const possibleKeys = [
          'FullName', 
          'FirstName', 'UserName', 'unique_name', 'name', 'email',
          'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
          'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'
      ];

      for (let key of possibleKeys) {
          let value = decoded[key];
          if (value && isNaN(value)) {
              username = value;
              break; 
          }
      }

    
      if (username.includes('@')) {
          username = username.split('@')[0];
      }

    
      const initials = username.substring(0, 2).toUpperCase();

    
      const topbarAvatar = this.container.querySelector('#topbar-avatar');
      const topbarName = this.container.querySelector('#topbar-name');
      const topbarRole = this.container.querySelector('#topbar-role');

      if (topbarAvatar) topbarAvatar.textContent = initials;
      if (topbarName) topbarName.textContent = username;
      if (topbarRole) topbarRole.textContent = role;

   
      const offcanvasAvatar = this.container.querySelector('#offcanvas-avatar');
      const offcanvasName = this.container.querySelector('#offcanvas-name');
      const offcanvasRole = this.container.querySelector('#offcanvas-role');

      if (offcanvasAvatar) offcanvasAvatar.textContent = initials;
      if (offcanvasName) offcanvasName.textContent = username;
      if (offcanvasRole) offcanvasRole.textContent = role;

    } catch (e) {
      console.error("Error al leer el token JWT:", e);
    }
  }

  #setupEvents() {
    this.#setupSearch();
    this.#setupOffcanvas();
    this.#setupThemeToggle();
    this.#setupLogout();
    this.#setupNotifications();
  }

  #setupSearch() {
    const wrapper  = this.container.querySelector('.topbar-search');
    const input    = this.container.querySelector('.search-input');
    const trigger  = this.container.querySelector('.search-trigger');

    if (!trigger || !input || !wrapper) return;

    trigger.addEventListener('click', () => {
      wrapper.classList.toggle('active');
      if (wrapper.classList.contains('active')) input.focus();
    });

    input.addEventListener('blur', () => {
      if (input.value.trim() === '') wrapper.classList.remove('active');
    });
  }

  #setupOffcanvas() {
    const btnOpen  = this.container.querySelector('#btn-open-profile');
    const btnClose = this.container.querySelector('#btn-close-profile');
    const panel    = this.container.querySelector('#profile-offcanvas');
    const overlay  = this.container.querySelector('#profile-overlay');

    if (!btnOpen || !panel || !overlay) return;

    const close = () => {
      panel.classList.remove('active');
      overlay.classList.remove('active');
    };

    btnOpen.addEventListener('click', () => {
      panel.classList.add('active');
      overlay.classList.add('active');
    });

    if (btnClose) btnClose.addEventListener('click', close);
    overlay.addEventListener('click', close);
  }

  #setupThemeToggle() {
    const btn    = this.container.querySelector('#btn-toggle-theme');
    const toggle = this.container.querySelector('#theme-switch');

    if (!btn || !toggle) return;

    btn.addEventListener('click', () => {
      toggle.classList.toggle('active');
    });
  }

  #setupLogout() {
    const btn = this.container.querySelector('.btn-logout-panel');
    if (!btn) return;

    btn.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('isLoggedIn');
      window.location.href = '/modules/login/login.html';
    });
  }

  #setupNotifications() {
    const btnBell   = this.container.querySelector('#btn-notifications');
    const dropdown  = this.container.querySelector('#notif-dropdown');
    const btnMarkAll = this.container.querySelector('#btn-mark-all');
    const badge     = this.container.querySelector('#notif-badge');

    if (!btnBell || !dropdown) return;

    btnBell.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('active');
    });

    if (btnMarkAll) {
      btnMarkAll.addEventListener('click', () => {
        this.container.querySelectorAll('.notif-item.unread')
          .forEach(item => item.classList.remove('unread'));

        this.container.querySelectorAll('.notif-dot')
          .forEach(dot => dot.remove());

        if (badge) {
          badge.textContent = '0';
          badge.style.display = 'none';
        }
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const topbar = new TopBar();
  await topbar.load();
});