/**
 * WelcomeView - Pantalla de bienvenida
 * Se muestra cuando no hay datos cargados
 */

const WelcomeView = (function() {
    /**
     * Renderiza la vista de bienvenida
     */
    function render(container, data) {
        container.innerHTML = `
            <div class="welcome">
                <svg class="welcome__icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                </svg>

                <h2 class="welcome__title" data-i18n="welcome.title">${I18n.t('welcome.title')}</h2>
                <p class="welcome__subtitle" data-i18n="welcome.subtitle">${I18n.t('welcome.subtitle')}</p>

                <div class="dropzone" id="dropzone" tabindex="0" role="button" aria-label="${I18n.t('welcome.dropzone.text')}">
                    <svg class="dropzone__icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    <p class="dropzone__text" data-i18n="welcome.dropzone.text">${I18n.t('welcome.dropzone.text')}</p>
                    <p class="dropzone__hint" data-i18n="welcome.dropzone.hint">${I18n.t('welcome.dropzone.hint')}</p>
                </div>

                <div class="welcome__divider">
                    <span data-i18n="welcome.or">${I18n.t('welcome.or')}</span>
                </div>

                <button class="btn btn--lg" id="btn-import-json">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    <span data-i18n="welcome.importJson">${I18n.t('welcome.importJson')}</span>
                </button>
            </div>
        `;

        // Configurar eventos
        setupDropzone();
        setupImportButton();
    }

    /**
     * Configura el área de drag & drop
     */
    function setupDropzone() {
        const dropzone = document.getElementById('dropzone');
        const fileInput = document.getElementById('file-input-csv');

        // Click para seleccionar archivo
        dropzone.addEventListener('click', () => {
            fileInput.click();
        });

        // Keyboard accessibility
        dropzone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInput.click();
            }
        });

        // Drag events
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dropzone--active');
        });

        dropzone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dropzone--active');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dropzone--active');

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (file.name.endsWith('.csv')) {
                    handleFile(file);
                } else {
                    UI.showToast(I18n.t('errors.csvInvalido'), 'error');
                }
            }
        });
    }

    /**
     * Configura el botón de importar JSON
     */
    function setupImportButton() {
        const btn = document.getElementById('btn-import-json');
        const fileInput = document.getElementById('file-input-json');

        btn.addEventListener('click', () => {
            fileInput.click();
        });
    }

    /**
     * Maneja un archivo CSV subido
     */
    async function handleFile(file) {
        try {
            const result = await CSVParser.parse(file);

            // Mostrar modal para seleccionar trimestre
            showTrimestreModal(result);
        } catch (error) {
            UI.showToast(error.message, 'error');
        }
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
            <div class="mt-md" style="background: var(--color-bg-secondary); padding: var(--spacing-md); border-radius: var(--radius-md);">
                <p><strong>${I18n.t('common.media')}:</strong> ${csvData.profesor}</p>
                <p><strong>Etapa:</strong> ${csvData.etapa}</p>
                <p><strong>${I18n.t('dashboard.kpi.total')}:</strong> ${csvData.año}</p>
            </div>
            <div class="modal__actions">
                <button class="btn" id="btn-cancel-trimestre">${I18n.t('trimestre.cancel')}</button>
                <button class="btn btn--primary" id="btn-confirm-trimestre">${I18n.t('trimestre.confirm')}</button>
            </div>
        `;

        App.showModal(content);

        document.getElementById('btn-cancel-trimestre').addEventListener('click', () => {
            App.closeModal();
        });

        document.getElementById('btn-confirm-trimestre').addEventListener('click', () => {
            const trimestre = document.getElementById('trimestre-select').value;

            // Crear evaluación
            const evaluacion = {
                id: `${csvData.etapa}_${csvData.año}_${csvData.fecha}_${trimestre}`,
                etapa: csvData.etapa,
                año: csvData.año,
                fecha: csvData.fecha,
                trimestre: trimestre,
                datos: csvData.datos
            };

            // Guardar en storage
            const currentData = Storage.getAll() || { evaluaciones: [] };

            // Verificar duplicado
            if (currentData.evaluaciones.some(ev => ev.id === evaluacion.id)) {
                UI.showToast(I18n.t('errors.duplicado'), 'error');
                App.closeModal();
                return;
            }

            currentData.evaluaciones.push(evaluacion);
            currentData.profesor = csvData.profesor;
            currentData.etapa = csvData.etapa;
            currentData.centro = csvData.centro;

            Storage.saveAll(currentData);

            App.closeModal();

            // Recargar la app
            location.reload();
        });
    }

    // API pública
    return {
        render
    };
})();
