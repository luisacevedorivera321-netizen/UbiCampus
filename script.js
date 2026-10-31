document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    const loadingOverlay = document.getElementById('loading-overlay');
    const logoutBtn = document.getElementById('logout-btn');

    // Modales
    const modalReport = document.getElementById('modal-report');
    const btnOpenReport = document.getElementById('btn-open-report');
    const closeReportModal = document.getElementById('close-report-modal');
    const formReportItem = document.getElementById('form-report-item');

    // Perfil
    const displayName = document.getElementById('display-name');
    const displayCode = document.getElementById('display-code');
    const welcomeMessage = document.getElementById('welcome-message');
    const profileAvatar = document.getElementById('profile-avatar');

    let map = null;
    let markers = [];

   // Objetos de ejemplo con coordenadas en el plano de AutoCAD (Y, X)
    const initialItems = [
        { lat: 300, lng: 350, title: "Billetera de cuero marrón", type: "found", location: "Cafetería Central", category: "Llaves / Billeteras", date: "Hoy" },
        { lat: 750, lng: 500, title: "Llaves de auto Toyota con llavero rojo", type: "found", location: "Pabellón A - Piso 1", category: "Llaves / Billeteras", date: "Ayer" },
        { lat: 600, lng: 1200, title: "Mochila Lenovo negra", type: "lost", location: "Laboratorio de Cómputo 3", category: "Mochilas / Cuadernos", date: "Hace 2 días" },
        { lat: 250, lng: 1500, title: "DNI a nombre de Carlos Ruiz", type: "found", location: "Cancha Deportiva", category: "Documentos / DNI", date: "Hoy" },
        { lat: 800, lng: 900, title: "Calculadora Científica Casio", type: "lost", location: "Aula 204", category: "Otros", date: "Ayer" }
    ];

    // Evento de Login
    loginForm.addEventListener('submit', (evento) => {
        evento.preventDefault();

        const nombre = document.getElementById('nombre').value.trim();
        const apellidos = document.getElementById('apellidos').value.trim();
        const codigo = document.getElementById('codigo').value.trim();

        loadingOverlay.classList.remove('hidden');

        setTimeout(() => {
            const iniciales = nombre.charAt(0).toUpperCase() + apellidos.charAt(0).toUpperCase();

            displayName.textContent = `${nombre} ${apellidos}`;
            displayCode.textContent = `Cód: ${codigo}`;
            welcomeMessage.textContent = `¡Hola, ${nombre}! 👋`;
            profileAvatar.textContent = iniciales;

            loadingOverlay.classList.add('hidden');
            loginContainer.classList.add('hidden');
            appContainer.classList.remove('hidden');

            // Inicializar el mapa al entrar
            initMap();
        }, 2000);
    });

 
        // Icono rojo para perdidos, verde para encontrados
        const iconColor = item.type === 'found' ? 'green' : 'red';
        const 
            
       // Función para Cargar el Plano Interactivo de AutoCAD
    function initMap() {
        if (map) return;

        const bounds = [[0, 0], [1000, 1800]];

        // 1. Inicializar mapa con bloqueo estricto de bordes
        map = L.map('map', {
            crs: L.CRS.Simple,
            maxBounds: bounds,
            maxBoundsViscosity: 1.0, // Impide arrastrar fuera de los bordes
            attributionControl: false
        });

        // 2. Montar imagen
        L.imageOverlay('plano-ucv.jpg', bounds).addTo(map);

        // 3. Encuadrar
        map.fitBounds(bounds);

        // 4. BLOQUEO DE ZOOM: Ajusta el zoom mínimo exactamente al tamaño del recuadro
        const minZoomCalculado = map.getBoundsZoom(bounds);
        map.setMinZoom(minZoomCalculado);
        map.setMaxZoom(minZoomCalculado + 3);

        // 5. Cargar marcadores
        initialItems.forEach(item => addMarkerToMap(item));

        setTimeout(() => {
            map.invalidateSize();
        }, 200);
    }

    // Agregar Marcador al Mapa con PopUp estilizado
    function addMarkerToMap(item) {customIcon = L.divIcon({
            className: 'custom-pin',
            html: `<div style="background-color: ${iconColor === 'green' ? '#16a34a' : '#dc2626'}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.4);"></div>`,
            iconSize: [20, 20]
        });

        const marker = L.marker([item.lat, item.lng], { icon: customIcon }).addTo(map);

        const popupContent = `
            <div style="font-family: Roboto, sans-serif; padding: 4px;">
                <span style="display:inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; color: white; background-color: ${item.type === 'found' ? '#16a34a' : '#dc2626'}; margin-bottom: 6px;">
                    ${item.type === 'found' ? 'ENCONTRADO' : 'PERDIDO'}
                </span>
                <h4 style="margin: 0 0 4px 0; color: #1e3a8a; font-size: 14px;">${item.title}</h4>
                <p style="margin: 0; font-size: 12px; color: #475569;">📍 ${item.location}</p>
                <p style="margin: 2px 0 8px 0; font-size: 11px; color: #94a3b8;">Categoría: ${item.category}</p>
                <button style="width: 100%; background: #1e3a8a; color: white; border: none; padding: 6px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer;">
                    ${item.type === 'found' ? 'Reclamar / Verificar' : 'Tengo información'}
                </button>
            </div>
        `;

        marker.bindPopup(popupContent);
        markers.push(marker);
    }

    // Control de Modales
    btnOpenReport.addEventListener('click', () => modalReport.classList.remove('hidden'));
    closeReportModal.addEventListener('click', () => modalReport.classList.add('hidden'));

    // Publicar Objeto desde el Formulario
    formReportItem.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('item-title').value;
        const category = document.getElementById('item-category').value;
        const location = document.getElementById('item-location').value;

       // Crear marcador en una ubicación dentro del plano
        const newItem = {
            lat: Math.floor(Math.random() * 600) + 200,
            lng: Math.floor(Math.random() * 1200) + 300,
            title: title,
            type: "found",
            location: location,
            category: category,
            date: "Ahora"
        };

        addMarkerToMap(newItem);
        modalReport.classList.add('hidden');
        formReportItem.reset();
        alert('¡Excelente! El objeto reportado ya se encuentra visible en el plano digital.');
    });

    // Cerrar sesión
    logoutBtn.addEventListener('click', () => {
        appContainer.classList.add('hidden');
        loginContainer.classList.remove('hidden');
    });
});
