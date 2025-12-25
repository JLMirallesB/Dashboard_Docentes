/**
 * Storage - Módulo para gestionar la persistencia de datos
 * Usa localStorage para almacenar evaluaciones
 */

const Storage = (function() {
    const STORAGE_KEY = 'dashboard_docentes_data';
    const MAX_STORAGE_MB = 5; // Límite aproximado de localStorage

    /**
     * Guarda todos los datos
     */
    function saveAll(data) {
        try {
            const json = JSON.stringify(data);
            localStorage.setItem(STORAGE_KEY, json);
            return true;
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                throw new Error(I18n.t('errors.storageLimit'));
            }
            throw error;
        }
    }

    /**
     * Obtiene todos los datos guardados
     */
    function getAll() {
        try {
            const json = localStorage.getItem(STORAGE_KEY);
            return json ? JSON.parse(json) : null;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return null;
        }
    }

    /**
     * Limpia todos los datos
     */
    function clearAll() {
        localStorage.removeItem(STORAGE_KEY);
    }

    /**
     * Guarda una evaluación
     */
    function saveEvaluacion(evaluacion) {
        const data = getAll() || { evaluaciones: [] };

        // Verificar duplicado
        const existingIndex = data.evaluaciones.findIndex(ev => ev.id === evaluacion.id);
        if (existingIndex >= 0) {
            data.evaluaciones[existingIndex] = evaluacion;
        } else {
            data.evaluaciones.push(evaluacion);
        }

        saveAll(data);
    }

    /**
     * Obtiene todas las evaluaciones
     */
    function getEvaluaciones() {
        const data = getAll();
        return data?.evaluaciones || [];
    }

    /**
     * Elimina una evaluación
     */
    function deleteEvaluacion(id) {
        const data = getAll();
        if (data && data.evaluaciones) {
            data.evaluaciones = data.evaluaciones.filter(ev => ev.id !== id);
            saveAll(data);
        }
    }

    /**
     * Verifica si existe un duplicado
     */
    function checkDuplicate(etapa, año, fecha, trimestre) {
        const data = getAll();
        if (!data || !data.evaluaciones) return false;

        const id = `${etapa}_${año}_${fecha}_${trimestre}`;
        return data.evaluaciones.some(ev => ev.id === id);
    }

    /**
     * Obtiene información del uso de almacenamiento
     */
    function getStorageUsage() {
        let total = 0;

        for (const key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage.getItem(key).length * 2; // UTF-16 = 2 bytes por caracter
            }
        }

        const usedMB = total / (1024 * 1024);
        const percentage = (usedMB / MAX_STORAGE_MB) * 100;

        return {
            usedBytes: total,
            usedMB: usedMB.toFixed(2),
            usedFormatted: formatBytes(total),
            totalFormatted: `${MAX_STORAGE_MB} MB`,
            percentage: percentage.toFixed(1),
            isNearLimit: percentage > 80
        };
    }

    /**
     * Formatea bytes a una cadena legible
     */
    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Exporta todos los datos a un archivo JSON
     */
    function exportToJSON(data, filename) {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'dashboard_docentes_export.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Importa datos desde un archivo JSON
     */
    function importFromJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);

                    // Validar estructura
                    if (!data.evaluaciones || !Array.isArray(data.evaluaciones)) {
                        throw new Error(I18n.t('errors.jsonInvalido'));
                    }

                    // Validar que cada evaluación tiene los campos necesarios
                    for (const ev of data.evaluaciones) {
                        if (!ev.id || !ev.datos || !Array.isArray(ev.datos)) {
                            throw new Error(I18n.t('errors.jsonInvalido'));
                        }
                    }

                    resolve(data);
                } catch (error) {
                    reject(new Error(I18n.t('errors.jsonInvalido')));
                }
            };

            reader.onerror = () => {
                reject(new Error(I18n.t('errors.jsonInvalido')));
            };

            reader.readAsText(file);
        });
    }

    // API pública
    return {
        saveAll,
        getAll,
        clearAll,
        saveEvaluacion,
        getEvaluaciones,
        deleteEvaluacion,
        checkDuplicate,
        getStorageUsage,
        exportToJSON,
        importFromJSON
    };
})();
