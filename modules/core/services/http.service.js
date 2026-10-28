import { CONFIG } from "../config/app.config.js";

// Función para obtener los encabezados de seguridad automáticamente
function getHeaders() {
    const token = localStorage.getItem("token"); // O donde sea que guardes tu token al hacer login
    const headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    };
    
    // Si hay token, lo mandamos con la palabra Bearer
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
}

export async function get(url) {
    const response = await fetch(`${CONFIG.API_URL}${url}`, {
        method: 'GET',
        headers: getHeaders()
    });

    if (response.status === 401) {
        // Si el token expiró o es inválido, lo mandamos al login de una
        localStorage.removeItem("isLoggedIn");
        window.location.href = "/modules/login/login.html";
        throw new Error("Sesión expirada o no autorizada");
    }

    if (!response.ok) throw new Error("Error al consumir API");
    return await response.json();
}

export async function post(url, data) {
    const response = await fetch(`${CONFIG.API_URL}${url}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
    });

    if (response.status === 401) {
        localStorage.removeItem("isLoggedIn");
        window.location.href = "/modules/login/login.html";
        throw new Error("Sesión expirada o no autorizada");
    }

    if (!response.ok) throw new Error("Error al consumir API");
    return await response.json();
}