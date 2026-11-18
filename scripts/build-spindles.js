#!/usr/bin/env node
/*
 * Генератор раздела «Шпиндели» из data/spindles.js.
 * Запуск из корня репозитория:  node scripts/build-spindles.js
 * Делает:
 *   1) spindles/<slug>.html — отдельная SEO-страница каждого шпинделя;
 *   2) список всех шпинделей на spindle-changsheng.html (между маркерами SPINDLES:START/END);
 *   3) записи spindle-changsheng.html и spindles/*.html в sitemap.xml (между маркерами spindles:start/end).
 * Удаляет из spindles/ страницы моделей, которых больше нет в данных.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://чпу-склад.рф';
const { SPINDLES, SPINDLE_SPEC_LABELS, spindleTitle } = require(path.join(ROOT, 'data', 'spindles.js'));
const today = new Date().toISOString().slice(0, 10);

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const isTbd = v => /уточн/i.test(String(v || ''));
const fmtVal = (key, v) => {
  if (v == null || v === '') return null;
  if (String(v).trim().toLowerCase() === 'уточнить') return '<span class="tbd">уточняется</span>';
  let s = esc(v).replace(/\(уточнить\)/g, '<span class="tbd">(уточняется)</span>');
  if (key === 'rpm' && /^\d+$/.test(String(v))) s = Number(v).toLocaleString('ru-RU').replace(/\u00a0/g, ' ') + ' об/мин';
  return s;
};
const priceText = s => s.price
  ? s.price.toLocaleString('ru-RU').replace(/\u00a0/g, ' ') + ' ₽'
  : 'Цена по запросу';

// --- проверки данных ---
const HAN = /[\u3400-\u9fff\uf900-\ufaff]/;
const ids = new Set(), slugs = new Set();
for (const s of SPINDLES) {
  if (!s.id || !s.slug) throw new Error('Нет id/slug: ' + JSON.stringify(s));
  if (!/^[a-z0-9-]+$/.test(s.slug)) throw new Error('Плохой slug: ' + s.slug);
  if (ids.has(s.id)) throw new Error('Дубль id: ' + s.id);
  if (slugs.has(s.slug)) throw new Error('Дубль slug: ' + s.slug);
  ids.add(s.id); slugs.add(s.slug);
  if (HAN.test(JSON.stringify(s))) throw new Error('Иероглифы в данных: ' + s.id);
  if (s.img && !/^https?:/.test(s.img) && !fs.existsSync(path.join(ROOT, s.img))) throw new Error('Нет файла фото: ' + s.img);
}

function specsRows(s, withBrand) {
  const rows = [];
  if (withBrand) rows.push(`<tr><th>Производитель</th><td>${esc(s.brand)}</td></tr>`);
  rows.push(`<tr><th>Модель</th><td>${esc(s.model)}</td></tr>`);
  for (const [key, label] of SPINDLE_SPEC_LABELS) {
    const v = fmtVal(key, s.specs[key]);
    if (v != null) rows.push(`<tr><th>${label}</th><td>${v}</td></tr>`);
  }
  return rows.join('\n            ');
}

function metaDescription(s) {
  return `${s.model}: ${s.short}. ${s.price ? 'Цена ' + priceText(s) + '.' : 'Цена по запросу.'} Характеристики, фото, применение — ЧПУ-склад.`;
}

const NAV = p => `<header>
    <div class="nav-container">
        <div class="logo"><img src="${p}logo.jpg" alt="ЧПУ-Склад"> ЧПУ склад</div>
        <nav>
            <ul>
                <li><a href="${p}index.html">Главная</a></li>
                <li><a href="${p}program.html">Программы</a></li>
                <li><a href="${p}equipment.html">Оборудование</a></li>
                <li><a href="${p}marketplace.html">Marketplace</a></li>
                <li><a href="${p}cart.html">Корзина <span id="headerCartCount" style="background:#dc3545;color:white;border-radius:10px;padding:1px 6px;font-size:0.75rem;">0</span></a></li>
            </ul>
        </nav>
    </div>
</header>`;

const CART_JS = `function addToCart(id) {
  var cart = JSON.parse(localStorage.getItem('cncCart') || '{}');
  cart[id] = (cart[id] || 0) + 1;
  localStorage.setItem('cncCart', JSON.stringify(cart));
  updateCartBadge();
  alert('Добавлено в корзину');
}
function updateCartBadge() {
  var cart = JSON.parse(localStorage.getItem('cncCart') || '{}');
  var n = Object.values(cart).reduce(function (a, b) { return a + b; }, 0);
  var el = document.getElementById('headerCartCount');
  if (el) el.textContent = n;
}
updateCartBadge();`;

function detailPage(s) {
  const url = `${SITE}/spindles/${s.slug}.html`;
  const title = `${spindleTitle(s)} для ЧПУ — характеристики и цена | ЧПУ-склад`;
  const desc = metaDescription(s);
  const img = s.img ? (/^https?:/.test(s.img) ? s.img : '../' + s.img) : '';
  const imgAbs = s.img ? (/^https?:/.test(s.img) ? s.img : `${SITE}/${s.img}`) : '';
  const ld = {
    '@context': 'https://schema.org', '@type': 'Product', name: s.model, description: s.short,
    brand: /другие/i.test(s.brand) ? undefined : { '@type': 'Brand', name: s.brand.replace(/\s*\(.*\)$/, '') },
    image: imgAbs || undefined, sku: s.id, url,
    offers: s.price ? { '@type': 'Offer', price: s.price, priceCurrency: 'RUB', url, availability: 'https://schema.org/InStock' } : undefined
  };
  const crumbs = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Marketplace', item: `${SITE}/marketplace.html` },
      { '@type': 'ListItem', position: 3, name: 'Шпиндели', item: `${SITE}/spindle-changsheng.html` },
      { '@type': 'ListItem', position: 4, name: s.model, item: url }
    ]
  };
  const description = (s.description && s.description.length ? s.description : [`${s.name}. ${s.short}.`])
    .map(p => `<p>${esc(p)}</p>`).join('\n        ');
  const apps = s.applications && s.applications.length
    ? s.applications : ['Фрезерно-гравировальные станки ЧПУ по дереву, пластику, композитам и цветным металлам — подбор под мощность и цангу уточняйте у менеджера.'];
  const notes = (s.notes || []).map(n => `<li>${n.date ? `<span class="note-date">${esc(n.date)}</span> ` : ''}${esc(n.text)}</li>`).join('\n          ');
  const clarify = (s.clarify || []).map(c => esc(c)).join(', ');
  const mailSubj = encodeURIComponent(`Вопрос по шпинделю ${s.model}`);
  const others = SPINDLES.filter(o => o.slug !== s.slug && o.brand === s.brand)
    .map(o => `<li><a href="${o.slug}.html">${esc(o.model)}</a> — ${esc(o.specs.power)}, ${priceText(o)}</li>`).join('\n          ');

  return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- Сгенерировано scripts/build-spindles.js из data/spindles.js — правьте данные, а не этот файл -->
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${url}">
    <meta property="og:type" content="product">
    <meta property="og:url" content="${url}">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(desc)}">
    <meta property="og:locale" content="ru_RU">
    <meta property="og:site_name" content="ЧПУ-склад">${imgAbs ? `\n    <meta property="og:image" content="${esc(imgAbs)}">` : ''}
    <link rel="stylesheet" href="../style.css">
    <style>
        .breadcrumbs { font-size: 0.85rem; color: #666; margin: 10px 0 16px; }
        .breadcrumbs a { color: #0d6efd; text-decoration: none; }
        .spindle-top { display: flex; gap: 24px; flex-wrap: wrap; }
        .spindle-photo { flex: 1 1 380px; background: #f8f9fa; border-radius: 12px; min-height: 260px; display: flex; align-items: center; justify-content: center; color: #999; }
        .spindle-photo img { width: 100%; max-height: 460px; object-fit: contain; border-radius: 12px; }
        .spindle-buy { flex: 1 1 320px; }
        .spindle-price { font-size: 1.8rem; font-weight: bold; color: #0d6efd; margin: 8px 0; }
        .price-usd { font-size: 1rem; color: #666; font-weight: normal; }
        .spindle-actions { display: flex; gap: 10px; flex-wrap: wrap; margin: 12px 0; }
        .spindle-actions .btn { padding: 10px 18px; border: none; border-radius: 8px; cursor: pointer; font-size: 0.95rem; text-decoration: none; display: inline-block; }
        .btn-primary { background: #0d6efd; color: white; }
        .btn-secondary { background: #f0f2f5; color: #333; }
        .specs { width: 100%; border-collapse: collapse; margin: 10px 0 20px; background: white; }
        .specs th, .specs td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #eee; vertical-align: top; }
        .specs th { width: 40%; color: #555; font-weight: 500; }
        .tbd { color: #b26a00; }
        .section { background: white; border-radius: 12px; padding: 16px 20px; margin: 16px 0; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
        .note-date { color: #888; font-size: 0.85rem; }
    </style>
    <script type="application/ld+json">${JSON.stringify(ld)}</script>
    <script type="application/ld+json">${JSON.stringify(crumbs)}</script>
</head>
<body>
${NAV('../')}
<main style="max-width:1100px;margin:20px auto;padding:0 16px;">
    <nav class="breadcrumbs" aria-label="Навигация"><a href="../index.html">Главная</a> › <a href="../marketplace.html">Marketplace</a> › <a href="../spindle-changsheng.html">Шпиндели</a> › ${esc(s.model)}</nav>
    <h1>${esc(spindleTitle(s))}</h1>
    <div class="spindle-top">
        <div class="spindle-photo">${img ? `<img src="${esc(img)}" alt="Шпиндель ${esc(s.model)}">` : 'Фото уточняется'}</div>
        <div class="spindle-buy">
            <p>${esc(s.name)}</p>
            <div class="spindle-price">${priceText(s)}${s.price && s.priceUsd ? ` <span class="price-usd">/ ${s.priceUsd} $</span>` : ''}</div>
            <p>${esc(s.short)}</p>
            <div class="spindle-actions">
                <button class="btn btn-primary" onclick="addToCart('${esc(s.id)}')">${s.price ? 'В корзину' : 'Запросить цену (в корзину)'}</button>
                <a class="btn btn-secondary" href="mailto:stepmotoren@yandex.ru?subject=${mailSubj}">Задать вопрос</a>
            </div>
            <p style="font-size:0.85rem;color:#666;">Цены и наличие уточняйте у менеджера: stepmotoren@yandex.ru</p>
        </div>
    </div>

    <section class="section">
        <h2>Характеристики</h2>
        <table class="specs">
            ${specsRows(s, true)}
        </table>
    </section>

    <section class="section" id="opisanie">
        <h2>Описание</h2>
        ${description}
    </section>

    <section class="section" id="primenenie">
        <h2>Применение</h2>
        <ul>
          ${apps.map(a => `<li>${esc(a)}</li>`).join('\n          ')}
        </ul>
    </section>
${notes ? `
    <section class="section" id="dopolnitelno">
        <h2>Дополнительная информация</h2>
        <ul>
          ${notes}
        </ul>
    </section>
` : ''}${clarify ? `
    <section class="section" id="utochnyaetsya">
        <h2>Уточняется</h2>
        <p class="tbd">${clarify}. Напишите нам — сообщим актуальные данные.</p>
    </section>
` : ''}${others ? `
    <section class="section">
        <h2>Другие шпиндели${/другие/i.test(s.brand) ? "" : ": " + esc(s.brand)}</h2>
        <ul>
          ${others}
        </ul>
    </section>
` : ''}
    <p><a href="../spindle-changsheng.html">← Все шпиндели</a> · <a href="../marketplace.html">Marketplace</a></p>
</main>
<footer>
    <p>© 2026 ЧПУ-Склад • Все права защищены</p>
</footer>
<script>
${CART_JS}
</script>
</body>
</html>
`;
}

function listCard(s) {
  const img = s.img
    ? `<img src="${esc(s.img)}" alt="Шпиндель ${esc(s.model)}" loading="lazy">`
    : `<div class="no-photo">Фото уточняется</div>`;
  return `<div class="variant-card" id="${esc(s.id)}">
          <a href="spindles/${s.slug}.html">${img}</a>
          <div class="variant-title"><a href="spindles/${s.slug}.html">${esc(s.name)}</a></div>
          <div class="variant-price">${priceText(s)}${s.price && s.priceUsd ? ` <span class="price-usd">/ ${s.priceUsd} $</span>` : ''}</div>
          <table class="specs-table">
            ${specsRows(s, false)}
          </table>
          <div class="variant-actions">
            <a class="btn btn-secondary" href="spindles/${s.slug}.html">Подробнее</a>
            <button class="btn btn-primary" onclick="addToCart('${esc(s.id)}')">${s.price ? 'В корзину' : 'Запросить цену'}</button>
          </div>
        </div>`;
}

function listHtml() {
  const brands = [...new Set(SPINDLES.map(s => s.brand))];
  return brands.map(b => `<h2 class="brand-title">${esc(b)}</h2>
    <div class="variant-list">
        ${SPINDLES.filter(s => s.brand === b).map(listCard).join('\n        ')}
    </div>`).join('\n    ');
}

function replaceBetween(text, start, end, inner, file) {
  const i = text.indexOf(start), j = text.indexOf(end);
  if (i < 0 || j < 0 || j < i) throw new Error(`Нет маркеров ${start} / ${end} в ${file}`);
  return text.slice(0, i + start.length) + '\n' + inner + '\n' + text.slice(j);
}

// 1) детальные страницы
const outDir = path.join(ROOT, 'spindles');
fs.mkdirSync(outDir, { recursive: true });
const wanted = new Set(SPINDLES.map(s => s.slug + '.html'));
for (const f of fs.readdirSync(outDir)) if (f.endsWith('.html') && !wanted.has(f)) fs.unlinkSync(path.join(outDir, f));
for (const s of SPINDLES) fs.writeFileSync(path.join(outDir, s.slug + '.html'), detailPage(s));

// 2) список
const listFile = path.join(ROOT, 'spindle-changsheng.html');
fs.writeFileSync(listFile, replaceBetween(fs.readFileSync(listFile, 'utf8'),
  '<!-- SPINDLES:START (генерируется scripts/build-spindles.js) -->', '<!-- SPINDLES:END -->', '    ' + listHtml(), listFile));

// 3) sitemap
const smFile = path.join(ROOT, 'sitemap.xml');
const entry = (loc, prio) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${prio}</priority>\n  </url>`;
const sm = [entry(`${SITE}/spindle-changsheng.html`, '0.8'), ...SPINDLES.map(s => entry(`${SITE}/spindles/${s.slug}.html`, '0.7'))].join('\n');
fs.writeFileSync(smFile, replaceBetween(fs.readFileSync(smFile, 'utf8'), '  <!-- spindles:start -->', '  <!-- spindles:end -->', sm, smFile));

console.log(`OK: ${SPINDLES.length} страниц в spindles/, список и sitemap обновлены`);
