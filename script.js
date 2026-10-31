// Inicialización de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBjIhSawNRtFP89wJdyqN2klRUOc1ovSOk",
    authDomain: "ubicampus-53d05.firebaseapp.com",
    databaseURL: "https://ubicampus-53d05-default-rtdb.firebaseio.com",
    projectId: "ubicampus-53d05",
    storageBucket: "ubicampus-53d05.firebasestorage.app",
    messagingSenderId: "1080685186655",
    appId: "1:1080685186655:web:314f1368af0335928895ea",
    measurementId: "G-ZJR3KCNBQ2"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
const reportsRef = db.ref('reports');

document.addEventListener('DOMContentLoaded', () => {
    // Elementos DOM de acceso y pantalla de carga
    const loginForm = document.getElementById('login-form');
    const btnLoginSubmit = document.getElementById('btn-login-submit');
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    const loadingOverlay = document.getElementById('loading-overlay');
    const logoutBtn = document.getElementById('logout-btn');

    // Modales y Reportes
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

    const filterChips = document.querySelectorAll('.filter-chip');
    let map = null;
    let markersMap = new Map();
    let isPickingLocation = false;
    let pendingReportData = null;
    let currentFilter = 'all';

    // Dimensiones virtuales del plano de AutoCAD
    const bounds = [[0, 0], [1000, 1800]];

    // Almacenamiento local (Sesión de usuario) y estado global de reportes
    let reports = [];
    let currentUser = JSON.parse(localStorage.getItem('ubi_session')) || null;

    // Escuchador en tiempo real de Firebase para sincronizar reportes
    reportsRef.on('value', (snapshot) => {
        const data = snapshot.val();
        reports = [];
        if (data) {
            Object.keys(data).forEach(key => {
                reports.push(data[key]);
            });
        }
        actualizarMapaYContadores();
    });

    // Persistencia de sesión al recargar
    if (currentUser) {
        cargarPerfilUI(currentUser);
        loginContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        initMap();
    }

    // Procesar Inicio de Sesión con animación de Carga
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

        // Mostrar overlay de carga
        if (loadingOverlay) loadingOverlay.classList.remove('hidden');

        // Simulación de carga fluida (800ms)
        setTimeout(() => {
            cargarPerfilUI(currentUser);
            if (loadingOverlay) loadingOverlay.classList.add('hidden');
            if (loginContainer) loginContainer.classList.add('hidden');
            if (appContainer) appContainer.classList.remove('hidden');
            initMap();
        }, 800);
    }

    function cargarPerfilUI(user) {
        const init1 = user.nombre.charAt(0) || 'U';
        const init2 = user.apellidos.charAt(0) || 'C';

        document.getElementById('display-name').textContent = `${user.nombre} ${user.apellidos}`;
        document.getElementById('display-code').textContent = `Cód: ${user.codigo}`;
        document.getElementById('welcome-message').textContent = `¡Hola, ${user.nombre}! 👋`;
        document.getElementById('profile-avatar').textContent = (init1 + init2).toUpperCase();
    }

    if (btnLoginSubmit) btnLoginSubmit.addEventListener('click', procesarAcceso);
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            procesarAcceso();
        });
    }

    // Inicialización del Mapa con límites rígidos de AutoCAD
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

            const reportId = Date.now();
            const newReport = {
                id: reportId,
                ...pendingReportData,
                lat: Math.round(e.latlng.lat),
                lng: Math.round(e.latlng.lng),
                status: 'active',
                pin: null,
                claimContact: null,
                claimAnswer: null,
                userCode: currentUser.codigo,
                userName: `${currentUser.nombre} ${currentUser.apellidos}`,
                date: new Date().toLocaleDateString('es-PE', { hour: '2-digit', minute: '2-digit' })
            };

            // Guardar directamente en Firebase Realtime Database
            reportsRef.child(reportId).set(newReport);

            desactivarModoPicker();
            alert('¡Reporte publicado con éxito en la nube!');
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

    function actualizarMapaYContadores() {
        if (!map) return;
        markersMap.forEach(marker => map.removeLayer(marker));
        markersMap.clear();

        const activeReports = reports.filter(r => r.status !== 'claimed');
        let filtered = activeReports;

        if (currentFilter === 'lost' || currentFilter === 'found') {
            filtered = activeReports.filter(r => r.type === currentFilter && r.status === 'active');
        } else if (currentFilter === 'verifying') {
            filtered = activeReports.filter(r => r.status === 'verifying' || r.status === 'approved');
        }

        filtered.forEach(item => addMarkerToMap(item));

        const countLostNum = activeReports.filter(r => r.type === 'lost' && r.status === 'active').length;
        const countFoundNum = activeReports.filter(r => r.type === 'found' && r.status === 'active').length;

        document.getElementById('count-lost').textContent = countLostNum;
        document.getElementById('count-found').textContent = countFoundNum;
    }

    function addMarkerToMap(item) {
        let iconColor = item.type === 'lost' ? '#dc2626' : '#16a34a';
        let statusBadge = item.type === 'lost' ? 'BUSCADO' : 'HALLADO';

        if (item.status === 'verifying' || item.status === 'approved') {
            iconColor = '#ea580c';
            statusBadge = item.status === 'approved' ? 'RECLAMO APROBADO 🟠' : 'EN VERIFICACIÓN 🟠';
        }

        const marker = L.marker([item.lat, item.lng], {
            icon: L.divIcon({
                className: 'custom-pin',
                html: `<div style="background-color: ${iconColor}; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.4);"></div>`,
                iconSize: [22, 22]
            })
        }).addTo(map);

        let actionButtonHTML = '';
        const isOwner = currentUser && currentUser.codigo === item.userCode;

        if (item.status === 'verifying') {
            if (isOwner) {
                actionButtonHTML = `
                    <div style="background: #fff7ed; padding: 8px; border-radius: 6px; margin-bottom: 8px; border: 1px solid #fdba74;">
                        <p style="font-size: 11px; font-weight: bold; color: #c2410c; margin-bottom:2px;">Respuesta recibida:</p>
                        <p style="font-size: 13px; color: #1e293b; font-style: italic; margin-bottom:4px;">"${item.claimAnswer}"</p>
                        <p style="font-size: 11px; color: #64748b;">WhatsApp: ${item.claimContact}</p>
                    </div>
                    <button onclick="aprobarReclamo(${item.id})" style="width: 100%; background: #16a34a; color: white; border: none; padding: 6px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer; margin-bottom: 5px;">✔️ Aprobar y Generar PIN</button>
                    <button onclick="rechazarReclamo(${item.id})" style="width: 100%; background: #dc2626; color: white; border: none; padding: 6px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer;">❌ Rechazar</button>
                `;
            } else {
                actionButtonHTML = `<p style="font-size:11px; color: #ea580c; font-weight:bold; text-align:center;">⏳ Esperando que el publicador apruebe el reclamo...</p>`;
            }
        } else if (item.status === 'approved') {
            if (isOwner) {
                actionButtonHTML = `
                    <p style="font-size:11px; color: #64748b; margin-bottom:6px;">Contacta al dueño (${item.claimContact}) y dale su PIN: <b>${item.pin}</b></p>
                    <button onclick="confirmarEntregaPin(${item.id})" style="width: 100%; background: #ea580c; color: white; border: none; padding: 8px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer;">
                        🔑 Finalizar (Ingresar PIN)
                    </button>
                `;
            } else {
                actionButtonHTML = `<p style="font-size:11px; color: #16a34a; font-weight:bold; text-align:center;">✅ Reclamo Aprobado. El publicador te contactará pronto.</p>`;
            }
        } else {
            if (!isOwner) {
                actionButtonHTML = `
                    <button onclick="solicitarReclamo(${item.id})" style="width: 100%; background: #1e3a8a; color: white; border: none; padding: 8px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer;">
                        🔒 Solicitar Reclamo
                    </button>`;
            } else {
                actionButtonHTML = `<p style="font-size:10px; color: #64748b; text-align:center; font-style:italic;">Tú publicaste este reporte.</p>`;
            }
        }

        marker.bindPopup(`
            <div style="font-family: Roboto, sans-serif; padding: 4px; min-width: 190px;">
                <span style="display:inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; color: white; background-color: ${iconColor}; margin-bottom: 6px;">${statusBadge}</span>
                <h4 style="margin: 0 0 4px 0; color: #1e3a8a; font-size: 14px;">${item.title}</h4>
                <p style="margin: 0; font-size: 12px; color: #475569;">📍 ${item.location}</p>
                <p style="margin: 4px 0 8px 0; font-size: 10px; color: #94a3b8;">Por: ${item.userName}</p>
                ${actionButtonHTML}
            </div>
        `);
        markersMap.set(item.id, marker);
    }

    // Flujo de Verificación Humana con Firebase
    window.solicitarReclamo = function(id) {
        const item = reports.find(r => r.id === id);
        if (!item) return;
        claimReportId.value = item.id;
        claimItemName.textContent = `Objeto: ${item.title}`;
        claimQuestionText.textContent = item.question;
        modalClaim.classList.remove('hidden');
    };

    if (closeClaimModal) closeClaimModal.addEventListener('click', () => modalClaim.classList.add('hidden'));

    if (formClaimItem) {
        formClaimItem.addEventListener('submit', (e) => {
            e.preventDefault();
            const reportId = parseInt(claimReportId.value);
            const answerVal = document.getElementById('claim-user-answer').value.trim();
            const contactVal = document.getElementById('claim-user-contact').value.trim();

            reportsRef.child(reportId).update({
                status: 'verifying',
                claimAnswer: answerVal,
                claimContact: contactVal
            });

            modalClaim.classList.add('hidden');
            formClaimItem.reset();
            alert("✉️ Tu respuesta ha sido enviada.\nEl estudiante que encontró el objeto la revisará y te contactará por WhatsApp si es correcta.");
        });
    }

    window.aprobarReclamo = function(id) {
        const pinGenerado = Math.floor(1000 + Math.random() * 9000).toString();
        const item = reports.find(r => r.id === id);

        reportsRef.child(id).update({
            status: 'approved',
            pin: pinGenerado
        });

        alert(`✅ Reclamo Aprobado.\n\nEl sistema ha generado el PIN: [ ${pinGenerado} ]\n\nContacta al número ${item?.claimContact || ''} indicándole que aprobaste su respuesta y entrégale este PIN para solicitarlo al momento del encuentro físico.`);
    };

    window.rechazarReclamo = function(id) {
        reportsRef.child(id).update({
            status: 'active',
            claimAnswer: null,
            claimContact: null
        });

        alert("❌ Reclamo rechazado. El objeto vuelve a estar activo en el plano.");
    };

    window.confirmarEntregaPin = function(id) {
        const item = reports.find(r => r.id === id);
        if (!item) return;

        const pinIngresado = prompt(`Ingresa el PIN de 4 dígitos proporcionado por el dueño al momento de la entrega:`);
        if (pinIngresado === null) return;

        if (pinIngresado.trim() === item.pin) {
            reportsRef.child(id).update({
                status: 'claimed'
            });
            alert("¡ENTREGA CONFIRMADA EXITOSAMENTE! 🎉\nEl reporte ha sido retirado.");
        } else {
            alert("❌ PIN incorrecto.");
        }
    };

    // Control de Formularios y Modales
    function abrirModalFormulario(tipo) {
        itemTypeVal.value = tipo;
        modalReportTitle.textContent = tipo === 'found' ? 'Reportar Objeto Encontrado 🟢' : 'Reportar Objeto Perdido 🔴';
        modalReport.classList.remove('hidden');
    }

    if (btnOpenReportFound) btnOpenReportFound.addEventListener('click', () => abrirModalFormulario('found'));
    if (btnOpenReportLost) btnOpenReportLost.addEventListener('click', () => abrirModalFormulario('lost'));
    if (closeReportModal) closeReportModal.addEventListener('click', () => modalReport.classList.add('hidden'));

    if (formReportItem) {
        formReportItem.addEventListener('submit', (e) => {
            e.preventDefault();
            pendingReportData = {
                title: document.getElementById('item-title').value.trim(),
                category: document.getElementById('item-category').value,
                location: document.getElementById('item-location').value.trim(),
                desc: document.getElementById('item-desc').value.trim(),
                question: document.getElementById('item-question').value.trim(),
                type: itemTypeVal.value
            };
            modalReport.classList.add('hidden');
            formReportItem.reset();
            activarModoPicker();
        });
    }

    function activarModoPicker() {
        isPickingLocation = true;
        mapPickerBanner.classList.remove('hidden');
        map.getContainer().style.cursor = 'crosshair';
    }

    function desactivarModoPicker() {
        isPickingLocation = false;
        pendingReportData = null;
        mapPickerBanner.classList.add('hidden');
        map.getContainer().style.cursor = '';
    }

    if (cancelPickerBtn) cancelPickerBtn.addEventListener('click', desactivarModoPicker);

    filterChips.forEach(chip => chip.addEventListener('click', (e) => {
        filterChips.forEach(c => c.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentFilter = e.currentTarget.getAttribute('data-filter');
        actualizarMapaYContadores();
    }));

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('ubi_session');
            currentUser = null;
            appContainer.classList.add('hidden');
            loginContainer.classList.remove('hidden');
        });
    }
});
