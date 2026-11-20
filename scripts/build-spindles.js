#!/usr/bin/env node
/*
 * Генератор раздела «Шпиндели» из data/spindles.js.
 * Запуск из корня репозитория:  node scripts/build-spindles.js
 * Делает:
 *   1) spindles/<slug>.html — отдельная SEO-страница каждого шпинделя;
 *   2) список всех шпинделей на spindle-changsheng.html (между маркерами SPINDLES:START/END);
 *   3) записи spindle-changsheng.html и spindles/*.html в sitemap.xml (между маркерами spindles:start/end);
 *   4) docs/articles.csv — таблица артикулов всех товаров (data/spindles.js + data/catalog.js).
 *   5) метки ?v=<хэш> у подключений data/spindles.js, data/catalog.js и style.css во всех страницах сайта.
 * Шпинделю без поля sku сам вписывает следующий свободный артикул 2xxxx в data/spindles.js.
 * Удаляет из spindles/ страницы моделей, которых больше нет в данных; для выбывших (SPINDLES_RETIRED)
 * пишет страницы-переадресации на модель-замену.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://чпу-склад.рф';
// --- артикулы: шпинделю без sku автоматически вписывается следующий свободный номер 2xxxx ---
(function assignSpindleSkus() {
  const file = path.join(ROOT, 'data', 'spindles.js');
  let text = fs.readFileSync(file, 'utf8');
  const used = [...text.matchAll(/sku:\s*'(2\d{4})'/g)].map(m => Number(m[1]));
  let next = Math.max(20000, ...used) + 1;
  let added = 0;
  text = text.replace(/^(\s*id:\s*'[^']+',)(?!\s*sku:)/gm, (m, head) => {
    if (next > 29999) throw new Error('Закончились артикулы группы 2xxxx');
    added++;
    return `${head} sku: '${next++}',`;
  });
  if (added) { fs.writeFileSync(file, text); console.log(`Артикулы: присвоено новых — ${added}`); }
})();

const { SPINDLES, SPINDLES_RETIRED = [], SPINDLE_SPEC_LABELS, spindleTitle, spindlePhotos, spindleMainPhoto } = require(path.join(ROOT, 'data', 'spindles.js'));
const { MACHINES, CATALOG } = require(path.join(ROOT, 'data', 'catalog.js'));
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

const photoSrc = (p, prefix) => !p ? '' : (/^https?:/.test(p) ? p : prefix + p);
const photoAbs = p => !p ? '' : (/^https?:/.test(p) ? p : `${SITE}/${p}`);

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
  const rawPhotos = Array.isArray(s.photos) ? s.photos.filter(Boolean) : [];
  const seenPhotos = new Set();
  for (const p of rawPhotos) {
    if (seenPhotos.has(p)) throw new Error('Дубль фото у ' + s.id + ': ' + p);
    seenPhotos.add(p);
    if (!/^https?:/.test(p) && !fs.existsSync(path.join(ROOT, p))) throw new Error('Нет файла фото: ' + p + ' (' + s.id + ')');
  }
  if (s.img && !rawPhotos.includes(s.img) && !/^https?:/.test(s.img) && !fs.existsSync(path.join(ROOT, s.img))) {
    throw new Error('Нет файла фото: ' + s.img + ' (' + s.id + ')');
  }
}

// --- проверки артикулов (уникальны по всему сайту, 5 цифр, группа по типу товара) ---
const skus = new Map();
const checkSku = (sku, who, group) => {
  if (!/^\d{5}$/.test(String(sku || ''))) throw new Error('Нет/плохой артикул (5 цифр): ' + who);
  if (group && sku[0] !== group) throw new Error(`Артикул ${sku} у ${who} должен начинаться с ${group}`);
  if (skus.has(sku)) throw new Error(`Дубль артикула ${sku}: ${skus.get(sku)} и ${who}`);
  skus.set(sku, who);
};
for (const m of MACHINES) checkSku(m.sku, m.id, '1');
for (const s of SPINDLES) checkSku(s.sku, s.id, '2');
for (const c of CATALOG) checkSku(c.sku, c.id, '3');
// выбывшие артикулы занимают номер навсегда; переадресация должна вести на существующую модель
for (const r of SPINDLES_RETIRED) {
  checkSku(r.sku, r.id + ' (выбыл)', '2');
  if (ids.has(r.id) || slugs.has(r.slug)) throw new Error('Выбывший товар снова есть в SPINDLES: ' + r.id);
  if (!SPINDLES.some(s => s.id === r.to)) throw new Error(`Выбывший ${r.id}: нет модели-замены ${r.to}`);
}

// Строка «Артикул: 20001 [Копировать]»
const skuLine = sku => `<div class="sku-line">Артикул: <span class="sku-code">${esc(sku)}</span> <button type="button" class="sku-copy" onclick="copySku('${esc(sku)}', this)" title="Скопировать артикул">Копировать</button></div>`;

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

function redirectPage(r) {
  const to = SPINDLES.find(s => s.id === r.to);
  const href = `${to.slug}.html`;
  const abs = `${SITE}/spindles/${to.slug}.html`;
  return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- Сгенерировано scripts/build-spindles.js: товар арт. ${esc(r.sku)} выбыл, переадресация на арт. ${esc(to.sku)} -->
    <title>${esc(r.title)} — перенесено: ${esc(spindleTitle(to))} | ЧПУ-склад</title>
    <meta name="description" content="Карточка «${esc(r.title)}» (арт. ${esc(r.sku)}) объединена с моделью ${esc(to.model)} (арт. ${esc(to.sku)}).">
    <meta name="robots" content="noindex, follow">
    <link rel="canonical" href="${abs}">
    <meta http-equiv="refresh" content="0; url=${href}">
    <script>location.replace('${href}' + location.search + location.hash);</script>
${METRIKA}
</head>
<body>
    <p>Карточка «${esc(r.title)}» (арт. ${esc(r.sku)}) объединена с моделью <a href="${href}">${esc(spindleTitle(to))}</a> (арт. ${esc(to.sku)}).</p>
</body>
</html>
`;
}

function specsRows(s, withBrand) {
  const rows = [];
  if (withBrand) rows.push(`<tr><th>Производитель</th><td>${esc(s.brand)}</td></tr>`);
  rows.push(`<tr><th>Артикул</th><td>${esc(s.sku)}</td></tr>`);
  rows.push(`<tr><th>Модель</th><td>${esc(s.model)}</td></tr>`);
  for (const [key, label] of SPINDLE_SPEC_LABELS) {
    const v = fmtVal(key, s.specs[key]);
    if (v != null) rows.push(`<tr><th>${label}</th><td>${v}</td></tr>`);
  }
  return rows.join('\n            ');
}

function metaDescription(s) {
  return `${s.model} (арт. ${s.sku}): ${s.short}. ${s.price ? 'Цена ' + priceText(s) + '.' : 'Цена по запросу.'} Характеристики, фото, применение — ЧПУ-склад.`;
}

const NAV = p => `<header>
    <div class="nav-container">
        <div class="logo">
            <a href="${p}index.html" style="display:flex;align-items:center;gap:10px;color:inherit;text-decoration:none;"><img src="${p}logo.jpg" alt="ЧПУ-склад"> ЧПУ-склад</a>
        </div>
        <nav>
            <ul>
                <li><a href="${p}index.html">Главная</a></li>
                <li><a href="${p}marketplace.html" class="nav-catalog active">Товары</a></li>
                <li><a href="${p}equipment.html">Оборудование</a></li>
                <li><a href="${p}program.html">Программы</a></li>
                <li><a href="${p}cart.html">Корзина <span id="headerCartCount" style="background:#dc3545;color:white;border-radius:10px;padding:1px 6px;font-size:0.75rem;">0</span></a></li>
                <li><a href="https://universal-cnc.vercel.app/chat.html" target="_blank" rel="noopener">Обучение</a></li>
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
updateCartBadge();
function copySku(sku, btn) {
  function done() { if (!btn) return; var old = btn.getAttribute('data-label') || btn.textContent; btn.setAttribute('data-label', old); btn.textContent = 'Скопировано'; setTimeout(function () { btn.textContent = old; }, 1500); }
  function fallback() { var t = document.createElement('textarea'); t.value = sku; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) {} document.body.removeChild(t); done(); }
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(sku).then(done, fallback); else fallback();
}`;

const GALLERY_CSS = `
        .spindle-photo.gallery { flex-direction: column; background: transparent; min-height: 0; align-items: stretch; }
        .gallery-main { position: relative; background: #f8f9fa; border-radius: 12px; width: 100%; display: flex; align-items: center; justify-content: center; }
        .gallery-main-img { width: 100%; max-height: 460px; object-fit: contain; border-radius: 12px; cursor: zoom-in; }
        .gallery-nav { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.92); border: none; border-radius: 50%; width: 36px; height: 36px; font-size: 1.5rem; line-height: 1; cursor: pointer; box-shadow: 0 1px 6px rgba(0,0,0,0.15); z-index: 1; color: #222; }
        .gallery-nav:hover { background: #fff; }
        .gallery-prev { left: 8px; }
        .gallery-next { right: 8px; }
        .gallery-counter { position: absolute; right: 10px; bottom: 10px; background: rgba(0,0,0,0.6); color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 0.85rem; }
        .gallery-thumbs { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; width: 100%; }
        .gallery-thumb { border: 2px solid transparent; border-radius: 8px; padding: 0; background: #f8f9fa; cursor: pointer; width: 72px; height: 72px; overflow: hidden; }
        .gallery-thumb.is-active { border-color: #0d6efd; }
        .gallery-thumb img { width: 100%; height: 100%; object-fit: contain; display: block; }
        .gallery-lightbox { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 9999; display: flex; align-items: center; justify-content: center; }
        .gallery-lightbox[hidden] { display: none; }
        .gallery-lightbox-img { max-width: 92vw; max-height: 88vh; object-fit: contain; }
        .gallery-lightbox-close { position: absolute; top: 16px; right: 16px; background: rgba(255,255,255,0.92); border: none; border-radius: 50%; width: 40px; height: 40px; font-size: 1.6rem; line-height: 1; cursor: pointer; z-index: 2; }
        .gallery-lightbox .gallery-nav { background: rgba(255,255,255,0.92); }
        .gallery-lightbox .gallery-counter { right: 16px; bottom: 16px; }
`;

const GALLERY_JS = `function initSpindleGallery() {
  var root = document.querySelector('[data-spindle-gallery]');
  if (!root) return;
  var srcs = JSON.parse(root.getAttribute('data-photos'));
  var model = root.getAttribute('data-model') || '';
  var i = 0;
  var mainImg = root.querySelector('.gallery-main-img');
  var mainCounter = root.querySelector('.gallery-counter');
  var thumbs = root.querySelectorAll('.gallery-thumb');
  var lb = document.querySelector('[data-gallery-lightbox]');
  var lbImg = lb && lb.querySelector('.gallery-lightbox-img');
  var lbCounter = lb && lb.querySelector('.gallery-counter');
  var lbOpen = false;

  function alt(k) {
    return 'Шпиндель ' + model + ' — фото ' + (k + 1) + ' из ' + srcs.length;
  }
  function show(n) {
    i = (n + srcs.length) % srcs.length;
    mainImg.src = srcs[i];
    mainImg.alt = alt(i);
    mainCounter.textContent = (i + 1) + ' / ' + srcs.length;
    for (var t = 0; t < thumbs.length; t++) {
      thumbs[t].classList.toggle('is-active', t === i);
      thumbs[t].setAttribute('aria-current', t === i ? 'true' : 'false');
    }
    if (lbImg) {
      lbImg.src = srcs[i];
      lbImg.alt = alt(i);
    }
    if (lbCounter) lbCounter.textContent = (i + 1) + ' / ' + srcs.length;
  }
  function prev() { show(i - 1); }
  function next() { show(i + 1); }
  function openLb() {
    if (!lb) return;
    lb.hidden = false;
    lbOpen = true;
    show(i);
    var closeBtn = lb.querySelector('.gallery-lightbox-close');
    if (closeBtn) closeBtn.focus();
  }
  function closeLb() {
    if (!lb) return;
    lb.hidden = true;
    lbOpen = false;
  }

  root.querySelector('.gallery-prev').addEventListener('click', prev);
  root.querySelector('.gallery-next').addEventListener('click', next);
  mainImg.addEventListener('click', openLb);
  for (var t = 0; t < thumbs.length; t++) {
    (function (k) {
      thumbs[k].addEventListener('click', function () { show(k); });
    })(t);
  }
  if (lb) {
    lb.querySelector('.gallery-prev').addEventListener('click', prev);
    lb.querySelector('.gallery-next').addEventListener('click', next);
    lb.querySelector('.gallery-lightbox-close').addEventListener('click', closeLb);
    lb.addEventListener('click', function (e) {
      if (e.target === lb) closeLb();
    });
  }
  document.addEventListener('keydown', function (e) {
    var tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 'ArrowLeft') prev();
    else if (e.key === 'ArrowRight') next();
    else if (e.key === 'Escape' && lbOpen) closeLb();
  });

  var startX = null;
  function onStart(e) {
    startX = (e.touches ? e.touches[0].clientX : e.clientX);
  }
  function onEnd(e) {
    if (startX == null) return;
    var x = (e.changedTouches ? e.changedTouches[0].clientX : e.clientX);
    var dx = x - startX;
    startX = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) next(); else prev();
  }
  var swipeEl = root.querySelector('.gallery-main');
  swipeEl.addEventListener('touchstart', onStart, { passive: true });
  swipeEl.addEventListener('touchend', onEnd);
  if (lb) {
    lb.addEventListener('touchstart', onStart, { passive: true });
    lb.addEventListener('touchend', onEnd);
  }
}
initSpindleGallery();`;

function photoAlts(s, photos) {
  return photos.map((_, i) => photos.length > 1
    ? `Шпиндель ${s.model} — фото ${i + 1} из ${photos.length}`
    : `Шпиндель ${s.model}`);
}

function photoBlock(s) {
  const photos = spindlePhotos(s);
  if (!photos.length) return `<div class="spindle-photo">Фото уточняется</div>`;
  const srcs = photos.map(p => photoSrc(p, '../'));
  const alts = photoAlts(s, photos);
  if (photos.length === 1) {
    return `<div class="spindle-photo"><img src="${esc(srcs[0])}" alt="${esc(alts[0])}"></div>`;
  }
  const thumbs = srcs.map((src, i) =>
    `<button type="button" class="gallery-thumb${i === 0 ? ' is-active' : ''}" data-i="${i}" aria-label="${esc(alts[i])}" aria-current="${i === 0 ? 'true' : 'false'}"><img src="${esc(src)}" alt=""></button>`
  ).join('\n        ');
  return `<div class="spindle-photo gallery" data-spindle-gallery data-model="${esc(s.model)}" data-photos="${esc(JSON.stringify(srcs))}">
        <div class="gallery-main">
            <button type="button" class="gallery-nav gallery-prev" aria-label="Предыдущее фото">‹</button>
            <img class="gallery-main-img" src="${esc(srcs[0])}" alt="${esc(alts[0])}">
            <button type="button" class="gallery-nav gallery-next" aria-label="Следующее фото">›</button>
            <span class="gallery-counter" aria-live="polite">1 / ${photos.length}</span>
        </div>
        <div class="gallery-thumbs">${thumbs}</div>
    </div>`;
}

function lightboxHtml(s) {
  const photos = spindlePhotos(s);
  if (photos.length < 2) return '';
  const srcs = photos.map(p => photoSrc(p, '../'));
  const alts = photoAlts(s, photos);
  return `<div class="gallery-lightbox" hidden data-gallery-lightbox>
    <button type="button" class="gallery-lightbox-close" aria-label="Закрыть">×</button>
    <button type="button" class="gallery-nav gallery-prev" aria-label="Предыдущее фото">‹</button>
    <img class="gallery-lightbox-img" src="${esc(srcs[0])}" alt="${esc(alts[0])}">
    <button type="button" class="gallery-nav gallery-next" aria-label="Следующее фото">›</button>
    <span class="gallery-counter" aria-live="polite">1 / ${photos.length}</span>
</div>`;
}

function detailPage(s) {
  const url = `${SITE}/spindles/${s.slug}.html`;
  const title = `${spindleTitle(s)} для ЧПУ — характеристики и цена | ЧПУ-склад`;
  const desc = metaDescription(s);
  const photos = spindlePhotos(s);
  const imgAbsList = photos.map(photoAbs);
  const imgAbs = imgAbsList[0] || '';
  const ld = {
    '@context': 'https://schema.org', '@type': 'Product', name: s.model, description: s.short,
    brand: /другие/i.test(s.brand) ? undefined : { '@type': 'Brand', name: s.brand.replace(/\s*\(.*\)$/, '') },
    image: imgAbsList.length > 1 ? imgAbsList : (imgAbs || undefined), sku: s.sku, productID: s.id, url,
    offers: s.price ? { '@type': 'Offer', price: s.price, priceCurrency: 'RUB', url, availability: 'https://schema.org/InStock' } : undefined
  };
  const crumbs = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Товары', item: `${SITE}/marketplace.html` },
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
  const mailSubj = encodeURIComponent(`Вопрос по артикулу ${s.sku} — шпиндель ${s.model}`);
  const others = SPINDLES.filter(o => o.slug !== s.slug && o.brand === s.brand)
    .map(o => `<li><a href="${o.slug}.html">${esc(o.model)}</a> — ${esc(o.specs.power)}, ${priceText(o)}</li>`).join('\n          ');
  const hasGallery = photos.length > 1;

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
        .sku-line { margin: 4px 0 8px; color: #444; font-size: 0.95rem; }
        .sku-code { font-family: monospace; font-size: 1.05rem; font-weight: bold; background: #f0f2f5; padding: 1px 6px; border-radius: 4px; user-select: all; }
        .sku-copy { border: 1px solid #ccd; background: #fff; border-radius: 6px; padding: 2px 8px; font-size: 0.8rem; cursor: pointer; }
${hasGallery ? GALLERY_CSS : ''}    </style>
    <script type="application/ld+json">${JSON.stringify(ld)}</script>
    <script type="application/ld+json">${JSON.stringify(crumbs)}</script>
<!-- Yandex.Metrika counter -->
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
<!-- /Yandex.Metrika counter -->
</head>
<body>
${NAV('../')}
<main style="max-width:1100px;margin:20px auto;padding:0 16px;">
    <nav class="breadcrumbs" aria-label="Навигация"><a href="../index.html">Главная</a> › <a href="../marketplace.html">Товары</a> › <a href="../spindle-changsheng.html">Шпиндели</a> › ${esc(s.model)}</nav>
    <h1>${esc(spindleTitle(s))}</h1>
    <div class="spindle-top">
        ${photoBlock(s)}
        <div class="spindle-buy">
            ${skuLine(s.sku)}
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
    <p><a href="../spindle-changsheng.html">← Все шпиндели</a> · <a href="../marketplace.html">Товары</a></p>
</main>
<footer>
    <p>© 2026 ЧПУ-склад • Все права защищены</p>
    <p>Поддержка: <a href="tel:+79619910176">+7 961 991 01 76</a> (WhatsApp) | <a href="mailto:stepmotoren@yandex.ru">stepmotoren@yandex.ru</a></p>
    <p><a href="../payment-nonresident.html">Оплата и доставка для нерезидентов</a></p>
</footer>
${hasGallery ? lightboxHtml(s) + '\n' : ''}<script>
${CART_JS}${hasGallery ? '\n' + GALLERY_JS : ''}
</script>
</body>
</html>
`;
}

function listCard(s) {
  const main = spindleMainPhoto(s);
  const img = main
    ? `<img src="${esc(main)}" alt="Шпиндель ${esc(s.model)}" loading="lazy">`
    : `<div class="no-photo">Фото уточняется</div>`;
  return `<div class="variant-card" id="${esc(s.id)}">
          <a href="spindles/${s.slug}.html">${img}</a>
          <div class="variant-title"><a href="spindles/${s.slug}.html">${esc(s.name)}</a></div>
          ${skuLine(s.sku)}
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

// Разметка schema.org для списков: ItemList + BreadcrumbList
const ldScript = o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`;
const crumbsLd = items => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })) });
const itemListLd = (name, items) => ({ '@context': 'https://schema.org', '@type': 'ItemList', name, numberOfItems: items.length,
  itemListElement: items.map(([nm, url], i) => ({ '@type': 'ListItem', position: i + 1, name: nm, url })) });
const spindleItems = () => SPINDLES.map(s => [`${spindleTitle(s)} (арт. ${s.sku})`, `${SITE}/spindles/${s.slug}.html`]);

function listHtml() {
  const brands = [...new Set(SPINDLES.map(s => s.brand))];
  return ldScript(itemListLd('Шпиндели для ЧПУ', spindleItems())) + '\n    ' +
    ldScript(crumbsLd([['Главная', `${SITE}/`], ['Товары', `${SITE}/marketplace.html`], ['Шпиндели', `${SITE}/spindle-changsheng.html`]])) + '\n    ' +
    brands.map(b => `<h2 class="brand-title">${esc(b)}</h2>
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
const wanted = new Set([...SPINDLES, ...SPINDLES_RETIRED].map(s => s.slug + '.html'));
for (const f of fs.readdirSync(outDir)) if (f.endsWith('.html') && !wanted.has(f)) fs.unlinkSync(path.join(outDir, f));
for (const s of SPINDLES) fs.writeFileSync(path.join(outDir, s.slug + '.html'), detailPage(s));
for (const r of SPINDLES_RETIRED) fs.writeFileSync(path.join(outDir, r.slug + '.html'), redirectPage(r));

// 2) список
const listFile = path.join(ROOT, 'spindle-changsheng.html');
fs.writeFileSync(listFile, replaceBetween(fs.readFileSync(listFile, 'utf8'),
  '<!-- SPINDLES:START (генерируется scripts/build-spindles.js) -->', '<!-- SPINDLES:END -->', '    ' + listHtml(), listFile));

// 2б) разметка ItemList/BreadcrumbList на marketplace.html (между маркерами ITEMLIST:START/END)
const mpFile = path.join(ROOT, 'marketplace.html');
const mpItems = [...spindleItems(), ...CATALOG.map(c => [`${c.title} (арт. ${c.sku})`, c.link ? `${SITE}/${c.link}` : `${SITE}/marketplace.html?q=${c.sku}`])];
fs.writeFileSync(mpFile, replaceBetween(fs.readFileSync(mpFile, 'utf8'),
  '<!-- ITEMLIST:START (генерируется scripts/build-spindles.js) -->', '<!-- ITEMLIST:END -->',
  '    ' + ldScript(itemListLd('Товары ЧПУ-склад', mpItems)) + '\n    ' +
  ldScript(crumbsLd([['Главная', `${SITE}/`], ['Товары', `${SITE}/marketplace.html`]])) + '\n    ', mpFile));

// 3) sitemap
const smFile = path.join(ROOT, 'sitemap.xml');
const entry = (loc, prio) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${prio}</priority>\n  </url>`;
const sm = [entry(`${SITE}/spindle-changsheng.html`, '0.8'), ...SPINDLES.map(s => entry(`${SITE}/spindles/${s.slug}.html`, '0.7'))].join('\n');
fs.writeFileSync(smFile, replaceBetween(fs.readFileSync(smFile, 'utf8'), '  <!-- spindles:start -->', '  <!-- spindles:end -->', sm, smFile));

// 4) таблица артикулов docs/articles.csv (генерируется, руками не править)
const csvCell = v => /[",;\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
const csvRows = [
  ...MACHINES.map(m => [m.sku, 'Станок', m.title, m.id, `${SITE}/${m.link}`]),
  ...SPINDLES.map(s => [s.sku, 'Шпиндель', spindleTitle(s), s.id, `${SITE}/spindles/${s.slug}.html`]),
  ...CATALOG.map(c => [c.sku, 'Товары', c.title, c.id, c.link ? `${SITE}/${c.link}` : `${SITE}/marketplace.html?q=${c.sku}`]),
  ...SPINDLES_RETIRED.map(r => { const to = SPINDLES.find(s => s.id === r.to); return [r.sku, 'Выбыл (не использовать)', `${r.title} → арт. ${to.sku}`, r.id, `${SITE}/spindles/${to.slug}.html`]; })
].sort((a, b) => a[0].localeCompare(b[0]));
fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs', 'articles.csv'),
  '\ufeff' + [['Артикул', 'Тип', 'Название', 'id (ключ корзины)', 'Ссылка'], ...csvRows].map(r => r.map(csvCell).join(';')).join('\r\n') + '\r\n');

// 5) метки версии ?v=<хэш> у общих файлов с данными и стилями — чтобы после обновления цен
//    браузер не брал старую копию из кэша (GitHub Pages отдаёт их с max-age=600).
//    Хэш = первые 8 символов sha256 содержимого файла; меняется только когда меняется сам файл.
const crypto = require('crypto');
const VERSIONED = ['data/spindles.js', 'data/catalog.js', 'style.css'];
const versions = Object.fromEntries(VERSIONED.map(f =>
  [f, crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, f))).digest('hex').slice(0, 8)]));
const SKIP_DIRS = new Set(['.git', 'node_modules', 'docs', 'api', 'scripts', 'mistral-advanced-bot', '_site']);
function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => {
    const full = path.join(dir, d.name);
    if (d.isDirectory()) return SKIP_DIRS.has(d.name) ? [] : htmlFiles(full);
    return d.name.endsWith('.html') ? [full] : [];
  });
}
let versionedFiles = 0;
for (const file of htmlFiles(ROOT)) {
  const text = fs.readFileSync(file, 'utf8');
  const out = text.replace(/(\b(?:src|href)=")([^"?#]+\.(?:js|css))(?:\?v=[0-9a-f]*)?"/g, (m, attr, ref) => {
    if (/^[a-z]+:|^\/\//i.test(ref)) return m; // внешние адреса не трогаем
    const rel = path.relative(ROOT, path.resolve(path.dirname(file), ref)).split(path.sep).join('/');
    return versions[rel] ? `${attr}${ref}?v=${versions[rel]}"` : m;
  });
  if (out !== text) fs.writeFileSync(file, out);
  if (/\?v=[0-9a-f]{8}"/.test(out)) versionedFiles++;
}
console.log(`Версии файлов: ${VERSIONED.map(f => `${f}?v=${versions[f]}`).join(', ')} (страниц с метками: ${versionedFiles})`);

console.log(`OK: ${SPINDLES.length} страниц в spindles/, список и sitemap обновлены`);
