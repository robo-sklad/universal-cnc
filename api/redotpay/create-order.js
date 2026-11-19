// api/redotpay/create-order.js
// Создаёт платёжный заказ RedotPay Connect (POST /openapi/v2/order/create)
// и возвращает ссылку на страницу оплаты (Paylink): { payUrl }.
// Переменные окружения (задаются в Vercel → Project Settings → Environment Variables):
//   REDOTPAY_APP_KEY       — App Key мерчанта (заголовок X-R-AK)
//   REDOTPAY_PRIVATE_KEY   — приватный ключ RSA в формате PKCS#8 PEM (можно с "\n")
//   REDOTPAY_API_VERSION   — версия загруженного публичного ключа (X-R-KEY-VERSION), по умолчанию 1
//   REDOTPAY_BASE_URL      — по умолчанию https://acquirer.redotpay.com (live)
//   SITE_URL               — адрес сайта для возврата после оплаты
//   REDOTPAY_CURRENCIES    — необязательно, список валют через запятую, по умолчанию USD
//   REDOTPAY_MAX_AMOUNT    — необязательно, максимальная сумма, по умолчанию 50000
//   REDOTPAY_MERCHANT_NAME — необязательно, имя продавца на странице оплаты
import crypto from 'node:crypto';
import {
  DEFAULT_LIVE_BASE_URL, CREATE_ORDER_PATH, loadPrivateKey, signRequest, applyCors, isAllowedOrigin,
  readJsonBody, sendJson, sendEmpty,
} from './_lib.js';

const DEFAULT_SITE_URL = 'https://xn----8sbmwfvpo8a.xn--p1ai';
const EMAIL_RE = /^[^\s@,]{1,64}@[^\s@,]{1,190}\.[a-zA-Z]{2,}$/;

function fail(res, status, error, message) {
  return sendJson(res, status, { ok: false, error, message });
}

function makeOrderId() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
  return `CNC${stamp}${crypto.randomBytes(4).toString('hex').toUpperCase()}`; // 25 символов, [A-Z0-9]
}

