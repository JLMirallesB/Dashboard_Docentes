/**
 * CursosView - Vista de análisis por curso
 */

const CursosView = (function() {
    let currentCurso = null;

    /**
     * Renderiza la vista
     */
    function render(container, data) {
        const { selectedEvaluacion } = data;

        if (!selectedEvaluacion || !selectedEvaluacion.datos) {
            container.innerHTML = UI.createEmptyState(I18n.t('welcome.noData'));
            return;
        }

        // Obtener datos
        const cursos = CSVParser.getCursos(selectedEvaluacion.datos);
        const cursoAsignaturas = CSVParser.getCursoAsignaturas(selectedEvaluacion.datos);
        const globalData = CSVParser.getGlobalData(selectedEvaluacion.datos);

        const cursosGlobales = cursos.filter(c => !c.Dimension2 || c.Dimension2 === 'TODOS');

        if (!cursosGlobales || cursosGlobales.length === 0) {
            container.innerHTML = UI.createEmptyState(I18n.t('welcome.noData'));
            return;
        }

        // Ordenar cursos
        const cursosOrdenados = sortCursos(cursosGlobales);
        const listaCursos = cursosOrdenados.map(c => c.Dimension1);

        // Selector
        const selectorOptions = [
            { value: '', label: I18n.t('cursos.all') },
            ...listaCursos.map(c => ({ value: c, label: c }))
        ];

        container.innerHTML = `
            ${UI.createSectionHeader(I18n.t('cursos.title'))}

            ${UI.createSelector({
                id: 'curso-selector',
                label: I18n.t('cursos.select'),
                options: selectorOptions,
                selected: currentCurso || ''
            })}

            <div id="curso-detail"></div>

            <div class="chart-container mt-lg">
                <h3 class="chart-container__title">${I18n.t('cursos.comparativa')}</h3>
                <div class="chart-wrapper">
                    <canvas id="chart-cursos"></canvas>
                </div>
            </div>

            <div class="card mt-lg">
                <h3 class="chart-container__title mb-md">${I18n.t('cursos.all')}</h3>
                ${createCursosTable(cursosOrdenados, globalData)}
            </div>
        `;

        // Crear gráfico comparativo
        createComparisonChart(cursosOrdenados);

        // Setup selector
        document.getElementById('curso-selector').addEventListener('change', (e) => {
            currentCurso = e.target.value;
            updateDetail(cursosGlobales, cursoAsignaturas, globalData);
        });

        // Mostrar detalle inicial
        updateDetail(cursosGlobales, cursoAsignaturas, globalData);
    }

    /**
     * Ordena los cursos por etapa y número
     */
    function sortCursos(cursos) {
        return [...cursos].sort((a, b) => {
            // Determinar etapa: usar campo Etapa si existe, o detectar del nombre
            const aEtapa = (a.Etapa === 'EEM' || a.Dimension1.includes('EEM')) ? 0 : 1;
            const bEtapa = (b.Etapa === 'EEM' || b.Dimension1.includes('EEM')) ? 0 : 1;

            // Extraer número del curso (ej: "2EPM" -> 2)
            const aNum = parseInt(a.Dimension1.replace(/[^\d]/g, '')) || 0;
            const bNum = parseInt(b.Dimension1.replace(/[^\d]/g, '')) || 0;

            if (aEtapa !== bEtapa) return aEtapa - bEtapa;
            return aNum - bNum;
        });
    }

    /**
     * Actualiza el detalle del curso seleccionado
     */
    function updateDetail(cursos, cursoAsignaturas, globalData) {
        const detailContainer = document.getElementById('curso-detail');

        if (!currentCurso) {
            detailContainer.innerHTML = '';
            return;
        }

        const curso = cursos.find(c => c.Dimension1 === currentCurso);
        if (!curso) {
            detailContainer.innerHTML = '';
            return;
        }

        const mediaColor = UI.getColorForValue(curso.Media);
        const diffMedia = curso.Media - (globalData?.Media || 0);
        const diffText = diffMedia >= 0 ? `+${diffMedia.toFixed(2)}` : diffMedia.toFixed(2);
        const diffClass = diffMedia >= 0 ? 'text-success' : 'text-danger';
        const distMinMax = UI.getMinMaxFromNotas(curso);
        const minValue = distMinMax.min !== null ? distMinMax.min : curso.Min;
        const maxValue = distMinMax.max !== null ? distMinMax.max : curso.Max;

        const asignaturasDelCurso = cursoAsignaturas.filter(row => row.Dimension1 === currentCurso);
        const cursoAsignaturasHtml = asignaturasDelCurso.length > 0
            ? createCursoAsignaturasTable(asignaturasDelCurso)
            : `<p class="text-muted">${I18n.t('cursos.noSubjectBreakdown')}</p>`;

        detailContainer.innerHTML = `
            <div class="kpi-grid mt-lg">
                ${UI.createKPICard({
                    title: I18n.t('common.media'),
                    value: UI.formatNumber(curso.Media),
                    subtitle: `<span class="${diffClass}">${diffText} vs global</span>`,
                    indicator: mediaColor
                })}

                ${UI.createKPICard({
                    title: I18n.t('dashboard.kpi.aprobados'),
                    value: UI.formatPercent(curso.Pct_Aprobados),
                    subtitle: `${curso.Aprobados || 0} de ${curso.N}`,
                    indicator: 'success'
                })}

                ${UI.createKPICard({
                    title: I18n.t('dashboard.kpi.total'),
                    value: curso.N || 0
                })}

                ${UI.createKPICard({
                    title: I18n.t('dashboard.kpi.desviacion'),
                    value: UI.formatNumber(curso.Desv_Tipica),
                    subtitle: UI.getDeviationText(curso.Desv_Tipica),
                    indicator: UI.getColorForDeviation(curso.Desv_Tipica)
                })}
            </div>

            <div class="card mt-md">
                <h4 class="mb-sm">${I18n.t('dashboard.percentiles')}</h4>
                <div class="percentiles-row">
                    <div class="percentile-item">
                        <span class="percentile-label">${I18n.t('common.min')}</span>
                        <span class="percentile-value">${UI.formatNumber(minValue)}</span>
                    </div>
                    <div class="percentile-item">
                        <span class="percentile-label">${I18n.t('common.p25')}</span>
                        <span class="percentile-value">${UI.formatNumber(curso.P25)}</span>
                    </div>
                    <div class="percentile-item">
                        <span class="percentile-label">${I18n.t('common.mediana')}</span>
                        <span class="percentile-value">${UI.formatNumber(curso.Mediana)}</span>
                    </div>
                    <div class="percentile-item">
                        <span class="percentile-label">${I18n.t('common.p75')}</span>
                        <span class="percentile-value">${UI.formatNumber(curso.P75)}</span>
                    </div>
                    <div class="percentile-item">
                        <span class="percentile-label">${I18n.t('common.max')}</span>
                        <span class="percentile-value">${UI.formatNumber(maxValue)}</span>
                    </div>
                </div>
            </div>

            <div class="chart-container mt-lg">
                <h3 class="chart-container__title">${I18n.t('dashboard.distribucion')}</h3>
                <div class="chart-wrapper">
                    <canvas id="chart-curso-dist"></canvas>
                </div>
            </div>

            <div class="card mt-lg">
                <h3 class="chart-container__title mb-md">${I18n.t('cursos.subjectBreakdownTitle')}</h3>
                ${cursoAsignaturasHtml}
            </div>
        `;

        // Crear gráfico de distribución
        const notasData = [
            curso.Notas_1 || 0,
            curso.Notas_2 || 0,
            curso.Notas_3 || 0,
            curso.Notas_4 || 0,
            curso.Notas_5 || 0,
            curso.Notas_6 || 0,
            curso.Notas_7 || 0,
            curso.Notas_8 || 0,
            curso.Notas_9 || 0,
            curso.Notas_10 || 0
        ];

        Charts.createGradeDistribution('chart-curso-dist', notasData);
    }

    /**
     * Crea la tabla de asignaturas por curso
     */
    function createCursoAsignaturasTable(asignaturas) {
        const headers = [
            { label: I18n.t('asignaturas.tabla.asignatura'), key: 'Dimension2' },
            { label: I18n.t('asignaturas.tabla.n'), key: 'N', align: 'center' },
            {
                label: I18n.t('asignaturas.tabla.media'),
                key: 'Media',
                align: 'center',
                format: (val) => {
                    const color = UI.getColorForValue(val);
                    return `<span class="text-${color}">${UI.formatNumber(val)}</span>`;
                }
            },
            {
                label: I18n.t('asignaturas.tabla.aprobados'),
                key: 'Pct_Aprobados',
                align: 'center',
                format: (val) => UI.formatPercent(val)
            },
            {
                label: I18n.t('asignaturas.tabla.desviacion'),
                key: 'Desv_Tipica',
                align: 'center',
                format: (val) => UI.formatNumber(val)
            },
            {
                label: I18n.t('asignaturas.tabla.coefVar'),
                key: 'Coef_Variacion',
                align: 'center',
                format: (val) => val ? UI.formatNumber(val) + '%' : '-'
            }
        ];

        const sorted = [...asignaturas].sort((a, b) => (b.Media || 0) - (a.Media || 0));
        return UI.createDataTable(headers, sorted, { striped: true });
    }

    /**
     * Crea el gráfico comparativo de cursos
     */
    function createComparisonChart(cursos) {
        const labels = cursos.map(c => c.Dimension1);
        const data = cursos.map(c => c.Media);

        Charts.createComparisonBar('chart-cursos', labels, data);
    }

    /**
     * Crea la tabla de cursos
     */
    function createCursosTable(cursos, globalData) {
        const headers = [
            { label: I18n.t('cursos.tabla.curso'), key: 'Dimension1' },
            { label: I18n.t('cursos.tabla.etapa'), key: 'Etapa', align: 'center' },
            { label: I18n.t('cursos.tabla.n'), key: 'N', align: 'center' },
            {
                label: I18n.t('cursos.tabla.media'),
                key: 'Media',
                align: 'center',
                format: (val) => {
                    const color = UI.getColorForValue(val);
                    return `<span class="text-${color}">${UI.formatNumber(val)}</span>`;
                }
            },
            {
                label: I18n.t('cursos.tabla.aprobados'),
                key: 'Pct_Aprobados',
                align: 'center',
                format: (val) => UI.formatPercent(val)
            },
            {
                label: I18n.t('cursos.tabla.desviacion'),
                key: 'Desv_Tipica',
                align: 'center',
                format: (val) => UI.formatNumber(val)
            },
            {
                label: I18n.t('cursos.tabla.coefVar'),
                key: 'Coef_Variacion',
                align: 'center',
                format: (val) => val ? UI.formatNumber(val) + '%' : '-'
            }
        ];

        return UI.createDataTable(headers, cursos, { striped: true });
    }

    // API pública
    return {
        render
    };
})();
