/**
 * UI - Módulo de componentes de interfaz reutilizables
 */

const UI = (function() {
    /**
     * Crea una tarjeta de KPI
     */
    function createKPICard(options) {
        const {
            title,
            value,
            subtitle = '',
            indicator = null, // 'success', 'warning', 'danger'
            trend = null, // { direction: 'up'|'down', value: '5%' }
            miniChart = null // Para gráfico circular pequeño
        } = options;

        const indicatorClass = indicator ? `kpi-card--${indicator}` : '';
        const indicatorBar = indicator ? `<div class="kpi-card__indicator kpi-card__indicator--${indicator}"></div>` : '';

        let trendHTML = '';
        if (trend) {
            const trendClass = trend.direction === 'up' ? 'kpi-card__trend--up' : 'kpi-card__trend--down';
            const trendIcon = trend.direction === 'up'
                ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>'
                : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>';
            trendHTML = `<span class="kpi-card__trend ${trendClass}">${trendIcon} ${trend.value}</span>`;
        }

        let miniChartHTML = '';
        if (miniChart) {
            miniChartHTML = `<canvas id="${miniChart.id}" width="60" height="60" style="position: absolute; right: 16px; top: 50%; transform: translateY(-50%);"></canvas>`;
        }

        return `
            <div class="card kpi-card ${indicatorClass}">
                ${indicatorBar}
                <div class="card__header">
                    <span class="card__title">${title}</span>
                </div>
                <div class="card__value">${value}</div>
                ${subtitle ? `<div class="card__subtitle">${subtitle}</div>` : ''}
                ${trendHTML}
                ${miniChartHTML}
            </div>
        `;
    }

    /**
     * Crea una tabla de datos
     */
    function createDataTable(headers, rows, options = {}) {
        const { striped = false, sortable = false, className = '' } = options;

        const headerCells = headers.map((h, i) => {
            const align = h.align || 'left';
            return `<th style="text-align: ${align}">${h.label || h}</th>`;
        }).join('');

        const rowsHTML = rows.map(row => {
            const cells = headers.map((h, i) => {
                const key = h.key || i;
                const value = typeof key === 'number' ? row[key] : row[key];
                const align = h.align || 'left';
                const formatted = h.format ? h.format(value, row) : value;
                return `<td style="text-align: ${align}">${formatted ?? '-'}</td>`;
            }).join('');
            return `<tr>${cells}</tr>`;
        }).join('');

        return `
            <div class="table-container ${className}">
                <table class="table ${striped ? 'table--striped' : ''}">
                    <thead>
                        <tr>${headerCells}</tr>
                    </thead>
                    <tbody>
                        ${rowsHTML || '<tr><td colspan="' + headers.length + '" class="text-center text-muted">Sin datos</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    }

    /**
     * Crea un selector/dropdown
     */
    function createSelector(options) {
        const {
            id,
            label,
            options: selectOptions,
            selected = '',
            onChange = null,
            placeholder = ''
        } = options;

        const optionsHTML = selectOptions.map(opt => {
            const value = typeof opt === 'object' ? opt.value : opt;
            const text = typeof opt === 'object' ? opt.label : opt;
            const isSelected = value === selected ? 'selected' : '';
            return `<option value="${value}" ${isSelected}>${text}</option>`;
        }).join('');

        return `
            <div class="form-group">
                ${label ? `<label class="form-label" for="${id}">${label}</label>` : ''}
                <select id="${id}" class="form-select">
                    ${placeholder ? `<option value="">${placeholder}</option>` : ''}
                    ${optionsHTML}
                </select>
            </div>
        `;
    }

    /**
     * Muestra un toast/notificación
     */
    function showToast(message, type = 'info', duration = 4000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;

        const icon = getToastIcon(type);
        toast.innerHTML = `${icon}<span>${message}</span>`;

        container.appendChild(toast);

        // Auto-remove
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * Obtiene el icono para un tipo de toast
     */
    function getToastIcon(type) {
        const icons = {
            success: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
            error: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
            warning: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
            info: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
        };
        return icons[type] || icons.info;
    }

    /**
     * Formatea un número
     */
    function formatNumber(value, decimals = 2) {
        if (value === null || value === undefined || isNaN(value)) {
            return '-';
        }
        return Number(value).toFixed(decimals);
    }

    /**
     * Formatea un porcentaje
     */
    function formatPercent(value, decimals = 1) {
        if (value === null || value === undefined || isNaN(value)) {
            return '-';
        }
        return Number(value).toFixed(decimals) + '%';
    }

    /**
     * Obtiene el color según el valor y umbrales
     */
    function getColorForValue(value, thresholds = { danger: 5, warning: 6 }) {
        if (value === null || value === undefined) return null;
        if (value < thresholds.danger) return 'danger';
        if (value < thresholds.warning) return 'warning';
        return 'success';
    }

    /**
     * Obtiene el color para desviación típica
     */
    function getColorForDeviation(value) {
        if (value === null || value === undefined) return null;
        if (value < 1.5) return 'success'; // Concentradas
        if (value > 2.5) return 'danger';  // Muy dispersas
        return 'warning';
    }

    /**
     * Obtiene el texto para la desviación
     */
    function getDeviationText(value) {
        if (value === null || value === undefined) return '';
        if (value < 1.5) return I18n.t('dashboard.indicadores.concentradas');
        if (value > 2.5) return I18n.t('dashboard.indicadores.dispersas');
        return I18n.t('dashboard.indicadores.normal');
    }

    /**
     * Crea un badge/etiqueta
     */
    function createBadge(text, type = '') {
        const className = type ? `badge badge--${type}` : 'badge';
        return `<span class="${className}">${text}</span>`;
    }

    /**
     * Crea un indicador de tendencia
     */
    function createTrendIndicator(current, previous) {
        if (previous === null || previous === undefined || current === null) {
            return '';
        }

        const diff = current - previous;
        const percent = ((diff / previous) * 100).toFixed(1);

        if (Math.abs(diff) < 0.01) {
            return `<span class="text-muted">→ ${I18n.t('evolucion.tendencia.estable')}</span>`;
        }

        if (diff > 0) {
            return `<span class="text-success">↑ +${percent}%</span>`;
        }

        return `<span class="text-danger">↓ ${percent}%</span>`;
    }

    /**
     * Crea un spinner de carga
     */
    function createLoading() {
        return `
            <div class="loading">
                <div class="spinner"></div>
            </div>
        `;
    }

    /**
     * Crea un estado vacío
     */
    function createEmptyState(message, icon = null) {
        const iconSVG = icon || `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                <polyline points="13 2 13 9 20 9"/>
            </svg>
        `;

        return `
            <div class="empty-state">
                <div class="empty-state__icon">${iconSVG}</div>
                <p>${message}</p>
            </div>
        `;
    }

    /**
     * Crea el header de una sección
     */
    function createSectionHeader(title, subtitle = '', actions = '') {
        return `
            <div class="section-header">
                <div>
                    <h2 class="section-title">${title}</h2>
                    ${subtitle ? `<p class="section-subtitle">${subtitle}</p>` : ''}
                </div>
                ${actions ? `<div class="section-actions">${actions}</div>` : ''}
            </div>
        `;
    }

    /**
     * Obtiene colores para notas (1-10)
     */
    function getGradeColors() {
        return {
            1: '#DC2626',
            2: '#DC2626',
            3: '#DC2626',
            4: '#DC2626',
            5: '#F59E0B',
            6: '#10B981',
            7: '#10B981',
            8: '#10B981',
            9: '#10B981',
            10: '#10B981'
        };
    }

    /**
     * Genera un array de colores para notas
     */
    function getGradeColorsArray() {
        const colors = getGradeColors();
        return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => colors[n]);
    }

    // API pública
    return {
        createKPICard,
        createDataTable,
        createSelector,
        showToast,
        formatNumber,
        formatPercent,
        getColorForValue,
        getColorForDeviation,
        getDeviationText,
        createBadge,
        createTrendIndicator,
        createLoading,
        createEmptyState,
        createSectionHeader,
        getGradeColors,
        getGradeColorsArray
    };
})();
