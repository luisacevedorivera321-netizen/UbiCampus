document.addEventListener('DOMContentLoaded', () => {
    // Referencias a los contenedores principales
    const loginForm = document.getElementById('login-form');
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');

    // Referencias a los elementos del perfil en la página principal
    const displayName = document.getElementById('display-name');
    const displayCode = document.getElementById('display-code');
    const welcomeMessage = document.getElementById('welcome-message');
    const profileAvatar = document.getElementById('profile-avatar');

    // Evento: Cuando el usuario intenta iniciar sesión
    loginForm.addEventListener('submit', (evento) => {
        evento.preventDefault(); // Evita que la página recargue por defecto

        // Obtener los datos escritos en los campos de texto
        const nombre = document.getElementById('nombre').value.trim();
        const apellidos = document.getElementById('apellidos').value.trim();
        const codigo = document.getElementById('codigo').value.trim();

        // Validar que los campos no estén vacíos
        if(nombre && apellidos && codigo) {
            
            // 1. Generar iniciales para la foto de perfil (Ej. Luis Acevedo -> LA)
            const iniciales = nombre.charAt(0).toUpperCase() + apellidos.charAt(0).toUpperCase();

            // 2. Insertar los datos del estudiante en la interfaz
            displayName.textContent = `${nombre} ${apellidos}`;
            displayCode.textContent = `Cód: ${codigo}`;
            welcomeMessage.textContent = `¡Hola, ${nombre}!`;
            profileAvatar.textContent = iniciales;

            // 3. Ocultar la pantalla de acceso y mostrar la página principal
            loginContainer.classList.add('hidden');
            appContainer.classList.remove('hidden');
        }
    });
});
