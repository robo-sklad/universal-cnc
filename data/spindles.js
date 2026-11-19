/*
 * Единый источник данных по шпинделям сайта ЧПУ-склад.
 * Используется:
 *   - scripts/build-spindles.js — генерирует статические страницы spindles/<slug>.html,
 *     список на spindle-changsheng.html и записи в sitemap.xml;
 *   - marketplace.html — карточки категории «Шпиндели»;
 *   - cart.html — названия и цены шпинделей в корзине.
 *
 * Как добавить шпиндель: добавить объект в массив, положить фото в images/,
 * выполнить `node scripts/build-spindles.js` и закоммитить результат.
 *
 * Поля:
 *   id        — ключ корзины (localStorage cncCart), не менять у существующих;
 *   slug      — имя страницы: spindles/<slug>.html (латиница, цифры, дефис);
 *   brand     — группа на странице «все шпиндели»;
 *   model, name, short — модель, полное название, короткое описание для карточки;
 *   price (₽), priceUsd, priceOnRequest — цена; при price:0 + priceOnRequest показывается «Цена по запросу»;
 *   specs     — характеристики; значение 'уточнить' выводится как «уточняется»;
 *   img       — главное фото (путь от корня сайта; '' — фото уточняется);
 *                 оставлено для совместимости: главное фото = photos[0] || img;
 *   photos    — все фото модели (массив путей; первое — главное). Если photos нет,
 *                 используется img. Дополнительный ракурс — ещё один путь в photos;
 *   description — абзацы описания модели;
 *   applications — список «Применение»;
 *   notes     — дополнительная информация по модели (в т.ч. из писем): {date:'ГГГГ-ММ-ДД', text:'...'};
 *   clarify   — что ещё нужно уточнить (выводится на странице блоком «Уточняется»).
 */
