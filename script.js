// Base de datos local simulada de reportes por zona
const reportesPorZona = {
    'Pabellón A - Aulas': [
        { titulo: 'Mochila negra', hora: 'Hace 30 min', detalle: 'Dejada en el aula 204' },
        { titulo: 'Lentes de medida', hora: 'Hace 2 horas', detalle: 'Cerca del escalonado' }
    ],
    'Biblioteca Central': [
        { titulo: 'Audífonos Bluetooth', hora: 'Hace 1 hora', detalle: 'Mesa de lectura del 2do piso' }
    ],
    'Cafetería / Comedor': [
        { titulo: 'Billetera de cuero', hora: 'Hace 10 min', detalle: 'Entregada en caja' }
    ],
    'Laboratorios de Cómputo': [
        { titulo: 'USB Kingston 32GB', hora: 'Hace 4 horas', detalle: 'Laboratorio L5' }
    ]
};

// Al cargar la página, verificar si hay sesión iniciada previamente
document.addEventListener('DOMContentLoaded', () => {
    const usuarioGuardado = localStorage.getItem('usuarioUbiCampus');
    if (usuarioGuardado) {
        cargarPerfil(JSON.parse(usuarioGuardado));
        mostrarPlataforma();
    }
});

// Guardar datos e ingresar a la aplicación
function registrarUsuario(e) {
    e.preventDefault();
    
    const nombre = document.getElementById('nombreCompleto').value.trim();
    const codigo = document.getElementById('codigoEstudiante').value.trim();

    if (nombre && codigo) {
        const usuario = { nombre, codigo };
        localStorage.setItem('usuarioUbiCampus', JSON.stringify(usuario));
        cargarPerfil(usuario);
        mostrarPlataforma();
    }
}

// Cargar datos en la vista de perfil y header
function cargarPerfil(usuario) {
    document.getElementById('perfilNombre').textContent = usuario.nombre;
    document.getElementById('perfilCodigo').textContent = usuario.codigo;
    
    // Obtener iniciales para el avatar
    const iniciales = usuario.nombre
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
        
    document.getElementById('avatarIniciales').textContent = iniciales || 'UC';
}

// Cambiar visibilidad entre login y aplicación
function mostrarPlataforma() {
    document.getElementById('pantallaLogin').classList.add('hidden');
    document.getElementById('appPrincipal').classList.remove('hidden');
}

// Cerrar sesión y borrar datos locales
function cerrarSesion() {
    localStorage.removeItem('usuarioUbiCampus');
    location.reload();
}

// Navegación de pestañas (Mapa, Reportes, Perfil)
function cambiarVista(vistaNombre, event) {
    document.querySelectorAll('.vista-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    if (vistaNombre === 'mapa') {
        document.getElementById('vistaMapa').classList.remove('hidden');
    } else if (vistaNombre === 'perfil') {
        document.getElementById('vistaPerfil').classList.remove('hidden');
    } else if (vistaNombre === 'reportes') {
        document.getElementById('vistaReportes').classList.remove('hidden');
    }

    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
}

// Interacción con las zonas del plano digital
function seleccionarZona(nombreZona) {
    document.getElementById('zonaSeleccionadaNombre').textContent = nombreZona;
    const listaContenedor = document.getElementById('listaObjetos');
    
    const objetos = reportesPorZona[nombreZona] || [];
    
    if (objetos.length === 0) {
        listaContenedor.innerHTML = '<div class="empty-state"><p>No hay objetos reportados en esta área actualmente.</p></div>';
        return;
    }

    listaContenedor.innerHTML = objetos.map(item => `
        <div class="objeto-card">
            <h4>${item.titulo}</h4>
            <p><small>📍 ${item.detalle}</small></p>
            <p><small>🕒 ${item.hora}</small></p>
        </div>
    `).join('');
}
