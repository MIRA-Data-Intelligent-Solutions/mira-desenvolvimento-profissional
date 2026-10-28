/**
 * FERRAMENTAS — funções pequenas usadas em várias páginas:
 * escapar texto, formatar datas e números, guardar dados no navegador, ler parâmetros da URL.
 */

var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapa texto antes de colocá-lo dentro de um HTML montado em JavaScript (evita injeção de HTML). */
function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return ESC[c]; });
}

/** Remove acentos e deixa em minúsculas (para a busca ignorar acentos). */
function normalize(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Espera o usuário parar de digitar antes de executar a função. */
function debounce(fn, wait) {
  var t;
  return function () {
    var args = arguments;
    clearTimeout(t);
    t = setTimeout(function () { fn.apply(null, args); }, wait || 200);
  };
}

var _uid = 0;
function nextId(prefix) {
  _uid += 1;
  return (prefix || 'id') + '-' + _uid;
}

/** Lê um parâmetro da URL. Ex.: detalhes-colaborador.html?id=u01  ->  parametroUrl('id') = 'u01' */
function parametroUrl(nome) {
  return new URLSearchParams(window.location.search).get(nome) || '';
}

/* ---------------------------------------------------------------- guardar no navegador */

/** Cria um "guardador" seguro (localStorage/sessionStorage podem falhar em janela privada). */
function criarArmazenamento(nomeStorage) {
  return {
    get: function (chave, padrao) {
      try {
        var bruto = window[nomeStorage].getItem(chave);
        return bruto === null ? (padrao === undefined ? null : padrao) : JSON.parse(bruto);
      } catch (e) { return padrao === undefined ? null : padrao; }
    },
    set: function (chave, valor) {
      try { window[nomeStorage].setItem(chave, JSON.stringify(valor)); return true; } catch (e) { return false; }
    },
    remove: function (chave) {
      try { window[nomeStorage].removeItem(chave); } catch (e) { /* ignora */ }
    }
  };
}
var armazenamentoLocal = criarArmazenamento('localStorage');      // fica salvo mesmo fechando o navegador
var armazenamentoSessao = criarArmazenamento('sessionStorage');   // vale só enquanto a aba está aberta

/* ---------------------------------------------------------------- formatação */

function pad(n) { return String(n).padStart(2, '0'); }

function formatNumber(value) { return new Intl.NumberFormat('pt-BR').format(value); }

/** Converte "2026-05-20" (ou Date) em Date. */
function toDate(input) {
  if (input instanceof Date) return input;
  if (!input) return null;
  var p = String(input).slice(0, 10).split('-').map(Number);
  return new Date(p[0], p[1] - 1, p[2]);
}

/** "2026-05-20" -> "20/05/2026" (ou "20/05" com o padrão 'DD/MM'). */
function formatDate(input, pattern) {
  var d = toDate(input);
  if (!d) return '';
  var map = { DD: pad(d.getDate()), MM: pad(d.getMonth() + 1), YYYY: String(d.getFullYear()) };
  return (pattern || 'DD/MM/YYYY').replace(/DD|MM|YYYY/g, function (t) { return map[t]; });
}

function toISO(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

function initials(name) {
  var parts = String(name || '?').trim().split(/\s+/);
  return ((parts[0][0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** Cor estável por nome, para avatares sem foto. */
function avatarColor(name) {
  var h = 0;
  String(name).split('').forEach(function (ch) { h = (h * 31 + ch.charCodeAt(0)) % 360; });
  return 'hsl(' + h + ' 55% 48%)';
}

function avatar(name, size) {
  size = size || 36;
  return '<span class="avatar" style="--size:' + size + 'px;--avatar-bg:' + avatarColor(name) + '" aria-hidden="true">' + initials(name) + '</span>';
}

function firstName(name) { return String(name || '').split(' ')[0]; }

/** Máscara de telefone: +55 (11) 98888-7777 */
function maskPhone(raw) {
  var digits = String(raw).replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 2) return digits ? '+' + digits : '';
  var cc = digits.slice(0, 2);
  var ddd = digits.slice(2, 4);
  var rest = digits.slice(4);
  var body = rest.length > 5 ? rest.slice(0, 5) + '-' + rest.slice(5) : rest;
  return '+' + cc + (ddd ? ' (' + ddd + ')' : '') + (body ? ' ' + body : '');
}
