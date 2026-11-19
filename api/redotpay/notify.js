// api/redotpay/notify.js
// Приём вебхуков RedotPay Connect (результат оплаты / возврата).
// Подпись X-R-Signature проверяется публичным ключом платформы RedotPay
// по строке "{appKey}.{X-R-TS}.{тело запроса}" (SHA256withRSA, Base64).
// URL этого обработчика указывается в кабинете мерчанта RedotPay:
//   https://<домен Vercel>/api/redotpay/notify
// Для точной проверки подписи нужно «сырое» тело запроса. Рекомендуется в Vercel
// задать переменную NODEJS_HELPERS=0, чтобы тело не разбиралось заранее.
import crypto from 'node:crypto';
import {
  DEFAULT_LIVE_BASE_URL, REDOTPAY_PLATFORM_PUBLIC_KEYS, verifyWebhookSignature, environmentFromBaseUrl,
} from './_lib.js';

async function readRawBody(req) {
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  const chunks = [];
  try {
    for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  } catch (e) { /* поток уже прочитан */ }
  if (chunks.length) return Buffer.concat(chunks).toString('utf8');
  // Запасной вариант: тело уже разобрано платформой. Подпись может не совпасть,
  // если исходный JSON отличался форматированием.
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);
  return '';
}

function header(req, name) {
  const v = req.headers[name.toLowerCase()];
  return Array.isArray(v) ? v[0] : v;
}

export default async function handler(req, res) {
  const requestId = crypto.randomUUID();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ code: 'FAIL', requestId, msg: 'method not allowed' });
  }

  const appKey = (process.env.REDOTPAY_APP_KEY || '').trim();
  if (!appKey) {
    return res.status(503).json({ code: 'FAIL', requestId, msg: 'not configured' });
  }

  const raw = await readRawBody(req);
  const ts = header(req, 'X-R-TS');
  const signature = header(req, 'X-R-Signature');
  const version = parseInt(header(req, 'X-R-KEY-VERSION') || '1', 10);
  const env = environmentFromBaseUrl(process.env.REDOTPAY_BASE_URL || DEFAULT_LIVE_BASE_URL);
  const publicKey = (REDOTPAY_PLATFORM_PUBLIC_KEYS[env] || {})[version];

  if (!ts || !signature || !publicKey) {
    console.warn('[redotpay notify] missing headers or unknown key version', env, version);
    return res.status(401).json({ code: 'FAIL', requestId, msg: 'signature required' });
  }
  if (!verifyWebhookSignature({ appKey, timestamp: ts, body: raw, signature, publicKey })) {
    console.warn('[redotpay notify] bad signature');
    return res.status(401).json({ code: 'FAIL', requestId, msg: 'invalid signature' });
  }

  let event = {};
  try { event = JSON.parse(raw); } catch (e) { /* оставляем пустым */ }

  // Обработка идемпотентная: здесь только запись в лог Vercel. Статусы оплаты:
  // 1 — в процессе, 2 — успешно, 3 — ошибка, 4 — закрыт.
  if (event.actionType === 'ACQUIRER_PAY') {
    console.log('[redotpay notify] payment', event.outerOrderSn || event.outerOrder, event.orderSn || event.preSn,
      'status', event.orderStatus, event.orderAmount, event.orderCurrency, '→', event.cryptoAmount, event.cryptoCurrency || event.coin);
  } else if (event.refundSn) {
    console.log('[redotpay notify] refund', event.outerOrderSn, event.refundSn, event.status, event.refundAmount, event.refundCurrency);
  } else {
    console.log('[redotpay notify] event received');
  }

  return res.status(200).json({ code: 'SUCCESS', requestId });
}
