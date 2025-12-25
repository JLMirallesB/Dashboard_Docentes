/**
 * MatrizView - Vista de matriz Curso × Especialidad
 */

const MatrizView = (function() {
    let hideEmpty = false;

    /**
     * Renderiza la vista
     */
    function render(container, data) {
        const { selectedEvaluacion } = data;

        if (!selectedEvaluacion || !selectedEvaluacion.datos) {
            container.innerHTML = UI.createEmptyState(I18n.t('welcome.noData'));
            return;
        }

        // Obtener datos de la matriz
        const matrizData = CSVParser.getMatriz(selectedEvaluacion.datos);

        if (!matrizData || matrizData.length === 0) {
            container.innerHTML = UI.createEmptyState(I18n.t('welcome.noData'));
            return;
        }

        // Procesar datos para la matriz
        const { cursos, especialidades, matrix } = processMatrixData(matrizData);

        container.innerHTML = `
            ${UI.createSectionHeader(
                I18n.t('matriz.title'),
                I18n.t('matriz.subtitle')
            )}

            <div class="form-group">
                <label class="form-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="hide-empty" ${hideEmpty ? 'checked' : ''}>
                    ${I18n.t('matriz.filtrar')}
                </label>
            </div>

            <div class="card mt-lg">
                <div class="matrix" id="matrix-container"></div>
            </div>

            <div id="cell-detail" class="mt-lg"></div>
        `;

        // Renderizar matriz
        renderMatrix(cursos, especialidades, matrix, matrizData);

        // Setup toggle
        document.getElementById('hide-empty').addEventListener('change', (e) => {
            hideEmpty = e.target.checked;
            renderMatrix(cursos, especialidades, matrix, matrizData);
        });
    }

    /**
     * Procesa los datos para crear la estructura de matriz
     */
    function processMatrixData(data) {
        // Obtener cursos y especialidades únicos
        const cursosSet = new Set();
        const especialidadesSet = new Set();

        data.forEach(row => {
            if (row.Dimension1) cursosSet.add(row.Dimension1);
            if (row.Dimension2) especialidadesSet.add(row.Dimension2);
        });

        // Ordenar cursos
        const cursos = Array.from(cursosSet).sort((a, b) => {
            const aNum = parseInt(a) || 0;
            const bNum = parseInt(b) || 0;
            const aEtapa = a.includes('EEM') ? 0 : 1;
            const bEtapa = b.includes('EEM') ? 0 : 1;
            if (aEtapa !== bEtapa) return aEtapa - bEtapa;
            return aNum - bNum;
        });

        const especialidades = Array.from(especialidadesSet).sort();

        // Crear matriz de valores
        const matrix = cursos.map(curso => {
            return especialidades.map(esp => {
                const cell = data.find(d => d.Dimension1 === curso && d.Dimension2 === esp);
                return cell ? cell.Media : null;
            });
        });

        return { cursos, especialidades, matrix };
    }

    /**
     * Renderiza la matriz en el contenedor
     */
    function renderMatrix(cursos, especialidades, matrix, rawData) {
        // Filtrar si es necesario
        let filteredCursos = [...cursos];
        let filteredEspecialidades = [...especialidades];
        let filteredMatrix = matrix.map(row => [...row]);

        if (hideEmpty) {
            // Encontrar columnas con al menos un valor
            const colsWithData = especialidades.map((_, colIdx) => {
                return matrix.some(row => row[colIdx] !== null);
            });

            // Encontrar filas con al menos un valor
            const rowsWithData = cursos.map((_, rowIdx) => {
                return matrix[rowIdx].some(val => val !== null);
            });

            // Filtrar
            filteredEspecialidades = especialidades.filter((_, i) => colsWithData[i]);
            filteredCursos = cursos.filter((_, i) => rowsWithData[i]);
            filteredMatrix = matrix
                .filter((_, i) => rowsWithData[i])
                .map(row => row.filter((_, i) => colsWithData[i]));
        }

        // Crear heatmap
        Charts.createHeatmapTable('matrix-container', {
            rows: filteredCursos,
            cols: filteredEspecialidades,
            values: filteredMatrix,
            onClick: (curso, especialidad, value) => {
                showCellDetail(curso, especialidad, rawData);
            }
        });
    }

    /**
     * Muestra el detalle de una celda
     */
    function showCellDetail(curso, especialidad, rawData) {
        const detailContainer = document.getElementById('cell-detail');
        const cellData = rawData.find(d => d.Dimension1 === curso && d.Dimension2 === especialidad);

        if (!cellData) {
            detailContainer.innerHTML = '';
            return;
        }

        const mediaColor = UI.getColorForValue(cellData.Media);

        detailContainer.innerHTML = `
            <div class="card">
                <h3 class="chart-container__title">${curso} - ${especialidad}</h3>

                <div class="kpi-grid mt-md">
                    ${UI.createKPICard({
                        title: I18n.t('common.media'),
                        value: UI.formatNumber(cellData.Media),
                        indicator: mediaColor
                    })}

                    ${UI.createKPICard({
                        title: I18n.t('dashboard.kpi.aprobados'),
                        value: UI.formatPercent(cellData.Pct_Aprobados),
                        subtitle: `${cellData.Aprobados || 0} de ${cellData.N}`,
                        indicator: 'success'
                    })}

                    ${UI.createKPICard({
                        title: I18n.t('dashboard.kpi.total'),
                        value: cellData.N || 0
                    })}

                    ${UI.createKPICard({
                        title: I18n.t('dashboard.kpi.desviacion'),
                        value: UI.formatNumber(cellData.Desv_Tipica),
                        indicator: UI.getColorForDeviation(cellData.Desv_Tipica)
                    })}
                </div>

                <div class="chart-container mt-lg">
                    <h4 class="chart-container__title">${I18n.t('dashboard.distribucion')}</h4>
                    <div class="chart-wrapper">
                        <canvas id="chart-cell-dist"></canvas>
                    </div>
                </div>
            </div>
        `;

        // Crear gráfico de distribución
        const notasData = [
            cellData.Notas_1 || 0,
            cellData.Notas_2 || 0,
            cellData.Notas_3 || 0,
            cellData.Notas_4 || 0,
            cellData.Notas_5 || 0,
            cellData.Notas_6 || 0,
            cellData.Notas_7 || 0,
            cellData.Notas_8 || 0,
            cellData.Notas_9 || 0,
            cellData.Notas_10 || 0
        ];

        Charts.createGradeDistribution('chart-cell-dist', notasData);
    }

    // API pública
    return {
        render
    };
})();
