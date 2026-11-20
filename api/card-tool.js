// api/card-tool.js
// Служебный «Генератор карточек товаров» (раньше — открытая страница на GitHub Pages).
// Доступ проверяется на сервере: пароль хранится ТОЛЬКО в переменной окружения Vercel
// CARD_TOOL_PASSWORD (в коде его нет). После входа ставится подписанная cookie на 12 часов.
// Если переменная не задана — инструмент выключен (503).
// Адрес: https://universal-cnc.vercel.app/api/card-tool
import crypto from 'node:crypto';
import { readRawBody } from './_http.js';

const COOKIE = 'card_tool';
const TTL_SEC = 12 * 60 * 60;

function key(pass) { return crypto.createHash('sha256').update('card-tool:' + pass).digest(); }
function sign(pass, exp) { return crypto.createHmac('sha256', key(pass)).update(String(exp)).digest('hex'); }
function safeEq(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
function readCookie(req, name) {
  const h = req.headers.cookie || '';
  for (const part of h.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return '';
}
function authed(req, pass) {
  const [exp, sig] = readCookie(req, COOKIE).split('.');
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  return safeEq(sig, sign(pass, exp));
}
function send(res, status, html, extra = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('X-Frame-Options', 'DENY');
  for (const [k, v] of Object.entries(extra)) res.setHeader(k, v);
  res.end(html);
}
const page = (body) => `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="robots" content="noindex, nofollow">
<title>Инструмент</title><style>
body{font-family:Arial,sans-serif;background:#f8f9fa;margin:0;padding:20px;color:#333}
.box{max-width:900px;margin:0 auto;background:#fff;padding:24px;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.08)}
label{display:block;margin:12px 0 4px;font-weight:500}
input,textarea,select{width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box}
button{background:#0d6efd;color:#fff;border:none;padding:12px 24px;border-radius:8px;font-size:1rem;cursor:pointer;margin-top:14px}
pre{background:#f8f9fa;padding:16px;border-radius:8px;white-space:pre-wrap;font-family:inherit;line-height:1.5}
.err{color:#c00}</style></head><body><div class="box">${body}</div></body></html>`;

const LOGIN = (err) => page(`<h1>Вход</h1>${err ? '<p class="err">Неверный пароль</p>' : ''}
<form method="post" action="/api/card-tool"><label for="p">Пароль</label>
<input type="password" id="p" name="password" autocomplete="current-password" required autofocus>
<button type="submit">Войти</button></form>`);

const TOOL = page(`<h1>Генератор карточек товаров</h1>
<p>Вставьте данные со страницы товара — получите текст карточки для Marketplace ЧПУ-склад.</p>
<form id="f"><label>Ссылка на исходную страницу</label><input type="url" id="link">
<label>Название товара *</label><input type="text" id="title" required>
<label>Описание, характеристики, комплектация *</label><textarea id="desc" rows="8" required></textarea>
<label>Цена (для внутреннего расчёта)</label><input type="text" id="price">
<label>Категория</label><select id="category"><option>Шпиндели</option><option>Фрезы и инструмент</option>
<option>Механика и направляющие</option><option>Электроника</option><option>Расходники</option><option>Другое</option></select>
<button type="submit">Сгенерировать карточку</button></form>
<div id="out" style="display:none"><h2>Готовая карточка</h2><pre id="res"></pre><button type="button" id="copy">Копировать карточку</button></div>
<form method="post" action="/api/card-tool?logout=1"><button type="submit" style="background:#6c757d">Выйти</button></form>
<script>
document.getElementById('f').addEventListener('submit', function (e) {
  e.preventDefault();
  var v = function (id) { return document.getElementById(id).value.trim(); };
  var card = 'НАЗВАНИЕ:\\n' + v('title') + '\\n\\nАННОТАЦИЯ:\\nКачественный товар для станков с ЧПУ. Подходит для мастерских, школ, учебных центров и небольших производств.\\n\\nОПИСАНИЕ:\\n' + v('desc') +
    '\\n\\nХАРАКТЕРИСТИКИ:\\n• Категория: ' + v('category') + '\\n• Цена (внутр.): ' + (v('price') || 'уточнить') + '\\n• Источник: ' + (v('link') || 'не указан') +
    '\\n\\nДЛЯ КОГО:\\nВладельцы станков ЧПУ, мастерские, школы и учебные центры.\\n\\nКАК ИСПОЛЬЗОВАТЬ:\\nУстановите согласно инструкции к вашему станку. При необходимости обратитесь за консультацией.\\n\\nСТАТУС:\\nГотово к размещению на Marketplace ЧПУ-склад.\\n';
  document.getElementById('res').textContent = card;
  document.getElementById('out').style.display = 'block';
});
document.getElementById('copy').addEventListener('click', function () {
  navigator.clipboard.writeText(document.getElementById('res').textContent).then(function () { alert('Карточка скопирована!'); });
});
</script>`);

export default async function handler(req, res) {
  const pass = process.env.CARD_TOOL_PASSWORD;
  if (!pass) return send(res, 503, page('<p>Инструмент выключен: не задана переменная окружения.</p>'));
  const url = new URL(req.url, 'http://x');
  const cookieBase = `${COOKIE}=; Path=/api/card-tool; HttpOnly; Secure; SameSite=Strict`;
  if (req.method === 'POST' && url.searchParams.get('logout')) {
    return send(res, 303, '', { 'Set-Cookie': cookieBase + '; Max-Age=0', Location: '/api/card-tool' });
  }
  if (req.method === 'POST') {
    let given = '';
    try { given = new URLSearchParams((await readRawBody(req)).toString('utf8')).get('password') || ''; } catch (e) {}
    if (!safeEq(given, pass)) {
      await new Promise(r => setTimeout(r, 800)); // замедление перебора
      return send(res, 401, LOGIN(true));
    }
    const exp = Math.floor(Date.now() / 1000) + TTL_SEC;
    const val = `${exp}.${sign(pass, exp)}`;
    return send(res, 303, '', {
      'Set-Cookie': `${COOKIE}=${val}; Path=/api/card-tool; HttpOnly; Secure; SameSite=Strict; Max-Age=${TTL_SEC}`,
      Location: '/api/card-tool'
    });
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, page('<p>Метод не поддерживается</p>'));
  return authed(req, pass) ? send(res, 200, TOOL) : send(res, 200, LOGIN(false));
}
