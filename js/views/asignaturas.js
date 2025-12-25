/**
 * AsignaturasView - Vista de análisis por asignatura
 */

const AsignaturasView = (function() {
    let currentAsignatura = null;

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
        const asignaturas = CSVParser.getAsignaturas(selectedEvaluacion.datos);
        const globalData = CSVParser.getGlobalData(selectedEvaluacion.datos);

        if (!asignaturas || asignaturas.length === 0) {
            container.innerHTML = UI.createEmptyState(I18n.t('welcome.noData'));
            return;
        }

        // Obtener lista de asignaturas únicas
        const listaAsignaturas = asignaturas.map(a => a.Dimension1).sort();

        // Selector
        const selectorOptions = [
            { value: '', label: I18n.t('asignaturas.all') },
            ...listaAsignaturas.map(a => ({ value: a, label: a }))
        ];

        container.innerHTML = `
            ${UI.createSectionHeader(I18n.t('asignaturas.title'))}

            ${UI.createSelector({
                id: 'asignatura-selector',
                label: I18n.t('asignaturas.select'),
                options: selectorOptions,
                selected: currentAsignatura || ''
            })}

            <div id="asignatura-detail"></div>

            <div class="chart-container mt-lg">
                <h3 class="chart-container__title">${I18n.t('asignaturas.comparativa')}</h3>
                <div class="chart-wrapper" style="height: ${Math.max(300, asignaturas.length * 40)}px;">
                    <canvas id="chart-asignaturas"></canvas>
                </div>
            </div>

            <div class="card mt-lg">
                <h3 class="chart-container__title mb-md">${I18n.t('asignaturas.all')}</h3>
                ${createAsignaturasTable(asignaturas, globalData)}
            </div>
        `;

        // Crear gráfico comparativo
        createComparisonChart(asignaturas);

        // Setup selector
        document.getElementById('asignatura-selector').addEventListener('change', (e) => {
            currentAsignatura = e.target.value;
            updateDetail(asignaturas, globalData);
        });

        // Mostrar detalle inicial si hay una seleccionada
        updateDetail(asignaturas, globalData);
    }

    /**
     * Actualiza el detalle de la asignatura seleccionada
     */
    function updateDetail(asignaturas, globalData) {
        const detailContainer = document.getElementById('asignatura-detail');

        if (!currentAsignatura) {
            detailContainer.innerHTML = '';
            return;
        }

        const asignatura = asignaturas.find(a => a.Dimension1 === currentAsignatura);
        if (!asignatura) {
            detailContainer.innerHTML = '';
            return;
        }

        const mediaColor = UI.getColorForValue(asignatura.Media);
        const diffMedia = asignatura.Media - (globalData?.Media || 0);
        const diffText = diffMedia >= 0 ? `+${diffMedia.toFixed(2)}` : diffMedia.toFixed(2);
        const diffClass = diffMedia >= 0 ? 'text-success' : 'text-danger';

        detailContainer.innerHTML = `
            <div class="kpi-grid mt-lg">
                ${UI.createKPICard({
                    title: I18n.t('common.media'),
                    value: UI.formatNumber(asignatura.Media),
                    subtitle: `<span class="${diffClass}">${diffText} vs global</span>`,
                    indicator: mediaColor
                })}

                ${UI.createKPICard({
                    title: I18n.t('dashboard.kpi.aprobados'),
                    value: UI.formatPercent(asignatura.Pct_Aprobados),
                    subtitle: `${asignatura.Aprobados || 0} de ${asignatura.N}`,
                    indicator: 'success'
                })}

                ${UI.createKPICard({
                    title: I18n.t('dashboard.kpi.total'),
                    value: asignatura.N || 0
                })}

                ${UI.createKPICard({
                    title: I18n.t('dashboard.kpi.desviacion'),
                    value: UI.formatNumber(asignatura.Desv_Tipica),
                    subtitle: UI.getDeviationText(asignatura.Desv_Tipica),
                    indicator: UI.getColorForDeviation(asignatura.Desv_Tipica)
                })}
            </div>

            <div class="chart-container mt-lg">
                <h3 class="chart-container__title">${I18n.t('dashboard.distribucion')}</h3>
                <div class="chart-wrapper">
                    <canvas id="chart-asignatura-dist"></canvas>
                </div>
            </div>
        `;

        // Crear gráfico de distribución
        const notasData = [
            asignatura.Notas_1 || 0,
            asignatura.Notas_2 || 0,
            asignatura.Notas_3 || 0,
            asignatura.Notas_4 || 0,
            asignatura.Notas_5 || 0,
            asignatura.Notas_6 || 0,
            asignatura.Notas_7 || 0,
            asignatura.Notas_8 || 0,
            asignatura.Notas_9 || 0,
            asignatura.Notas_10 || 0
        ];

        Charts.createGradeDistribution('chart-asignatura-dist', notasData);
    }

    /**
     * Crea el gráfico comparativo de asignaturas
     */
    function createComparisonChart(asignaturas) {
        const labels = asignaturas.map(a => truncateLabel(a.Dimension1, 30));
        const data = asignaturas.map(a => a.Media);

        Charts.createHorizontalBar('chart-asignaturas', labels, data);
    }

    /**
     * Crea la tabla de asignaturas
     */
    function createAsignaturasTable(asignaturas, globalData) {
        const headers = [
            { label: I18n.t('asignaturas.tabla.asignatura'), key: 'Dimension1' },
            { label: I18n.t('asignaturas.tabla.n'), key: 'N', align: 'center' },
            {
                label: I18n.t('asignaturas.tabla.media'),
                key: 'Media',
                align: 'center',
                format: (val, row) => {
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
            }
        ];

        // Ordenar por media descendente
        const sorted = [...asignaturas].sort((a, b) => (b.Media || 0) - (a.Media || 0));

        return UI.createDataTable(headers, sorted, { striped: true });
    }

    /**
     * Trunca una etiqueta
     */
    function truncateLabel(label, maxLength) {
        if (!label) return '';
        if (label.length <= maxLength) return label;
        return label.substring(0, maxLength - 3) + '...';
    }

    // API pública
    return {
        render
    };
})();
