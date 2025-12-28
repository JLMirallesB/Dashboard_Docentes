/**
 * MatrizView - Vista de matriz Curso × Especialidad
 */

const MatrizView = (function() {
    let hideEmpty = false;
    let currentMatrixType = null;

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
        const { tipos, matrices } = CSVParser.getMatrices(selectedEvaluacion.datos);

        if (!matrices || matrices.length === 0) {
            container.innerHTML = UI.createEmptyState(I18n.t('welcome.noData'));
            return;
        }

        if (!currentMatrixType || !tipos.includes(currentMatrixType)) {
            currentMatrixType = tipos[0];
        }

        const selectorHTML = tipos.length > 1 ? UI.createSelector({
            id: 'matriz-type-selector',
            label: I18n.t('matriz.type'),
            options: tipos.map(tipo => ({
                value: tipo,
                label: formatMatrixLabel(tipo)
            })),
            selected: currentMatrixType
        }) : '';

        container.innerHTML = `
            ${UI.createSectionHeader(
                I18n.t('matriz.title'),
                I18n.t('matriz.subtitle')
            )}

            ${selectorHTML}

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

        // Renderizar matriz inicial
        renderMatrixByType(matrices);

        // Setup toggle
        document.getElementById('hide-empty').addEventListener('change', (e) => {
            hideEmpty = e.target.checked;
            renderMatrixByType(matrices);
        });

        // Setup selector si hay múltiples tipos
        if (tipos.length > 1) {
            document.getElementById('matriz-type-selector').addEventListener('change', (e) => {
                currentMatrixType = e.target.value;
                renderMatrixByType(matrices);
            });
        }
    }

    /**
     * Renderiza la matriz filtrando por tipo
     */
    function renderMatrixByType(matrices) {
        const filtered = matrices.filter(row => row.Tipo_Agregacion === currentMatrixType);
        const { cursos, especialidades, matrix } = processMatrixData(filtered);
        renderMatrix(cursos, especialidades, matrix, filtered);
    }

    /**
     * Formatea el nombre del tipo de matriz
     */
    function formatMatrixLabel(tipo) {
        const base = 'Por_Curso_Especialidad';
        if (tipo === base) return I18n.t('matriz.global');
        if (tipo.startsWith(`${base}_`)) {
            return tipo.replace(`${base}_`, '').replace(/_/g, ' ');
        }
        return tipo;
    }

    /**
     * Procesa los datos para crear la estructura de matriz
     */
    function processMatrixData(data) {
        // Obtener cursos y especialidades únicos con sus etapas
        const cursosMap = new Map(); // curso -> etapa
        const especialidadesSet = new Set();

        data.forEach(row => {
            if (row.Dimension1) {
                // Guardar la etapa asociada al curso
                if (!cursosMap.has(row.Dimension1)) {
                    cursosMap.set(row.Dimension1, row.Etapa || '');
                }
            }
            if (row.Dimension2) especialidadesSet.add(row.Dimension2);
        });

        // Ordenar cursos usando el campo Etapa o detectando del nombre
        const cursos = Array.from(cursosMap.keys()).sort((a, b) => {
            const aEtapaField = cursosMap.get(a);
            const bEtapaField = cursosMap.get(b);

            // Determinar etapa: usar campo Etapa si existe, o detectar del nombre
            const aEtapa = (aEtapaField === 'EEM' || a.includes('EEM')) ? 0 : 1;
            const bEtapa = (bEtapaField === 'EEM' || b.includes('EEM')) ? 0 : 1;

            // Extraer número del curso (ej: "2EPM" -> 2)
            const aNum = parseInt(a.replace(/[^\d]/g, '')) || 0;
            const bNum = parseInt(b.replace(/[^\d]/g, '')) || 0;

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
