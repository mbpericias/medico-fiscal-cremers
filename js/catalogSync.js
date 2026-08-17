/**
 * catalogSync.js — Sincroniza o banco local com o CATÁLOGO de normas
 * oficiais (data/catalog.json), de forma exclusivamente ADITIVA.
 *
 * O que este módulo faz, em toda inicialização do app:
 *   1. Busca data/catalog.json (lista de arquivos JSON oficiais).
 *   2. Busca cada arquivo listado.
 *   3. Para cada card desses arquivos cujo `id` AINDA NÃO existe no banco
 *      local, insere o card com progresso zerado (novo).
 *   4. Cards cujo `id` já existe localmente NUNCA são tocados — nem seu
 *      conteúdo, nem (principalmente) seu progresso de estudo.
 *
 * O que este módulo NUNCA faz:
 *   - apagar ou sobrescrever um card já existente;
 *   - apagar ou alterar progresso/histórico/estatísticas de qualquer card;
 *   - depender de nomes de leis/resoluções fixados no código — a lista de
 *     normas oficiais vive inteiramente em data/catalog.json.
 *
 * Assim, adicionar uma nova norma ao catálogo oficial no futuro é só:
 * colocar o arquivo em data/ e acrescentar uma linha em catalog.json —
 * nenhuma mudança neste arquivo, em app.js ou em state.js é necessária.
 *
 * Em dispositivos/navegadores offline ou servidos via file:// (onde fetch
 * de arquivos locais é bloqueado), a sincronização falha silenciosamente e
 * o app continua funcionando com o que já estiver no banco local — a
 * importação manual pela tela "Importar flashcards" continua disponível
 * como alternativa.
 */
(function (global) {
  'use strict';

  var State = global.MF.State;
  var CardsModel = global.MF.CardsModel;

  var CATALOG_FILE = 'data/catalog.json';

  /**
   * Executa a sincronização e devolve uma Promise que resolve com um
   * resumo: { added, totalLocal, totalOfficialSeen, uniqueOfficialSeen }.
   * Nunca rejeita (falhas de rede/parse são capturadas e logadas).
   */
  function sync() {
    return fetch(CATALOG_FILE)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (catalog) {
        var entries = (catalog && Array.isArray(catalog.bancos_oficiais)) ? catalog.bancos_oficiais : [];
        var files = entries.map(function (e) { return e.arquivo; }).filter(Boolean);
        return Promise.all(files.map(function (file) {
          return fetch(file)
            .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
            .then(function (parsed) { return { file: file, parsed: parsed }; })
            .catch(function (err) {
              console.warn('[Catálogo] Falha ao carregar "' + file + '": ' + err.message);
              return null;
            });
        }));
      })
      .then(function (results) {
        var existing = State.getAllCards().reduce(function (acc, c) { acc[c.id] = c; return acc; }, {});
        var added = [];
        var rawIdsSeen = [];       // para detectar duplicidade de id ENTRE arquivos oficiais
        var uniqueIdsSeen = {};

        results.forEach(function (result) {
          if (!result) return;
          var extracted = CardsModel.extractCardsArray(result.parsed);
          if (!extracted.cardsArray) {
            console.warn('[Catálogo] Arquivo "' + result.file + '" não está no formato esperado (array ou {cards:[...]}).');
            return;
          }

          var report = CardsModel.analyzeImportBatch(result.parsed, existing);
          if (report.invalidos.length > 0) {
            console.warn('[Catálogo] ' + report.invalidos.length + ' card(s) inválido(s) em "' + result.file + '" (ignorados):', report.invalidos);
          }

          extracted.cardsArray.forEach(function (raw) {
            if (raw && raw.id) { rawIdsSeen.push(raw.id); uniqueIdsSeen[raw.id] = true; }
          });

          // Só os NOVOS (id ainda não presente localmente) entram — cards já
          // existentes (report.existentes) são propositalmente ignorados aqui.
          report.novos.forEach(function (card) {
            existing[card.id] = card;
            added.push(card);
          });
        });

        if (added.length > 0) {
          State.importCards(added);
        }

        var summary = {
          added: added.length,
          totalLocal: State.getAllCards().length,
          totalOfficialSeen: rawIdsSeen.length,
          uniqueOfficialSeen: Object.keys(uniqueIdsSeen).length
        };

        if (summary.totalOfficialSeen !== summary.uniqueOfficialSeen) {
          console.warn(
            '[Catálogo] Atenção: há ids duplicados ENTRE arquivos oficiais diferentes (' +
            summary.totalOfficialSeen + ' cards lidos, apenas ' + summary.uniqueOfficialSeen + ' ids únicos). ' +
            'Verifique os arquivos listados em ' + CATALOG_FILE + '.'
          );
        }

        console.info(
          '[Catálogo] Sincronização concluída: ' + summary.added + ' card(s) novo(s) adicionado(s). ' +
          summary.uniqueOfficialSeen + ' ids oficiais únicos no catálogo. ' +
          summary.totalLocal + ' cards no banco local.'
        );

        return summary;
      })
      .catch(function (err) {
        console.warn('[Catálogo] Sincronização não realizada (normal em file:// ou offline no primeiro acesso): ' + err.message);
        return { added: 0, totalLocal: State.getAllCards().length, totalOfficialSeen: 0, uniqueOfficialSeen: 0 };
      });
  }

  global.MF = global.MF || {};
  global.MF.CatalogSync = { sync: sync };
})(window);
