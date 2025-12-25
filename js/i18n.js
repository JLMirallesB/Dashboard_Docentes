/**
 * Sistema de internacionalización (i18n)
 * Soporta Español (es) y Valenciano (ca)
 */

const I18n = (function() {
    // Idioma por defecto
    const DEFAULT_LANG = 'es';
    const SUPPORTED_LANGS = ['es', 'ca'];
    const STORAGE_KEY = 'dashboard_lang';

    // Traducciones cargadas
    let translations = {};
    let currentLang = DEFAULT_LANG;

    /**
     * Inicializa el sistema i18n
     */
    async function init() {
        // Recuperar idioma guardado o usar el por defecto
        const savedLang = localStorage.getItem(STORAGE_KEY);
        currentLang = SUPPORTED_LANGS.includes(savedLang) ? savedLang : DEFAULT_LANG;

        // Cargar traducciones
        await loadTranslations(currentLang);

        // Actualizar el botón de idioma
        updateLangButton();

        // Traducir elementos iniciales
        translatePage();
    }

    /**
     * Carga las traducciones de un idioma
     */
    async function loadTranslations(lang) {
        try {
            const response = await fetch(`locales/${lang}.json`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            translations = await response.json();
        } catch (error) {
            console.error(`Error loading translations for ${lang}:`, error);
            // Si falla, intentar cargar el idioma por defecto
            if (lang !== DEFAULT_LANG) {
                await loadTranslations(DEFAULT_LANG);
            }
        }
    }

    /**
     * Obtiene una traducción por su clave
     * Soporta claves anidadas con punto: "nav.dashboard"
     * Soporta interpolación: "Hola {name}" -> t('key', {name: 'Juan'})
     */
    function t(key, params = {}) {
        const keys = key.split('.');
        let value = translations;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                console.warn(`Translation key not found: ${key}`);
                return key;
            }
        }

        if (typeof value !== 'string') {
            console.warn(`Translation key is not a string: ${key}`);
            return key;
        }

        // Interpolación de parámetros
        return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
            return params[paramKey] !== undefined ? params[paramKey] : match;
        });
    }

    /**
     * Cambia el idioma actual
     */
    async function setLang(lang) {
        if (!SUPPORTED_LANGS.includes(lang)) {
            console.warn(`Unsupported language: ${lang}`);
            return;
        }

        currentLang = lang;
        localStorage.setItem(STORAGE_KEY, lang);
        await loadTranslations(lang);
        updateLangButton();
        translatePage();

        // Disparar evento para que otros módulos puedan reaccionar
        document.dispatchEvent(new CustomEvent('langChange', { detail: { lang } }));
    }

    /**
     * Alterna entre idiomas
     */
    async function toggleLang() {
        const currentIndex = SUPPORTED_LANGS.indexOf(currentLang);
        const nextIndex = (currentIndex + 1) % SUPPORTED_LANGS.length;
        await setLang(SUPPORTED_LANGS[nextIndex]);
    }

    /**
     * Obtiene el idioma actual
     */
    function getLang() {
        return currentLang;
    }

    /**
     * Actualiza el botón de idioma
     */
    function updateLangButton() {
        const btn = document.getElementById('btn-lang');
        if (btn) {
            btn.textContent = currentLang.toUpperCase();
            btn.setAttribute('aria-label', currentLang === 'es' ? 'Cambiar a Valenciano' : 'Canviar a Espanyol');
        }
    }

    /**
     * Traduce todos los elementos con data-i18n
     */
    function translatePage() {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.textContent = t(key);
        });

        // Traducir placeholders
        const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
        placeholders.forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.setAttribute('placeholder', t(key));
        });

        // Traducir titles/tooltips
        const titles = document.querySelectorAll('[data-i18n-title]');
        titles.forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            el.setAttribute('title', t(key));
        });

        // Actualizar atributo lang del HTML
        document.documentElement.lang = currentLang;
    }

    // API pública
    return {
        init,
        t,
        setLang,
        toggleLang,
        getLang,
        translatePage
    };
})();

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    I18n.init();
});
