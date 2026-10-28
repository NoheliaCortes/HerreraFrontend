function generarDetallesFijos() {
    const fechaActual = new Date();
    const fechaFormateada = fechaActual.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const numeroVenta = 'VTA-' + fechaActual.getTime().toString().slice(-8) + '-' + 
                        Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    const tipoVenta = 'Detalle';
    const metodoPago = 'Contado';
    actualizarDetallesFijos(fechaFormateada, numeroVenta, tipoVenta, metodoPago);
}
function actualizarDetallesFijos(fecha, numeroVenta, tipoVenta, metodoPago) {
    const infoList = document.querySelector('.info-list');
    
    if (infoList) {
        const parrafos = infoList.querySelectorAll('p');
        
        parrafos.forEach(p => {
            const fuerte = p.querySelector('strong');
            if (fuerte) {
                const texto = fuerte.textContent.trim();
                
                if (texto === 'Venta:' && p.textContent.includes('[Detalle]')) {
                    p.innerHTML = `<strong>Venta:</strong> ${tipoVenta}`;
                }
                else if (texto === 'Nro Venta:') {
                    p.innerHTML = `<strong>Nro Venta:</strong> ${numeroVenta}`;
                }
                else if (texto === 'Fecha:') {
                    p.innerHTML = `<strong>Fecha:</strong> ${fecha}`;
                }
                else if (texto === 'Venta:' && p.textContent.includes('[Contado]')) {
                    p.innerHTML = `<strong>Venta:</strong> ${metodoPago}`;
                }
            }
        });
    }
}
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        generarDetallesFijos();
    }, 600);
});

window.regenerarDetallesVenta = function() {
    generarDetallesFijos();
    console.log('Detalles de venta actualizados');
};