/*
 * Товары сайта ЧПУ-склад, кроме шпинделей (шпиндели — data/spindles.js).
 * Используется: marketplace.html (карточки), cart.html (артикулы в корзине и в заказе),
 * scripts/build-spindles.js (проверка артикулов и таблица docs/articles.csv).
 *
 * Артикул (поле sku) — постоянный номер товара из 5 цифр, НЕ меняется и НЕ переиспользуется:
 *   1xxxx — станки (оборудование), 2xxxx — шпиндели, 3xxxx — комплектующие, инструмент, расходники, ПО.
 * Новому товару — следующий свободный номер своей группы (у шпинделей скрипт сборки ставит его сам).
 *
 * Поля товара marketplace: id (ключ корзины, не менять), sku, title, price (₽), cat, desc, [img], [link].
 */
var MACHINES = [
  {
    id: 'cnc-3040', sku: '10001', slug: 'cnc-3040',
    title: 'Станок ЧПУ 3040, 1500 Вт',
    short: 'Настольный фрезерно-гравировальный станок, рабочее поле 300×400×100 мм',
    price: 199000, cat: 'machines',
    img: 'equipment-data/cnc-3040/main.jpg',
    link: 'machines/cnc-3040.html',
    techLink: 'equipment/cnc-3040.html',
    description: [
      'Настольный фрезерно-гравировальный станок с ЧПУ. Рабочее поле 300×400×100 мм, шпиндель 1500 Вт с водяным охлаждением.',
      'Управление программой CNCV4 или OpenBuilds CONTROL. Подходит для мастерской и малого производства: дерево, фанера, акрил, ПВХ, алюминий и цветные металлы.'
    ],
    specs: {
      workArea: '300 × 400 × 100 мм',
      spindlePower: '1500 Вт (водяное охлаждение)',
      rpm: 'до 24 000 об/мин',
      cooling: 'водяное',
      drive: 'ШВП (шарико-винтовая передача)',
      rails: 'профильные рельсы',
      control: 'программа CNCV4',
      materials: 'дерево, фанера, акрил, ПВХ, алюминий, цветные металлы',
      weightPacked: '≈ 52 кг'
    }
  },
  {
    id: 'cnc-4060', sku: '10002', slug: 'cnc-4060',
    title: 'Станок ЧПУ 4060, 1500 Вт',
    short: 'Настольный фрезерно-гравировальный станок, рабочее поле 400×600×120 мм',
    price: 239000, cat: 'machines',
    img: '',
    link: 'machines/cnc-4060.html',
    techLink: 'equipment/cnc-3040.html',
    description: [
      'Настольный фрезерно-гравировальный станок с ЧПУ. Рабочее поле 400×600×120 мм, шпиндель 1500 Вт с водяным охлаждением.',
      'Управление программой CNCV4 или OpenBuilds CONTROL. Та же линейка, что и станок ЧПУ 3040, с увеличенным рабочим полем.'
    ],
    specs: {
      workArea: '400 × 600 × 120 мм',
      spindlePower: '1500 Вт (водяное охлаждение)',
      rpm: 'до 24 000 об/мин',
      cooling: 'водяное',
      drive: 'ШВП (шарико-винтовая передача)',
      rails: 'профильные рельсы',
      control: 'программа CNCV4',
      materials: 'дерево, фанера, акрил, ПВХ, алюминий, цветные металлы',
      weightPacked: '≈ 62 кг'
    }
  }
];

var CATALOG = [
  { id: 'frezy-set', sku: '30001', title: 'Комплект фрез для ЧПУ (10 шт)', price: 4200, cat: 'tools', desc: 'По дереву, акрилу, пластику' },
  { id: 'freza-6mm', sku: '30002', title: 'Фреза спиральная 6 мм однозаходная', price: 890, cat: 'tools', desc: 'Для дерева и акрила' },
  { id: 'guides-hgr15', sku: '30003', title: 'Линейные направляющие HGR15 комплект', price: 9200, cat: 'mechanics', desc: 'Для осей X/Y, высокая точность' },
  { id: 'ballscrew-1605', sku: '30004', title: 'ШВП 1605 (500 мм) с гайкой', price: 6800, cat: 'mechanics', desc: 'Шарико-винтовая передача' },
  { id: 'driver-tb6600', sku: '30005', title: 'Драйвер шагового двигателя TB6600', price: 2900, cat: 'electronics', desc: '4 А, надёжный' },
  { id: 'stepper-nema23', sku: '30006', title: 'Шаговый двигатель NEMA 23 (2.8 Нм)', price: 4500, cat: 'electronics', desc: 'Для станков ЧПУ' },
  { id: 'collet-er20', sku: '30007', title: 'Набор цанг ER20 (13 шт)', price: 2100, cat: 'consumables', desc: 'Для шпинделей с ER20' },
  { id: 'coolant-5l', sku: '30008', title: 'СОЖ для ЧПУ (5 л)', price: 1200, cat: 'consumables', desc: 'Смазочно-охлаждающая жидкость' },
  { id: 'cncv4', sku: '30009', title: 'Программа CNCV4 (расширенная)', price: 0, cat: 'software', desc: 'Управление станками ЧПУ', link: 'program/CNCV4.html' },
  // Позиции, которые раньше были только в корзине (цены — из cart.html, без изменений)
  { id: 'freza-3mm', sku: '30010', title: 'Фреза концевая 3 мм', price: 450, cat: 'tools', desc: 'Концевая фреза, диаметр 3 мм' },
  { id: 'coupler', sku: '30011', title: 'Муфта соединительная 8x8', price: 650, cat: 'mechanics', desc: 'Соединительная муфта 8×8 мм' },
  { id: 'controller-grbl', sku: '30012', title: 'Контроллер GRBL на Arduino', price: 3200, cat: 'electronics', desc: 'Контроллер на Arduino с прошивкой GRBL' },
  { id: 'collet-set', sku: '30013', title: 'Набор цанг ER11 (13 шт)', price: 1800, cat: 'consumables', desc: 'Для шпинделей с ER11' },
  { id: 'bit-set', sku: '30014', title: 'Набор свёрел для ЧПУ', price: 980, cat: 'tools', desc: 'Набор свёрел для станков ЧПУ' }
];

// Старые ключи корзины (cart.html) → id товара в каталоге, чтобы в корзине тоже был виден артикул
var CATALOG_ALIASES = { 'guides-hgr': 'guides-hgr15', 'ballscrew': 'ballscrew-1605', 'coolant': 'coolant-5l', 'cncv4-license': 'cncv4' };

// Копирование артикула в буфер обмена (кнопка «Копировать» рядом с артикулом)
function copySku(sku, btn) {
  function done() {
    if (!btn) return;
    var old = btn.getAttribute('data-label') || btn.textContent;
    btn.setAttribute('data-label', old);
    btn.textContent = 'Скопировано';
    setTimeout(function () { btn.textContent = old; }, 1500);
  }
  function fallback() {
    var t = document.createElement('textarea');
    t.value = sku; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(t); done();
  }
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(sku).then(done, fallback);
  else fallback();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MACHINES: MACHINES, CATALOG: CATALOG, CATALOG_ALIASES: CATALOG_ALIASES };
}
