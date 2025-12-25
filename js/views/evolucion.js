/**
 * EvolucionView - Vista de evolución temporal
 * Muestra gráficos de evolución cuando hay múltiples evaluaciones
 */

const EvolucionView = (function() {
    let currentAsignatura = 'global';

    /**
     * Renderiza la vista
     */
    function render(container, data) {
        const { evaluaciones } = data;

        if (!evaluaciones || evaluaciones.length < 2) {
            container.innerHTML = `
                ${UI.createSectionHeader(I18n.t('evolucion.title'))}
                ${UI.createEmptyState(I18n.t('evolucion.noMultiple'))}
            `;
            return;
        }

        // Ordenar evaluaciones por fecha/trimestre
        const sortedEvaluaciones = sortEvaluaciones(evaluaciones);

        // Obtener lista de asignaturas de todas las evaluaciones
        const asignaturas = getAsignaturasFromAll(sortedEvaluaciones);

        // Selector de asignaturas
        const selectorOptions = [
            { value: 'global', label: I18n.t('evolucion.global') },
            ...asignaturas.map(a => ({ value: a, label: a }))
        ];

        container.innerHTML = `
            ${UI.createSectionHeader(
                I18n.t('evolucion.title'),
                I18n.t('evolucion.subtitle')
            )}

            ${UI.createSelector({
                id: 'asignatura-evolucion-selector',
                label: I18n.t('evolucion.selectAsignatura'),
                options: selectorOptions,
                selected: currentAsignatura
            })}

            <div class="chart-container mt-lg">
                <div class="chart-wrapper" style="height: 350px;">
                    <canvas id="chart-evolucion"></canvas>
                </div>
            </div>

            <div class="card mt-lg">
                <h3 class="chart-container__title mb-md">${I18n.t('evolucion.subtitle')}</h3>
                <div id="evolucion-table"></div>
            </div>
        `;

        // Crear gráfico y tabla
        updateEvolucion(sortedEvaluaciones);

        // Setup selector
        document.getElementById('asignatura-evolucion-selector').addEventListener('change', (e) => {
            currentAsignatura = e.target.value;
            updateEvolucion(sortedEvaluaciones);
        });
    }

    /**
     * Ordena las evaluaciones por trimestre y año
     */
    function sortEvaluaciones(evaluaciones) {
        return [...evaluaciones].sort((a, b) => {
            // Ordenar por año primero
            if (a.año !== b.año) {
                return a.año.localeCompare(b.año);
            }
            // Luego por trimestre
            const tOrder = { 'T1': 1, 'T2': 2, 'T3': 3 };
            return (tOrder[a.trimestre] || 0) - (tOrder[b.trimestre] || 0);
        });
    }

    /**
     * Obtiene todas las asignaturas de todas las evaluaciones
     */
    function getAsignaturasFromAll(evaluaciones) {
        const asignaturas = new Set();

        evaluaciones.forEach(ev => {
            const asigs = CSVParser.getAsignaturas(ev.datos);
            asigs.forEach(a => {
                if (a.Dimension1 && a.Dimension1 !== 'TODOS') {
                    asignaturas.add(a.Dimension1);
                }
            });
        });

        return Array.from(asignaturas).sort();
    }

    /**
     * Actualiza el gráfico y la tabla de evolución
     */
    function updateEvolucion(evaluaciones) {
        const labels = evaluaciones.map(ev => `${ev.trimestre} ${ev.año}`);
        let chartData = [];
        let tableData = [];

        if (currentAsignatura === 'global') {
            // Evolución de la media global
            chartData = evaluaciones.map(ev => {
                const global = CSVParser.getGlobalData(ev.datos);
                return global?.Media || null;
            });

            tableData = evaluaciones.map((ev, i) => {
                const global = CSVParser.getGlobalData(ev.datos);
                const prevMedia = i > 0 ? tableData[i-1]?.media : null;

                return {
                    periodo: `${ev.trimestre} ${ev.año}`,
                    media: global?.Media,
                    n: global?.N,
                    aprobados: global?.Pct_Aprobados,
                    tendencia: prevMedia !== null ? global?.Media - prevMedia : null
                };
            });
        } else {
            // Evolución de una asignatura específica
            chartData = evaluaciones.map(ev => {
                const asignaturas = CSVParser.getAsignaturas(ev.datos);
                const asig = asignaturas.find(a => a.Dimension1 === currentAsignatura);
                return asig?.Media || null;
            });

            tableData = evaluaciones.map((ev, i) => {
                const asignaturas = CSVParser.getAsignaturas(ev.datos);
                const asig = asignaturas.find(a => a.Dimension1 === currentAsignatura);
                const prevMedia = i > 0 ? tableData[i-1]?.media : null;

                return {
                    periodo: `${ev.trimestre} ${ev.año}`,
                    media: asig?.Media || null,
                    n: asig?.N || null,
                    aprobados: asig?.Pct_Aprobados || null,
                    tendencia: prevMedia !== null && asig?.Media !== null ? asig.Media - prevMedia : null
                };
            });
        }

        // Crear gráfico
        Charts.createLineChart('chart-evolucion', labels, [
            {
                label: currentAsignatura === 'global' ? I18n.t('evolucion.global') : currentAsignatura,
                data: chartData,
                color: '#1a1a1a'
            }
        ]);

        // Crear tabla
        createEvolucionTable(tableData);
    }

    /**
     * Crea la tabla de evolución
     */
    function createEvolucionTable(data) {
        const headers = [
            { label: 'Periodo', key: 'periodo' },
            { label: I18n.t('common.n'), key: 'n', align: 'center' },
            {
                label: I18n.t('common.media'),
                key: 'media',
                align: 'center',
                format: (val) => {
                    if (val === null) return '-';
                    const color = UI.getColorForValue(val);
                    return `<span class="text-${color}">${UI.formatNumber(val)}</span>`;
                }
            },
            {
                label: I18n.t('dashboard.kpi.aprobados'),
                key: 'aprobados',
                align: 'center',
                format: (val) => val !== null ? UI.formatPercent(val) : '-'
            },
            {
                label: 'Tendencia',
                key: 'tendencia',
                align: 'center',
                format: (val) => {
                    if (val === null) return '-';
                    const icon = val >= 0 ? '↑' : '↓';
                    const color = val >= 0 ? 'success' : 'danger';
                    const sign = val >= 0 ? '+' : '';
                    return `<span class="text-${color}">${icon} ${sign}${val.toFixed(2)}</span>`;
                }
            }
        ];

        const tableContainer = document.getElementById('evolucion-table');
        tableContainer.innerHTML = UI.createDataTable(headers, data, { striped: true });
    }

    // API pública
    return {
        render
    };
})();
