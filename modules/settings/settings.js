const tabMeta = {
  perfil: {
    title: "Mi Perfil",
    desc: "Visualiza tu información personal y nivel de acceso.",
  },
  negocio: {
    title: "Datos del Negocio",
    desc: "Configura la información legal de la sorbetería para documentos.",
  },
  sistema: {
    title: "Preferencias",
    desc: "Apariencia y notificaciones del sistema.",
  },
};

function showTab(id, el) {
  document.querySelectorAll(".settings-menu-item").forEach((b) => b.classList.remove("active"));
  el.classList.add("active");
  document.querySelectorAll(".tab-panel").forEach((p) => (p.style.display = "none"));
  document.getElementById("panel-" + id).style.display = "block";
  document.getElementById("tab-title").textContent = tabMeta[id].title;
  document.getElementById("tab-desc").textContent = tabMeta[id].desc;
  lucide.createIcons();
}

function setTheme(el) {
  document.querySelectorAll(".theme-card").forEach((c) => c.classList.remove("active"));
  el.classList.add("active");
}

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();

  const currentRole = localStorage.getItem('rol') || 'Vendedor'; 
  
  if (currentRole !== 'Administrador' && currentRole !== 'Admin') {
      const btnNegocio = document.getElementById('btn-tab-negocio');
      const labelAdmin = document.getElementById('label-admin');

      if (btnNegocio) btnNegocio.style.display = 'none';
      if (labelAdmin) labelAdmin.style.display = 'none';
  }

  document.getElementById('profile-username').value = localStorage.getItem('username') || '';
  document.getElementById('profile-role').value = currentRole;
  document.getElementById('profile-firstname').value = localStorage.getItem('firstName') || '';
  document.getElementById('profile-lastname').value = localStorage.getItem('lastName') || '';
  document.getElementById('profile-email').value = localStorage.getItem('email') || '';

  const hash = window.location.hash;
  if (hash) {
    const tabName = hash.replace('#', '');
    const tabButton = document.querySelector(`button[onclick*="'${tabName}'"]`);
    if (tabButton && tabButton.style.display !== 'none') {
        tabButton.click();
    }
  }
});

const avatarInput = document.getElementById('avatar-input');
const avatarImg = document.getElementById('avatar-img');

if (avatarInput && avatarImg) {
    avatarInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evento) => {
                avatarImg.src = evento.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
}


async function loadBusinessProfile() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('https://localhost:7035/api/BusinessProfile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            

            if (data.name) document.getElementById('business-name').value = data.name;
            if (data.ruc) document.getElementById('business-ruc').value = data.ruc;
            if (data.phone) document.getElementById('business-phone').value = data.phone;
            if (data.address) document.getElementById('business-address').value = data.address;
            if (data.email) document.getElementById('business-email').value = data.email;
            

            if (data.logoUrl) document.getElementById('avatar-img').src = `https://localhost:7035${data.logoUrl}`;
        }
    } catch (error) {
        console.error("No se pudo cargar el perfil del negocio:", error);
    }
}


const currentRole = localStorage.getItem('rol') || ''; 
if (currentRole === 'Administrador' || currentRole === 'Admin') {
    loadBusinessProfile();
}

const btnSaveBusiness = document.getElementById('btn-save-business');
if (btnSaveBusiness) {
    btnSaveBusiness.addEventListener('click', async () => {
        const token = localStorage.getItem('token');
        
        const formData = new FormData();
        formData.append('Name', document.getElementById('business-name').value);
        formData.append('Ruc', document.getElementById('business-ruc').value);
        formData.append('Phone', document.getElementById('business-phone').value);
        formData.append('Address', document.getElementById('business-address').value);
        formData.append('Email', document.getElementById('business-email').value);


        if (avatarInput.files.length > 0) {
            formData.append('Logo', avatarInput.files[0]);
        }

        try {
            const response = await fetch('https://localhost:7035/api/BusinessProfile', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const result = await response.json();
            if (response.ok && result.success) {
                Swal.fire({
                    title: '¡Guardado!',
                    text: 'Los datos de la sorbetería están actualizados.',
                    icon: 'success',
                    confirmButtonColor: '#10b981'
                });
                if (result.logoUrl) {
                    document.getElementById('avatar-img').src = `https://localhost:7035${result.logoUrl}`;
                }
            } else {
                Swal.fire('Error', 'No se pudo guardar la información', 'error');
            }
        } catch (error) {
            Swal.fire('Fallo de red', 'No hay conexión con la API', 'error');
        }
    });
}