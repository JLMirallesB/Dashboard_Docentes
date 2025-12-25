/**
 * DashboardView - Vista principal con KPIs globales
 */

const DashboardView = (function() {
    /**
     * Renderiza el dashboard
     */
    function render(container, data) {
        const { evaluaciones, selectedEvaluacion, profesor } = data;

        if (!selectedEvaluacion || !selectedEvaluacion.datos) {
            container.innerHTML = UI.createEmptyState(I18n.t('welcome.noData'));
            return;
        }

        // Obtener datos globales
        const globalData = CSVParser.getGlobalData(selectedEvaluacion.datos);

        if (!globalData) {
            container.innerHTML = UI.createEmptyState(I18n.t('welcome.noData'));
            return;
        }

        // Selector de evaluación si hay múltiples
        let selectorHTML = '';
        if (evaluaciones.length > 1) {
            const options = evaluaciones.map(ev => ({
                value: ev.id,
                label: `${ev.trimestre} - ${ev.año}`
            }));
            selectorHTML = UI.createSelector({
                id: 'evaluacion-selector',
                label: I18n.t('dashboard.selectEvaluacion'),
                options: options,
                selected: selectedEvaluacion.id
            });
        }

        // Construir HTML
        container.innerHTML = `
            ${UI.createSectionHeader(
                I18n.t('dashboard.title'),
                `${profesor || ''} | ${selectedEvaluacion.etapa} | ${selectedEvaluacion.trimestre} ${selectedEvaluacion.año}`
            )}

            ${selectorHTML}

            <div class="kpi-grid">
                ${createKPICards(globalData)}
            </div>

            <div class="grid grid--2">
                <div class="chart-container">
                    <h3 class="chart-container__title">${I18n.t('dashboard.distribucion')}</h3>
                    <div class="chart-wrapper">
                        <canvas id="chart-distribucion"></canvas>
                    </div>
                </div>

                <div class="chart-container">
                    <h3 class="chart-container__title">${I18n.t('common.aprobados')} vs ${I18n.t('common.suspensos')}</h3>
                    <div class="chart-wrapper" style="display: flex; align-items: center; justify-content: center;">
                        <canvas id="chart-aprobados" style="max-width: 250px;"></canvas>
                    </div>
                </div>
            </div>

            <div class="card">
                <h3 class="chart-container__title">${I18n.t('dashboard.percentiles')}</h3>
                ${createPercentilesTable(globalData)}
            </div>
        `;

        // Crear gráficos
        createCharts(globalData);

        // Setup selector
        if (evaluaciones.length > 1) {
            document.getElementById('evaluacion-selector').addEventListener('change', (e) => {
                App.selectEvaluacion(e.target.value);
            });
        }
    }

    /**
     * Crea las tarjetas de KPI
     */
    function createKPICards(data) {
        const mediaColor = UI.getColorForValue(data.Media);
        const desvColor = UI.getColorForDeviation(data.Desv_Tipica);

        return `
            ${UI.createKPICard({
                title: I18n.t('dashboard.kpi.media'),
                value: UI.formatNumber(data.Media),
                subtitle: `${I18n.t('common.moda')}: ${data.Moda || '-'} | ${I18n.t('common.mediana')}: ${UI.formatNumber(data.Mediana)}`,
                indicator: mediaColor
            })}

            ${UI.createKPICard({
                title: I18n.t('dashboard.kpi.aprobados'),
                value: UI.formatPercent(data.Pct_Aprobados),
                subtitle: `${data.Aprobados || 0} ${I18n.t('common.aprobados').toLowerCase()}`,
                indicator: 'success',
                miniChart: { id: 'mini-chart-aprobados' }
            })}

            ${UI.createKPICard({
                title: I18n.t('dashboard.kpi.total'),
                value: data.N || 0,
                subtitle: `${data.Sin_Evaluar || 0} sin evaluar`
            })}

            ${UI.createKPICard({
                title: I18n.t('dashboard.kpi.desviacion'),
                value: UI.formatNumber(data.Desv_Tipica),
                subtitle: UI.getDeviationText(data.Desv_Tipica),
                indicator: desvColor
            })}
        `;
    }

    /**
     * Crea la tabla de percentiles
     */
    function createPercentilesTable(data) {
        const headers = [
            { label: I18n.t('common.min'), key: 'min', align: 'center' },
            { label: I18n.t('common.p25'), key: 'p25', align: 'center' },
            { label: I18n.t('common.mediana'), key: 'mediana', align: 'center' },
            { label: I18n.t('common.p75'), key: 'p75', align: 'center' },
            { label: I18n.t('common.max'), key: 'max', align: 'center' },
            { label: I18n.t('common.moda'), key: 'moda', align: 'center' }
        ];

        const rows = [{
            min: data.Min,
            p25: UI.formatNumber(data.P25),
            mediana: UI.formatNumber(data.Mediana),
            p75: UI.formatNumber(data.P75),
            max: data.Max,
            moda: data.Moda
        }];

        return UI.createDataTable(headers, rows);
    }

    /**
     * Crea los gráficos del dashboard
     */
    function createCharts(data) {
        // Distribución de notas
        const notasData = [
            data.Notas_1 || 0,
            data.Notas_2 || 0,
            data.Notas_3 || 0,
            data.Notas_4 || 0,
            data.Notas_5 || 0,
            data.Notas_6 || 0,
            data.Notas_7 || 0,
            data.Notas_8 || 0,
            data.Notas_9 || 0,
            data.Notas_10 || 0
        ];

        Charts.createGradeDistribution('chart-distribucion', notasData);

        // Gráfico de aprobados/suspensos
        Charts.createDoughnut('chart-aprobados', data.Aprobados || 0, data.Suspensos || 0);

        // Mini chart en KPI card
        setTimeout(() => {
            Charts.createMiniDoughnut('mini-chart-aprobados', data.Pct_Aprobados || 0);
        }, 100);
    }

    // API pública
    return {
        render
    };
})();
