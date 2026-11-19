// api/redotpay/_lib.js
// Общие функции RedotPay Connect: подпись запросов и проверка подписи вебхуков.
// Файл начинается с "_", поэтому Vercel не публикует его как отдельный endpoint.
// Секретов в коде нет: ключи берутся только из переменных окружения.
import crypto from 'node:crypto';

// HTTP-помощники, работающие и без помощников Vercel (NODEJS_HELPERS=0).
export { readRawBody, readJsonBody, sendJson, sendEmpty } from '../_http.js';

export const DEFAULT_LIVE_BASE_URL = 'https://acquirer.redotpay.com';
export const SANDBOX_BASE_URL = 'https://acquirersandbox.rp-2023app.com';
export const CREATE_ORDER_PATH = '/openapi/v2/order/create';

// Публичные ключи платформы RedotPay для проверки подписи вебхуков (X-R-KEY-VERSION: 1).
// Источник: https://docs.redotpay.com/docs/en/api-reference/signature#redotpay-platform-public-keys
// Это открытые ключи RedotPay, не секрет.
export const REDOTPAY_PLATFORM_PUBLIC_KEYS = {
  production: {
    1: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzMn4r06M/cp2amkbCxIs
PSr030JoCFeymwjTZrBnI8kW4mtL6JtUPYpJTFgCB8ZQoV75lEmUw8gSLbN770Cc
5EOi1dF4ekmLQ7Ez0SFUbQgJa7Vg5wBdSKcbUmkKGviJt+iZRJ0tZsPpXMPqIo9Y
OWJagfPbDhEwT2t1ANP4ou98sCqLqELI80iYm8+W4B9IvBW4lc+H5BAPtXpYMtlZ
6stCnvHXd1EjvlTak25v5xJ8AInEeAy8/D2glunmz/VfPyoB5OHPgnYVU66HyeQc
O1ZY/jzB5d6I/zX4JENG1xrP8ThPZ9qMWtmputJ0XYKymiZgZP6vh0L+G6P/Z98v
lQIDAQAB
-----END PUBLIC KEY-----`,
  },
  sandbox: {
    1: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuctrVK3eP8hpoJf7FMet
lcR77FYcj9HtrkySyGDRt5HHwdwgM8jK0kfE4ag/zI8goe8M0iJ2o7n3VCfTzn8O
yfU0bu6KzDti1WOJV9fv4XtSmhm9W4WKjIc8uDQViR7E8trzcrbKFVbKVGng1+z0
KobQBDtWhjUeXKktUq1lpiejTS+XjXej26ANPfwbqbY+/6kBB3sWbt9BLDI/WhPY
XnFV9oJWod9I/dYUgUUA/b/+bI1wlobNntBDxiNmX0kbqpGZbzO6l9wWFXZiFCD2
5QtBOZlMbn9noH4KW3DnKGc2nKNz/f2FEM9DJKn3P7NGFVy6O/Q5NzcbFs+DI6nT
ywIDAQAB
-----END PUBLIC KEY-----`,
  },
};

// Приватный ключ в переменной окружения часто хранится одной строкой с "\n".
export function normalizePem(value) {
  if (!value) return '';
  let pem = String(value).trim();
  if ((pem.startsWith('"') && pem.endsWith('"')) || (pem.startsWith("'") && pem.endsWith("'"))) {
    pem = pem.slice(1, -1);
  }
  pem = pem.replace(/\\r\\n|\\n/g, '\n').replace(/\r\n/g, '\n');
  return pem;
}

export function loadPrivateKey(value) {
  const pem = normalizePem(value);
  if (!pem) throw new Error('private key is empty');
  return crypto.createPrivateKey({ key: pem, format: 'pem' });
}

// Строка для подписи запроса (по документации RedotPay):
// "{HTTP-METHOD} {URI}\n{appKey}.{timestamp}.{requestBody}"
export function buildRequestStringToSign(method, uri, appKey, timestamp, body) {
  return `${String(method).toUpperCase()} ${uri}\n${appKey}.${timestamp}.${body}`;
}

// SHA256withRSA (PKCS#1 v1.5) + Base64.
export function signRequest({ method, uri, appKey, timestamp, body, privateKey }) {
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(buildRequestStringToSign(method, uri, appKey, timestamp, body), 'utf8');
  signer.end();
  return signer.sign(privateKey).toString('base64');
}

// Строка для проверки вебхука: "{appKey}.{timestamp}.{requestBody}" (без метода и URI).
export function verifyWebhookSignature({ appKey, timestamp, body, signature, publicKey }) {
  try {
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${appKey}.${timestamp}.${body}`, 'utf8');
    verifier.end();
    return verifier.verify(publicKey, Buffer.from(String(signature), 'base64'));
  } catch (e) {
    return false;
  }
}

export function environmentFromBaseUrl(baseUrl) {
  return /sandbox/i.test(String(baseUrl || '')) ? 'sandbox' : 'production';
}

// Разрешённые источники запросов (CORS): боевой домен и превью Vercel этого проекта.
const ALLOWED_ORIGINS = new Set([
  'https://xn----8sbmwfvpo8a.xn--p1ai',
  'https://www.xn----8sbmwfvpo8a.xn--p1ai',
  // GitHub Pages сейчас не принуждает HTTPS, поэтому страница может открыться и по http
  'http://xn----8sbmwfvpo8a.xn--p1ai',
  'http://www.xn----8sbmwfvpo8a.xn--p1ai',
]);
// Деплои и превью Vercel этого проекта: universal-<...>-aleksandrs-projects-98e3f756.vercel.app
const VERCEL_PREVIEW_RE = /^https:\/\/universal-[a-z0-9-]+-aleksandrs-projects-98e3f756\.vercel\.app$/;
const VERCEL_PROD_ORIGIN = 'https://universal-cnc.vercel.app';

export function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  if (origin === VERCEL_PROD_ORIGIN || VERCEL_PREVIEW_RE.test(origin)) return true;
  const extra = String(process.env.REDOTPAY_ALLOWED_ORIGINS || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  return extra.includes(origin);
}

export function applyCors(req, res) {
  const origin = req.headers && req.headers.origin;
  res.setHeader('Vary', 'Origin');
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '600');
  }
  return origin;
}