var SPINDLES = [
  {
    id: 'cs-80-1.5-skf', slug: 'changsheng-80-1-5kw-skf', brand: 'Changsheng (Чаншэн)',
    model: 'Changsheng 80×213 1,5 кВт',
    name: 'Чаншэн 80×213 / 1.5 кВт / 3 подшипника SKF',
    short: 'Водяное охлаждение, 220 В, 24 000 об/мин, ER16/ER20',
    price: 18500, priceUsd: 195,
    specs: { power: '1.5 кВт', voltage: '220В', rpm: '24000', collet: 'ER16/ER20', cooling: 'Водяное', bearings: '3 шт., SKF', size: '80×213 мм', weight: '~4 кг' },
    img: '',
    photos: [],
    description: [], applications: [], notes: [], clarify: ['фото', 'ток', 'частота']
  },
  {
    id: 'cs-80-2.2-7', slug: 'changsheng-gdz-80-2-2b', brand: 'Changsheng (Чаншэн)',
    model: 'Changsheng GDZ-80-2.2B',
    name: 'Чаншэн GDZ-80-2.2B 80×213 / 2.2 кВт / ER20 / 220В / 3 подшипника P4',
    short: '220 В, 400 Гц, 24 000 об/мин, ER20, Ø80×213 мм, водяное охлаждение, 5,1 кг',
    price: 19500, priceUsd: 205,
    specs: { power: '2.2 кВт', voltage: '220В', frequency: '400 Гц', rpm: '24000', collet: 'ER20', cooling: 'Водяное', bearings: '3 шт., класс P4', size: '80×213 мм', weight: '5.1 кг' },
    img: 'images/changsheng-gdz80-2.2kw-ru.jpg',
    photos: ['images/changsheng-gdz80-2.2kw-ru.jpg'],
    description: [], applications: [], notes: [], clarify: ['ток', 'модель подшипников']
  },
  {
    id: 'cs-80-2.2b4-238', slug: 'changsheng-gdz-80-2-2b4-80x238', brand: 'Changsheng (Чаншэн)',
    model: 'Changsheng GDZ-80-2.2B(4) 80×238',
    name: 'Чаншэн GDZ-80-2.2B(4) 80×238 / 2.2 кВт / ER20 / 220В / 4 подшипника',
    short: '220 В, 8 А (вариант 380 В / 5 А), 400 Гц, 24 000 об/мин, ER20, Ø80×238 мм, 5,45 кг',
    price: 0, priceOnRequest: true,
    specs: { power: '2.2 кВт', voltage: '220В (по запросу 380В)', current: '8А (380В — 5А)', frequency: '400 Гц', rpm: '24000', collet: 'ER20', cooling: 'Водяное (уточнить)', bearings: '4 шт.', size: '80×238 мм', weight: '5.45 кг' },
    img: 'images/changsheng-gdz80-2.2b4-80x238-ru.jpg',
    photos: ['images/changsheng-gdz80-2.2b4-80x238-ru.jpg'],
    description: ['Удлинённая (238 мм) версия шпинделя 2,2 кВт Ø80 мм с четырьмя подшипниками вместо трёх.'],
    applications: ['Обработка дерева'],
    notes: [{date:'2026-11-19', text:'Маркировка на корпусе: GDZ-80-2.2B(4) Φ80×238, 220V, 2.2KW, 8A, 400Hz, 24000rpm. Габариты по фото: корпус 238 мм, вылет 44 + 15 мм. По умолчанию 220 В / 8 А, вариант 380 В / 5 А — указать при заказе. В открытых источниках у GDZ-80-2.2B на 4 подшипника: 2×7005C P4 + 2×7002C P4, водяное охлаждение. Фото и данные — письмо от 19.11.2026 («Следующие 10шт»).'}],
    clarify: ['цена', 'охлаждение (водяное по открытым источникам, на фото не указано)', 'модель подшипников', 'гарантия']
  },
  {
    id: 'cs-85-2.2-380', slug: 'changsheng-85-2-2kw-380v', brand: 'Changsheng (Чаншэн)',
    model: 'Changsheng Ø85 2,2 кВт (380 В)',
    name: 'Чаншэн Ø85 / 2.2 кВт / ER20 / 380В / 4 подшипника P4',
    short: '380 В, 400 Гц, 24 000 об/мин, ER20, Ø85 мм, водяное охлаждение, 5,1 кг',
    price: 0, priceOnRequest: true,
    specs: { power: '2.2 кВт', voltage: '380В', current: 'уточнить', frequency: '400 Гц', rpm: '24000', collet: 'ER20', cooling: 'Водяное', bearings: '4 шт., класс P4 (серия 7)', size: 'Ø85 мм, корпус 184,5 мм', weight: '5.1 кг', warranty: '1 год (включая подшипники и обмотку)' },
    img: 'images/changsheng-85-2.2kw-380v-ru.jpg',
    photos: ['images/changsheng-85-2.2kw-380v-ru.jpg'],
    description: [],
    applications: ['Обработка дерева'],
    notes: [{date:'2026-11-19', text:'Маркировка на корпусе читается неуверенно: «85RD24Z2.2…», 2.2kW, 380V, 400Hz, 24000rpm. Диаметры по фото: корпус 85 мм, ступени 62 и 48 мм; корпус 184,5 мм, вылет 34 + 1 + 16 мм. Продавец обозначает модель как 85×253 / 2,2 кВт / 380 В. У производителя (csspindle.cn, GDZ85-2.2): 380 В, 6 А, 0,88 Н·м, 8 кг. Фото и данные — письмо от 19.11.2026 («Следующие 10шт»).'}],
    clarify: ['цена', 'точная модель (маркировка на фото плохо читается)', 'ток (на фото ~3,5 А, у производителя 6 А)', 'вес (5,1 кг по фото, 8 кг у производителя)', 'длина (253 мм в названии продавца)']
  },
  {
    id: 'cs-100-3kw-220', slug: 'changsheng-gdz-100-3-0-220v', brand: 'Changsheng (Чаншэн)',
    model: 'Changsheng GDZ-100-3.0 (220 В)',
    name: 'Чаншэн GDZ-100-3.0 100×220 / 3 кВт / ER20 / 220В / 3 подшипника P4',
    short: '220 В, 12 А, 400 Гц, 24 000 об/мин, ER20, Ø100×220 мм, водяное охлаждение, 8,9 кг',
    price: 28500, priceUsd: 300,
    specs: { power: '3.0 кВт', voltage: '220В', current: '12А', frequency: '400 Гц', rpm: '24000', collet: 'ER20', cooling: 'Водяное', bearings: '3 шт., класс P4', size: '100×220 мм', weight: '8.9 кг', warranty: '1 год (включая подшипники и обмотку)' },
    img: 'images/changsheng-gdz100-3kw-ru.jpg',
    photos: ['images/changsheng-gdz100-3kw-ru.jpg'],
    description: [], applications: [], notes: [], clarify: ['модель подшипников', 'вес (8,9 или 9,1 кг)']
  },
  {
    id: 'cs-100-3kw-380', slug: 'changsheng-100-3kw-380v', brand: 'Changsheng (Чаншэн)',
    model: 'Changsheng GDZ-100-3.0 (380 В)',
    name: 'Чаншэн GDZ-100-3.0 100×220 / 3 кВт / ER20 / 380В / 3 подшипника P4',
    short: '380 В, 7 А, 400 Гц, 24 000 об/мин, ER20, Ø100×220 мм, водяное охлаждение, 8,9 кг',
    price: 28500, priceUsd: 300,
    specs: { power: '3.0 кВт', voltage: '380В', current: '7А', frequency: '400 Гц', rpm: '24000', collet: 'ER20', cooling: 'Водяное', bearings: '3 шт., класс P4 (серия 7)', size: '100×220 мм', weight: '8.9 кг', warranty: '1 год (включая подшипники и обмотку)' },
    img: 'images/changsheng-gdz100-3kw-380v-ru.jpg',
    photos: ['images/changsheng-gdz100-3kw-380v-ru.jpg'],
    description: [], applications: ['Обработка дерева'], notes: [{date:'2026-11-19', text:'Маркировка на корпусе: GDZ-100-3.0 Φ100×220, 380V, 400Hz, 24000rpm. Габариты по фото: корпус 223 мм, вылет 44 + 31 мм. Фото и данные — письмо от 19.11.2026 («Следующие 10шт»).'}], clarify: ['модель подшипников', 'ток (7 А — по фото продавца)']
  },
  {
    id: 'cs-100-4.5-220', slug: 'changsheng-100-4-5kw-220v', brand: 'Changsheng (Чаншэн)',
    model: 'Changsheng GDZ-100-4.5 (220 В)',
    name: 'Чаншэн GDZ-100-4.5 100×260 / 4.5 кВт / ER20 / 220В / 4 подшипника P4',
    short: '220 В, 13,8 А, 400 Гц, 24 000 об/мин, ER20, Ø100×260 мм, водяное охлаждение, 11 кг',
    price: 34500, priceUsd: 365,
    specs: { power: '4.5 кВт', voltage: '220В', current: '13.8А', frequency: '400 Гц', rpm: '24000', collet: 'ER20', cooling: 'Водяное', bearings: '4 шт., класс P4 (серия 7)', size: '100×260 мм', weight: '11 кг', warranty: '1 год (включая подшипники и обмотку)' },
    img: 'images/changsheng-gdz100-4.5kw-220v-ru.jpg',
    photos: ['images/changsheng-gdz100-4.5kw-220v-ru.jpg'],
    description: [], applications: ['Обработка дерева'], notes: [{date:'2026-11-19', text:'Маркировка на корпусе: GDZ-100-4.5 Φ100×260, 220V, 4.5KW, 13.8A, 400Hz, 24000rpm. Габариты по фото: корпус 261 мм, вылет 44 + 31 мм. Фото и данные — письмо от 19.11.2026 («Следующие 10шт»).'}], clarify: ['модель подшипников']
  },
  {
    id: 'cs-100-4.5-380', slug: 'changsheng-100-4-5kw-380v', brand: 'Changsheng (Чаншэн)',
    model: 'Changsheng GDZ-100-4.5 (380 В)',
    name: 'Чаншэн GDZ-100-4.5 100×260 / 4.5 кВт / ER20 / 380В / 4 подшипника P4',
    short: '380 В, 8 А, 400 Гц, 24 000 об/мин, ER20, Ø100×260 мм, водяное охлаждение, 11 кг',
    price: 34500, priceUsd: 365,
    specs: { power: '4.5 кВт', voltage: '380В', current: '8А', frequency: '400 Гц', rpm: '24000', collet: 'ER20', cooling: 'Водяное', bearings: '4 шт., класс P4 (серия 7)', size: '100×260 мм', weight: '11 кг', warranty: '1 год (включая подшипники и обмотку)' },
    img: 'images/changsheng-gdz100-4.5kw-380v-ru.jpg',
    photos: ['images/changsheng-gdz100-4.5kw-380v-ru.jpg'],
    description: [], applications: ['Обработка дерева'], notes: [{date:'2026-11-19', text:'Маркировка на корпусе: GDZ-100-4.5 Φ100×260, 380V, 4.5KW, 8A, 400Hz, 24000rpm. Габариты по фото: корпус 261 мм, вылет 44 + 31 мм. Фото и данные — письмо от 19.11.2026 («Следующие 10шт»).'}], clarify: ['модель подшипников']
  },
  {
    id: 'cs-65-800-air', slug: 'changsheng-65-0-8kw-air', brand: 'Changsheng (Чаншэн)',
    model: 'Changsheng GDZ-65F-800 (воздушное)',
    name: 'Чаншэн GDZ-65F-800 65×188 / 0.8 кВт / ER11 / 220В / 4 подшипника / воздушное',
    short: 'Воздушное охлаждение, 220 В, 4 А, 400 Гц, 24 000 об/мин, ER11, Ø65×188 мм, 2,8 кг',
    price: 12500, priceUsd: 132,
    specs: { power: '0.8 кВт', voltage: '220В', current: '4А', frequency: '400 Гц', rpm: '24000', collet: 'ER11', cooling: 'Воздушное', bearings: '4 шт., класс P4', size: '65×188 мм', weight: '2.8 кг', warranty: '1 год (включая подшипники и обмотку)' },
    img: 'images/changsheng-gdz65f-800-ru.jpg',
    photos: ['images/changsheng-gdz65f-800-ru.jpg'],
    description: ['Компактный шпиндель 800 Вт с воздушным охлаждением (вентилятор на заднем торце): не нужны помпа и шланги. Корпус Ø65 мм, длина корпуса 182 мм, вылет вала 28 мм.'], applications: ['Настольные фрезерно-гравировальные станки ЧПУ', 'Гравировка по дереву, пластику, акрилу'], notes: [{date:'2026-11-19', text:'Маркировка на корпусе: GDZ-65F-800 Φ65×188, 220V, 800W, 4A, 400Hz, 24000rpm. Габариты по фото: корпус 182 мм, вылет 28 + 15 мм. По данным производителя (tsspindle.com): подшипники 2×7002C P4 + 2×7000C P4, вес 2,5 кг. Фото и данные — письмо от 19.11.2026 («Следующие 10шт»).'}, {date:'2026-11-19', text:'Дополнено по фото из письма 19.11.2026 16:45 (другая карточка продавца, тот же ракурс — в галерею не добавлялось): подпись «65×188/800 Вт/ER11, 4 подшипника SKF, воздушное охлаждение», 220 В / 4 А, вес нетто 2,8 кг, гарантия 1 год (включая подшипники и обмотку).'}], clarify: ['вес (2,8 кг по фото продавца — подтверждено вторым фото, 2,5 кг у производителя)', 'производитель и модель подшипников: в подписи продавца SKF, в названии варианта — TPI, у производителя 2×7002C P4 + 2×7000C P4']
  },
  {
    id: 'cs-80-2.2-air', slug: 'changsheng-80-2-2kw-air', brand: 'Changsheng (Чаншэн)',
    model: 'Changsheng GDZ-80F-2.2 (воздушное)',
    name: 'Чаншэн GDZ-80F-2.2 80×195 / 2.2 кВт / ER20 / 220В / 4 подшипника / воздушное',
    short: 'Воздушное охлаждение, 220 В, 8 А, 400 Гц, 24 000 об/мин, ER20, Ø80×195 мм, 4,5 кг',
    price: 21500, priceUsd: 226,
    specs: { power: '2.2 кВт', voltage: '220В', current: '8А', frequency: '400 Гц', rpm: '24000', collet: 'ER20', cooling: 'Воздушное', bearings: '4 шт., класс P4', size: '80×195 мм', weight: '4.5 кг', warranty: '1 год (включая подшипники и обмотку)' },
    img: 'images/changsheng-gdz80f-2.2-ru.jpg',
    photos: ['images/changsheng-gdz80f-2.2-ru.jpg'],
    description: [], applications: [], notes: [{date:'2026-11-19', text:'Маркировка на корпусе: GDZ-80F-2.2 Φ80×195, 220V, 2.2KW, 8A, 400Hz, 24000rpm. Габариты по фото: корпус 193,5 мм, вылет 32 + 19 мм. В открытых источниках (StepperOnline GDZ80F-2.2B4): подшипники 2×7005 + 2×7002, вес 4,75 кг. Фото и данные — письмо от 19.11.2026 («Следующие 10шт»).'}], clarify: ['вес (4,5 кг по фото продавца, 4,75 кг в открытых источниках)', 'модель подшипников']
  },
  {
    id: 'cs-125-5.5', slug: 'changsheng-gdz-125-5-5', brand: 'Changsheng (Чаншэн)',
    model: 'Changsheng GDZ-125-5.5',
    name: 'Чаншэн GDZ-125-5.5 125×298 / 5.5 кВт / ER25 / 380В / 4 подшипника P4',
    short: '380 В, 8 А, 400 Гц, 24 000 об/мин, ER25, Ø125×298 мм, водяное охлаждение, 22 кг',
    price: 89000, priceUsd: 935,
    specs: { power: '5.5 кВт', voltage: '380В', current: '8А', frequency: '400 Гц', rpm: '24000', collet: 'ER25', cooling: 'Водяное', bearings: '4 шт., класс P4', size: '125×298 мм', weight: '22 кг' },
    img: 'images/changsheng-gdz125-5.5kw-ru.jpg',
    photos: ['images/changsheng-gdz125-5.5kw-ru.jpg'],
    description: [], applications: [], notes: [], clarify: ['ток (8 А для 5,5 кВт при 380 В — проверить)', 'модель подшипников', 'гарантия']
  },
  {
    id: 'cs-125-5.5-320', slug: 'changsheng-gdz-125-5-5-125x320', brand: 'Changsheng (Чаншэн)',
    model: 'Changsheng GDZ-125-5.5 125×320 («пуля»)',
    name: 'Чаншэн GDZ-125-5.5 125×320 / 5.5 кВт / ER25 / 380В / 4 керамических подшипника P4',
    short: '380 В, 10 А, 400 Гц, 24 000 об/мин, ER25, Ø125×320 мм, конусная передняя часть, водяное охлаждение, 25 кг',
    price: 0, priceOnRequest: true,
    specs: { power: '5.5 кВт', voltage: '380В', current: '10А', frequency: '400 Гц', rpm: '24000', collet: 'ER25', cooling: 'Водяное', bearings: '4 шт., керамические шариковые, класс P4', size: '125×320 мм', weight: '25 кг', warranty: '1 год (включая подшипники и обмотку)' },
    img: 'images/changsheng-gdz125-5.5-320-ru.jpg',
    photos: ['images/changsheng-gdz125-5.5-320-ru.jpg'],
    description: ['Вариант шпинделя 5,5 кВт Ø125 мм с удлинённой конусной передней частью («пуля»).'],
    applications: ['Обработка дерева'],
    notes: [{date:'2026-11-19', text:'Маркировка на корпусе: GDZ-125-5.5 Φ125×320, 380V, 5.5Kw, 10A, 400Hz, 24000rpm. Габариты по фото: корпус 298 мм, передняя часть 60 мм, вылет 51 мм. У производителя для GDZ-125-5.5: 380 В / 10 А, 1,85 Н·м, подшипники 7007C P4 ×2 + 7205C P4 ×2. Фото и данные — письмо от 19.11.2026 («Следующие 10шт»).'}],
    clarify: ['цена', 'модель подшипников (керамические по фото продавца)', 'отличия от GDZ-125-5.5 125×298']
  },
  {
    id: 'tongsheng-65-0.8', slug: 'tongsheng-thd-65-800c', brand: 'Tongsheng',
    model: 'Tongsheng THD-65-800C',
    name: 'Tongsheng THD-65-800C 65×195 / 0.8 кВт / ER11 / 220В / 4 подшипника',
    short: '220 В, 5 А, 400 Гц, 24 000 об/мин, ER11, Ø65×195 мм, водяное охлаждение, 3,0 кг',
    price: 0, priceOnRequest: true,
    specs: { power: '0.8 кВт', voltage: '220В', current: '5А', frequency: '400 Гц', rpm: '24000', collet: 'ER11', cooling: 'Водяное', bearings: '4 шт.', size: '65×195 мм', weight: '3.0 кг' },
    img: 'images/tongsheng-thd65-800c-ru.jpg',
    photos: ['images/tongsheng-thd65-800c-ru.jpg'],
    description: [], applications: [], notes: [], clarify: ['цена', 'комплектность', 'производитель подшипников']
  },
  {
    id: 'tongsheng-80-2.2-12k', slug: 'tongsheng-thd-80-2-2c', brand: 'Tongsheng',
    model: 'Tongsheng THD-80-2.2C',
    name: 'Tongsheng THD-80-2.2C 80×213 / 2.2 кВт / ER20 / 220В / 12000 об/мин (высокий момент)',
    short: '220 В, 8 А, 400 Гц, 12 000 об/мин (высокий момент), ER20, Ø80×213 мм',
    price: 0, priceOnRequest: true,
    specs: { power: '2.2 кВт', voltage: '220В', current: '8А', frequency: '400 Гц', rpm: '12000', collet: 'ER20', cooling: 'Водяное (уточнить)', bearings: 'уточнить', size: '80×213 мм', weight: 'уточнить' },
    img: 'images/tongsheng-thd80-2.2c-ru.jpg',
    photos: ['images/tongsheng-thd80-2.2c-ru.jpg'],
    description: ['Низкооборотный шпиндель (12 000 об/мин) с повышенным крутящим моментом — подходит для фрезерования металла и твёрдых пород дерева.'],
    applications: [], notes: [], clarify: ['цена', 'охлаждение', 'подшипники', 'вес']
  },
  {
    id: 'spindle-2.2', slug: 'shpindel-2-2kw-gdz', brand: 'Другие модели (производитель уточняется)',
    model: 'Шпиндель 2,2 кВт GDZ',
    name: 'Шпиндель для ЧПУ 2.2 кВт GDZ',
    short: 'Водяное охлаждение, 24 000 об/мин, ER20, диаметр 80 мм',
    price: 18500,
    specs: { power: '2.2 кВт', voltage: 'уточнить', rpm: '24000', collet: 'ER20', cooling: 'Водяное', size: 'Ø80 мм', weight: 'уточнить' },
    img: '',
    photos: [],
    description: [], applications: [], notes: [], clarify: ['производитель (возможно, дублирует Changsheng GDZ-80-2.2B)', 'фото']
  },
  {
    id: 'spindle-1.5', slug: 'shpindel-1-5kw-water', brand: 'Другие модели (производитель уточняется)',
    model: 'Шпиндель 1,5 кВт с водяным охлаждением',
    name: 'Шпиндель 1.5 кВт с водяным охлаждением (для станков 3040/4060)',
    short: 'Для станков 3040/4060, водяное охлаждение',
    price: 14900,
    specs: { power: '1.5 кВт', voltage: 'уточнить', rpm: 'уточнить', collet: 'уточнить', cooling: 'Водяное', size: 'уточнить', weight: 'уточнить' },
    img: '',
    photos: [],
    description: [], applications: ['Фрезерно-гравировальные станки ЧПУ 3040 и 4060'], notes: [], clarify: ['производитель', 'фото']
  },
  {
    id: 'spindle-800', slug: 'shpindel-0-8kw-air', brand: 'Другие модели (производитель уточняется)',
    model: 'Шпиндель 0,8 кВт с воздушным охлаждением',
    name: 'Шпиндель 0.8 кВт воздушное охлаждение (компактный)',
    short: 'Компактный, для небольших станков, воздушное охлаждение',
    price: 8900,
    specs: { power: '0.8 кВт', voltage: 'уточнить', rpm: 'уточнить', collet: 'уточнить', cooling: 'Воздушное', size: 'уточнить', weight: 'уточнить' },
    img: '',
    photos: [],
    description: [], applications: [], notes: [], clarify: ['производитель', 'фото']
  }
];

