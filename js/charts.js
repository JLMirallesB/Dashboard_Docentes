/**
 * Charts - Módulo para crear y gestionar gráficos con Chart.js
 */

const Charts = (function() {
    // Almacén de instancias de gráficos
    const instances = {};

    // Configuración global de colores
    const colors = {
        light: {
            text: '#1a1a1a',
            textSecondary: '#6c757d',
            grid: '#e9ecef',
            background: '#ffffff'
        },
        dark: {
            text: '#f8f9fa',
            textSecondary: '#adb5bd',
            grid: '#3d3d3d',
            background: '#1a1a1a'
        }
    };

    // Colores para notas
    const gradeColors = [
        '#DC2626', '#DC2626', '#DC2626', '#DC2626', // 1-4: rojo
        '#F59E0B', // 5: amarillo
        '#10B981', '#10B981', '#10B981', '#10B981', '#10B981' // 6-10: verde
    ];

    /**
     * Obtiene los colores actuales según el tema
     */
    function getCurrentColors() {
        const theme = document.documentElement.getAttribute('data-theme') || 'light';
        return colors[theme];
    }

    /**
     * Configura los defaults globales de Chart.js
     */
    function setupDefaults() {
        if (typeof Chart === 'undefined') return;

        const currentColors = getCurrentColors();

        Chart.defaults.color = currentColors.textSecondary;
        Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
        Chart.defaults.plugins.legend.display = false;
        Chart.defaults.plugins.tooltip.backgroundColor = currentColors.background;
        Chart.defaults.plugins.tooltip.titleColor = currentColors.text;
        Chart.defaults.plugins.tooltip.bodyColor = currentColors.textSecondary;
        Chart.defaults.plugins.tooltip.borderColor = currentColors.grid;
        Chart.defaults.plugins.tooltip.borderWidth = 1;
    }

    /**
     * Actualiza el tema de los gráficos
     */
    function updateTheme(theme) {
        setupDefaults();

        // Actualizar todos los gráficos existentes
        Object.values(instances).forEach(chart => {
            if (chart && !chart.destroyed) {
                chart.update();
            }
        });
    }

    /**
     * Destruye un gráfico existente
     */
    function destroy(id) {
        if (instances[id]) {
            instances[id].destroy();
            delete instances[id];
        }
    }

    /**
     * Destruye todos los gráficos
     */
    function destroyAll() {
        Object.keys(instances).forEach(destroy);
    }

    /**
     * Crea un gráfico de barras para distribución de notas
     */
    function createGradeDistribution(canvasId, data, options = {}) {
        destroy(canvasId);

        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const currentColors = getCurrentColors();
        const labels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

        instances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: gradeColors,
                    borderRadius: 4,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.parsed.y} ${I18n.t('common.notas').toLowerCase()}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: currentColors.textSecondary }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: currentColors.grid },
                        ticks: {
                            color: currentColors.textSecondary,
                            stepSize: 1
                        }
                    }
                }
            }
        });

        return instances[canvasId];
    }

    /**
     * Crea un gráfico de barras horizontal
     */
    function createHorizontalBar(canvasId, labels, data, options = {}) {
        destroy(canvasId);

        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const currentColors = getCurrentColors();
        const barColors = data.map(value => {
            if (value < 5) return '#DC2626';
            if (value < 6) return '#F59E0B';
            return '#10B981';
        });

        instances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: barColors,
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${I18n.t('common.media')}: ${context.parsed.x.toFixed(2)}`
                        }
                    }
                },
                scales: {
                    x: {
                        min: 0,
                        max: 10,
                        grid: { color: currentColors.grid },
                        ticks: { color: currentColors.textSecondary }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: currentColors.textSecondary }
                    }
                }
            }
        });

        return instances[canvasId];
    }

    /**
     * Crea un gráfico de barras vertical para comparativas
     */
    function createComparisonBar(canvasId, labels, data, options = {}) {
        destroy(canvasId);

        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const currentColors = getCurrentColors();
        const barColors = data.map(value => {
            if (value < 5) return '#DC2626';
            if (value < 6) return '#F59E0B';
            return '#10B981';
        });

        instances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: barColors,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${I18n.t('common.media')}: ${context.parsed.y.toFixed(2)}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: currentColors.textSecondary }
                    },
                    y: {
                        min: 0,
                        max: 10,
                        grid: { color: currentColors.grid },
                        ticks: { color: currentColors.textSecondary }
                    }
                }
            }
        });

        return instances[canvasId];
    }

    /**
     * Crea un gráfico circular (donut)
     */
    function createDoughnut(canvasId, approved, failed, options = {}) {
        destroy(canvasId);

        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        instances[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [I18n.t('common.aprobados'), I18n.t('common.suspensos')],
                datasets: [{
                    data: [approved, failed],
                    backgroundColor: ['#10B981', '#DC2626'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '70%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.label}: ${context.parsed}`
                        }
                    }
                }
            }
        });

        return instances[canvasId];
    }

    /**
     * Crea un mini gráfico circular para KPI
     */
    function createMiniDoughnut(canvasId, percentage) {
        destroy(canvasId);

        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const remaining = 100 - percentage;

        instances[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [percentage, remaining],
                    backgroundColor: ['#10B981', '#e9ecef'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: false,
                maintainAspectRatio: true,
                cutout: '75%',
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        });

        return instances[canvasId];
    }

    /**
     * Crea un gráfico de líneas para evolución temporal
     */
    function createLineChart(canvasId, labels, datasets, options = {}) {
        destroy(canvasId);

        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const currentColors = getCurrentColors();

        const chartDatasets = datasets.map((ds, index) => ({
            label: ds.label,
            data: ds.data,
            borderColor: ds.color || '#1a1a1a',
            backgroundColor: 'transparent',
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: ds.color || '#1a1a1a'
        }));

        instances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: chartDatasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: datasets.length > 1,
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: currentColors.textSecondary }
                    },
                    y: {
                        min: 0,
                        max: 10,
                        grid: { color: currentColors.grid },
                        ticks: { color: currentColors.textSecondary }
                    }
                }
            }
        });

        return instances[canvasId];
    }

    /**
     * Crea un heatmap como tabla coloreada
     * (Chart.js no tiene heatmap nativo, usamos HTML)
     */
    function createHeatmapTable(containerId, data, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const { rows, cols, values, onClick } = data;

        let html = '<table class="matrix-table">';

        // Header
        html += '<thead><tr><th></th>';
        cols.forEach(col => {
            html += `<th>${col}</th>`;
        });
        html += '</tr></thead>';

        // Body
        html += '<tbody>';
        rows.forEach((row, i) => {
            html += `<tr><th>${row}</th>`;
            cols.forEach((col, j) => {
                const value = values[i]?.[j];
                if (value !== null && value !== undefined) {
                    const color = getHeatmapColor(value);
                    html += `<td class="matrix-cell" style="background-color: ${color}; color: ${getContrastColor(color)}" data-row="${i}" data-col="${j}" data-value="${value}">${value.toFixed(1)}</td>`;
                } else {
                    html += `<td class="matrix-cell matrix-cell--empty">-</td>`;
                }
            });
            html += '</tr>';
        });
        html += '</tbody></table>';

        container.innerHTML = html;

        // Add click handlers
        if (onClick) {
            container.querySelectorAll('.matrix-cell:not(.matrix-cell--empty)').forEach(cell => {
                cell.addEventListener('click', () => {
                    const rowIdx = parseInt(cell.dataset.row);
                    const colIdx = parseInt(cell.dataset.col);
                    onClick(rows[rowIdx], cols[colIdx], parseFloat(cell.dataset.value));
                });
            });
        }
    }

    /**
     * Obtiene el color para un valor del heatmap
     */
    function getHeatmapColor(value) {
        if (value < 5) {
            // Rojo (más intenso cuanto menor)
            const intensity = Math.max(0.3, value / 5);
            return `rgba(220, 38, 38, ${intensity})`;
        } else if (value < 6) {
            // Amarillo
            return 'rgba(245, 158, 11, 0.7)';
        } else {
            // Verde (más intenso cuanto mayor)
            const intensity = Math.min(1, 0.4 + (value - 6) * 0.15);
            return `rgba(16, 185, 129, ${intensity})`;
        }
    }

    /**
     * Obtiene color de texto con contraste
     */
    function getContrastColor(bgColor) {
        // Simplificado: usar blanco para colores oscuros
        if (bgColor.includes('220, 38, 38') && !bgColor.includes('0.3')) {
            return '#ffffff';
        }
        return '#1a1a1a';
    }

    // Inicializar cuando Chart.js esté disponible
    document.addEventListener('DOMContentLoaded', () => {
        const checkChart = setInterval(() => {
            if (typeof Chart !== 'undefined') {
                setupDefaults();
                clearInterval(checkChart);
            }
        }, 100);
    });

    // API pública
    return {
        createGradeDistribution,
        createHorizontalBar,
        createComparisonBar,
        createDoughnut,
        createMiniDoughnut,
        createLineChart,
        createHeatmapTable,
        updateTheme,
        destroy,
        destroyAll
    };
})();
