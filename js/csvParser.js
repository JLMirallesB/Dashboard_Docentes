/**
 * CSVParser - Módulo para parsear y validar archivos CSV
 * Utiliza PapaParse para el parsing
 */

const CSVParser = (function() {
    // Columnas requeridas en el CSV
    const REQUIRED_COLUMNS = [
        'Tipo_Agregacion',
        'Profesor',
        'Etapa',
        'Año_Academico',
        'Centro',
        'Fecha_Generacion',
        'Dimension1',
        'Dimension2',
        'N',
        'Media'
    ];

    // Columnas numéricas
    const NUMERIC_COLUMNS = [
        'N', 'Sin_Evaluar', 'Media', 'Desv_Tipica', 'Coef_Variacion',
        'Moda', 'Mediana', 'P25', 'P75', 'Min', 'Max',
        'Notas_1', 'Notas_2', 'Notas_3', 'Notas_4', 'Notas_5',
        'Notas_6', 'Notas_7', 'Notas_8', 'Notas_9', 'Notas_10',
        'Aprobados', 'Suspensos', 'Pct_Aprobados', 'Pct_Suspensos'
    ];

    /**
     * Parsea un archivo CSV
     * @param {File} file - Archivo CSV a parsear
     * @returns {Promise<Object>} - Objeto con los datos parseados
     */
    function parse(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error(I18n.t('errors.archivoVacio')));
                return;
            }

            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                encoding: 'UTF-8',
                complete: (results) => {
                    try {
                        const validated = validateAndProcess(results.data, results.meta.fields);
                        resolve(validated);
                    } catch (error) {
                        reject(error);
                    }
                },
                error: (error) => {
                    reject(new Error(I18n.t('errors.csvInvalido') + ': ' + error.message));
                }
            });
        });
    }

    /**
     * Valida y procesa los datos del CSV
     */
    function validateAndProcess(data, fields) {
        // Verificar que hay datos
        if (!data || data.length === 0) {
            throw new Error(I18n.t('errors.archivoVacio'));
        }

        // Verificar columnas requeridas
        const missingColumns = REQUIRED_COLUMNS.filter(col => !fields.includes(col));
        if (missingColumns.length > 0) {
            throw new Error(I18n.t('errors.columnasFaltantes', { columns: missingColumns.join(', ') }));
        }

        // Procesar filas
        const processedData = data
            .filter(row => row.Dimension1 && row.Dimension1.trim() !== '') // Ignorar filas vacías
            .map(row => processRow(row));

        if (processedData.length === 0) {
            throw new Error(I18n.t('errors.archivoVacio'));
        }

        // Extraer metadatos del primer registro
        const firstRow = processedData[0];

        return {
            profesor: cleanString(firstRow.Profesor),
            etapa: cleanString(firstRow.Etapa),
            año: cleanString(firstRow.Año_Academico),
            centro: cleanString(firstRow.Centro),
            fecha: cleanString(firstRow.Fecha_Generacion),
            datos: processedData
        };
    }

    /**
     * Procesa una fila individual
     */
    function processRow(row) {
        const processed = {};

        for (const [key, value] of Object.entries(row)) {
            if (NUMERIC_COLUMNS.includes(key)) {
                processed[key] = parseNumericValue(value);
            } else {
                processed[key] = cleanString(value);
            }
        }

        return processed;
    }

    /**
     * Convierte un valor a número
     */
    function parseNumericValue(value) {
        if (value === null || value === undefined || value === '' || value === '-') {
            return null;
        }

        // Reemplazar coma por punto para decimales
        const cleaned = String(value).replace(',', '.').trim();
        const num = parseFloat(cleaned);

        return isNaN(num) ? null : num;
    }

    /**
     * Limpia un string
     */
    function cleanString(value) {
        if (value === null || value === undefined) {
            return '';
        }
        return String(value).trim();
    }

    /**
     * Obtiene los tipos de agregación únicos
     */
    function getAggregationTypes(data) {
        const types = new Set(data.map(row => row.Tipo_Agregacion));
        return Array.from(types);
    }

    /**
     * Filtra datos por tipo de agregación
     */
    function filterByType(data, type) {
        return data.filter(row => row.Tipo_Agregacion === type);
    }

    /**
     * Obtiene valores únicos de una dimensión
     */
    function getUniqueDimension1(data, type) {
        const filtered = type ? filterByType(data, type) : data;
        const values = new Set(filtered.map(row => row.Dimension1).filter(v => v && v !== 'TODOS'));
        return Array.from(values).sort();
    }

    /**
     * Obtiene valores únicos de Dimension2
     */
    function getUniqueDimension2(data, type) {
        const filtered = type ? filterByType(data, type) : data;
        const values = new Set(filtered.map(row => row.Dimension2).filter(v => v && v !== 'TODOS'));
        return Array.from(values).sort();
    }

    /**
     * Obtiene el registro Global
     */
    function getGlobalData(data) {
        return data.find(row => row.Tipo_Agregacion === 'Global');
    }

    /**
     * Obtiene datos por asignatura
     */
    function getAsignaturas(data) {
        return filterByType(data, 'Por_Asignatura');
    }

    /**
     * Obtiene datos por curso
     */
    function getCursos(data) {
        return filterByType(data, 'Por_Curso');
    }

    /**
     * Obtiene datos por especialidad
     */
    function getEspecialidades(data) {
        return filterByType(data, 'Por_Especialidad');
    }

    /**
     * Obtiene datos de la matriz curso x especialidad
     */
    function getMatriz(data) {
        return filterByType(data, 'Por_Curso_Especialidad');
    }

    /**
     * Obtiene datos ANOVA
     */
    function getANOVA(data) {
        const cursos = filterByType(data, 'ANOVA_Cursos');
        const especialidades = filterByType(data, 'ANOVA_Especialidades');
        return { cursos, especialidades };
    }

    // API pública
    return {
        parse,
        filterByType,
        getAggregationTypes,
        getUniqueDimension1,
        getUniqueDimension2,
        getGlobalData,
        getAsignaturas,
        getCursos,
        getEspecialidades,
        getMatriz,
        getANOVA
    };
})();