var SPINDLE_SPEC_LABELS = [
  ['power', 'Мощность'], ['voltage', 'Напряжение'], ['current', 'Ток'], ['frequency', 'Частота'],
  ['rpm', 'Обороты'], ['collet', 'Цанга'], ['cooling', 'Охлаждение'], ['bearings', 'Подшипники'],
  ['size', 'Размер'], ['weight', 'Вес'], ['warranty', 'Гарантия']
];

// Заголовок товара: «Шпиндель <модель> <мощность>» без повторов
function spindleTitle(s) {
  var t = /^шпиндель/i.test(s.model) ? s.model : 'Шпиндель ' + s.model;
  if (!/кВт/.test(s.model)) t += ' ' + s.specs.power;
  return t;
}


// Главное фото и полный список (photos[0] либо старое поле img; без дублей, пустые пропускаются)
function spindlePhotos(s) {
  var list = [], seen = {};
  function add(p) {
    if (!p) return;
    if (seen[p]) return;
    seen[p] = true;
    list.push(p);
  }
  if (s.photos && s.photos.length) {
    for (var i = 0; i < s.photos.length; i++) add(s.photos[i]);
  } else {
    add(s.img);
  }
  return list;
}
function spindleMainPhoto(s) {
  var p = spindlePhotos(s);
  return p[0] || '';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SPINDLES: SPINDLES, SPINDLE_SPEC_LABELS: SPINDLE_SPEC_LABELS, spindleTitle: spindleTitle, spindlePhotos: spindlePhotos, spindleMainPhoto: spindleMainPhoto };
}
