document.addEventListener('DOMContentLoaded', () => {
    // Elementos DOM
    const loginForm = document.getElementById('login-form');
    const btnLoginSubmit = document.getElementById('btn-login-submit');
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    const loadingOverlay = document.getElementById('loading-overlay');
    const logoutBtn = document.getElementById('logout-btn');

    // Modales y Banner
    const modalReport = document.getElementById('modal-report');
    const modalReportTitle = document.getElementById('modal-report-title');
    const btnOpenReportFound = document.getElementById('btn-open-report-found');
    const btnOpenReportLost = document.getElementById('btn-open-report-lost');
    const closeReportModal = document.getElementById('close-report-modal');
    const formReportItem = document.getElementById('form-report-item');
    const itemTypeVal = document.getElementById('item-type-val');
    const mapPickerBanner = document.getElementById('map-picker-banner');
    const cancelPickerBtn = document.getElementById('cancel-picker-btn');

    // Modal de Reclamo
    const modalClaim = document.getElementById('modal-claim');
    const closeClaimModal = document.getElementById('close-claim-modal');
    const formClaimItem = document.getElementById('form-claim-item');
    const claimReportId = document.getElementById('claim-report-id');
    const claimItemName = document.getElementById('claim-item-name');
    const claimQuestionText = document.getElementById('claim-question-text');

    // Perfil y Contadores
    const displayName = document.getElementById('display-name');
    const displayCode = document.getElementById('display-code');
    const welcomeMessage = document.getElementById('welcome-message');
    const profileAvatar = document.getElementById('profile-avatar');
    const countLost = document.getElementById('count-lost');
    const countFound = document.getElementById('count-found');

    const filterChips = document.querySelectorAll('.filter-chip');

    let map = null;
    let markersMap = new Map();
    let isPickingLocation = false;
    let pendingReportData = null;
    let currentFilter = 'all';

    const bounds = [[0, 0], [1000, 1800]];

    // Memoria local
    let reports = JSON.parse(localStorage.getItem('ubi_reports')) || [];
    let currentUser = JSON.parse(localStorage.getItem('ubi_session')) || null;

    if (currentUser) {
        cargarPerfilUI(currentUser);
        loginContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        initMap();
    }

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

    // Inicialización del Mapa
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

        map.on('click', (e) => {
            if (!isPickingLocation || !pendingReportData) return;

            const lat = Math.round(e.latlng.lat);
            const lng = Math.round(e.latlng.lng);

            const newReport = {
                id: Date.now(),
                ...pendingReportData,
                lat: lat,
                lng: lng,
                status: 'active', // active, verifying, claimed
                pin: null,
                claimContact: null,
                userCode: currentUser.codigo,
                userName: `${currentUser.nombre} ${currentUser.apellidos}`,
                date: new Date().toLocaleDateString('es-PE', { hour: '2-digit', minute: '2-digit' })
            };

            reports.push(newReport);
            guardarReportes();

            desactivarModoPicker();
            actualizarMapaYContadores();

            alert('¡Reporte registrado con éxito! El objeto está resguardado mediante validación de seguridad.');
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

    function guardarReportes() {
        localStorage.setItem('ubi_reports', JSON.stringify(reports));
    }

    function actualizarMapaYContadores() {
        if (!map) return;

        markersMap.forEach(marker => map.removeLayer(marker));
        markersMap.clear();

        const activeReports = reports.filter(r => r.status !== 'claimed');

        let filtered = activeReports;
        if (currentFilter === 'lost' || currentFilter === 'found') {
            filtered = activeReports.filter(r => r.type === currentFilter && r.status === 'active');
        } else if (currentFilter === 'verifying') {
            filtered = activeReports.filter(r => r.status === 'verifying');
        }

        filtered.forEach(item => addMarkerToMap(item));

        const countLostNum = activeReports.filter(r => r.type === 'lost' && r.status === 'active').length;
        const countFoundNum = activeReports.filter(r => r.type === 'found' && r.status === 'active').length;

        if (countLost) countLost.textContent = countLostNum;
        if (countFound) countFound.textContent = countFoundNum;
    }

    function addMarkerToMap(item) {
        let iconColor = '#16a34a'; // Verde por defecto
        let statusBadge = 'HALLADO EN CUSTODIA';

        if (item.status === 'verifying') {
            iconColor = '#ea580c'; // Naranja (En verificación)
            statusBadge = 'EN VERIFICACIÓN 🟠';
        } else if (item.type === 'lost') {
            iconColor = '#dc2626'; // Rojo (Perdido)
            statusBadge = 'BUSCADO POR ESTUDIANTE';
        }

        const customIcon = L.divIcon({
            className: 'custom-pin',
            html: `<div style="background-color: ${iconColor}; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.4);"></div>`,
            iconSize: [22, 22]
        });

        const marker = L.marker([item.lat, item.lng], { icon: customIcon }).addTo(map);

        let actionButtonHTML = '';

        if (item.status === 'verifying') {
            actionButtonHTML = `
                <div style="background: #fff7ed; border: 1px solid #ffedd5; padding: 6px; border-radius: 6px; margin-bottom: 8px;">
                    <p style="margin:0; font-size: 10px; color: #c2410c; font-weight: bold;">🔒 Devolución en proceso</p>
                </div>
                <button onclick="confirmarEntregaPin(${item.id})" style="width: 100%; background: #ea580c; color: white; border: none; padding: 8px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer;">
                    🔑 Confirmar Entrega (Ingresar PIN)
                </button>
            `;
        } else {
            actionButtonHTML = `
                <button onclick="solicitarReclamo(${item.id})" style="width: 100%; background: #1e3a8a; color: white; border: none; padding: 8px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer;">
                    🔒 Solicitar Reclamo (Responder Pregunta)
                </button>
            `;
        }

        const popupContent = `
            <div style="font-family: Roboto, sans-serif; padding: 4px; min-width: 190px;">
                <span style="display:inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; color: white; background-color: ${iconColor}; margin-bottom: 6px;">
                    ${statusBadge}
                </span>
                <h4 style="margin: 0 0 4px 0; color: #1e3a8a; font-size: 14px;">${item.title}</h4>
                <p style="margin: 0; font-size: 12px; color: #475569;">📍 ${item.location}</p>
                <p style="margin: 2px 0; font-size: 11px; color: #64748b;">Categoría: ${item.category}</p>
                ${item.desc ? `<p style="margin: 4px 0; font-size: 11px; color: #334155; font-style: italic;">"${item.desc}"</p>` : ''}
                <p style="margin: 4px 0 8px 0; font-size: 10px; color: #94a3b8;">Por: ${item.userName} (${item.date})</p>
                ${actionButtonHTML}
            </div>
        `;

        marker.bindPopup(popupContent);
        markersMap.set(item.id, marker);
    }

    // --- PROCESO DE VALIDACIÓN DE SEGURIDAD (PASOS 1 Y 2) ---
    window.solicitarReclamo = function(id) {
        const item = reports.find(r => r.id === id);
        if (!item) return;

        if (claimReportId) claimReportId.value = item.id;
        if (claimItemName) claimItemName.textContent = `Objeto: ${item.title}`;
        if (claimQuestionText) claimQuestionText.textContent = item.question || "¿Qué característica única tiene el objeto?";
        
        if (modalClaim) modalClaim.classList.remove('hidden');
    };

    if (closeClaimModal && modalClaim) {
        closeClaimModal.addEventListener('click', () => modalClaim.classList.add('hidden'));
    }

    if (formClaimItem) {
        formClaimItem.addEventListener('submit', (e) => {
            e.preventDefault();

            const id = parseInt(claimReportId.value);
            const userAns = document.getElementById('claim-user-answer').value.trim();
            const userContact = document.getElementById('claim-user-contact').value.trim();

            const item = reports.find(r => r.id === id);
            if (!item) return;

            // Comparar respuesta (ignora mayúsculas/minúsculas)
            if (userAns.toLowerCase() === (item.answer || '').toLowerCase()) {
                // Generar PIN aleatorio de 4 dígitos
                const pinGenerado = Math.floor(1000 + Math.random() * 9000).toString();

                item.status = 'verifying';
                item.pin = pinGenerado;
                item.claimContact = userContact;
                guardarReportes();

                modalClaim.classList.add('hidden');
                formClaimItem.reset();
                actualizarMapaYContadores();

                alert(`¡RESPUESTA CORRECTA! 🟢\n\nSe ha generado tu Código PIN de entrega: [ ${pinGenerado} ]\n\nEl objeto ha cambiado a estado "EN VERIFICACIÓN 🟠" en el plano. Presenta este PIN al momento de la entrega física para retirar el pin.`);
            } else {
                alert("❌ Respuesta incorrecta. Por motivos de seguridad, la respuesta no coincide con el registro del publicador.");
            }
        });
    }

    // --- PROCESO DE ENTREGA FINAL POR PIN (PASO 3) ---
    window.confirmarEntregaPin = function(id) {
        const item = reports.find(r => r.id === id);
        if (!item) return;

        const pinIngresado = prompt(`Confirmar Devolución para: "${item.title}"\n\nIngresa el Código PIN de 4 dígitos proporcionado al reclamante:`);

        if (pinIngresado === null) return; // Cancelado

        if (pinIngresado.trim() === item.pin) {
            item.status = 'claimed';
            guardarReportes();
            actualizarMapaYContadores();
            alert("¡ENTREGA CONFIRMADA EXITOSAMENTE! 🎉\n\nEl reporte ha sido cerrado y retirado del plano digital.");
        } else {
            alert("❌ Código PIN incorrecto. No se puede retirar el objeto del mapa.");
        }
    };

    // Modales y Picker
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
                question: document.getElementById('item-question').value.trim(),
                answer: document.getElementById('item-answer').value.trim(),
                type: itemTypeVal.value
            };

            modalReport.classList.add('hidden');
            formReportItem.reset();
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

    // Filtros
    filterChips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            filterChips.forEach(c => c.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentFilter = e.currentTarget.getAttribute('data-filter');
            actualizarMapaYContadores();
        });
    });

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('ubi_session');
            currentUser = null;
            appContainer.classList.add('hidden');
            loginContainer.classList.remove('hidden');
        });
    }
});