function cleanText(s, max) {
  return String(s || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

export default async function handler(req, res) {
  const origin = applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return sendEmpty(res, isAllowedOrigin(origin) ? 204 : 403);
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return fail(res, 405, 'method_not_allowed', 'Только POST запросы');
  }
  if (origin && !isAllowedOrigin(origin)) {
    return fail(res, 403, 'origin_not_allowed', 'Запрос с этого сайта не разрешён');
  }

  const appKey = (process.env.REDOTPAY_APP_KEY || '').trim();
  const privateKeyRaw = process.env.REDOTPAY_PRIVATE_KEY || '';
  const keyVersion = String(parseInt(process.env.REDOTPAY_API_VERSION || '1', 10) || 1);
  const baseUrl = (process.env.REDOTPAY_BASE_URL || DEFAULT_LIVE_BASE_URL).trim().replace(/\/+$/, '');
  const siteUrl = (process.env.SITE_URL || DEFAULT_SITE_URL).trim().replace(/\/+$/, '');
  const currencies = String(process.env.REDOTPAY_CURRENCIES || 'USD')
    .split(',').map((c) => c.trim().toUpperCase()).filter((c) => /^[A-Z]{3}$/.test(c));
  const maxAmount = Number(process.env.REDOTPAY_MAX_AMOUNT || 50000);

  if (!appKey || !privateKeyRaw) {
    return fail(res, 503, 'not_configured', 'Оплата пока не настроена. Свяжитесь с нами для согласования оплаты.');
  }

  const body = await readJsonBody(req);
  if (body === null) return fail(res, 400, 'bad_json', 'Некорректный запрос');

  const amount = Number(String(body.amount ?? '').replace(',', '.'));
  if (!Number.isFinite(amount) || amount <= 0) {
    return fail(res, 400, 'bad_amount', 'Укажите сумму больше нуля');
  }
  if (amount > maxAmount) {
    return fail(res, 400, 'amount_too_large', `Сумма больше ${maxAmount}. Для крупных заказов свяжитесь с нами.`);
  }
  const roundedAmount = Math.round(amount * 100) / 100;
  if (roundedAmount <= 0) return fail(res, 400, 'bad_amount', 'Укажите сумму больше нуля');

  const currency = String(body.currency || currencies[0] || '').toUpperCase();
  if (!currencies.includes(currency)) {
    return fail(res, 400, 'bad_currency', `Доступные валюты: ${currencies.join(', ')}`);
  }

  const email = cleanText(body.email, 254);
  if (email && !EMAIL_RE.test(email)) {
    return fail(res, 400, 'bad_email', 'Проверьте адрес e-mail');
  }
  const comment = cleanText(body.orderComment ?? body.comment, 80);

  const orderId = makeOrderId();
  const outerUid = `web-${crypto.createHash('sha256').update(email || orderId).digest('hex').slice(0, 24)}`; // <= 32
  const orderDesc = cleanText(`Order ${orderId}${comment ? ': ' + comment : ''}`, 120);
  const redirectUrl = `${siteUrl}/payment-nonresident.html?pay=return&order=${orderId}`;

  // Поля запроса — по схеме PreOrderCreateRequestV2 из документации RedotPay.
  const payload = {
    outerOrderSn: orderId,
    outerUid,
    orderAmount: roundedAmount,
    orderCurrency: currency,
    env: 'WEB',
    orderDesc,
    redirectUrl,
  };
  if (email) payload.buyer = { email };
  if (process.env.REDOTPAY_MERCHANT_NAME) payload.merchantName = cleanText(process.env.REDOTPAY_MERCHANT_NAME, 64);

  const requestBody = JSON.stringify(payload); // компактный JSON: подписывается и отправляется одна и та же строка
  const timestamp = String(Date.now());

  let signature;
  try {
    signature = signRequest({
      method: 'POST', uri: CREATE_ORDER_PATH, appKey, timestamp, body: requestBody,
      privateKey: loadPrivateKey(privateKeyRaw),
    });
  } catch (e) {
    console.error('[redotpay] signing failed:', e && e.code ? e.code : 'error'); // ключ не логируется
    return fail(res, 500, 'signing_failed', 'Ошибка настройки платёжного шлюза');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let rp;
  try {
    const r = await fetch(baseUrl + CREATE_ORDER_PATH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-R-AK': appKey,
        'X-R-TS': timestamp,
        'X-R-KEY-VERSION': keyVersion,
        'X-R-Signature': signature,
      },
      body: requestBody,
      signal: controller.signal,
    });
    const text = await r.text();
    try { rp = JSON.parse(text); } catch (e) { rp = null; }
    if (!r.ok && !rp) {
      console.error('[redotpay] http error', r.status);
      return fail(res, 502, 'gateway_http_error', 'Платёжный шлюз временно недоступен');
    }
  } catch (e) {
    console.error('[redotpay] request failed:', e && e.name);
    return fail(res, 502, 'gateway_unreachable', 'Платёжный шлюз временно недоступен');
  } finally {
    clearTimeout(timer);
  }

  if (!rp || rp.code !== 'SUCCESS' || !rp.data) {
    console.error('[redotpay] create order rejected:', rp && rp.code, rp && (rp.msg || rp.message), rp && rp.requestId);
    return fail(res, 502, 'gateway_rejected', 'Платёжный шлюз отклонил запрос. Свяжитесь с нами.');
  }

  const payUrl = rp.data.webUrl || rp.data.h5Url || '';
  if (!/^https:\/\//i.test(payUrl)) {
    console.error('[redotpay] no payUrl in response', rp.requestId);
    return fail(res, 502, 'no_pay_url', 'Платёжный шлюз не вернул ссылку на оплату');
  }

  console.log('[redotpay] order created', orderId, rp.data.orderSn, roundedAmount, currency);
  return sendJson(res, 200, { ok: true, payUrl, orderId, orderSn: rp.data.orderSn || null });
}
