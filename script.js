document.addEventListener('DOMContentLoaded', () => {
    // Elementos DOM
    const loginForm = document.getElementById('login-form');
    const btnLoginSubmit = document.getElementById('btn-login-submit');
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    const loadingOverlay = document.getElementById('loading-overlay');
    const logoutBtn = document.getElementById('logout-btn');

    // Modales y Banner Picker
    const modalReport = document.getElementById('modal-report');
    const modalReportTitle = document.getElementById('modal-report-title');
    const btnOpenReportFound = document.getElementById('btn-open-report-found');
    const btnOpenReportLost = document.getElementById('btn-open-report-lost');
    const closeReportModal = document.getElementById('close-report-modal');
    const formReportItem = document.getElementById('form-report-item');
    const itemTypeVal = document.getElementById('item-type-val');
    const mapPickerBanner = document.getElementById('map-picker-banner');
    const cancelPickerBtn = document.getElementById('cancel-picker-btn');

    // Elementos Perfil y Contadores
    const displayName = document.getElementById('display-name');
    const displayCode = document.getElementById('display-code');
    const welcomeMessage = document.getElementById('welcome-message');
    const profileAvatar = document.getElementById('profile-avatar');
    const countLost = document.getElementById('count-lost');
    const countFound = document.getElementById('count-found');

    // Filtros
    const filterChips = document.querySelectorAll('.filter-chip');

    // Variables de Estado
    let map = null;
    let markersMap = new Map(); // Guarda la referencia de marcadores id -> L.marker
    let isPickingLocation = false;
    let pendingReportData = null;
    let currentFilter = 'all';

    // Dimensiones virtuales del plano de AutoCAD
    const bounds = [[0, 0], [1000, 1800]];

    // --- ALMACENAMIENTO LOCAL Y PERSISTENCIA DE SESIÓN ---
    let reports = JSON.parse(localStorage.getItem('ubi_reports')) || [];
    let currentUser = JSON.parse(localStorage.getItem('ubi_session')) || null;

    // Verificar sesión iniciada automáticamente
    if (currentUser) {
        cargarPerfilUI(currentUser);
        loginContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        initMap();
    }

    // Procesar Login
    function procesarAcceso() {
        const nombreVal = (document.getElementById('nombre')?.value || '').trim();
        const apellidosVal = (document.getElementById('apellidos')?.value || '').trim();
        const codigoVal = (document.getElementById('codigo')?.value || '').trim();

        if (!nombreVal || !apellidosVal || !codigoVal) {
            alert("Por favor, completa todos los campos del formulario.");
            return;
        }

        currentUser = { nombre: nombreVal, apellidos: apellidosVal, codigo: codigoVal };
        localStorage.setItem('ubi_session', JSON.stringify(currentUser));

        if (loadingOverlay) loadingOverlay.classList.remove('hidden');

        setTimeout(() => {
            cargarPerfilUI(currentUser);
            if (loadingOverlay) loadingOverlay.classList.add('hidden');
            if (loginContainer) loginContainer.classList.add('hidden');
            if (appContainer) appContainer.classList.remove('hidden');

            initMap();
        }, 600);
    }

    function cargarPerfilUI(user) {
        const init1 = user.nombre.charAt(0) || 'U';
        const init2 = user.apellidos.charAt(0) || 'C';

        if (displayName) displayName.textContent = `${user.nombre} ${user.apellidos}`;
        if (displayCode) displayCode.textContent = `Cód: ${user.codigo}`;
        if (welcomeMessage) welcomeMessage.textContent = `¡Hola, ${user.nombre}! 👋`;
        if (profileAvatar) profileAvatar.textContent = (init1 + init2).toUpperCase();
    }

    if (btnLoginSubmit) btnLoginSubmit.addEventListener('click', procesarAcceso);
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            procesarAcceso();
        });
    }

    // --- INICIALIZACIÓN Y CONTROL DEL MAPA LEAFLET ---
    function initMap() {
        if (map) {
            actualizarMapaYContadores();
            return;
        }

        map = L.map('map', {
            crs: L.CRS.Simple,
            maxBounds: bounds,
            maxBoundsViscosity: 1.0,
            attributionControl: false
        });

        L.imageOverlay('plano-ucv.jpg', bounds).addTo(map);

        // Capturar clic en el plano para guardar posición del objeto
        map.on('click', (e) => {
            if (!isPickingLocation || !pendingReportData) return;

            const lat = Math.round(e.latlng.lat);
            const lng = Math.round(e.latlng.lng);

            const newReport = {
                id: Date.now(),
                ...pendingReportData,
                lat: lat,
                lng: lng,
                status: 'active',
                userCode: currentUser.codigo,
                userName: `${currentUser.nombre} ${currentUser.apellidos}`,
                date: new Date().toLocaleDateString('es-PE', { hour: '2-digit', minute: '2-digit' })
            };

            reports.push(newReport);
            guardarReportes();

            // Desactivar modo de captura
            desactivarModoPicker();
            actualizarMapaYContadores();

            alert('¡Reporte publicado con éxito! El pin ya es visible en el plano digital.');
        });

        setTimeout(() => {
            if (map) {
                map.invalidateSize();
                map.fitBounds(bounds);
                try {
                    const minZoomCalc = map.getBoundsZoom(bounds);
                    map.setMinZoom(minZoomCalc);
                    map.setMaxZoom(minZoomCalc + 3);
                } catch (err) {
                    map.setMinZoom(0);
                }
            }
            actualizarMapaYContadores();
        }, 300);
    }

    // --- RENDERIZADO Y ACTUALIZACIÓN DE ESTADO ---
    function guardarReportes() {
        localStorage.setItem('ubi_reports', JSON.stringify(reports));
    }

    function actualizarMapaYContadores() {
        if (!map) return;

        // Limpiar marcadores existentes del plano
        markersMap.forEach(marker => map.removeLayer(marker));
        markersMap.clear();

        const activeReports = reports.filter(r => r.status === 'active');

        // Filtrar según botón de la interfaz
        const filtered = currentFilter === 'all' 
            ? activeReports 
            : activeReports.filter(r => r.type === currentFilter);

        // Renderizar pins
        filtered.forEach(item => addMarkerToMap(item));

        // Actualizar números dinámicos de las tarjetas
        const countLostNum = activeReports.filter(r => r.type === 'lost').length;
        const countFoundNum = activeReports.filter(r => r.type === 'found').length;

        if (countLost) countLost.textContent = countLostNum;
        if (countFound) countFound.textContent = countFoundNum;
    }

    function addMarkerToMap(item) {
        const isFound = item.type === 'found';
        const iconColor = isFound ? '#16a34a' : '#dc2626';

        const customIcon = L.divIcon({
            className: 'custom-pin',
            html: `<div style="background-color: ${iconColor}; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.4);"></div>`,
            iconSize: [22, 22]
        });

        const marker = L.marker([item.lat, item.lng], { icon: customIcon }).addTo(map);

        const popupContent = `
            <div style="font-family: Roboto, sans-serif; padding: 4px; min-width: 180px;">
                <span style="display:inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; color: white; background-color: ${iconColor}; margin-bottom: 6px;">
                    ${isFound ? 'HALLADO EN CUSTODIA' : 'BUSCADO POR ESTUDIANTE'}
                </span>
                <h4 style="margin: 0 0 4px 0; color: #1e3a8a; font-size: 14px;">${item.title}</h4>
                <p style="margin: 0; font-size: 12px; color: #475569;">📍 ${item.location}</p>
                <p style="margin: 2px 0; font-size: 11px; color: #64748b;">Categoría: ${item.category}</p>
                ${item.desc ? `<p style="margin: 4px 0; font-size: 11px; color: #334155; font-style: italic;">"${item.desc}"</p>` : ''}
                <p style="margin: 4px 0 8px 0; font-size: 10px; color: #94a3b8;">Por: ${item.userName} (${item.date})</p>
                <button onclick="reclamarObjeto(${item.id})" style="width: 100%; background: #1e3a8a; color: white; border: none; padding: 8px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer; transition: background 0.2s;">
                    ✅ Reclamar / Retirar de Mapa
                </button>
            </div>
        `;

        marker.bindPopup(popupContent);
        markersMap.set(item.id, marker);
    }

    // Función de Reclamación accesible globalmente
    window.reclamarObjeto = function(id) {
        if (confirm("¿Confirmas que este objeto ha sido devuelto/reclamado? Se retirará permanentemente del mapa.")) {
            reports = reports.map(r => r.id === id ? { ...r, status: 'claimed' } : r);
            guardarReportes();
            actualizarMapaYContadores();
        }
    };

    // --- MODALES Y CAPTURA DE UBICACIÓN EN EL MAPA ---
    function abrirModalFormulario(tipo) {
        if (itemTypeVal) itemTypeVal.value = tipo;
        if (modalReportTitle) {
            modalReportTitle.textContent = tipo === 'found' 
                ? 'Reportar Objeto Encontrado 🟢' 
                : 'Reportar Objeto Perdido 🔴';
        }
        if (modalReport) modalReport.classList.remove('hidden');
    }

    if (btnOpenReportFound) btnOpenReportFound.addEventListener('click', () => abrirModalFormulario('found'));
    if (btnOpenReportLost) btnOpenReportLost.addEventListener('click', () => abrirModalFormulario('lost'));

    if (closeReportModal && modalReport) {
        closeReportModal.addEventListener('click', () => modalReport.classList.add('hidden'));
    }

    if (formReportItem) {
        formReportItem.addEventListener('submit', (e) => {
            e.preventDefault();

            pendingReportData = {
                title: document.getElementById('item-title').value.trim(),
                category: document.getElementById('item-category').value,
                location: document.getElementById('item-location').value.trim(),
                desc: document.getElementById('item-desc').value.trim(),
                type: itemTypeVal.value
            };

            modalReport.classList.add('hidden');
            formReportItem.reset();

            // Activar modo picker sobre el plano de AutoCAD
            activarModoPicker();
        });
    }

    function activarModoPicker() {
        isPickingLocation = true;
        if (mapPickerBanner) mapPickerBanner.classList.remove('hidden');
        if (map) map.getContainer().style.cursor = 'crosshair';
    }

    function desactivarModoPicker() {
        isPickingLocation = false;
        pendingReportData = null;
        if (mapPickerBanner) mapPickerBanner.classList.add('hidden');
        if (map) map.getContainer().style.cursor = '';
    }

    if (cancelPickerBtn) cancelPickerBtn.addEventListener('click', desactivarModoPicker);

    // --- FILTROS DE MAPA ---
    filterChips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            filterChips.forEach(c => c.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentFilter = e.currentTarget.getAttribute('data-filter');
            actualizarMapaYContadores();
        });
    });

    // --- CERRAR SESIÓN ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('ubi_session');
            currentUser = null;
            appContainer.classList.add('hidden');
            loginContainer.classList.remove('hidden');
        });
    }
});
