// api/_http.js
// Минимальные HTTP-помощники для serverless-функций Vercel.
// Работают и с «голыми» объектами Node.js (NODEJS_HELPERS=0: нет res.status(),
// res.json(), req.body), и при включённых помощниках Vercel.
// Файл начинается с "_", поэтому Vercel не публикует его как отдельный endpoint.

const MAX_BODY_BYTES = 1024 * 1024; // 1 МБ достаточно для форм и вебхуков

function peekBody(req) {
  // При включённых помощниках req.body — ленивый getter, который может бросить
  // исключение на некорректном JSON. Без помощников свойства просто нет.
  try { return req.body; } catch (e) { return undefined; }
}

// Возвращает «сырое» тело запроса как Buffer.
// Если платформа уже прочитала тело (req.body — Buffer/строка/объект), берём его.
export async function readRawBody(req) {
  const pre = peekBody(req);
  if (Buffer.isBuffer(pre)) return pre;
  if (typeof pre === 'string') return Buffer.from(pre, 'utf8');
  const chunks = [];
  let size = 0;
  if (!req.readableEnded && typeof req[Symbol.asyncIterator] === 'function') {
    for await (const chunk of req) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buf.length;
      if (size > MAX_BODY_BYTES) throw Object.assign(new Error('body too large'), { code: 'BODY_TOO_LARGE' });
      chunks.push(buf);
    }
  }
  if (chunks.length) return Buffer.concat(chunks);
  // Запасной вариант: тело уже разобрано платформой в объект.
  if (pre && typeof pre === 'object') return Buffer.from(JSON.stringify(pre), 'utf8');
  return Buffer.alloc(0);
}

// Разбирает JSON-тело. Пустое тело → {}, некорректный JSON → null.
export async function readJsonBody(req) {
  const pre = peekBody(req);
  if (pre && typeof pre === 'object' && !Buffer.isBuffer(pre)) return pre;
  let raw;
  try { raw = (await readRawBody(req)).toString('utf8'); } catch (e) { return null; }
  if (!raw.trim()) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' ? v : null;
  } catch (e) { return null; }
}

export function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Length', Buffer.byteLength(body));
  res.end(body);
}

export function sendEmpty(res, status) {
  res.statusCode = status;
  res.end();
}
