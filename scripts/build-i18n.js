#!/usr/bin/env node
/*
 * Языковые версии сайта: /en/, /kk/, /uz/, /hy/, /ka/, /ky/ (русский — основной, на прежних адресах).
 * Запускается из scripts/build-spindles.js (до простановки меток ?v=), можно и отдельно:
 *   node scripts/build-i18n.js
 * Делает:
 *   1) /<lang>/index.html, marketplace.html, payment.html; equipment.html — заглушка-переадресация на marketplace.html;
 *   2) /<lang>/spindles|machines|products/<slug>.html — карточки всех товаров с отдельной страницей;
 *   3) на русских страницах: переключатель языка в шапке (маркеры LANG:START/END)
 *      и <link rel="alternate" hreflang> (маркеры HREFLANG:START/END);
 *   4) sitemap.xml: адреса языковых версий (маркеры i18n:start/end) и xhtml:link у всех страниц с переводами.
 * Тексты — i18n/<lang>.json: ui (интерфейс), cats/catDesc (категории), specLabels (названия характеристик),
 * glossary/units (перевод названий товаров и значений характеристик по словарю).
 * Новый товар переводится сам, если все слова его названия и характеристик есть в glossary;
 * иначе сборка остановится и покажет непереведённый текст — добавьте фразу во все i18n/*.json.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://чпу-склад.рф';
const LANGS = ['en', 'kk', 'uz', 'hy', 'ka', 'ky'];
const ALL = ['ru', ...LANGS];
const NATIVE = { ru: 'Русский', en: 'English', kk: 'Қазақша', uz: 'O‘zbekcha', hy: 'Հայերեն', ka: 'ქართული', ky: 'Кыргызча' };
const CYR = /[А-Яа-яЁё]/;
const HAN = /[\u3400-\u9fff\uf900-\ufaff]/;
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const write = (f, t) => { fs.mkdirSync(path.dirname(path.join(ROOT, f)), { recursive: true }); fs.writeFileSync(path.join(ROOT, f), t); };
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fill = (t, o) => String(t).replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));

const { SPINDLES, SPINDLE_SPEC_LABELS, spindleTitle, spindleMainPhoto } = require(path.join(ROOT, 'data', 'spindles.js'));
const { MACHINES, CATALOG } = require(path.join(ROOT, 'data', 'catalog.js'));
const { PRODUCTS } = require(path.join(ROOT, 'data', 'products.js'));
const DICT = Object.fromEntries(LANGS.map(l => [l, JSON.parse(read(`i18n/${l}.json`))]));

// --- словари: у всех языков одинаковый набор ключей ---
for (const part of ['ui', 'cats', 'catDesc', 'specLabels', 'glossary', 'units']) {
  const keys = Object.keys(DICT.en[part]).sort().join('|');
  for (const l of LANGS) {
    if (Object.keys(DICT[l][part]).sort().join('|') !== keys) throw new Error(`i18n/${l}.json: набор ключей «${part}» отличается от en.json`);
    for (const [k, v] of Object.entries(DICT[l][part])) {
      if (!v) throw new Error(`i18n/${l}.json: пустой перевод ${part}.${k}`);
      if (HAN.test(v)) throw new Error(`i18n/${l}.json: иероглифы в ${part}.${k}`);
      if (/крипт|crypto|usdt|биткоин|bitcoin/i.test(v)) throw new Error(`i18n/${l}.json: упоминание криптовалюты в ${part}.${k}`);
    }
  }
}

// --- перевод названий и значений по словарю ---
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const B = '(?<![А-Яа-яЁёA-Za-z])', E = '(?![А-Яа-яЁё])';
const glossRe = new RegExp(B + '(' + Object.keys(DICT.en.glossary).sort((a, b) => b.length - a.length).map(reEsc).join('|') + ')' + E, 'g');
const unitRe = new RegExp('(?<![А-Яа-яЁё])(' + Object.keys(DICT.en.units).sort((a, b) => b.length - a.length).map(reEsc).join('|') + ')' + E, 'g');
const untranslated = [];
function tr(l, text) {
  if (text == null) return '';
  let s = String(text);
  if (l === 'ru') return s;
  s = s.replace(glossRe, m => DICT[l].glossary[m]);
  s = s.replace(unitRe, m => DICT[l].units[m]);
  if (l === 'en') s = s.replace(/(\d),(\d)/g, '$1.$2');
  if ((l === 'en' || l === 'uz' || l === 'hy' || l === 'ka') && CYR.test(s)) untranslated.push(`${l}: «${text}» → «${s}»`);
  return s;
}
const label = (l, ru) => {
  const v = DICT[l].specLabels[ru];
  if (!v) untranslated.push(`${l}: название характеристики «${ru}» (добавьте в specLabels)`);
  return v || ru;
};
const fmtPrice = p => p.toLocaleString('ru-RU').replace(/\u00a0/g, ' ') + ' ₽';
const priceOf = (l, it) => it.price ? fmtPrice(it.price) + (it.priceUsd ? ` <span class="price-usd">/ ${it.priceUsd} $</span>` : '') : DICT[l].ui.free;
const specVal = (l, key, v) => {
  if (String(v).trim().toLowerCase() === 'уточнить') return DICT[l].ui.tbd;
  if (key === 'rpm' && /^\d+$/.test(String(v))) return Number(v).toLocaleString('ru-RU').replace(/\u00a0/g, ' ') + ' ' + tr(l, 'об/мин');
  return tr(l, v);
};

// --- единый список товаров для языковых страниц ---
const MACHINE_LABELS = [['workArea', 'Рабочее поле (XYZ)'], ['spindlePower', 'Мощность шпинделя'], ['rpm', 'Максимальные обороты'], ['cooling', 'Охлаждение шпинделя'], ['drive', 'Привод осей'], ['rails', 'Направляющие'], ['control', 'Управление'], ['materials', 'Обрабатываемые материалы'], ['weightPacked', 'Вес с упаковкой']];
const ITEMS = [
  ...MACHINES.map(m => ({ kind: 'machines', id: m.id, sku: m.sku, slug: m.slug, cat: 'machines', title: m.title, price: m.price, img: m.img || '', techLink: m.techLink,
    specs: MACHINE_LABELS.filter(([k]) => m.specs && m.specs[k]).map(([k, lbl]) => [lbl, k, m.specs[k]]) })),
  ...SPINDLES.map(s => ({ kind: 'spindles', id: s.id, sku: s.sku, slug: s.slug, cat: 'spindle', title: spindleTitle(s), price: s.price, priceUsd: s.priceUsd, img: spindleMainPhoto(s) || '',
    specs: [['Производитель', null, s.brand.replace(/\s*\(.*\)$/, '')], ['Модель', null, s.model.replace(/^Шпиндель\s+/i, '')],
      ...SPINDLE_SPEC_LABELS.filter(([k]) => s.specs[k] != null && s.specs[k] !== '').map(([k, lbl]) => [lbl, k, s.specs[k]])] })),
  ...PRODUCTS.map(p => ({ kind: 'products', id: p.id, sku: p.sku, slug: p.slug, cat: p.cat, title: p.title, price: p.price, img: p.img || '',
    specs: (p.specs || []).map(([lbl, v]) => [lbl, null, v]) })),
  ...CATALOG.map(c => ({ kind: null, id: c.id, sku: c.sku, cat: c.cat, title: c.title, price: c.price, img: c.img || '', specs: [] }))
];
for (const it of ITEMS) if (it.price == null || (it.kind && !(it.price > 0))) throw new Error('Нет цены: ' + it.id);

// --- адреса страниц и альтернативы ---
const PAGES = []; // { key, ru: путь от корня, lang: l => путь от корня }
const addPage = (key, ruPath, langPath) => PAGES.push({ key, ruPath, langPath });
addPage('home', 'index.html', l => `${l}/index.html`);
addPage('marketplace', 'marketplace.html', l => `${l}/marketplace.html`);
addPage('payment', 'payment-nonresident.html', l => `${l}/payment.html`);
for (const it of ITEMS) if (it.kind) addPage('item:' + it.id, `${it.kind}/${it.slug}.html`, l => `${l}/${it.kind}/${it.slug}.html`);
const absUrl = p => `${SITE}/${p.replace(/(^|\/)index\.html$/, '$1')}`;
const pageUrls = pg => Object.fromEntries(ALL.map(l => [l, absUrl(l === 'ru' ? pg.ruPath : pg.langPath(l))]));
const hreflangLinks = pg => {
  const u = pageUrls(pg);
  return ALL.map(l => `<link rel="alternate" hreflang="${l}" href="${u[l]}">`).join('\n    ') + `\n    <link rel="alternate" hreflang="x-default" href="${u.ru}">`;
};
const relFrom = (fromFile, toFile) => {
  const r = path.relative(path.dirname(path.join(ROOT, fromFile)), path.join(ROOT, toFile)).split(path.sep).join('/');
  return r || path.basename(toFile);
};

// переключатель языка: ссылки на ту же страницу на других языках (или на главную языка)
function langSwitch(file, cur, pg) {
  const items = ALL.map(l => {
    // страница без перевода: «Русский» ведёт на неё же, остальные языки — на главную языка
    const target = pg ? (l === 'ru' ? pg.ruPath : pg.langPath(l)) : (l === 'ru' ? (cur === 'ru' ? file : 'index.html') : `${l}/index.html`);
    const cur1 = l === cur ? ' aria-current="true"' : '';
    return `<li><a href="${esc(relFrom(file, target))}" hreflang="${l}" lang="${l}"${cur1} onclick="try{localStorage.setItem('siteLang','${l}')}catch(e){}">${NATIVE[l]}</a></li>`;
  }).join('');
  return `<!-- LANG:START (генерируется scripts/build-i18n.js) --><div class="lang-switch"><details><summary title="Язык / Language">🌐 ${NATIVE[cur]}</summary><ul>${items}</ul></details></div><!-- LANG:END -->`;
}

// --- общие куски языковых страниц ---
const METRIKA = `<!-- Yandex.Metrika counter -->
<script type="text/javascript">
    (function(m,e,t,r,i,k,a){
        m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
    })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=114351392', 'ym');

    ym(114351392, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
</script>
<noscript><div><img src="https://mc.yandex.ru/watch/114351392" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
<!-- /Yandex.Metrika counter -->`;

const CARD_CSS = `
        .breadcrumbs { font-size: 0.85rem; color: #666; margin: 10px 0 16px; }
        .breadcrumbs a { color: #0d6efd; text-decoration: none; }
        .card-top { display: flex; gap: 24px; flex-wrap: wrap; }
        .card-photo { flex: 1 1 380px; background: #f8f9fa; border-radius: 12px; min-height: 260px; display: flex; align-items: flex-start; justify-content: center; color: #888; }
        .card-photo img { width: 100%; max-height: 460px; object-fit: contain; border-radius: 12px; }
        .card-buy { flex: 1 1 320px; }
        .card-price { font-size: 1.8rem; font-weight: bold; color: #0d6efd; margin: 8px 0; }
        .price-usd { font-size: 1rem; color: #555; font-weight: normal; }
        .btn { padding: 10px 18px; border: none; border-radius: 8px; cursor: pointer; font-size: 0.95rem; text-decoration: none; display: inline-block; text-align: center; }
        .btn-primary { background: #0d6efd; color: white; }
        .btn-secondary { background: #f0f2f5; color: #333; }
        .specs { width: 100%; border-collapse: collapse; margin: 10px 0 20px; background: white; }
        .specs th, .specs td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #eee; vertical-align: top; }
        .specs th { width: 40%; color: #555; font-weight: 500; }
        .section { background: white; border-radius: 12px; padding: 16px 20px; margin: 16px 0; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
        .sku-line { margin: 4px 0 8px; color: #444; font-size: 0.95rem; }
        .sku-code { font-family: monospace; font-size: 1.05rem; font-weight: bold; background: #f0f2f5; padding: 1px 6px; border-radius: 4px; user-select: all; }
        .sku-copy { border: 1px solid #ccd; background: #fff; border-radius: 6px; padding: 2px 8px; font-size: 0.8rem; cursor: pointer; }
        .no-photo { padding: 40px 16px; color: #888; }`;

const cartJs = l => `function addToCart(id) {
  var cart = JSON.parse(localStorage.getItem('cncCart') || '{}');
  cart[id] = (cart[id] || 0) + 1;
  localStorage.setItem('cncCart', JSON.stringify(cart));
  updateCartBadge();
  alert(${JSON.stringify(DICT[l].ui.added)});
}
function updateCartBadge() {
  var cart = JSON.parse(localStorage.getItem('cncCart') || '{}');
  var n = Object.values(cart).reduce(function (a, b) { return a + b; }, 0);
  var el = document.getElementById('headerCartCount');
  if (el) el.textContent = n;
}
updateCartBadge();
function copySku(sku, btn) {
  function done() { if (!btn) return; var old = btn.getAttribute('data-label') || btn.textContent; btn.setAttribute('data-label', old); btn.textContent = ${JSON.stringify(DICT[l].ui.copied)}; setTimeout(function () { btn.textContent = old; }, 1500); }
  function fallback() { var t = document.createElement('textarea'); t.value = sku; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) {} document.body.removeChild(t); done(); }
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(sku).then(done, fallback); else fallback();
}`;

const skuLine = (l, sku) => `<div class="sku-line">${esc(DICT[l].specLabels['Артикул'])}: <span class="sku-code">${esc(sku)}</span> <button type="button" class="sku-copy" onclick="copySku('${esc(sku)}', this)" title="${esc(DICT[l].ui.copyTitle)}">${esc(DICT[l].ui.copy)}</button></div>`;

function head(l, file, pg, o) {
  const u = absUrl(file);
  return `<!DOCTYPE html>
<html lang="${l}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- Сгенерировано scripts/build-i18n.js из i18n/${l}.json и data/*.js — правьте данные и словари, а не этот файл -->
    <title>${esc(o.title)}</title>
    <meta name="description" content="${esc(o.desc)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${u}">
    ${hreflangLinks(pg)}
    <meta property="og:type" content="${o.ogType || 'website'}">
    <meta property="og:url" content="${u}">
    <meta property="og:title" content="${esc(o.title)}">
    <meta property="og:description" content="${esc(o.desc)}">
    <meta property="og:locale" content="${DICT[l].locale}">
    <meta property="og:site_name" content="${esc(DICT[l].ui.brand)}">${o.image ? `\n    <meta property="og:image" content="${esc(o.image)}">` : ''}
    <link rel="stylesheet" href="${relFrom(file, 'style.css')}">
    <style>${CARD_CSS}${o.css || ''}
    </style>
    ${(o.ld || []).map(x => `<script type="application/ld+json">${JSON.stringify(x)}</script>`).join('\n    ')}
    <script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': o.pageType || 'WebPage', name: o.title, url: u, inLanguage: l, isPartOf: { '@type': 'WebSite', name: DICT[l].ui.brand, url: `${SITE}/${l}/` } })}</script>
${METRIKA}
</head>`;
}

function header(l, file, pg, active) {
  const ui = DICT[l].ui, r = t => esc(relFrom(file, t));
  const a = k => (k === active ? ' active' : '');
  return `<header>
    <div class="nav-container has-lang">
        <div class="logo">
            <a href="${r(`${l}/index.html`)}" style="display:flex;align-items:center;gap:10px;color:inherit;text-decoration:none;"><img src="${r('logo.jpg')}" alt="${esc(ui.brand)}"> ${esc(ui.brand)}</a>
        </div>
        <nav>
            <ul>
                <li><a href="${r(`${l}/index.html`)}" class="${a('home').trim()}">${esc(ui.navHome)}</a></li>
                <li><a href="${r(`${l}/marketplace.html`)}" class="nav-catalog${a('marketplace')}">${esc(ui.navCatalog)}</a></li>
                <li><a href="${r(`${l}/payment.html`)}" class="${a('payment').trim()}">${esc(ui.navPayment)}</a></li>
                <li><a href="${r('cart.html')}">${esc(ui.navCart)} <span id="headerCartCount" style="background:#dc3545;color:white;border-radius:10px;padding:1px 6px;font-size:0.75rem;">0</span></a></li>
            </ul>
        </nav>
        ${langSwitch(file, l, pg)}
    </div>
</header>`;
}

function footer(l, file) {
  const ui = DICT[l].ui;
  return `<footer>
    <p>© 2026 ${esc(ui.brand)} • ${esc(ui.rights)}</p>
    <p>${esc(ui.support)}: <a href="https://wa.me/79619910176">+7 961 991 01 76</a> (WhatsApp) | <a href="mailto:stepmotoren@yandex.ru">stepmotoren@yandex.ru</a></p>
    <p><a href="${esc(relFrom(file, `${l}/payment.html`))}">${esc(ui.payH1)}</a></p>
</footer>`;
}

const contactsBlock = l => `<p>${esc(DICT[l].ui.askDelivery)}</p>
        <p><strong>${esc(DICT[l].ui.email)}:</strong> <a href="mailto:stepmotoren@yandex.ru">stepmotoren@yandex.ru</a><br><strong>${esc(DICT[l].ui.phone)}:</strong> <a href="https://wa.me/79619910176">+7 961 991 01 76</a></p>`;

// --- карточка товара ---
function itemPage(l, it) {
  const ui = DICT[l].ui, file = `${l}/${it.kind}/${it.slug}.html`, pg = PAGES.find(p => p.key === 'item:' + it.id);
  const title = tr(l, it.title), price = fmtPrice(it.price), cat = DICT[l].cats[it.cat];
  const imgAbs = it.img ? (/^https?:/.test(it.img) ? it.img : `${SITE}/${it.img}`) : '';
  const photo = it.img ? `<img src="${esc(/^https?:/.test(it.img) ? it.img : relFrom(file, it.img))}" alt="${esc(title)}">` : `<div class="no-photo">${esc(ui.photoTbd)}</div>`;
  const rows = [[label(l, 'Артикул'), it.sku], ...it.specs.map(([lbl, key, v]) => [label(l, lbl), specVal(l, key, v)])]
    .map(([a, b]) => `<tr><th>${esc(a)}</th><td>${esc(b)}</td></tr>`).join('\n            ');
  const mp = relFrom(file, `${l}/marketplace.html`);
  const url = absUrl(file);
  const ld = [
    { '@context': 'https://schema.org', '@type': 'Product', name: title, description: `${cat}. ${DICT[l].catDesc[it.cat]}`, image: imgAbs || undefined, sku: it.sku, productID: it.id, url,
      offers: { '@type': 'Offer', price: it.price, priceCurrency: 'RUB', url, availability: 'https://schema.org/InStock' } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: ui.navHome, item: `${SITE}/${l}/` },
      { '@type': 'ListItem', position: 2, name: ui.navCatalog, item: `${SITE}/${l}/marketplace.html` },
      { '@type': 'ListItem', position: 3, name: cat, item: `${SITE}/${l}/marketplace.html?cat=${it.cat}` },
      { '@type': 'ListItem', position: 4, name: title, item: url }] }
  ];
  const tech = it.techLink ? `<p><a href="${esc(relFrom(file, it.techLink))}">${esc(ui.techLink)}</a></p>` : '';
  return `${head(l, file, pg, { title: fill(ui.cardTitle, { title }) + ' | ' + ui.brand, desc: fill(ui.cardDesc, { title, sku: it.sku, price, brand: ui.brand }), ogType: 'product', image: imgAbs, ld, pageType: 'ItemPage' })}
<body>
${header(l, file, pg, 'marketplace')}
<main style="max-width:1100px;margin:20px auto;padding:0 16px;">
    <nav class="breadcrumbs" aria-label="breadcrumbs"><a href="${esc(relFrom(file, `${l}/index.html`))}">${esc(ui.navHome)}</a> › <a href="${esc(mp)}">${esc(ui.navCatalog)}</a> › <a href="${esc(mp)}?cat=${it.cat}">${esc(cat)}</a> › ${esc(title)}</nav>
    <h1>${esc(title)}</h1>
    <div class="card-top">
        <div class="card-photo">${photo}</div>
        <div class="card-buy">
            ${skuLine(l, it.sku)}
            <div class="card-price">${priceOf(l, it)}</div>
            <p><button type="button" class="btn btn-primary" onclick="addToCart('${esc(it.id)}')">${esc(ui.addToCart)}</button></p>
            <h2 style="font-size:1.15rem;">${esc(ui.specs)}</h2>
            <table class="specs">
            ${rows}
            </table>
        </div>
    </div>
    <div class="section">
        <p>${esc(DICT[l].catDesc[it.cat])}</p>
        <p>${esc(ui.pricesNote)}</p>
        ${contactsBlock(l)}
    </div>
    ${tech}
    <p><a href="${esc(mp)}?cat=${it.cat}">← ${esc(cat)}</a> · <a href="${esc(mp)}">${esc(ui.allProducts)}</a></p>
</main>
${footer(l, file)}
<script>
${cartJs(l)}
</script>
</body>
</html>
`;
}

// --- каталог ---
// Русская marketplace.html ведётся вручную: в начале <main> стоит предупреждение
// «сайт в разработке!» и строка с телефоном (как на старой equipment.html).
// Сборка обновляет только маркеры HREFLANG/LANG и не перезаписывает тело русской страницы.
// На языковые /<lang>/marketplace.html это предупреждение не выносится: отдельного
// локализованного баннера на сайте не было.
const CAT_ORDER = ['machines', 'spindle', 'kits', 'vfd', 'lasers', 'co2', 'drives', 'controllers', 'rotary', 'tools', 'mechanics', 'electronics', 'consumables', 'software'];
function marketplacePage(l) {
  const ui = DICT[l].ui, file = `${l}/marketplace.html`, pg = PAGES.find(p => p.key === 'marketplace');
  const cards = ITEMS.map(it => {
    const title = tr(l, it.title);
    const link = it.kind ? `${it.kind}/${it.slug}.html` : '';
    const img = it.img ? `<img src="${esc(/^https?:/.test(it.img) ? it.img : relFrom(file, it.img))}" alt="${esc(title)}" loading="lazy">` : `<div class="placeholder">${esc(ui.photoTbd)}</div>`;
    const action = link ? `<a href="${esc(link)}" class="btn btn-primary">${esc(ui.details)}</a>` : `<button type="button" class="btn btn-primary" onclick="addToCart('${esc(it.id)}')">${esc(ui.addToCart)}</button>`;
    return `<div class="product-card" data-cat="${esc(it.cat)}" data-search="${esc((title + ' ' + it.sku).toLowerCase())}">
                <div class="product-image">${link ? `<a href="${esc(link)}">${img}</a>` : img}</div>
                <div class="product-info">
                    <h3 class="product-title">${link ? `<a href="${esc(link)}">${esc(title)}</a>` : esc(title)}</h3>
                    ${skuLine(l, it.sku)}
                    <div class="product-price">${priceOf(l, it)}</div>
                    <p class="product-desc">${esc(DICT[l].cats[it.cat])}</p>
                    <div class="product-actions">${action}</div>
                </div>
            </div>`;
  }).join('\n            ');
  const cats = CAT_ORDER.filter(c => ITEMS.some(it => it.cat === c));
  const ld = [{ '@context': 'https://schema.org', '@type': 'ItemList', name: ui.mpH1, numberOfItems: ITEMS.filter(i => i.kind).length,
    itemListElement: ITEMS.filter(i => i.kind).map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: `${tr(l, it.title)} (${it.sku})`, url: `${SITE}/${l}/${it.kind}/${it.slug}.html` })) }];
  const css = `
        .marketplace-layout { display: flex; gap: 20px; }
        .sidebar { width: 260px; flex-shrink: 0; }
        .categories { background: white; border-radius: 12px; padding: 14px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
        .categories h3 { margin: 0 0 10px; font-size: 1rem; }
        .categories button { display: block; width: 100%; text-align: left; background: none; border: none; padding: 8px 10px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; color: #333; }
        .categories button.active, .categories button:hover { background: #e7f1ff; color: #0d6efd; }
        .main-content { flex: 1; min-width: 0; }
        .search-bar { display: flex; gap: 8px; margin-bottom: 14px; }
        .search-bar input { flex: 1; padding: 10px 14px; border: 1px solid #ddd; border-radius: 8px; }
        .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
        .product-card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); display: flex; flex-direction: column; }
        .product-image { height: 180px; background: #f8f9fa; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .product-image img { width: 100%; height: 180px; object-fit: cover; }
        .product-image .placeholder { color: #888; font-size: 0.85rem; text-align: center; padding: 10px; }
        .product-info { padding: 14px; display: flex; flex-direction: column; flex: 1; }
        .product-title { font-weight: 600; margin: 0 0 6px; font-size: 0.95rem; line-height: 1.3; }
        .product-title a { color: #222; text-decoration: none; }
        .product-price { font-size: 1.25rem; font-weight: bold; color: #0d6efd; margin: 6px 0; }
        .product-desc { font-size: 0.8rem; color: #666; margin: 0 0 10px; }
        .product-actions { margin-top: auto; display: flex; }
        .product-actions .btn { flex: 1; padding: 8px; font-size: 0.85rem; }
        .sku-line { font-size: 0.82rem; }
        .empty-state { text-align: center; padding: 40px; color: #666; display: none; }
        @media (max-width: 768px) { .marketplace-layout { flex-direction: column; } .sidebar { width: 100%; } .products-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); } }`;
  return `${head(l, file, pg, { title: fill(ui.mpTitle, { brand: ui.brand }), desc: ui.mpDesc, ld, css, pageType: 'CollectionPage' })}
<body>
${header(l, file, pg, 'marketplace')}
<main>
    <div style="text-align:center; margin-bottom:20px;">
        <h1>${esc(ui.mpH1)}</h1>
        <p>${esc(ui.mpDesc)}</p>
        <p><small>${esc(ui.pricesNote)}</small></p>
    </div>
    <div class="marketplace-layout">
        <aside class="sidebar">
            <div class="categories">
                <h3>${esc(ui.categories)}</h3>
                <button class="active" data-cat="all">${esc(ui.allProducts)}</button>
                ${cats.map(c => `<button data-cat="${c}">${esc(DICT[l].cats[c])}</button>`).join('\n                ')}
            </div>
        </aside>
        <div class="main-content">
            <div class="search-bar"><input type="text" id="searchInput" placeholder="${esc(ui.search)}"></div>
            <div class="products-grid" id="productsGrid">
            ${cards}
            </div>
            <div class="empty-state" id="emptyState"><h3>${esc(ui.notFound)}</h3></div>
        </div>
    </div>
</main>
${footer(l, file)}
<script>
${cartJs(l)}
(function () {
  var cur = 'all';
  var input = document.getElementById('searchInput');
  var cards = document.querySelectorAll('.product-card');
  var btns = document.querySelectorAll('.categories button');
  function apply() {
    var q = input.value.trim().toLowerCase(), n = 0;
    cards.forEach(function (c) {
      var ok = (cur === 'all' || c.getAttribute('data-cat') === cur) && (!q || c.getAttribute('data-search').indexOf(q) >= 0);
      c.style.display = ok ? '' : 'none'; if (ok) n++;
    });
    document.getElementById('emptyState').style.display = n ? 'none' : 'block';
  }
  function setCat(c) { cur = c; btns.forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-cat') === c); }); apply(); }
  btns.forEach(function (b) { b.addEventListener('click', function () { setCat(b.getAttribute('data-cat')); }); });
  input.addEventListener('input', apply);
  var p = new URLSearchParams(location.search), want = p.get('cat') || location.hash.replace('#', '');
  if (p.get('q')) input.value = p.get('q');
  if (want && document.querySelector('.categories button[data-cat="' + want + '"]')) setCat(want); else apply();
})();
</script>
</body>
</html>
`;
}

// --- главная ---
function homePage(l) {
  const ui = DICT[l].ui, file = `${l}/index.html`, pg = PAGES.find(p => p.key === 'home');
  const cats = CAT_ORDER.filter(c => ITEMS.some(it => it.cat === c));
  const css = `
        .cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; margin: 12px 0; }
        .cat-grid a { display: block; background: #fff; border-radius: 10px; padding: 14px 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.07); text-decoration: none; color: #0d6efd; font-weight: 600; }
        .cat-grid a span { display: block; color: #666; font-weight: normal; font-size: 0.85rem; margin-top: 4px; }`;
  const ld = [{ '@context': 'https://schema.org', '@type': 'Organization', name: ui.brand, url: `${SITE}/${l}/`, logo: `${SITE}/logo.jpg`, email: 'stepmotoren@yandex.ru', telephone: '+79619910176' }];
  return `${head(l, file, pg, { title: fill(ui.homeTitle, { brand: ui.brand }), desc: fill(ui.homeIntro, { brand: ui.brand }), ld, css })}
<body>
${header(l, file, pg, 'home')}
<main>
    <section>
        <h1>${esc(ui.homeH1)}</h1>
        <p>${esc(fill(ui.homeIntro, { brand: ui.brand }))}</p>
        <p><a class="btn btn-primary" href="marketplace.html">${esc(ui.navCatalog)} →</a></p>
    </section>
    <section>
        <h2>${esc(ui.homeCatsH)}</h2>
        <div class="cat-grid">
            ${cats.map(c => `<a href="marketplace.html?cat=${c}">${esc(DICT[l].cats[c])}<span>${ITEMS.filter(it => it.cat === c).length}</span></a>`).join('\n            ')}
        </div>
    </section>
    <section>
        <h2>${esc(ui.homeHowH)}</h2>
        <ul>
            <li>${esc(ui.homeHow1)}</li>
            <li>${esc(ui.homeHow2)}</li>
            <li>${esc(ui.homeHow3)}</li>
        </ul>
        <p><a href="payment.html">${esc(ui.navPayment)} →</a></p>
    </section>
    <section>
        <h2>${esc(ui.contactsH)}</h2>
        <p><strong>${esc(ui.email)}:</strong> <a href="mailto:stepmotoren@yandex.ru">stepmotoren@yandex.ru</a></p>
        <p><strong>${esc(ui.phone)}:</strong> <a href="https://wa.me/79619910176">+7 961 991 01 76</a></p>
    </section>
</main>
${footer(l, file)}
<script>
${cartJs(l)}
</script>
</body>
</html>
`;
}

// --- оборудование: страница сохраняется как переадресация на каталог товаров (GitHub Pages без 301) ---
const EQ_MOVED = {
  en: { title: 'Machines — moved to the Products catalogue | CNC-Sklad', desc: 'The Machines section has been merged into the Products catalogue.', body: 'The Machines section has been merged into the <a href="marketplace.html">Products</a> catalogue.' },
  kk: { title: 'Станоктар — Тауарлар каталогына көшірілді | ЧПУ-склад', desc: '«Станоктар» бөлімі «Тауарлар» каталогымен біріктірілді.', body: '«Станоктар» бөлімі <a href="marketplace.html">Тауарлар</a> каталогымен біріктірілді.' },
  uz: { title: 'Dastgohlar — Mahsulotlar katalogiga ko‘chirildi | CNC-Sklad', desc: 'Dastgohlar bo‘limi Mahsulotlar katalogiga birlashtirildi.', body: 'Dastgohlar bo‘limi <a href="marketplace.html">Mahsulotlar</a> katalogiga birlashtirildi.' },
  hy: { title: 'Հաստոցներ — տեղափոխված է Ապրանքներ ցանկ | CNC-Sklad', desc: '«Հաստոցներ» բաժինը միավորվել է «Ապրանքներ» ցանկի հետ։', body: '«Հաստոցներ» բաժինը միավորվել է <a href="marketplace.html">Ապրանքներ</a> ցանկի հետ։' },
  ka: { title: 'ჩარხები — გადატანილია კატალოგში პროდუქცია | CNC-Sklad', desc: 'განყოფილება «ჩარხები» გაერთიანდა კატალოგთან «პროდუქცია».', body: 'განყოფილება «ჩარხები» გაერთიანდა კატალოგთან <a href="marketplace.html">პროდუქცია</a>.' },
  ky: { title: 'Станоктор — Товарлар каталогуна көчүрүлдү | ЧПУ-склад', desc: '«Станоктор» бөлүмү «Товарлар» каталогу менен бириктирилди.', body: '«Станоктор» бөлүмү <a href="marketplace.html">Товарлар</a> каталогу менен бириктирилди.' }
};
function equipmentPage(l) {
  const ui = DICT[l].ui, msg = EQ_MOVED[l];
  const title = msg.title || `${ui.navEquipment} — ${ui.navCatalog} | ${ui.brand}`;
  const canonical = `${SITE}/${l}/marketplace.html`;
  return `<!DOCTYPE html>
<html lang="${l}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(msg.desc)}">
    <meta name="robots" content="noindex, follow">
    <link rel="canonical" href="${canonical}">
    <meta http-equiv="refresh" content="0; url=marketplace.html">
    <script>location.replace('marketplace.html' + location.search + location.hash);</script>
${METRIKA}
</head>
<body>
    <p>${msg.body}</p>
</body>
</html>
`;
}

// --- оплата и доставка (та же форма онлайн-оплаты, что на payment-nonresident.html) ---
function paymentPage(l) {
  const ui = DICT[l].ui, file = `${l}/payment.html`, pg = PAGES.find(p => p.key === 'payment');
  const css = `
        .info-page { max-width: 800px; margin: 0 auto; }
        .info-page h2 { margin-top: 1.8em; }
        .highlight { background: #e7f3ff; padding: 16px 18px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #0d6efd; }
        .online-pay-box { background: #fff; padding: 22px; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); margin: 16px 0 24px; }
        .online-pay-form { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; }
        .online-pay-form label { display: flex; flex-direction: column; font-size: 0.95rem; color: #333; gap: 6px; }
        .online-pay-form .wide { grid-column: 1 / -1; }
        .online-pay-form input, .online-pay-form select { padding: 10px 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 1rem; }
        .online-pay-btn { background: #0d6efd; color: #fff; border: none; padding: 12px 22px; border-radius: 8px; font-size: 1rem; cursor: pointer; }
        .online-pay-btn:disabled { background: #c5c9ce; color: #555; cursor: wait; }
        .online-pay-msg { margin-top: 12px; min-height: 1.2em; }
        .online-pay-msg.error { color: #b02a37; }
        .online-pay-msg.info { color: #0a58ca; }
        .online-pay-note { font-size: 0.9rem; color: #666; }
        .steps li { margin-bottom: 10px; }
        @media (max-width: 600px) { .online-pay-form { grid-template-columns: 1fr; } }`;
  const M = k => JSON.stringify(ui[k]);
  return `${head(l, file, pg, { title: fill(ui.payTitle, { brand: ui.brand }), desc: ui.payDesc, css })}
<body>
${header(l, file, pg, 'payment')}
<main>
    <article class="info-page">
        <h1>${esc(ui.payH1)}</h1>
        <p>${esc(ui.payIntro)}</p>
        <h2>${esc(ui.payH)}</h2>
        <p>${esc(ui.pay1)}</p>
        <h2>${esc(ui.onlineH)}</h2>
        <div id="online-pay" class="online-pay-box" data-api-base="https://universal-cnc.vercel.app">
            <p>${esc(ui.online1)}</p>
            <form id="online-pay-form" class="online-pay-form" novalidate>
                <label>${esc(ui.fAmount)}
                    <input type="number" name="amount" min="1" max="50000" step="0.01" inputmode="decimal" required placeholder="${esc(ui.fAmountPh)}">
                </label>
                <label>${esc(ui.fCurrency)}
                    <select name="currency"><option value="USD" selected>USD</option></select>
                </label>
                <label class="wide">${esc(ui.fEmail)}
                    <input type="email" name="email" maxlength="254" autocomplete="email" placeholder="name@example.com">
                </label>
                <label class="wide">${esc(ui.fComment)}
                    <input type="text" name="orderComment" maxlength="80" placeholder="${esc(ui.fCommentPh)}">
                </label>
                <div class="wide"><button type="submit" class="online-pay-btn">${esc(ui.fPay)}</button></div>
            </form>
            <div id="online-pay-msg" class="online-pay-msg" role="status" aria-live="polite"></div>
            <p class="online-pay-note">${esc(ui.fNote)}</p>
        </div>
        <h2>${esc(ui.delivH)}</h2>
        <p>${esc(ui.deliv1)}</p>
        <p>${esc(ui.deliv2)}</p>
        <div class="highlight">${esc(ui.exportNote)}</div>
        <h2>${esc(ui.stepsH)}</h2>
        <ol class="steps">
            <li>${esc(ui.step1)} <a href="mailto:stepmotoren@yandex.ru">stepmotoren@yandex.ru</a>, WhatsApp <a href="https://wa.me/79619910176">+7 961 991 01 76</a></li>
            <li>${esc(ui.step2)}</li>
            <li>${esc(ui.step3)}</li>
            <li>${esc(ui.step4)}</li>
            <li>${esc(ui.step5)}</li>
        </ol>
        <h2>${esc(ui.contactsH)}</h2>
        <p><strong>${esc(ui.email)}:</strong> <a href="mailto:stepmotoren@yandex.ru">stepmotoren@yandex.ru</a><br><strong>${esc(ui.phone)}:</strong> <a href="https://wa.me/79619910176">+7 961 991 01 76</a></p>
    </article>
</main>
${footer(l, file)}
<script>
${cartJs(l)}
(function () {
    var box = document.getElementById('online-pay');
    var form = document.getElementById('online-pay-form');
    var msg = document.getElementById('online-pay-msg');
    if (!box || !form || !msg) return;
    function show(text, type) { msg.textContent = text; msg.className = 'online-pay-msg' + (type ? ' ' + type : ''); }
    var params = new URLSearchParams(window.location.search);
    if (params.get('pay') === 'return') show(${M('mReturn')} + ' ' + (params.get('order') || '—') + '.', 'info');
    var configuredBase = (box.getAttribute('data-api-base') || '').replace(/\\/+$/, '');
    var onVercel = /\\.vercel\\.app$/i.test(window.location.hostname);
    var apiBase = (configuredBase && onVercel) ? '' : configuredBase;
    var endpoint = apiBase + '/api/pay/create-order';
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var amount = parseFloat(String(form.amount.value).replace(',', '.'));
        if (!(amount > 0)) { show(${M('mAmount')}, 'error'); return; }
        var btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        show(${M('mCreating')}, 'info');
        fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: amount, currency: form.currency.value, email: form.email.value.trim(), orderComment: form.orderComment.value.trim() })
        }).then(function (r) {
            return r.json().catch(function () { return {}; }).then(function (data) { return { ok: r.ok, data: data }; });
        }).then(function (res) {
            if (res.ok && res.data && res.data.payUrl && /^https:\\/\\//i.test(res.data.payUrl)) { show(${M('mRedirect')}, 'info'); window.location.href = res.data.payUrl; return; }
            show(${M('mFail')}, 'error'); btn.disabled = false;
        }).catch(function () { show(${M('mUnavailable')}, 'error'); btn.disabled = false; });
    });
})();
</script>
</body>
</html>
`;
}

// 1–2) языковые страницы
for (const l of LANGS) {
  const dir = path.join(ROOT, l);
  for (const k of ['spindles', 'machines', 'products']) {
    const d = path.join(dir, k);
    if (!fs.existsSync(d)) continue;
    const want = new Set(ITEMS.filter(it => it.kind === k).map(it => it.slug + '.html'));
    for (const f of fs.readdirSync(d)) if (f.endsWith('.html') && !want.has(f)) fs.unlinkSync(path.join(d, f));
  }
  write(`${l}/index.html`, homePage(l));
  write(`${l}/marketplace.html`, marketplacePage(l));
  write(`${l}/equipment.html`, equipmentPage(l));
  write(`${l}/payment.html`, paymentPage(l));
  for (const it of ITEMS) if (it.kind) write(`${l}/${it.kind}/${it.slug}.html`, itemPage(l, it));
}
if (untranslated.length) throw new Error('Нет перевода (добавьте фразы в glossary/specLabels всех i18n/*.json):\n  ' + [...new Set(untranslated)].join('\n  '));

// 3) русские страницы: hreflang и переключатель
const SKIP_DIRS = new Set(['.git', 'node_modules', 'docs', 'api', 'scripts', 'mistral-advanced-bot', '_site', 'knowledge', 'equipment-data', 'i18n', ...LANGS]);
const SKIP_FILES = new Set(['program/Mach3.html', 'equipment/cnc-3040.html']); // пустая Mach3 и технический раздел 3040 не трогаем
function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => {
    const full = path.join(dir, d.name);
    if (d.isDirectory()) return SKIP_DIRS.has(d.name) ? [] : htmlFiles(full);
    return d.name.endsWith('.html') ? [full] : [];
  });
}
const byRu = new Map(PAGES.map(p => [p.ruPath, p]));
let ruTouched = 0;
for (const full of htmlFiles(ROOT)) {
  const rel = path.relative(ROOT, full).split(path.sep).join('/');
  if (SKIP_FILES.has(rel)) continue;
  let t = fs.readFileSync(full, 'utf8'); const t0 = t;
  const pg = byRu.get(rel);
  t = t.replace(/\n?\s*<!-- HREFLANG:START[\s\S]*?<!-- HREFLANG:END -->/g, '');
  if (pg) t = t.replace(/(<link rel="canonical"[^>]*>)/, `$1\n    <!-- HREFLANG:START (генерируется scripts/build-i18n.js) -->\n    ${hreflangLinks(pg)}\n    <!-- HREFLANG:END -->`);
  t = t.replace(/\s*<!-- LANG:START[\s\S]*?<!-- LANG:END -->/g, '');
  t = t.replace(/<div class="nav-container has-lang">/g, '<div class="nav-container">');
  if (/<div class="nav-container">/.test(t) && /<\/nav>/.test(t)) {
    t = t.replace(/(<\/nav>)/, `$1\n        ${langSwitch(rel, 'ru', pg)}`);
    t = t.replace('<div class="nav-container">', '<div class="nav-container has-lang">'); // сетка шапки: переключатель всегда справа (style.css)
  }
  // главная: если посетитель раньше сам выбрал другой язык — открыть его (только для людей, не для роботов)
  t = t.replace(/\n?<script>\/\* LANG-REMEMBER \*\/[\s\S]*?<\/script>/g, '');
  if (rel === 'index.html') t = t.replace(/(<\/head>)/, `<script>/* LANG-REMEMBER */(function(){try{var l=localStorage.getItem('siteLang');if(!l||l==='ru'||!/^(en|kk|uz|hy|ka|ky)$/.test(l))return;if(/bot|crawl|spider|slurp|yandex|google|bing|baidu|duckduck|lighthouse|headless|preview/i.test(navigator.userAgent))return;location.replace('${''}'+l+'/');}catch(e){}})();</script>\n$1`);
  if (t !== t0) { fs.writeFileSync(full, t); ruTouched++; }
}

// 4) sitemap
const smFile = path.join(ROOT, 'sitemap.xml');
let sm = fs.readFileSync(smFile, 'utf8');
if (!/xmlns:xhtml=/.test(sm)) sm = sm.replace(/<urlset([^>]*)>/, '<urlset$1 xmlns:xhtml="http://www.w3.org/1999/xhtml">');
sm = sm.replace(/\n\s*<xhtml:link [^>]*\/>/g, '');
const today = new Date().toISOString().slice(0, 10);
const altXml = pg => { const u = pageUrls(pg); return [...ALL.map(l => `    <xhtml:link rel="alternate" hreflang="${l}" href="${u[l]}"/>`), `    <xhtml:link rel="alternate" hreflang="x-default" href="${u.ru}"/>`].join('\n'); };
const urlToPage = new Map(PAGES.map(p => [absUrl(p.ruPath), p]));
sm = sm.replace(/(<loc>([^<]+)<\/loc>)/g, (m, all, loc) => { const pg = urlToPage.get(loc); return pg ? `${all}\n${altXml(pg)}` : m; });
const langEntries = PAGES.flatMap(pg => LANGS.map(l => `  <url>\n    <loc>${absUrl(pg.langPath(l))}</loc>\n${altXml(pg)}\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${pg.key.startsWith('item:') ? '0.6' : '0.7'}</priority>\n  </url>`)).join('\n');
if (!sm.includes('<!-- i18n:start -->')) sm = sm.replace('</urlset>', '  <!-- i18n:start -->\n  <!-- i18n:end -->\n</urlset>');
const i = sm.indexOf('  <!-- i18n:start -->'), j = sm.indexOf('  <!-- i18n:end -->');
sm = sm.slice(0, i + '  <!-- i18n:start -->'.length) + '\n' + langEntries + '\n' + sm.slice(j);
fs.writeFileSync(smFile, sm);

console.log(`i18n: ${LANGS.length} языков × ${PAGES.length} страниц = ${LANGS.length * PAGES.length} страниц; русских страниц обновлено: ${ruTouched}`);
