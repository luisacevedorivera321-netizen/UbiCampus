document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    const loadingOverlay = document.getElementById('loading-overlay');

    const displayName = document.getElementById('display-name');
    const displayCode = document.getElementById('display-code');
    const welcomeMessage = document.getElementById('welcome-message');
    const profileAvatar = document.getElementById('profile-avatar');

    loginForm.addEventListener('submit', (evento) => {
        evento.preventDefault();

        const nombre = document.getElementById('nombre').value.trim();
        const apellidos = document.getElementById('apellidos').value.trim();
        const codigo = document.getElementById('codigo').value.trim();

        const soloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
        const soloNumeros = /^[0-9]+$/;

        if (!soloLetras.test(nombre) || !soloLetras.test(apellidos)) {
            alert('Por favor, ingresa solo letras en los campos de Nombre y Apellidos.');
            return;
        }

        if (!soloNumeros.test(codigo)) {
            alert('Por favor, ingresa solo números en el Código de Estudiante.');
            return;
        }

        // 1. Mostrar la pantalla de carga con difuminado
        loadingOverlay.classList.remove('hidden');

        // 2. Esperar 3 segundos (3000 ms) simulando carga institucional
        setTimeout(() => {
            const iniciales = nombre.charAt(0).toUpperCase() + apellidos.charAt(0).toUpperCase();

            displayName.textContent = `${nombre} ${apellidos}`;
            displayCode.textContent = `Cód: ${codigo}`;
            welcomeMessage.textContent = `¡Hola, ${nombre}!`;
            profileAvatar.textContent = iniciales;

            // Ocultar carga y pantalla de acceso, mostrar sistema principal
            loadingOverlay.classList.add('hidden');
            loginContainer.classList.add('hidden');
            appContainer.classList.remove('hidden');
        }, 3000);
    });
});
