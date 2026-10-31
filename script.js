document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const btnLogin = document.getElementById('btn-login');
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

    // Filtros
    const filterChips = document.querySelectorAll('.filter-chip');

    let map = null;
    let markers = [];

    // Objetos iniciales en coordenadas del plano
    const initialItems = [
        { id: 1, lat: 300, lng: 350, title: "Billetera de cuero marrón", type: "found", location: "Cafetería Central", category: "Llaves / Billeteras", date: "Hoy" },
        { id: 2, lat: 750, lng: 500, title: "Llaves de auto Toyota con llavero rojo", type: "found", location: "Pabellón A - Piso 1", category: "Llaves / Billeteras", date: "Ayer" },
        { id: 3, lat: 600, lng: 1200, title: "Mochila Lenovo negra", type: "lost", location: "Laboratorio de Cómputo 3", category: "Mochilas / Cuadernos", date: "Hace 2 días" },
        { id: 4, lat: 250, lng: 1500, title: "DNI a nombre de Carlos Ruiz", type: "found", location: "Cancha Deportiva", category: "Documentos / DNI", date: "Hoy" },
        { id: 5, lat: 800, lng: 900, title: "Calculadora Científica Casio", type: "lost", location: "Aula 204", category: "Otros", date: "Ayer" }
    ];

    // Función principal para ingresar al mapa
    function ejecutarLogin() {
        const nombreInput = document.getElementById('nombre');
        const apellidosInput = document.getElementById('apellidos');
        const codigoInput = document.getElementById('codigo');

        const nombre = nombreInput ? nombreInput.value.trim() : 'Estudiante';
        const apellidos = apellidosInput ? apellidosInput.value.trim() : '';
        const codigo = codigoInput ? codigoInput.value.trim() : '00000000';

        if (loadingOverlay) loadingOverlay.classList.remove('hidden');

        setTimeout(() => {
            const init1 = nombre.charAt(0) || 'U';
            const init2 = apellidos.charAt(0) || 'C';

            if (displayName) displayName.textContent = `${nombre} ${apellidos}`;
            if (displayCode) displayCode.textContent = `Cód: ${codigo}`;
            if (welcomeMessage) welcomeMessage.textContent = `¡Hola, ${nombre}! 👋`;
            if (profileAvatar) profileAvatar.textContent = (init1 + init2).toUpperCase();

            if (loadingOverlay) loadingOverlay.classList.add('hidden');
            if (loginContainer) loginContainer.classList.add('hidden');
            if (appContainer) appContainer.classList.remove('hidden');

            initMap();
        }, 800);
    }

    // Vincular clic directo en el botón de login
    if (btnLogin) {
        btnLogin.addEventListener('click', ejecutarLogin);
    }
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            ejecutarLogin();
        });
    }

    // Inicialización del Mapa Leaflet en modo Plano
    function initMap() {
        if (map) return;

        const bounds = [[0, 0], [1000, 1800]];

        map = L.map('map', {
            crs: L.CRS.Simple,
            minZoom: -1,
            maxZoom: 3,
            maxBounds: bounds,
            maxBoundsViscosity: 1.0,
            attributionControl: false
        });

        L.imageOverlay('plano-ucv.jpg', bounds).addTo(map);

        renderMarkers('all');

        setTimeout(() => {
            map.invalidateSize();
            map.fitBounds(bounds);
        }, 250);
    }

    // Renderizar marcadores con soporte de filtros
    function renderMarkers(filterType) {
        markers.forEach(m => map.removeLayer(m));
        markers = [];

        const filtered = filterType === 'all' 
            ? initialItems 
            : initialItems.filter(item => item.type === filterType);

        filtered.forEach(item => addMarkerToMap(item));
    }

    function addMarkerToMap(item) {
        const iconColor = item.type === 'found' ? '#16a34a' : '#dc2626';
        const customIcon = L.divIcon({
            className: 'custom-pin',
            html: `<div style="background-color: ${iconColor}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.4);"></div>`,
            iconSize: [20, 20]
        });

        const marker = L.marker([item.lat, item.lng], { icon: customIcon }).addTo(map);

        const popupContent = `
            <div style="font-family: Roboto, sans-serif; padding: 4px;">
                <span style="display:inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; color: white; background-color: ${iconColor}; margin-bottom: 6px;">
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

    // Filtros de mapa
    filterChips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            filterChips.forEach(c => c.classList.remove('active'));
            e.currentTarget.classList.add('active');
            const filterValue = e.currentTarget.getAttribute('data-filter');
            if (map) renderMarkers(filterValue);
        });
    });

    // Control de Modales
    if (btnOpenReport && modalReport) {
        btnOpenReport.addEventListener('click', () => modalReport.classList.remove('hidden'));
    }
    if (closeReportModal && modalReport) {
        closeReportModal.addEventListener('click', () => modalReport.classList.add('hidden'));
    }

    if (formReportItem) {
        formReportItem.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('item-title').value;
            const category = document.getElementById('item-category').value;
            const location = document.getElementById('item-location').value;

            const newItem = {
                id: Date.now(),
                lat: Math.floor(Math.random() * 600) + 200,
                lng: Math.floor(Math.random() * 1200) + 300,
                title: title,
                type: "found",
                location: location,
                category: category,
                date: "Ahora"
            };

            initialItems.push(newItem);
            addMarkerToMap(newItem);

            const foundCount = document.getElementById('count-found');
            if (foundCount) {
                foundCount.textContent = parseInt(foundCount.textContent || 0) + 1;
            }

            modalReport.classList.add('hidden');
            formReportItem.reset();
            alert('¡Excelente! El objeto reportado ya se encuentra visible en el plano digital.');
        });
    }

    // Cerrar sesión
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            appContainer.classList.add('hidden');
            loginContainer.classList.remove('hidden');
        });
    }
});
