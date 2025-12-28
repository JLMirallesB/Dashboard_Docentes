/**
 * App.js - Módulo principal de la aplicación
 * Gestiona el estado global, navegación y eventos principales
 */

const App = (function() {
    // Estado global de la aplicación
    const state = {
        currentView: 'welcome',
        evaluaciones: [],
        selectedEvaluacion: null,
        profesor: null,
        etapa: null,
        centro: null
    };

    // Vistas disponibles
    const views = {
        welcome: WelcomeView,
        dashboard: DashboardView,
        asignaturas: AsignaturasView,
        cursos: CursosView,
        especialidades: EspecialidadesView,
        matriz: MatrizView,
        anova: AnovaView,
        evolucion: EvolucionView
    };

    /**
     * Inicializa la aplicación
     */
    function init() {
        // Cargar datos del localStorage
        loadStoredData();

        // Configurar event listeners
        setupEventListeners();

        // Renderizar vista inicial
        if (state.evaluaciones.length > 0) {
            navigateTo('dashboard');
            showAppControls(true);
        } else {
            navigateTo('welcome');
            showAppControls(false);
        }
    }

    /**
     * Carga datos guardados en localStorage
     */
    function loadStoredData() {
        const data = Storage.getAll();
        if (data && data.evaluaciones && data.evaluaciones.length > 0) {
            state.evaluaciones = data.evaluaciones;
            state.profesor = data.profesor;
            state.etapa = data.etapa;
            state.centro = data.centro;
            state.selectedEvaluacion = data.evaluaciones[0];
        }
    }

    /**
     * Configura los event listeners principales
     */
    function setupEventListeners() {
        // Navegación por sidebar
        document.querySelectorAll('.sidebar__link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.getAttribute('data-view');
                navigateTo(view);
                // Cerrar sidebar en móvil
                closeMobileSidebar();
            });
        });

        // Toggle sidebar colapsable
        const btnCollapse = document.getElementById('btn-collapse');
        if (btnCollapse) {
            btnCollapse.addEventListener('click', toggleSidebar);
        }

        // Menú hamburguesa para móvil
        const btnMenu = document.getElementById('btn-menu');
        if (btnMenu) {
            btnMenu.addEventListener('click', toggleMobileSidebar);
        }

        // Overlay del sidebar (móvil)
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', closeMobileSidebar);
        }

        // Toggle idioma
        document.getElementById('btn-lang').addEventListener('click', () => {
            I18n.toggleLang();
        });

        // Botón añadir CSV
        document.getElementById('btn-add-csv').addEventListener('click', () => {
            document.getElementById('file-input-csv').click();
        });

        // Botón exportar
        document.getElementById('btn-export').addEventListener('click', exportData);

        // Botón gestionar evaluaciones
        document.getElementById('btn-evaluaciones').addEventListener('click', showEvaluacionesModal);

        // Input de archivos CSV
        document.getElementById('file-input-csv').addEventListener('change', handleCSVUpload);

        // Input de archivos JSON
        document.getElementById('file-input-json').addEventListener('change', handleJSONImport);

        // Modal close
        document.getElementById('modal-close').addEventListener('click', closeModal);
        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeModal();
        });

        // Escape para cerrar modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeModal();
        });

        // Escuchar cambios de idioma
        document.addEventListener('langChange', () => {
            renderCurrentView();
        });
    }

    /**
     * Navega a una vista específica
     */
    function navigateTo(viewName) {
        if (!views[viewName]) {
            console.error(`View not found: ${viewName}`);
            return;
        }

        // Actualizar estado
        state.currentView = viewName;

        // Actualizar enlaces activos
        document.querySelectorAll('.sidebar__link').forEach(link => {
            link.classList.remove('sidebar__link--active');
            if (link.getAttribute('data-view') === viewName) {
                link.classList.add('sidebar__link--active');
            }
        });

        // Renderizar vista
        renderCurrentView();

        // Actualizar URL hash
        window.location.hash = viewName;
    }

    /**
     * Renderiza la vista actual
     */
    function renderCurrentView() {
        const mainContent = document.getElementById('main-content');
        const ViewModule = views[state.currentView];

        if (ViewModule && typeof ViewModule.render === 'function') {
            mainContent.innerHTML = '';
            ViewModule.render(mainContent, getViewData());
        }
    }

    /**
     * Obtiene los datos para pasar a las vistas
     */
    function getViewData() {
        return {
            evaluaciones: state.evaluaciones,
            selectedEvaluacion: state.selectedEvaluacion,
            profesor: state.profesor,
            etapa: state.etapa,
            centro: state.centro,
            allData: getAllData()
        };
    }

    /**
     * Obtiene todos los datos de todas las evaluaciones
     */
    function getAllData() {
        const allData = [];
        state.evaluaciones.forEach(ev => {
            ev.datos.forEach(row => {
                allData.push({
                    ...row,
                    _trimestre: ev.trimestre,
                    _fecha: ev.fecha,
                    _id: ev.id
                });
            });
        });
        return allData;
    }

    /**
     * Muestra/oculta los controles de la app (cuando hay datos)
     */
    function showAppControls(show) {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('main-content');
        const btnAddCsv = document.getElementById('btn-add-csv');
        const btnExport = document.getElementById('btn-export');
        const btnEvaluaciones = document.getElementById('btn-evaluaciones');
        const btnMenu = document.getElementById('btn-menu');

        if (show) {
            sidebar.style.display = 'block';
            mainContent.classList.remove('main-content--full');
            btnAddCsv.style.display = 'flex';
            btnExport.style.display = 'flex';
            btnEvaluaciones.style.display = 'flex';
            if (btnMenu) btnMenu.style.display = '';
        } else {
            sidebar.style.display = 'none';
            mainContent.classList.add('main-content--full');
            btnAddCsv.style.display = 'none';
            btnExport.style.display = 'none';
            btnEvaluaciones.style.display = 'none';
            if (btnMenu) btnMenu.style.display = 'none';
        }
    }

    /**
     * Toggle sidebar colapsable (desktop)
     */
    function toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('main-content');
        const isCollapsed = sidebar.classList.toggle('sidebar--collapsed');

        if (isCollapsed) {
            mainContent.classList.add('main-content--collapsed');
        } else {
            mainContent.classList.remove('main-content--collapsed');
        }

        // Guardar estado
        localStorage.setItem('sidebar_collapsed', isCollapsed);
    }

    /**
     * Toggle sidebar en móvil
     */
    function toggleMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        const isOpen = sidebar.classList.toggle('sidebar--open');

        if (isOpen) {
            overlay.classList.add('sidebar-overlay--visible');
        } else {
            overlay.classList.remove('sidebar-overlay--visible');
        }
    }

    /**
     * Cierra el sidebar en móvil
     */
    function closeMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        sidebar.classList.remove('sidebar--open');
        overlay.classList.remove('sidebar-overlay--visible');
    }

    /**
     * Restaura el estado del sidebar
     */
    function restoreSidebarState() {
        const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
        if (isCollapsed) {
            const sidebar = document.getElementById('sidebar');
            const mainContent = document.getElementById('main-content');
            sidebar.classList.add('sidebar--collapsed');
            mainContent.classList.add('main-content--collapsed');
        }
    }

    /**
     * Maneja la subida de archivos CSV
     */
    async function handleCSVUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            // Parsear CSV
            const result = await CSVParser.parse(file);

            // Mostrar modal para seleccionar trimestre
            showTrimestreModal(result);
        } catch (error) {
            UI.showToast(error.message, 'error');
        }

        // Limpiar input
        event.target.value = '';
    }

    /**
     * Muestra el modal para seleccionar trimestre
     */
    function showTrimestreModal(csvData) {
        const content = `
            <h2 class="modal__title">${I18n.t('trimestre.title')}</h2>
            <div class="form-group">
                <label class="form-label">${I18n.t('trimestre.label')}</label>
                <select id="trimestre-select" class="form-select">
                    <option value="T1">${I18n.t('trimestre.t1')}</option>
                    <option value="T2">${I18n.t('trimestre.t2')}</option>
                    <option value="T3">${I18n.t('trimestre.t3')}</option>
                </select>
            </div>
            <div class="modal__actions">
                <button class="btn" onclick="App.closeModal()">${I18n.t('trimestre.cancel')}</button>
                <button class="btn btn--primary" id="btn-confirm-trimestre">${I18n.t('trimestre.confirm')}</button>
            </div>
        `;

        showModal(content);

        document.getElementById('btn-confirm-trimestre').addEventListener('click', () => {
            const trimestre = document.getElementById('trimestre-select').value;
            processCsvData(csvData, trimestre);
            closeModal();
        });
    }

    /**
     * Procesa los datos del CSV y los guarda
     */
    function processCsvData(csvData, trimestre) {
        // Crear evaluación
        const evaluacion = {
            id: `${csvData.etapa}_${csvData.año}_${csvData.fecha}_${trimestre}`,
            etapa: csvData.etapa,
            año: csvData.año,
            fecha: csvData.fecha,
            trimestre: trimestre,
            datos: csvData.datos
        };

        // Verificar duplicado
        const isDuplicate = state.evaluaciones.some(ev => ev.id === evaluacion.id);
        if (isDuplicate) {
            UI.showToast(I18n.t('errors.duplicado'), 'error');
            return;
        }

        // Actualizar estado
        state.evaluaciones.push(evaluacion);
        state.selectedEvaluacion = evaluacion;
        state.profesor = csvData.profesor;
        state.etapa = csvData.etapa;
        state.centro = csvData.centro;

        // Guardar en localStorage
        Storage.saveAll({
            evaluaciones: state.evaluaciones,
            profesor: state.profesor,
            etapa: state.etapa,
            centro: state.centro
        });

        // Mostrar controles y navegar al dashboard
        showAppControls(true);
        navigateTo('dashboard');

        UI.showToast(I18n.t('success.csvCargado'), 'success');
    }

    /**
     * Maneja la importación de JSON
     */
    async function handleJSONImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const data = await Storage.importFromJSON(file);

            // Actualizar estado
            state.evaluaciones = data.evaluaciones;
            state.profesor = data.profesor;
            state.etapa = data.etapa || data.evaluaciones[0]?.etapa;
            state.centro = data.centro || data.evaluaciones[0]?.datos[0]?.Centro;
            state.selectedEvaluacion = data.evaluaciones[0];

            // Guardar en localStorage
            Storage.saveAll({
                evaluaciones: state.evaluaciones,
                profesor: state.profesor,
                etapa: state.etapa,
                centro: state.centro
            });

            // Mostrar controles y navegar
            showAppControls(true);
            navigateTo('dashboard');

            UI.showToast(I18n.t('success.jsonImportado'), 'success');
        } catch (error) {
            UI.showToast(error.message, 'error');
        }

        event.target.value = '';
    }

    /**
     * Exporta todos los datos a JSON
     */
    function exportData() {
        const data = {
            version: '1.0',
            exportDate: new Date().toISOString().split('T')[0],
            profesor: state.profesor,
            etapa: state.etapa,
            centro: state.centro,
            evaluaciones: state.evaluaciones
        };

        Storage.exportToJSON(data, `dashboard_${state.profesor || 'datos'}_${data.exportDate}.json`);
        UI.showToast(I18n.t('success.datosExportados'), 'success');
    }

    /**
     * Muestra el modal de gestión de evaluaciones
     */
    function showEvaluacionesModal() {
        let listHTML = '';

        if (state.evaluaciones.length === 0) {
            listHTML = `<p class="text-muted">${I18n.t('evaluaciones.vacia')}</p>`;
        } else {
            listHTML = '<div class="evaluaciones-list">';
            state.evaluaciones.forEach(ev => {
                listHTML += `
                    <div class="evaluacion-item">
                        <div class="evaluacion-item__info">
                            <span class="evaluacion-item__title">${ev.trimestre} - ${ev.etapa}</span>
                            <span class="evaluacion-item__meta">${ev.año} | ${ev.fecha}</span>
                        </div>
                        <button class="btn btn--danger btn--icon" onclick="App.deleteEvaluacion('${ev.id}')" title="${I18n.t('evaluaciones.eliminar')}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                `;
            });
            listHTML += '</div>';
        }

        const storageInfo = Storage.getStorageUsage();

        const content = `
            <h2 class="modal__title">${I18n.t('evaluaciones.title')}</h2>
            ${listHTML}
            <div class="mt-lg">
                <p class="text-muted text-sm">${I18n.t('evaluaciones.espacio')}: ${storageInfo.usedFormatted} / ${storageInfo.totalFormatted}</p>
            </div>
            <div class="modal__actions">
                <button class="btn btn--danger" onclick="App.clearAllData()">${I18n.t('evaluaciones.limpiar')}</button>
                <button class="btn" onclick="App.closeModal()">${I18n.t('common.cerrar')}</button>
            </div>
        `;

        showModal(content);
    }

    /**
     * Elimina una evaluación
     */
    function deleteEvaluacion(id) {
        state.evaluaciones = state.evaluaciones.filter(ev => ev.id !== id);

        if (state.evaluaciones.length === 0) {
            Storage.clearAll();
            state.selectedEvaluacion = null;
            state.profesor = null;
            state.etapa = null;
            state.centro = null;
            closeModal();
            showAppControls(false);
            navigateTo('welcome');
        } else {
            state.selectedEvaluacion = state.evaluaciones[0];
            Storage.saveAll({
                evaluaciones: state.evaluaciones,
                profesor: state.profesor,
                etapa: state.etapa,
                centro: state.centro
            });
            showEvaluacionesModal(); // Refrescar modal
        }

        UI.showToast(I18n.t('success.evaluacionEliminada'), 'success');
    }

    /**
     * Limpia todos los datos
     */
    function clearAllData() {
        if (confirm(I18n.t('evaluaciones.confirmarEliminar'))) {
            Storage.clearAll();
            state.evaluaciones = [];
            state.selectedEvaluacion = null;
            state.profesor = null;
            state.etapa = null;
            state.centro = null;
            closeModal();
            showAppControls(false);
            navigateTo('welcome');
        }
    }

    /**
     * Selecciona una evaluación como activa
     */
    function selectEvaluacion(id) {
        const ev = state.evaluaciones.find(e => e.id === id);
        if (ev) {
            state.selectedEvaluacion = ev;
            renderCurrentView();
        }
    }

    /**
     * Muestra un modal
     */
    function showModal(content) {
        const overlay = document.getElementById('modal-overlay');
        const modalContent = document.getElementById('modal-content');

        modalContent.innerHTML = content;
        overlay.style.display = 'flex';

        // Forzar reflow para animación
        overlay.offsetHeight;
        overlay.classList.add('modal-overlay--visible');

        // Focus trap
        const focusable = overlay.querySelectorAll('button, input, select, textarea');
        if (focusable.length) focusable[0].focus();
    }

    /**
     * Cierra el modal
     */
    function closeModal() {
        const overlay = document.getElementById('modal-overlay');
        overlay.classList.remove('modal-overlay--visible');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 250);
    }

    /**
     * Obtiene el estado actual
     */
    function getState() {
        return { ...state };
    }

    // Inicializar cuando el DOM esté listo
    document.addEventListener('DOMContentLoaded', () => {
        // Restaurar estado del sidebar
        restoreSidebarState();

        // Esperar a que i18n esté listo
        setTimeout(init, 100);
    });

    // API pública
    return {
        init,
        navigateTo,
        getState,
        selectEvaluacion,
        deleteEvaluacion,
        clearAllData,
        showModal,
        closeModal,
        handleCSVUpload,
        handleJSONImport
    };
})();
