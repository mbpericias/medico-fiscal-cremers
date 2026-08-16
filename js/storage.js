/**
 * storage.js
 * Camada única de persistência (localStorage). Nenhum outro módulo deve
 * chamar localStorage diretamente — tudo passa por aqui, para que trocar
 * o mecanismo de armazenamento no futuro (ex.: IndexedDB) exija mudar
 * apenas este arquivo.
 */
(function (global) {
  'use strict';

  var PREFIX = 'mf_cremers_';
  var SCHEMA_VERSION = 1;

  var KEYS = {
    cards: PREFIX + 'cards',        // { [id]: card }
    progress: PREFIX + 'progress',  // { [id]: progressRecord }
    history: PREFIX + 'history',    // [ {cardId, date, rating, normaId} ]
    settings: PREFIX + 'settings',
    streak: PREFIX + 'streak',      // { current, longest, lastStudyDate }
    favorites: PREFIX + 'favorites',// [ cardId, ... ]
    meta: PREFIX + 'meta'
  };

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null || raw === undefined) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      console.error('Falha ao ler "' + key + '" do localStorage:', err);
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error('Falha ao gravar "' + key + '" no localStorage:', err);
      if (err && err.name === 'QuotaExceededError') {
        throw new Error(
          'Armazenamento local cheio. Exporte um backup, limpe dados ' +
          'antigos do navegador para este site, e tente novamente.'
        );
      }
      throw err;
    }
  }

  var DEFAULT_SETTINGS = {
    theme: 'auto',            // 'light' | 'dark' | 'auto'
    dailyGoal: 20,
    streakRule: 'goal',       // 'goal' = precisa bater a meta diária; 'any' = qualquer revisão conta
    newCardsPerSessionDefault: 20
  };

  var Storage = {
    KEYS: KEYS,
    SCHEMA_VERSION: SCHEMA_VERSION,

    getCards: function () { return readJSON(KEYS.cards, {}); },
    setCards: function (cardsById) { return writeJSON(KEYS.cards, cardsById); },

    getProgress: function () { return readJSON(KEYS.progress, {}); },
    setProgress: function (progressById) { return writeJSON(KEYS.progress, progressById); },

    getHistory: function () { return readJSON(KEYS.history, []); },
    setHistory: function (historyArr) { return writeJSON(KEYS.history, historyArr); },
    appendHistory: function (entry) {
      var h = readJSON(KEYS.history, []);
      h.push(entry);
      // Mantém o histórico sob controle (últimos 20000 eventos é mais do que suficiente).
      if (h.length > 20000) h = h.slice(h.length - 20000);
      writeJSON(KEYS.history, h);
      return h;
    },

    getSettings: function () {
      var s = readJSON(KEYS.settings, null);
      if (!s) return Object.assign({}, DEFAULT_SETTINGS);
      return Object.assign({}, DEFAULT_SETTINGS, s);
    },
    setSettings: function (settings) { return writeJSON(KEYS.settings, settings); },

    getStreak: function () {
      return readJSON(KEYS.streak, { current: 0, longest: 0, lastStudyDate: null });
    },
    setStreak: function (streak) { return writeJSON(KEYS.streak, streak); },

    getFavorites: function () { return readJSON(KEYS.favorites, []); },
    setFavorites: function (arr) { return writeJSON(KEYS.favorites, arr); },

    getMeta: function () {
      return readJSON(KEYS.meta, { schemaVersion: SCHEMA_VERSION, createdAt: null });
    },
    setMeta: function (meta) { return writeJSON(KEYS.meta, meta); },

    /** Monta um objeto único com tudo, para exportação de backup. */
    exportAll: function () {
      return {
        app: 'medico-fiscal-cremers-flashcards',
        schemaVersion: SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        cards: this.getCards(),
        progress: this.getProgress(),
        history: this.getHistory(),
        settings: this.getSettings(),
        streak: this.getStreak(),
        favorites: this.getFavorites()
      };
    },

    /** Substitui TODOS os dados pelo conteúdo de um backup previamente exportado. */
    restoreAll: function (backup) {
      if (!backup || typeof backup !== 'object') {
        throw new Error('Arquivo de backup inválido.');
      }
      if (!backup.cards || !backup.progress) {
        throw new Error('Arquivo de backup não contém a estrutura esperada.');
      }
      writeJSON(KEYS.cards, backup.cards || {});
      writeJSON(KEYS.progress, backup.progress || {});
      writeJSON(KEYS.history, backup.history || []);
      writeJSON(KEYS.settings, Object.assign({}, DEFAULT_SETTINGS, backup.settings || {}));
      writeJSON(KEYS.streak, backup.streak || { current: 0, longest: 0, lastStudyDate: null });
      writeJSON(KEYS.favorites, backup.favorites || []);
      writeJSON(KEYS.meta, { schemaVersion: SCHEMA_VERSION, createdAt: (this.getMeta().createdAt || new Date().toISOString()) });
      return true;
    },

    /** Usado apenas na primeiríssima inicialização do app. */
    ensureInitialized: function () {
      var meta = this.getMeta();
      if (!meta.createdAt) {
        meta.createdAt = new Date().toISOString();
        meta.schemaVersion = SCHEMA_VERSION;
        this.setMeta(meta);
      }
    }
  };

  global.MF = global.MF || {};
  global.MF.Storage = Storage;
})(window);
