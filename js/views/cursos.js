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
        const globalData = CSVParser.getGlobalData(selectedEvaluacion.datos);

        if (!cursos || cursos.length === 0) {
            container.innerHTML = UI.createEmptyState(I18n.t('welcome.noData'));
            return;
        }

        // Ordenar cursos
        const cursosOrdenados = sortCursos(cursos);
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
            updateDetail(cursos, globalData);
        });

        // Mostrar detalle inicial
        updateDetail(cursos, globalData);
    }

    /**
     * Ordena los cursos por etapa y número
     */
    function sortCursos(cursos) {
        return [...cursos].sort((a, b) => {
            const aNum = parseInt(a.Dimension1) || 0;
            const bNum = parseInt(b.Dimension1) || 0;
            const aEtapa = a.Dimension1.includes('EEM') ? 0 : 1;
            const bEtapa = b.Dimension1.includes('EEM') ? 0 : 1;

            if (aEtapa !== bEtapa) return aEtapa - bEtapa;
            return aNum - bNum;
        });
    }

    /**
     * Actualiza el detalle del curso seleccionado
     */
    function updateDetail(cursos, globalData) {
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

            <div class="chart-container mt-lg">
                <h3 class="chart-container__title">${I18n.t('dashboard.distribucion')}</h3>
                <div class="chart-wrapper">
                    <canvas id="chart-curso-dist"></canvas>
                </div>
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
            }
        ];

        return UI.createDataTable(headers, cursos, { striped: true });
    }

    // API pública
    return {
        render
    };
})();
