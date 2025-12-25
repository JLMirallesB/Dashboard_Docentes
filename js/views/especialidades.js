/**
 * EspecialidadesView - Vista de análisis por especialidad
 */

const EspecialidadesView = (function() {
    let currentEspecialidad = null;

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
        const especialidades = CSVParser.getEspecialidades(selectedEvaluacion.datos);
        const globalData = CSVParser.getGlobalData(selectedEvaluacion.datos);

        if (!especialidades || especialidades.length === 0) {
            container.innerHTML = UI.createEmptyState(I18n.t('welcome.noData'));
            return;
        }

        // Ordenar por media
        const especialidadesOrdenadas = [...especialidades].sort((a, b) => (b.Media || 0) - (a.Media || 0));
        const listaEspecialidades = especialidadesOrdenadas.map(e => e.Dimension1);

        // Selector
        const selectorOptions = [
            { value: '', label: I18n.t('especialidades.all') },
            ...listaEspecialidades.map(e => ({ value: e, label: e }))
        ];

        container.innerHTML = `
            ${UI.createSectionHeader(I18n.t('especialidades.title'))}

            ${UI.createSelector({
                id: 'especialidad-selector',
                label: I18n.t('especialidades.select'),
                options: selectorOptions,
                selected: currentEspecialidad || ''
            })}

            <div id="especialidad-detail"></div>

            <div class="chart-container mt-lg">
                <h3 class="chart-container__title">${I18n.t('especialidades.comparativa')}</h3>
                <div class="chart-wrapper" style="height: ${Math.max(300, especialidades.length * 40)}px;">
                    <canvas id="chart-especialidades"></canvas>
                </div>
            </div>

            <div class="card mt-lg">
                <h3 class="chart-container__title mb-md">${I18n.t('especialidades.all')}</h3>
                ${createEspecialidadesTable(especialidadesOrdenadas, globalData)}
            </div>
        `;

        // Crear gráfico comparativo
        createComparisonChart(especialidadesOrdenadas);

        // Setup selector
        document.getElementById('especialidad-selector').addEventListener('change', (e) => {
            currentEspecialidad = e.target.value;
            updateDetail(especialidades, globalData);
        });

        // Mostrar detalle inicial
        updateDetail(especialidades, globalData);
    }

    /**
     * Actualiza el detalle de la especialidad seleccionada
     */
    function updateDetail(especialidades, globalData) {
        const detailContainer = document.getElementById('especialidad-detail');

        if (!currentEspecialidad) {
            detailContainer.innerHTML = '';
            return;
        }

        const especialidad = especialidades.find(e => e.Dimension1 === currentEspecialidad);
        if (!especialidad) {
            detailContainer.innerHTML = '';
            return;
        }

        const mediaColor = UI.getColorForValue(especialidad.Media);
        const diffMedia = especialidad.Media - (globalData?.Media || 0);
        const diffText = diffMedia >= 0 ? `+${diffMedia.toFixed(2)}` : diffMedia.toFixed(2);
        const diffClass = diffMedia >= 0 ? 'text-success' : 'text-danger';

        detailContainer.innerHTML = `
            <div class="kpi-grid mt-lg">
                ${UI.createKPICard({
                    title: I18n.t('common.media'),
                    value: UI.formatNumber(especialidad.Media),
                    subtitle: `<span class="${diffClass}">${diffText} vs global</span>`,
                    indicator: mediaColor
                })}

                ${UI.createKPICard({
                    title: I18n.t('dashboard.kpi.aprobados'),
                    value: UI.formatPercent(especialidad.Pct_Aprobados),
                    subtitle: `${especialidad.Aprobados || 0} de ${especialidad.N}`,
                    indicator: 'success'
                })}

                ${UI.createKPICard({
                    title: I18n.t('dashboard.kpi.total'),
                    value: especialidad.N || 0
                })}

                ${UI.createKPICard({
                    title: I18n.t('dashboard.kpi.desviacion'),
                    value: UI.formatNumber(especialidad.Desv_Tipica),
                    subtitle: UI.getDeviationText(especialidad.Desv_Tipica),
                    indicator: UI.getColorForDeviation(especialidad.Desv_Tipica)
                })}
            </div>

            <div class="chart-container mt-lg">
                <h3 class="chart-container__title">${I18n.t('dashboard.distribucion')}</h3>
                <div class="chart-wrapper">
                    <canvas id="chart-especialidad-dist"></canvas>
                </div>
            </div>
        `;

        // Crear gráfico de distribución
        const notasData = [
            especialidad.Notas_1 || 0,
            especialidad.Notas_2 || 0,
            especialidad.Notas_3 || 0,
            especialidad.Notas_4 || 0,
            especialidad.Notas_5 || 0,
            especialidad.Notas_6 || 0,
            especialidad.Notas_7 || 0,
            especialidad.Notas_8 || 0,
            especialidad.Notas_9 || 0,
            especialidad.Notas_10 || 0
        ];

        Charts.createGradeDistribution('chart-especialidad-dist', notasData);
    }

    /**
     * Crea el gráfico comparativo de especialidades
     */
    function createComparisonChart(especialidades) {
        const labels = especialidades.map(e => truncateLabel(e.Dimension1, 25));
        const data = especialidades.map(e => e.Media);

        Charts.createHorizontalBar('chart-especialidades', labels, data);
    }

    /**
     * Crea la tabla de especialidades
     */
    function createEspecialidadesTable(especialidades, globalData) {
        const headers = [
            { label: I18n.t('especialidades.tabla.especialidad'), key: 'Dimension1' },
            { label: I18n.t('especialidades.tabla.n'), key: 'N', align: 'center' },
            {
                label: I18n.t('especialidades.tabla.media'),
                key: 'Media',
                align: 'center',
                format: (val) => {
                    const color = UI.getColorForValue(val);
                    return `<span class="text-${color}">${UI.formatNumber(val)}</span>`;
                }
            },
            {
                label: I18n.t('especialidades.tabla.aprobados'),
                key: 'Pct_Aprobados',
                align: 'center',
                format: (val) => UI.formatPercent(val)
            },
            {
                label: I18n.t('especialidades.tabla.desviacion'),
                key: 'Desv_Tipica',
                align: 'center',
                format: (val) => UI.formatNumber(val)
            }
        ];

        return UI.createDataTable(headers, especialidades, { striped: true });
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
