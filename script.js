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

    // Filtros
    const filterChips = document.querySelectorAll('.filter-chip');

    let map = null;
    let markers = [];

    // Objetos de ejemplo registrados en el Plano de AutoCAD (Y, X)
    const initialItems = [
        { id: 1, lat: 300, lng: 350, title: "Billetera de cuero marrón", type: "found", location: "Cafetería Central", category: "Llaves / Billeteras", date: "Hoy" },
        { id: 2, lat: 750, lng: 500, title: "Llaves de auto Toyota con llavero rojo", type: "found", location: "Pabellón A - Piso 1", category: "Llaves / Billeteras", date: "Ayer" },
        { id: 3, lat: 600, lng: 1200, title: "Mochila Lenovo negra", type: "lost", location: "Laboratorio de Cómputo 3", category: "Mochilas / Cuadernos", date: "Hace 2 días" },
        { id: 4, lat: 250, lng: 1500, title: "DNI a nombre de Carlos Ruiz", type: "found", location: "Cancha Deportiva", category: "Documentos / DNI", date: "Hoy" },
        { id: 5, lat: 800, lng: 900, title: "Calculadora Científica Casio", type: "lost", location: "Aula 204", category: "Otros", date: "Ayer" }
    ];

    // Evento de Login
    if (loginForm) {
        loginForm.addEventListener('submit', (evento) => {
            evento.preventDefault();

            const nombre = document.getElementById('nombre').value.trim();
            const apellidos = document.getElementById('apellidos').value.trim();
            const codigo = document.getElementById('codigo').value.trim();

            loadingOverlay.classList.remove('hidden');

            setTimeout(() => {
                const iniciales = (nombre.charAt(0) || 'U') + (apellidos.charAt(0) || 'C');

                displayName.textContent = `${nombre} ${apellidos}`;
                displayCode.textContent = `Cód: ${codigo}`;
                welcomeMessage.textContent = `¡Hola, ${nombre}! 👋`;
                profileAvatar.textContent = iniciales.toUpperCase();

                loadingOverlay.classList.add('hidden');
                loginContainer.classList.add('hidden');
                appContainer.classList.remove('hidden');

                // Inicializar mapa cuando la pantalla principal ya es visible
                initMap();
            }, 1000);
        });
    }

    // Función para Cargar el Plano Interactivo con Paredes Rígidas
    function initMap() {
        if (map) return;

        // Dimensiones del plano [Alto, Ancho]
        const bounds = [[0, 0], [1000, 1800]];

        // Instancia del mapa
        map = L.map('map', {
            crs: L.CRS.Simple,
            maxBounds: bounds,
            maxBoundsViscosity: 1.0, // Impide arrastrar fuera de la imagen
            attributionControl: false
        });

        // Montar la imagen de AutoCAD
        L.imageOverlay('plano-ucv.jpg', bounds).addTo(map);

        // Cargar marcadores iniciales
        renderMarkers('all');

        // Ajustar tamaño de pantalla y fijar zoom mínimo estricto
        setTimeout(() => {
            map.invalidateSize();
            map.fitBounds(bounds);

            // Bloquear zoom mínimo para impedir ver espacio vacío exterior
            const minZoomCalc = map.getBoundsZoom(bounds);
            map.setMinZoom(minZoomCalc);
            map.setMaxZoom(minZoomCalc + 3);
        }, 250);
    }

    // Renderizar Marcadores con soporte para Filtros
    function renderMarkers(filterType) {
        markers.forEach(m => map.removeLayer(m));
        markers = [];

        const filteredItems = filterType === 'all' 
            ? initialItems 
            : initialItems.filter(item => item.type === filterType);

        filteredItems.forEach(item => addMarkerToMap(item));
    }

    // Agregar Marcador Individual
    function addMarkerToMap(item) {
        const iconColor = item.type === 'found' ? 'green' : 'red';
        const customIcon = L.divIcon({
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

    // Lógica para botones de Filtro (Todos, Perdidos, Encontrados)
    filterChips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            filterChips.forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            const filterValue = e.target.getAttribute('data-filter');
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

    // Publicar Objeto desde el Formulario
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

            // Actualizar número en la tarjeta de encontrados
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
