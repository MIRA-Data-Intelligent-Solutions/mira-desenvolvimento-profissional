/**
 * TEMA CLARO / ESCURO.
 * Este arquivo é carregado no <head> (antes do resto da página) para o tema certo aparecer
 * logo de início, sem "piscar". As cores de cada tema ficam em css/themes.css.
 */
var Tema = (function () {
  var CHAVE = 'mira.theme';
  var ouvintes = [];

  function obter() {
    try {
      var salvo = JSON.parse(localStorage.getItem(CHAVE));
      if (salvo === 'light' || salvo === 'dark') return salvo;
    } catch (e) { /* ignora */ }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function aplicar(tema) {
    document.documentElement.setAttribute('data-theme', tema);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', tema === 'dark' ? '#000c29' : '#f6f7f9');
  }

  function definir(tema) {
    try { localStorage.setItem(CHAVE, JSON.stringify(tema)); } catch (e) { /* ignora */ }
    aplicar(tema);
    ouvintes.forEach(function (fn) { fn(tema); });
  }

  function alternar() { definir(obter() === 'dark' ? 'light' : 'dark'); }
  function aoMudar(fn) { ouvintes.push(fn); }

  aplicar(obter());
  return { obter: obter, definir: definir, alternar: alternar, aoMudar: aoMudar };
})();
