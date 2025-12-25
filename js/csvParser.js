/**
 * CSVParser - Módulo para parsear y validar archivos CSV
 * Utiliza PapaParse para el parsing
 * Soporta delimitadores ; y , automáticamente
 */

const CSVParser = (function() {
    // Columnas requeridas en el CSV (con variantes de encoding)
    const REQUIRED_COLUMNS_VARIANTS = {
        'Tipo_Agregacion': ['Tipo_Agregacion', 'Tipo_Analisis'],
        'Profesor': ['Profesor'],
        'Etapa': ['Etapa'],
        'Año_Academico': ['Año_Academico', 'AÃ±o_Academico', 'Ano_Academico'],
        'Centro': ['Centro'],
        'Fecha_Generacion': ['Fecha_Generacion', 'Fecha_Generación'],
        'Dimension1': ['Dimension1', 'Asignatura'],
        'Dimension2': ['Dimension2', 'Dimension_Analizada']
    };

    // Columnas numéricas
    const NUMERIC_COLUMNS = [
        'N', 'Sin_Evaluar', 'Media', 'Desv_Tipica', 'Coef_Variacion',
        'Moda', 'Mediana', 'P25', 'P75', 'Min', 'Max',
        'Notas_1', 'Notas_2', 'Notas_3', 'Notas_4', 'Notas_5',
        'Notas_6', 'Notas_7', 'Notas_8', 'Notas_9', 'Notas_10',
        'Aprobados', 'Suspensos', 'Pct_Aprobados', 'Pct_Suspensos',
        'Grupos_Con_Datos', 'Diferencia_Medias'
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

            // Primero leer el archivo como texto para preprocesarlo
            const reader = new FileReader();

            reader.onload = (event) => {
                try {
                    let content = event.target.result;

                    // Preprocesar el contenido
                    content = preprocessCSV(content);

                    // Parsear con PapaParse
                    const results = Papa.parse(content, {
                        header: true,
                        skipEmptyLines: 'greedy',
                        delimiter: detectDelimiter(content),
                        transformHeader: normalizeHeader
                    });

                    if (results.errors.length > 0) {
                        console.warn('CSV parse warnings:', results.errors);
                    }

                    const validated = validateAndProcess(results.data, results.meta.fields);
                    resolve(validated);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(new Error(I18n.t('errors.csvInvalido')));
            };

            reader.readAsText(file, 'UTF-8');
        });
    }

    /**
     * Detecta el delimitador del CSV
     */
    function detectDelimiter(content) {
        const firstLines = content.split('\n').slice(0, 10).join('\n');
        const semicolonCount = (firstLines.match(/;/g) || []).length;
        const commaCount = (firstLines.match(/,/g) || []).length;

        return semicolonCount > commaCount ? ';' : ',';
    }

    /**
     * Preprocesa el contenido del CSV
     */
    function preprocessCSV(content) {
        // Eliminar BOM si existe
        content = content.replace(/^\uFEFF/, '');

        // Dividir en líneas
        let lines = content.split(/\r?\n/);

        // Encontrar la línea que contiene los headers reales
        let headerIndex = -1;
        for (let i = 0; i < Math.min(lines.length, 10); i++) {
            const line = lines[i];
            // Buscar línea que contenga "Tipo_Agregacion" o "Tipo_Analisis"
            if (line.includes('Tipo_Agregacion') || line.includes('Tipo_Analisis')) {
                headerIndex = i;
                break;
            }
        }

        // Si encontramos headers, eliminar líneas anteriores
        if (headerIndex > 0) {
            lines = lines.slice(headerIndex);
        }

        // Filtrar líneas que son solo separadores o comentarios
        lines = lines.filter(line => {
            const trimmed = line.trim();
            // Eliminar líneas vacías, solo delimitadores, o que empiezan con "---"
            if (!trimmed) return false;
            if (/^[;,\s]+$/.test(trimmed)) return false;
            if (trimmed.startsWith('---')) return false;
            if (trimmed.startsWith('EXPORTACI')) return false;
            if (trimmed.startsWith('Esta hoja')) return false;
            return true;
        });

        return lines.join('\n');
    }

    /**
     * Normaliza el nombre de una columna
     */
    function normalizeHeader(header) {
        if (!header) return header;

        // Limpiar espacios
        let normalized = header.trim();

        // Corregir problemas de encoding comunes
        normalized = normalized
            .replace(/Ã±/g, 'ñ')
            .replace(/Ã³/g, 'ó')
            .replace(/Ã­/g, 'í')
            .replace(/Ã¡/g, 'á')
            .replace(/Ã©/g, 'é')
            .replace(/Ãº/g, 'ú')
            .replace(/Ã'/g, 'Ñ')
            .replace(/ï»¿/g, '');

        // Mapear variantes a nombres estándar
        for (const [standard, variants] of Object.entries(REQUIRED_COLUMNS_VARIANTS)) {
            if (variants.includes(normalized)) {
                return standard;
            }
        }

        return normalized;
    }

    /**
     * Valida y procesa los datos del CSV
     */
    function validateAndProcess(data, fields) {
        // Verificar que hay datos
        if (!data || data.length === 0) {
            throw new Error(I18n.t('errors.archivoVacio'));
        }

        // Normalizar campos
        const normalizedFields = fields.map(normalizeHeader);

        // Verificar columnas mínimas requeridas
        const requiredBasic = ['Tipo_Agregacion', 'Profesor', 'Etapa'];
        const missingColumns = requiredBasic.filter(col => !normalizedFields.includes(col));

        if (missingColumns.length > 0) {
            throw new Error(I18n.t('errors.columnasFaltantes', { columns: missingColumns.join(', ') }));
        }

        // Procesar filas - separar datos normales y ANOVA
        const normalData = [];
        const anovaData = [];

        data.forEach(row => {
            // Normalizar claves de la fila
            const normalizedRow = {};
            for (const [key, value] of Object.entries(row)) {
                const normalizedKey = normalizeHeader(key);
                normalizedRow[normalizedKey] = value;
            }

            const tipo = cleanString(normalizedRow.Tipo_Agregacion);

            // Ignorar filas sin tipo o con Dimension1/Asignatura vacía o "0"
            const dimension = cleanString(normalizedRow.Dimension1 || normalizedRow.Asignatura || '');
            if (!tipo || !dimension || dimension === '0' || dimension === '') {
                return;
            }

            // Separar ANOVA de datos normales
            if (tipo.startsWith('ANOVA')) {
                anovaData.push(processAnovaRow(normalizedRow));
            } else {
                normalData.push(processRow(normalizedRow));
            }
        });

        // Combinar datos
        const allData = [...normalData, ...anovaData];

        if (allData.length === 0) {
            throw new Error(I18n.t('errors.archivoVacio'));
        }

        // Extraer metadatos del primer registro normal o ANOVA
        const firstRow = normalData[0] || anovaData[0];

        return {
            profesor: cleanString(firstRow.Profesor),
            etapa: cleanString(firstRow.Etapa),
            año: cleanString(firstRow.Año_Academico),
            centro: cleanString(firstRow.Centro),
            fecha: cleanString(firstRow.Fecha_Generacion) || new Date().toISOString().split('T')[0],
            datos: allData
        };
    }

    /**
     * Procesa una fila normal
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
     * Procesa una fila de ANOVA (tiene estructura diferente)
     */
    function processAnovaRow(row) {
        return {
            Tipo_Agregacion: cleanString(row.Tipo_Agregacion),
            Profesor: cleanString(row.Profesor),
            Etapa: cleanString(row.Etapa),
            Año_Academico: cleanString(row.Año_Academico),
            Centro: cleanString(row.Centro),
            Fecha_Generacion: cleanString(row.Fecha_Generacion),
            Dimension1: cleanString(row.Dimension1 || row.Asignatura),
            Dimension2: cleanString(row.Dimension2 || row.Dimension_Analizada),
            N: parseNumericValue(row.Grupos_Con_Datos || row.N),
            Sin_Evaluar: cleanString(row.Calculable || row.Sin_Evaluar),
            Media: parseNumericValue(row.Diferencia_Medias || row.Media),
            Desv_Tipica: cleanString(row.Interpretacion || row.Desv_Tipica)
        };
    }

    /**
     * Convierte un valor a número
     */
    function parseNumericValue(value) {
        if (value === null || value === undefined || value === '' || value === '-' || value === 'N/A') {
            return null;
        }

        // Reemplazar coma por punto para decimales
        const cleaned = String(value).replace(/,/g, '.').trim();
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
        let str = String(value).trim();

        // Corregir encoding
        str = str
            .replace(/Ã±/g, 'ñ')
            .replace(/Ã³/g, 'ó')
            .replace(/Ã­/g, 'í')
            .replace(/Ã¡/g, 'á')
            .replace(/Ã©/g, 'é')
            .replace(/Ãº/g, 'ú')
            .replace(/Ã'/g, 'Ñ')
            .replace(/Ã"/g, 'Ó')
            .replace(/Ã/g, 'Í');

        return str;
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
