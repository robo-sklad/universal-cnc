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
    id: 'cs-65-800-42k', slug: 'changsheng-gdz-65-800a-42000', brand: 'Changsheng (Чаншэн)',
    model: 'Changsheng GDZ-65-800A (42 000 об/мин)',
    name: 'Чаншэн GDZ-65-800A 65×195 / 0.8 кВт / ER11 / 220В / 42 000 об/мин / 4 подшипника',
    short: '220 В, 5 А, 700 Гц, 42 000 об/мин, ER11, Ø65×195 мм, водяное охлаждение, 3,0 кг',
    price: 0, priceOnRequest: true,
    specs: { power: '0.8 кВт', voltage: '220В', current: '5А', frequency: '700 Гц', rpm: '42000', collet: 'ER11', cooling: 'Водяное', bearings: '4 шт., класс P4', size: '65×195 мм', weight: '3.0 кг' },
    img: 'images/changsheng-gdz65-800a-42k-ru.jpg',
    photos: ['images/changsheng-gdz65-800a-42k-ru.jpg'],
    description: ['Сверхвысокооборотная версия шпинделя GDZ-65-800A: 42 000 об/мин при частоте 700 Гц. Нужен преобразователь частоты, выдающий 700 Гц.'],
    applications: ['Гравировка мелким инструментом', 'Обработка пластика, акрила, композитов'],
    notes: [{ date: '2026-11-19', text: 'Фото и параметры по маркировке на корпусе (письмо 19.11.2026).' }],
    clarify: ['цена', 'ток (на маркировке 5 А, у аналогов на 42 000 об/мин — около 3 А)', 'ресурс подшипников на 42 000 об/мин', 'влагозащита']
  },
  {
    id: 'cs-65-800-kit5', slug: 'changsheng-gdz-65-800a-komplekt', brand: 'Changsheng (Чаншэн)',
    model: 'Шпиндель Changsheng GDZ-65-800A 0,8 кВт — комплект из 5 предметов',
    name: 'Комплект: шпиндель Чаншэн GDZ-65-800A 65×195 / 0.8 кВт / ER11 / 220В + ПЧ HJ200 1,5 кВт + помпа + кронштейн Ø65 + кабель 3 м',
    short: 'Шпиндель 0,8 кВт водяного охлаждения (220 В, 5 А, 400 Гц, 24 000 об/мин, ER11) + ПЧ HJ200-1,5 кВт, помпа, кронштейн Ø65 мм, кабель 3 м',
    price: 0, priceOnRequest: true,
    specs: { power: '0.8 кВт', voltage: '220В', current: '5А', frequency: '400 Гц', rpm: '24000', collet: 'ER11', cooling: 'Водяное', bearings: 'уточнить', size: '65×195 мм', weight: 'уточнить' },
    img: 'images/changsheng-gdz65-800a-kit-ru.jpg',
    photos: ['images/changsheng-gdz65-800a-kit-ru.jpg'],
    description: ['Готовый комплект для небольшого фрезерно-гравировального станка: шпиндель GDZ-65-800A с водяным охлаждением, преобразователь частоты HJ200 на 1,5 кВт, погружная помпа (напор 2,5 м), кронштейн с внутренним диаметром 65 мм и трёхжильный кабель 3 м.'],
    applications: ['Сборка и модернизация настольных станков ЧПУ'],
    notes: [{ date: '2026-11-19', text: 'Состав комплекта — по фото (письмо 19.11.2026); параметры шпинделя — по маркировке на корпусе.' }],
    clarify: ['цена', 'характеристики ПЧ HJ200 (вход 220 В, выходная частота)', 'подшипники', 'вес', 'входят ли цанги и шланги']
  },
  {
    id: 'cs-80-1.5-kit5', slug: 'changsheng-80-1-5kw-komplekt', brand: 'Changsheng (Чаншэн)',
    model: 'Шпиндель Changsheng 80×188 1,5 кВт — комплект из 5 предметов',
    name: 'Комплект: шпиндель Чаншэн 80×188 / 1.5 кВт / ER11 / 220В + ПЧ HJ200 1,5 кВт + помпа + кронштейн Ø80 + кабель 3 м',
    short: 'Шпиндель 1,5 кВт водяного охлаждения (220 В, 5 А, 400 Гц, 24 000 об/мин, ER11) + ПЧ HJ200-1,5 кВт, помпа, кронштейн Ø80 мм, кабель 3 м',
    price: 0, priceOnRequest: true,
    specs: { power: '1.5 кВт', voltage: '220В', current: '5А', frequency: '400 Гц', rpm: '24000', collet: 'ER11', cooling: 'Водяное', bearings: 'уточнить', size: '80×188 мм', weight: 'уточнить' },
    img: 'images/changsheng-80x188-1.5kw-kit-ru.jpg',
    photos: ['images/changsheng-80x188-1.5kw-kit-ru.jpg'],
    description: ['Комплект для станков 3040/4060: шпиндель 1,5 кВт Ø80 мм с водяным охлаждением, преобразователь частоты HJ200 на 1,5 кВт, погружная помпа (напор 2,5 м), кронштейн с внутренним диаметром 80 мм и кабель 3 м.'],
    applications: ['Сборка и модернизация станков ЧПУ 3040/4060'],
    notes: [{ date: '2026-11-19', text: 'Состав комплекта — по фото (письмо 19.11.2026); 220 В, 1,5 кВт, 5 А, 400 Гц, 24 000 об/мин — по маркировке; ER11 и 80×188 — по подписи продавца.' }],
    clarify: ['цена', 'модель шпинделя (на маркировке не читается)', 'цанга ER11 (для 1,5 кВт чаще ER16)', 'длина 188 или 185 мм', 'характеристики ПЧ HJ200', 'подшипники', 'вес']
  },
  {
    id: 'cs-80f-1.5-air', slug: 'changsheng-gdz-80f-1-5', brand: 'Changsheng (Чаншэн)',
    model: 'Changsheng GDZ-80F-1.5 (воздушное)',
    name: 'Чаншэн GDZ-80F-1.5 80×195 / 1.5 кВт / ER16 / 220В / 4 подшипника / воздушное',
    short: 'Воздушное охлаждение, 220 В, 8 А, 400 Гц, 24 000 об/мин, ER16, Ø80×195 мм, 4,3 кг',
    price: 0, priceOnRequest: true,
    specs: { power: '1.5 кВт', voltage: '220В', current: '8А', frequency: '400 Гц', rpm: '24000', collet: 'ER16', cooling: 'Воздушное', bearings: '4 шт., класс P4', size: '80×195 мм', weight: '4.3 кг' },
    img: 'images/changsheng-gdz80f-1.5-ru.jpg',
    photos: ['images/changsheng-gdz80f-1.5-ru.jpg'],
    description: ['Шпиндель с воздушным охлаждением (вентилятор на заднем торце) — не нужна помпа и система охлаждения. Передняя часть Ø59 мм, вылет вала 34 мм.'],
    applications: ['Фрезерно-гравировальные станки ЧПУ по дереву, пластику, акрилу'],
    notes: [{ date: '2026-11-19', text: 'Модель, 220 В, 1,5 кВт, 8 А, 400 Гц, 24 000 об/мин — по маркировке на корпусе (письмо 19.11.2026).' }],
    clarify: ['цена', 'модель подшипников']
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
    id: 'jingyi-2.2-er20-air', slug: 'jingyi-2-2kw-er20-air', brand: 'Jingyi',
    model: 'Jingyi серии 6, 2,2 кВт ER20 (квадратный, воздушное)',
    name: 'Jingyi серии 6 — квадратный шпиндель 2.2 кВт / ER20 / 220В / воздушное охлаждение, пылезащищённый',
    short: 'Квадратный корпус 165×80×73 мм с плитой крепления, воздушное охлаждение, 220 В, ER20, 4,66 кг',
    price: 0, priceOnRequest: true,
    specs: { power: '2.2 кВт', voltage: '220В', current: '5А (уточнить)', frequency: '400 Гц', rpm: '24000 (в названии у продавца — 18000, уточнить)', collet: 'ER20', cooling: 'Воздушное', bearings: 'уточнить', size: '165×80×73 мм, передняя часть Ø60 мм', weight: '4.66 кг' },
    img: 'images/jingyi-2.2kw-er20-air-ru.jpg',
    photos: ['images/jingyi-2.2kw-er20-air-ru.jpg'],
    description: ['Компактный квадратный шпиндель с воздушным охлаждением и пылезащитой; монтажная плита 165×110 мм, 8 сквозных отверстий Ø7 мм (шаг 35 мм). У продавца обозначен как шпиндель для станков сверления боковых отверстий («серия 6»).'],
    applications: ['Сверлильно-присадочные станки (боковые отверстия)', 'Гравировка и фрезерование дерева, пластика'],
    notes: [{ date: '2026-11-19', text: 'Параметры — по фото продавца (письмо 19.11.2026); шильдик на корпусе нечитаемый.' }],
    clarify: ['цена', 'точная модель (шильдик не читается)', 'обороты: 24 000 (на фото) или 18 000 (в названии)', 'ток: 5 А мало для 2,2 кВт при 220 В (у аналогов 6–8,5 А)', 'подшипники']
  },
  {
    id: 'spindle-6.0-er32-air', slug: 'shpindel-6kw-er32-air-380v', brand: 'Другие модели (производитель уточняется)',
    model: 'Шпиндель 6,0 кВт ER32 380 В (квадратный, воздушное)',
    name: 'Квадратный шпиндель 6.0 кВт / ER32 / 380В / 18 000 об/мин / воздушное охлаждение, с фланцем',
    short: 'Воздушное охлаждение, 380 В, 18 000 об/мин, ER32, квадратный корпус с монтажной плитой',
    price: 0, priceOnRequest: true,
    specs: { power: '6.0 кВт', voltage: '380В', current: 'уточнить', frequency: '300 Гц (по шильдику, уточнить)', rpm: '18000', collet: 'ER32', cooling: 'Воздушное', bearings: 'уточнить', size: 'уточнить', weight: 'уточнить' },
    img: 'images/spindle-6kw-er32-air-ru.jpg',
    photos: ['images/spindle-6kw-er32-air-ru.jpg'],
    description: ['Мощный квадратный шпиндель с воздушным охлаждением и цангой ER32 (инструмент до 20 мм) для раскроя и фрезерования массива, фанеры, МДФ на станках с трёхфазным питанием 380 В.'],
    applications: ['Мебельные и раскройные станки ЧПУ', 'Фрезерование массива дерева, МДФ, пластика'],
    notes: [{ date: '2026-11-19', text: '6,0 кВт / 380 В / ER32 / 18 000 об/мин, крепление фланцем — по подписи продавца (письмо 19.11.2026).' }],
    clarify: ['цена', 'производитель и модель (шильдик плохо читается)', 'ток (у аналогов 12–12,8 А)', 'частота (300 Гц?)', 'вес (у аналогов 13–16 кг)', 'размеры', 'подшипники']
  },
  {
    id: 'thd-3.5k-380', slug: 'thd-3-5k-er20-380v', brand: 'Другие модели (производитель уточняется)',
    model: 'THD-3.5K 3,5 кВт ER20 380 В (квадратный, воздушное)',
    name: 'Квадратный шпиндель THD-3.5K 3.5 кВт / ER20 / 380В / 18 000 об/мин / воздушное охлаждение, с фланцем',
    short: '380 В, 8,8 А, 300 Гц, 18 000 об/мин, ER20, корпус 105×102 мм, воздушное охлаждение, 7,8 кг',
    price: 0, priceOnRequest: true,
    specs: { power: '3.5 кВт', voltage: '380В', current: '8.8А', frequency: '300 Гц', rpm: '18000', collet: 'ER20', cooling: 'Воздушное', bearings: 'уточнить', size: 'корпус 105×102 мм, плита 186×134 мм', weight: '7.8 кг' },
    img: 'images/thd-3.5k-ru.jpg',
    photos: ['images/thd-3.5k-ru.jpg'],
    description: ['Квадратный шпиндель с воздушным охлаждением и монтажной плитой (фланцем) 186×134 мм: 10 сквозных отверстий Ø7 мм с шагом 35 мм.'],
    applications: ['Фрезерные станки ЧПУ по дереву, МДФ, пластику, алюминию'],
    notes: [{ date: '2026-11-19', text: 'Характеристики — по таблице продавца на фото (письмо 19.11.2026).' }],
    clarify: ['цена', 'производитель (префикс THD — возможно, Tongsheng)', 'длина корпуса', 'подшипники', 'ток 8,8 А (у аналогов 3,5 кВт/380 В — 7–7,8 А)']
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
