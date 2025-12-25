/**
 * AnovaView - Vista de análisis ANOVA
 * Muestra diferencias significativas entre cursos y especialidades
 */

const AnovaView = (function() {
    /**
     * Renderiza la vista
     */
    function render(container, data) {
        const { selectedEvaluacion } = data;

        if (!selectedEvaluacion || !selectedEvaluacion.datos) {
            container.innerHTML = UI.createEmptyState(I18n.t('welcome.noData'));
            return;
        }

        // Obtener datos ANOVA
        const { cursos, especialidades } = CSVParser.getANOVA(selectedEvaluacion.datos);

        if ((!cursos || cursos.length === 0) && (!especialidades || especialidades.length === 0)) {
            container.innerHTML = UI.createEmptyState(I18n.t('welcome.noData'));
            return;
        }

        // Filtrar solo calculables
        const cursosCalculables = cursos.filter(a => a.Sin_Evaluar === 'Sí');
        const espCalculables = especialidades.filter(a => a.Sin_Evaluar === 'Sí');

        // Contar diferencias significativas
        const cursosConDif = cursosCalculables.filter(a =>
            a.Desv_Tipica && a.Desv_Tipica.toLowerCase().includes('notable')
        ).length;
        const espConDif = espCalculables.filter(a =>
            a.Desv_Tipica && a.Desv_Tipica.toLowerCase().includes('notable')
        ).length;

        container.innerHTML = `
            ${UI.createSectionHeader(
                I18n.t('anova.title'),
                I18n.t('anova.subtitle')
            )}

            <div class="kpi-grid">
                ${UI.createKPICard({
                    title: I18n.t('anova.porCursos'),
                    value: `${cursosConDif}/${cursosCalculables.length}`,
                    subtitle: I18n.t('anova.resumen', { count: cursosConDif, total: cursosCalculables.length }),
                    indicator: cursosConDif > 0 ? 'warning' : 'success'
                })}

                ${UI.createKPICard({
                    title: I18n.t('anova.porEspecialidades'),
                    value: `${espConDif}/${espCalculables.length}`,
                    subtitle: I18n.t('anova.resumen', { count: espConDif, total: espCalculables.length }),
                    indicator: espConDif > 0 ? 'warning' : 'success'
                })}
            </div>

            ${cursos.length > 0 ? `
                <div class="card mt-lg">
                    <h3 class="chart-container__title mb-md">${I18n.t('anova.porCursos')}</h3>
                    ${createAnovaTable(cursos)}
                </div>
            ` : ''}

            ${especialidades.length > 0 ? `
                <div class="card mt-lg">
                    <h3 class="chart-container__title mb-md">${I18n.t('anova.porEspecialidades')}</h3>
                    ${createAnovaTable(especialidades)}
                </div>
            ` : ''}
        `;
    }

    /**
     * Crea la tabla ANOVA
     */
    function createAnovaTable(data) {
        const headers = [
            { label: I18n.t('anova.tabla.asignatura'), key: 'Dimension1' },
            { label: I18n.t('anova.tabla.grupos'), key: 'N', align: 'center' },
            {
                label: I18n.t('anova.calculable'),
                key: 'Sin_Evaluar',
                align: 'center',
                format: (val) => {
                    const isCalc = val === 'Sí';
                    return UI.createBadge(
                        isCalc ? I18n.t('common.si') : I18n.t('common.no'),
                        isCalc ? 'success' : ''
                    );
                }
            },
            {
                label: I18n.t('anova.tabla.diferencia'),
                key: 'Media',
                align: 'center',
                format: (val) => val !== null ? UI.formatNumber(val) : '-'
            },
            {
                label: I18n.t('anova.tabla.interpretacion'),
                key: 'Desv_Tipica',
                align: 'center',
                format: (val, row) => {
                    if (row.Sin_Evaluar !== 'Sí') return '-';
                    if (!val) return '-';

                    const isNotable = val.toLowerCase().includes('notable');
                    return UI.createBadge(
                        isNotable ? I18n.t('anova.diferencia.notable') : I18n.t('anova.diferencia.pequena'),
                        isNotable ? 'warning' : 'success'
                    );
                }
            }
        ];

        // Ordenar: primero calculables con diferencia notable, luego calculables sin diferencia, luego no calculables
        const sorted = [...data].sort((a, b) => {
            const aCalc = a.Sin_Evaluar === 'Sí' ? 1 : 0;
            const bCalc = b.Sin_Evaluar === 'Sí' ? 1 : 0;

            if (aCalc !== bCalc) return bCalc - aCalc;

            const aNotable = a.Desv_Tipica?.toLowerCase().includes('notable') ? 1 : 0;
            const bNotable = b.Desv_Tipica?.toLowerCase().includes('notable') ? 1 : 0;

            return bNotable - aNotable;
        });

        return UI.createDataTable(headers, sorted, { striped: true });
    }

    // API pública
    return {
        render
    };
})();
