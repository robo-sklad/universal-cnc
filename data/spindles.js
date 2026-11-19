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
    model: 'Changsheng 100×220 3 кВт (380 В)',
    name: 'Чаншэн 100×220 / 3 кВт / 380В / P4',
    short: '380 В, 7 А, 24 000 об/мин, ER20, водяное охлаждение',
    price: 28500, priceUsd: 300,
    specs: { power: '3.0 кВт', voltage: '380В', current: '7А', rpm: '24000', collet: 'ER20', cooling: 'Водяное', bearings: 'класс P4', size: '100×220 мм', weight: '8.9 кг' },
    img: '',
    photos: [],
    description: [], applications: [], notes: [], clarify: ['фото', 'частота', 'количество подшипников']
  },
  {
    id: 'cs-100-4.5-220', slug: 'changsheng-100-4-5kw-220v', brand: 'Changsheng (Чаншэн)',
    model: 'Changsheng 100×260 4,5 кВт (220 В)',
    name: 'Чаншэн 100×260 / 4.5 кВт / 220В / P4',
    short: '220 В, 24 000 об/мин, ER20, водяное охлаждение',
    price: 34500, priceUsd: 365,
    specs: { power: '4.5 кВт', voltage: '220В', rpm: '24000', collet: 'ER20', cooling: 'Водяное', bearings: 'класс P4', size: '100×260 мм', weight: '~11 кг' },
    img: '',
    photos: [],
    description: [], applications: [], notes: [], clarify: ['фото', 'ток', 'частота']
  },
  {
    id: 'cs-100-4.5-380', slug: 'changsheng-100-4-5kw-380v', brand: 'Changsheng (Чаншэн)',
    model: 'Changsheng 100×260 4,5 кВт (380 В)',
    name: 'Чаншэн 100×260 / 4.5 кВт / 380В / P4',
    short: '380 В, 24 000 об/мин, ER20, водяное охлаждение',
    price: 34500, priceUsd: 365,
    specs: { power: '4.5 кВт', voltage: '380В', rpm: '24000', collet: 'ER20', cooling: 'Водяное', bearings: 'класс P4', size: '100×260 мм', weight: '~11 кг' },
    img: '',
    photos: [],
    description: [], applications: [], notes: [], clarify: ['фото', 'ток', 'частота']
  },
  {
    id: 'cs-65-800-air', slug: 'changsheng-65-0-8kw-air', brand: 'Changsheng (Чаншэн)',
    model: 'Changsheng 65×188 0,8 кВт (воздушное)',
    name: 'Чаншэн 65×188 / 0.8 кВт / 4 подшипника / воздушное',
    short: 'Воздушное охлаждение, 220 В, 24 000 об/мин, ER11, 2,8 кг',
    price: 12500, priceUsd: 132,
    specs: { power: '0.8 кВт', voltage: '220В', rpm: '24000', collet: 'ER11', cooling: 'Воздушное', bearings: '4 шт.', size: '65×188 мм', weight: '2.8 кг' },
    img: '',
    photos: [],
    description: [], applications: [], notes: [], clarify: ['фото', 'ток', 'частота']
  },
  {
    id: 'cs-80-2.2-air', slug: 'changsheng-80-2-2kw-air', brand: 'Changsheng (Чаншэн)',
    model: 'Changsheng 80×195 2,2 кВт (воздушное)',
    name: 'Чаншэн 80×195 / 2.2 кВт / 4 подшипника / воздушное',
    short: 'Воздушное охлаждение, 220 В, 24 000 об/мин, ER20, 4,5 кг',
    price: 21500, priceUsd: 226,
    specs: { power: '2.2 кВт', voltage: '220В', rpm: '24000', collet: 'ER20', cooling: 'Воздушное', bearings: '4 шт.', size: '80×195 мм', weight: '4.5 кг' },
    img: '',
    photos: [],
    description: [], applications: [], notes: [], clarify: ['фото', 'ток', 'частота']
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
    id: 'cs-65-800a-158', slug: 'changsheng-gdz-65-800a-65x158', brand: 'Changsheng (Чаншэн)',
    model: 'Changsheng GDZ-65-800A 65×158',
    name: 'Чаншэн GDZ-65-800A 65×158 / 0.8 кВт / ER11 / 220В / 2 подшипника SKF',
    short: '220 В, 5 А, 400 Гц, 24 000 об/мин, ER11, Ø65×158 мм, водяное охлаждение, 2,5 кг',
    price: 0, priceOnRequest: true,
    specs: { power: '0.8 кВт', voltage: '220В', current: '5А', frequency: '400 Гц', rpm: '24000', collet: 'ER11', cooling: 'Водяное', bearings: '2 шт., класс P4, серия 7 (SKF — по описанию продавца)', size: '65×158 мм', weight: '2.5 кг', warranty: '1 год (включая подшипники и обмотку)' },
    img: 'images/changsheng-gdz65-800a-65x158-ru.jpg',
    photos: ['images/changsheng-gdz65-800a-65x158-ru.jpg'],
    description: ['Компактный шпиндель 800 Вт с водяным охлаждением и укороченным корпусом Ø65×158 мм на двух подшипниках. Работает от частотного преобразователя (220 В, 400 Гц), цанга ER11 — для фрез с хвостовиком до 7 мм.'],
    applications: ['Гравировка и фрезеровка дерева, пластика, акрила', 'Настольные и учебные фрезерно-гравировальные станки ЧПУ'],
    notes: [{ date: '2026-11-19', text: 'Карточка создана по фото из письма от 19.11.2026: маркировка на корпусе GDZ-65-800A Φ65×158, 220 В, 800 Вт, 5 А, 400 Гц, 24 000 об/мин; в описании продавца — 2 подшипника SKF, вес 2,5 кг.' }, { date: '2026-11-19', text: 'Дополнено по фото из письма 19.11.2026 16:45 (другая карточка того же продавца): подшипники класса P4 серии 7 (в шапке и в названии варианта «65×158/800 Вт, 2 подшипника P4»), вес нетто 2,5 кг и маркировка на корпусе подтверждены.' }],
    clarify: ['цена', 'производитель и модель подшипников: в одном описании продавца SKF, в другом — только «P4 серии 7» (у производителя для 65×158 указаны 7002C + 7000C)', 'обозначение: на корпусе GDZ-65-800A, у производителя короткая версия — GDZ65-800']
  },
  {
    id: 'cs-65-800a-195', slug: 'changsheng-gdz-65-800a-65x195', brand: 'Changsheng (Чаншэн)',
    model: 'Changsheng GDZ-65-800A 65×195',
    name: 'Чаншэн GDZ-65-800A 65×195 / 0.8 кВт / ER11 / 220В / 4 подшипника TPI',
    short: '220 В, 5 А, 400 Гц, 24 000 об/мин, ER11, Ø65×195 мм, водяное охлаждение, 3 кг',
    price: 0, priceOnRequest: true,
    specs: { power: '0.8 кВт', voltage: '220В', current: '5А', frequency: '400 Гц', rpm: '24000', collet: 'ER11', cooling: 'Водяное', bearings: '4 шт., TPI (2×7002C + 2×7000C)', size: '65×195 мм', weight: '3 кг', warranty: '1 год (включая подшипники и обмотку)' },
    img: 'images/changsheng-gdz65-800a-65x195-ru.jpg',
    photos: ['images/changsheng-gdz65-800a-65x195-ru.jpg'],
    description: ['Шпиндель 800 Вт с водяным охлаждением в корпусе Ø65×195 мм на четырёх подшипниках: жёстче и стабильнее короткой двухподшипниковой версии. Питание от частотного преобразователя 220 В, 400 Гц, цанга ER11.'],
    applications: ['Гравировка и фрезеровка дерева, пластика, акрила', 'Настольные и учебные фрезерно-гравировальные станки ЧПУ'],
    notes: [{ date: '2026-11-19', text: 'Карточка создана по фото из письма от 19.11.2026: маркировка на корпусе GDZ-65-800A Φ65×195, 220 В, 800 Вт, 5 А, 400 Гц, 24 000 об/мин; в описании продавца — 4 подшипника TPI, вес 3 кг.' }, { date: '2026-11-19', text: 'Дополнено по фото из письма 19.11.2026 16:45: вариант продавца «65×195/800 Вт, серия 7», 4 подшипника, вес нетто 2,9 кг; маркировка на корпусе та же.' }],
    clarify: ['цена', 'класс точности подшипников TPI (серия 7 подтверждена)', 'вес: 3 кг по одному фото продавца, 2,9 кг — по другому']
  },
  {
    id: 'cs-80-1.5-188', slug: 'changsheng-gdz-80-1-5-80x188', brand: 'Changsheng (Чаншэн)',
    model: 'Changsheng GDZ-80-1.5 80×188',
    name: 'Чаншэн GDZ-80-1.5 80×188 / 1.5 кВт / ER11 / 220В / 3 подшипника TPI',
    short: '220 В, 5 А, 400 Гц, 24 000 об/мин, ER11, Ø80×188 мм, водяное охлаждение, 4 кг',
    price: 0, priceOnRequest: true,
    specs: { power: '1.5 кВт', voltage: '220В', current: '5А', frequency: '400 Гц', rpm: '24000', collet: 'ER11', cooling: 'Водяное', bearings: '3 шт., TPI (2×7002C P4 DT + 1×7002C P4)', size: '80×188 мм', weight: '4 кг', warranty: '1 год (включая подшипники и обмотку)' },
    img: 'images/changsheng-gdz80-1.5-80x188-ru.jpg',
    photos: ['images/changsheng-gdz80-1.5-80x188-ru.jpg'],
    description: ['Популярный шпиндель 1,5 кВт с водяным охлаждением для станков 3040/6040: корпус Ø80×188 мм, три подшипника, консистентная смазка. Питание от частотного преобразователя 220 В, 400 Гц, цанга ER11 (хвостовик до 7 мм).'],
    applications: ['Фрезеровка и гравировка дерева, МДФ, пластика, акрила', 'Фрезерно-гравировальные станки ЧПУ 3040, 4060, 6040'],
    notes: [{ date: '2026-11-19', text: 'Карточка создана по фото из письма от 19.11.2026: маркировка на корпусе GDZ-80-1.5 Φ80×188, 220 В, 1,5 кВт, 5 А, 400 Гц, 24 000 об/мин; в описании продавца — 3 подшипника TPI, вес 4 кг.' }, { date: '2026-11-19', text: 'Дополнено по фото из письма 19.11.2026 16:45: вариант продавца «80×188/1,5 кВт, 3 подшипника, серия 7», вес нетто 4 кг и маркировка на корпусе подтверждены.' }],
    clarify: ['цена', 'класс подшипников TPI']
  },
  {
    id: 'cs-80-1.5-206', slug: 'changsheng-gdz-80-1-5-80x206', brand: 'Changsheng (Чаншэн)',
    model: 'Changsheng GDZ-80-1.5 80×206 (4 подшипника)',
    name: 'Чаншэн GDZ-80-1.5 80×206 / 1.5 кВт / ER11 / 220В / 4 подшипника',
    short: '220 В, 5 А, 400 Гц, 24 000 об/мин, ER11, Ø80×206 мм, водяное охлаждение, 4,4 кг',
    price: 0, priceOnRequest: true,
    specs: { power: '1.5 кВт', voltage: '220В', current: '5А', frequency: '400 Гц', rpm: '24000', collet: 'ER11', cooling: 'Водяное (трубка 5/8 мм)', bearings: '4 шт., TPI', size: '80×206 мм', weight: '4.4 кг', warranty: '1 год (включая подшипники и обмотку)' },
    img: 'images/changsheng-gdz80-1.5-80x206-ru.jpg',
    photos: ['images/changsheng-gdz80-1.5-80x206-ru.jpg', 'images/changsheng-gdz80-1.5-80x206-ru-2.jpg'],
    description: ['Удлинённая версия шпинделя 1,5 кВт с водяным охлаждением: корпус Ø80×206 мм, четыре подшипника. В комплекте авиационный разъём и цанга ER11 с гайкой.'],
    applications: ['Фрезеровка и гравировка дерева, МДФ, пластика, акрила', 'Фрезерно-гравировальные станки ЧПУ 3040, 4060, 6040'],
    notes: [{ date: '2026-11-19', text: 'Карточка создана по фото из письма от 19.11.2026 (картинка продавца с таблицей характеристик): GDZ-80-1.5, Ø80×206 мм, 4 подшипника, водяное охлаждение, 1,5 кВт, 5 А, 400 Гц, 24 000 об/мин, ER11, 4,4 кг.' }, { date: '2026-11-19', text: 'Дополнено по фото из письма 19.11.2026 16:45 (второе фото, хорошего качества): маркировка на корпусе GDZ-80-1.5(4) Φ80×208, 220 В, 1,5 кВт, 5 А, 400 Гц, 24 000 об/мин; в подписи продавца — 4 подшипника TPI, ER11, вес нетто 4,4 кг, гарантия 1 год (включая подшипники и обмотку). На чертеже продавца длина корпуса 206 мм.' }],
    clarify: ['цена', 'модель и класс подшипников TPI', 'длина корпуса: 206 мм на чертежах продавца, 208 мм в маркировке GDZ-80-1.5(4) Φ80×208 и в подписи второго фото', 'наличие версии на 380 В']
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
    id: 'tongsheng-80-1.5', slug: 'tongsheng-thd-80-1-5', brand: 'Tongsheng',
    model: 'Tongsheng THD-80-1.5',
    name: 'Tongsheng THD-80-1.5 80×190 / 1.5 кВт / ER11 / 220В / 3 подшипника',
    short: '220 В, 6 А, 400 Гц, 24 000 об/мин, ER11, Ø80×190 мм, водяное охлаждение, 4,1 кг',
    price: 0, priceOnRequest: true,
    specs: { power: '1.5 кВт', voltage: '220В', current: '6А', frequency: '400 Гц', rpm: '24000', collet: 'ER11', cooling: 'Водяное', bearings: '3 шт.', size: '80×190 мм', weight: '4.1 кг' },
    img: 'images/tongsheng-thd80-1.5-ru.jpg',
    photos: ['images/tongsheng-thd80-1.5-ru.jpg'],
    description: ['Шпиндель 1,5 кВт с водяным охлаждением в корпусе Ø80×190 мм на трёх подшипниках. Продавец позиционирует модель для многошпиндельных станков; корпус не влагозащищённый. Питание от частотного преобразователя 220 В, 400 Гц, цанга ER11.'],
    applications: ['Многошпиндельные фрезерно-гравировальные станки ЧПУ', 'Обработка дерева и рекламные работы (пластик, акрил, композит)'],
    notes: [{ date: '2026-11-19', text: 'Карточка создана по фото из письма от 19.11.2026: маркировка на корпусе THD-80-1.5 Φ80×190, 220 В, 1,5 кВт, 6 А, 400 Гц, 24 000 об/мин; в описании продавца — 3 подшипника, вес 4,1 кг, для многошпиндельных станков.' }],
    clarify: ['цена', 'модель подшипников', 'размер штуцеров', 'комплектность']
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
