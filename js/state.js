/**
 * state.js — Estado central da aplicação em memória, sincronizado com o
 * Storage. Views leem daqui e chamam ações daqui; nenhuma view deve tocar
 * em localStorage diretamente.
 */
(function (global) {
  'use strict';

  var Storage = global.MF.Storage;
  var SRS = global.MF.SRS;

  var cardsById = {};
  var progressById = {};
  var settings = {};
  var streak = {};
  var favorites = [];

  var listeners = [];

  function load() {
    Storage.ensureInitialized();
    cardsById = Storage.getCards();
    progressById = Storage.getProgress();
    settings = Storage.getSettings();
    streak = Storage.getStreak();
    favorites = Storage.getFavorites();
  }

  function notify() {
    listeners.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } });
  }

  function onChange(fn) { listeners.push(fn); }

  function persistCards() { Storage.setCards(cardsById); }
  function persistProgress() { Storage.setProgress(progressById); }
  function persistSettings() { Storage.setSettings(settings); }
  function persistStreak() { Storage.setStreak(streak); }
  function persistFavorites() { Storage.setFavorites(favorites); }

  // ---------- Acesso a cards ----------

  function getAllCards() {
    return Object.keys(cardsById).map(function (id) { return cardsById[id]; });
  }

  function getCard(id) { return cardsById[id]; }

  function getProgress(id) {
    return progressById[id] || SRS.createInitialProgress(id);
  }

  function getAllNormas() {
    var set = {};
    getAllCards().forEach(function (c) { set[c.norma] = true; });
    return Object.keys(set).sort();
  }

  function getAllTemas(norma) {
    var set = {};
    getAllCards().forEach(function (c) {
      if (!norma || c.norma === norma) set[c.tema] = true;
    });
    return Object.keys(set).sort();
  }

  // ---------- Importação ----------

  function importCards(newCardsArray) {
    newCardsArray.forEach(function (card) {
      cardsById[card.id] = card;
      if (!progressById[card.id]) {
        progressById[card.id] = SRS.createInitialProgress(card.id);
      }
    });
    persistCards();
    persistProgress();
    notify();
  }

  /** Atualiza um card já existente preservando seu histórico/progresso. */
  function updateCard(card) {
    if (!cardsById[card.id]) throw new Error('Card não existe: ' + card.id);
    cardsById[card.id] = card;
    persistCards();
    notify();
  }

  /**
   * Atualiza em lote o CONTEÚDO de cards já existentes (mesmo id), usada
   * pelo botão explícito "Atualizar cards existentes" da tela de Importar.
   * Nunca mexe em `progressById` — id é a chave de progresso/histórico, e
   * como o id não muda, revisões, domínio e sequência de acertos continuam
   * exatamente como estavam.
   */
  function updateCards(cardsArray) {
    cardsArray.forEach(function (card) {
      if (cardsById[card.id]) cardsById[card.id] = card;
    });
    persistCards();
    notify();
  }

  function deleteCard(id) {
    delete cardsById[id];
    delete progressById[id];
    persistCards();
    persistProgress();
    favorites = favorites.filter(function (f) { return f !== id; });
    persistFavorites();
    notify();
  }

  // ---------- Favoritos ----------

  function isFavorite(id) { return favorites.indexOf(id) !== -1; }
  function toggleFavorite(id) {
    var idx = favorites.indexOf(id);
    if (idx === -1) favorites.push(id); else favorites.splice(idx, 1);
    persistFavorites();
    notify();
  }

  // ---------- Registro de resposta ----------

  /**
   * Registra a resposta do usuário a um card: atualiza progresso (SRS),
   * grava evento no histórico e atualiza a sequência diária.
   */
  function recordAnswer(cardId, rating) {
    var card = cardsById[cardId];
    if (!card) throw new Error('Card não encontrado: ' + cardId);
    var prev = getProgress(cardId);
    var next = SRS.applyRating(prev, rating, card.prioridade);
    progressById[cardId] = next;
    persistProgress();

    Storage.appendHistory({
      cardId: cardId,
      norma: card.norma,
      tema: card.tema,
      date: SRS.todayStr(),
      timestamp: new Date().toISOString(),
      rating: rating
    });

    updateStreakForToday();
    notify();
    return next;
  }

  function updateStreakForToday() {
    var today = SRS.todayStr();
    if (streak.lastStudyDate === today) return; // já contabilizado hoje

    var studiedTodayCount = countStudiedOn(today);
    var goalMet = settings.streakRule === 'any' ? studiedTodayCount >= 1 : studiedTodayCount >= settings.dailyGoal;
    if (!goalMet) return; // ainda não bateu o critério de hoje; não altera sequência ainda

    if (streak.lastStudyDate) {
      var diff = SRS.daysBetween(streak.lastStudyDate, today);
      if (diff === 1) {
        streak.current += 1;
      } else if (diff > 1) {
        streak.current = 1;
      }
      // diff === 0 não deveria ocorrer aqui pois já retornamos acima
    } else {
      streak.current = 1;
    }
    streak.longest = Math.max(streak.longest || 0, streak.current);
    streak.lastStudyDate = today;
    persistStreak();
  }

  function countStudiedOn(dateStr) {
    var h = Storage.getHistory();
    var ids = {};
    h.forEach(function (e) { if (e.date === dateStr) ids[e.cardId] = true; });
    return Object.keys(ids).length;
  }

  // ---------- Configurações ----------

  function getSettings() { return settings; }
  function updateSettings(patch) {
    settings = Object.assign({}, settings, patch);
    persistSettings();
    notify();
  }

  function getStreak() { return streak; }

  // ---------- Backup ----------

  function exportBackup() { return Storage.exportAll(); }
  function restoreBackup(obj) {
    Storage.restoreAll(obj);
    load();
    notify();
  }

  global.MF = global.MF || {};
  global.MF.State = {
    load: load,
    onChange: onChange,
    notify: notify,
    getAllCards: getAllCards,
    getCard: getCard,
    getProgress: getProgress,
    getAllNormas: getAllNormas,
    getAllTemas: getAllTemas,
    importCards: importCards,
    updateCard: updateCard,
    updateCards: updateCards,
    deleteCard: deleteCard,
    isFavorite: isFavorite,
    toggleFavorite: toggleFavorite,
    recordAnswer: recordAnswer,
    countStudiedOn: countStudiedOn,
    getSettings: getSettings,
    updateSettings: updateSettings,
    getStreak: getStreak,
    exportBackup: exportBackup,
    restoreBackup: restoreBackup
  };
})(window);
