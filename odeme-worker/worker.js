/**
 * Umvion – Peplink lisans yenileme ödemesi (iyzico Ortak Ödeme Sayfası)
 *
 * Gizli değişkenler (Cloudflare → Worker → Settings → Variables and Secrets):
 *   IYZI_API_KEY      iyzico API anahtarı            (Secret)
 *   IYZI_SECRET_KEY   iyzico güvenlik anahtarı       (Secret)
 *   RESEND_API_KEY    Resend API anahtarı            (Secret)
 *   IYZI_BASE         https://sandbox-api.iyzipay.com (test) veya https://api.iyzipay.com (canlı)
 * KV bağlantısı:
 *   ORDERS            sipariş kayıtları için KV namespace
 *
 * Uç noktalar:
 *   GET  /peplink/quote     güncel TL tutarı (TCMB döviz satış kuru)
 *   POST /peplink/start     formu doğrular, ödemeyi başlatır, iyzico ödeme sayfası adresini döner
 *   POST /iyzico/callback   iyzico ödeme sonrası buraya döner; sonuç doğrulanır, e-postalar gönderilir
 */

// ---- Ayarlar -------------------------------------------------------------
const SITE = 'https://www.umvion.com';
const PAGE = SITE + '/peplink-lisans.html';
const ALLOWED_ORIGINS = ['https://www.umvion.com', 'https://umvion.com'];
const PRODUCT = { id: 'PEPLINK-LIC-3Y', name: 'Peplink lisans yenileme (3 yıl)', usd: 179 };
const NOTIFY_TO = 'info@umvion.com';
const FROM = 'Umvion Teknoloji <form@umvion.com>';
const INSTALLMENTS = [1, 2, 3, 6, 9, 12];
// --------------------------------------------------------------------------

const FIELDS = {
  storeCode: ['Mağaza kodu', 60, true],
  storeName: ['Mağaza adı', 120, true],
  company: ['Firma ünvanı', 160, true],
  taxNumber: ['Vergi numarası', 11, true],
  taxOffice: ['Vergi dairesi', 80, true],
  model: ['Peplink cihaz modeli', 80, true],
  serial: ['Peplink seri numarası', 40, true],
  contactName: ['Yetkili ad soyad', 100, true],
  email: ['E-posta', 120, true],
  phone: ['Telefon', 20, true],
  city: ['İl', 40, true],
  address: ['Fatura adresi', 300, true],
  note: ['Not', 1000, false],
};

const cors = (origin) => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Vary': 'Origin',
});
const json = (data, status, origin) =>
  new Response(status === 204 ? null : JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors(origin) },
  });
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => n.toFixed(2);
const trFmt = (n) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ---- TCMB kuru -----------------------------------------------------------
async function withTimeout(url, ms, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); } finally { clearTimeout(t); }
}
async function usdRate() {
  // 1) TCMB döviz satış kuru
  try {
    const res = await withTimeout('https://www.tcmb.gov.tr/kurlar/today.xml', 5000,
      { headers: { 'User-Agent': 'Mozilla/5.0 (Umvion odeme)' }, cf: { cacheTtl: 900, cacheEverything: true } });
    if (res.ok) {
      const xml = await res.text();
      const block = xml.match(/<Currency[^>]*CurrencyCode="USD"[^>]*>([\s\S]*?)<\/Currency>/);
      const sell = block && block[1].match(/<ForexSelling>([\d.]+)<\/ForexSelling>/);
      const date = (xml.match(/Tarih="([^"]+)"/) || [])[1] || '';
      if (sell) return { rate: parseFloat(sell[1]), date, source: 'TCMB döviz satış' };
    }
  } catch (e) { console.log('TCMB kuru alınamadı', String(e)); }
  // 2) Yedek kaynak
  const res = await withTimeout('https://open.er-api.com/v6/latest/USD', 5000, { cf: { cacheTtl: 900, cacheEverything: true } });
  const d = await res.json();
  if (!d || !d.rates || !d.rates.TRY) throw new Error('Kur alınamadı');
  return { rate: Math.round(d.rates.TRY * 10000) / 10000, date: new Date().toLocaleDateString('tr-TR'), source: 'piyasa kuru' };
}
async function quote() {
  const { rate, date, source } = await usdRate();
  const tl = Math.round(PRODUCT.usd * rate * 100) / 100;
  return { usd: PRODUCT.usd, rate, rateDate: date, rateSource: source, amount: tl };
}

// ---- iyzico (IYZWSv2 kimlik doğrulama) -----------------------------------
async function hmacHex(key, msg) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function iyzico(env, path, body) {
  const payload = JSON.stringify(body);
  const rnd = Date.now() + '' + Math.floor(Math.random() * 1e9);
  const signature = await hmacHex(env.IYZI_SECRET_KEY, rnd + path + payload);
  const auth = btoa(`apiKey:${env.IYZI_API_KEY}&randomKey:${rnd}&signature:${signature}`);
  const res = await fetch((env.IYZI_BASE || 'https://sandbox-api.iyzipay.com') + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'IYZWSv2 ' + auth, 'x-iyzi-rnd': rnd },
    body: payload,
  });
  return res.json();
}

// ---- E-posta (Resend) ----------------------------------------------------
async function sendMail(env, msg) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, ...msg }),
  });
  if (!r.ok) console.log('Resend hatası', r.status, await r.text());
}
function orderRows(o) {
  return [
    ['Mağaza kodu', o.f.storeCode], ['Mağaza adı', o.f.storeName], ['Firma ünvanı', o.f.company],
    ['Vergi numarası', o.f.taxNumber], ['Vergi dairesi', o.f.taxOffice],
    ['Peplink cihaz modeli', o.f.model], ['Peplink seri numarası', o.f.serial], ['Lisans süresi', '3 yıl'],
    ['Yetkili', o.f.contactName], ['E-posta', o.f.email], ['Telefon', o.f.phone],
    ['Fatura adresi', `${o.f.address}, ${o.f.city}`], ['Not', o.f.note || '-'],
  ];
}
function table(rows) {
  return `<table cellpadding="6" style="border-collapse:collapse;font-size:14px">${rows
    .map(([k, v]) => `<tr><td style="color:#4a5672;white-space:nowrap">${esc(k)}</td><td><b>${esc(v)}</b></td></tr>`).join('')}</table>`;
}

// ---- Sipariş başlatma ----------------------------------------------------
async function start(request, env, origin) {
  let data;
  try { data = await request.json(); } catch { return json({ success: false, message: 'Form verisi okunamadı.' }, 400, origin); }
  if (data.botcheck) return json({ success: false, message: 'Geçersiz istek.' }, 400, origin);
  if (!data.acceptTerms) return json({ success: false, message: 'Mesafeli Hizmet Sözleşmesi onayı gereklidir.' }, 422, origin);

  const f = {};
  for (const [key, [label, max, required]] of Object.entries(FIELDS)) {
    f[key] = String(data[key] || '').trim().slice(0, max);
    if (required && !f[key]) return json({ success: false, message: `${label} zorunludur.` }, 422, origin);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return json({ success: false, message: 'Geçerli bir e-posta girin.' }, 422, origin);
  if (!/^\d{10,11}$/.test(f.taxNumber)) return json({ success: false, message: 'Vergi numarası 10 (veya TC kimlik no 11) haneli olmalıdır.' }, 422, origin);
  const digits = f.phone.replace(/\D/g, '');
  if (digits.length < 10) return json({ success: false, message: 'Geçerli bir telefon numarası girin.' }, 422, origin);
  const gsm = '+90' + digits.slice(-10);

  let q;
  try { q = await quote(); } catch { return json({ success: false, message: 'Güncel kur alınamadı, lütfen biraz sonra tekrar deneyin.' }, 503, origin); }

  const orderId = 'PL' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase();
  const [name, ...rest] = f.contactName.split(/\s+/);
  const ip = request.headers.get('CF-Connecting-IP') || '85.34.78.112';
  const addr = { contactName: f.company, city: f.city, country: 'Turkey', address: `${f.address} | VD: ${f.taxOffice} VN: ${f.taxNumber}` };

  const body = {
    locale: 'tr',
    conversationId: orderId,
    price: money(q.amount),
    paidPrice: money(q.amount),
    currency: 'TRY',
    basketId: orderId,
    paymentGroup: 'PRODUCT',
    callbackUrl: new URL('/iyzico/callback', request.url).toString(),
    enabledInstallments: INSTALLMENTS,
    buyer: {
      id: f.taxNumber, name: name || f.contactName, surname: rest.join(' ') || '-', gsmNumber: gsm, email: f.email,
      identityNumber: f.taxNumber.length === 11 ? f.taxNumber : '11111111111',
      registrationAddress: addr.address, ip, city: f.city, country: 'Turkey',
    },
    billingAddress: addr,
    shippingAddress: addr,
    basketItems: [{ id: PRODUCT.id, name: PRODUCT.name, category1: 'Yazılım lisansı', itemType: 'VIRTUAL', price: money(q.amount) }],
  };

  const res = await iyzico(env, '/payment/iyzipos/checkoutform/initialize/auth/ecom', body);
  if (res.status !== 'success' || !res.token) {
    console.log('iyzico başlatma hatası', JSON.stringify(res));
    return json({ success: false, message: 'Ödeme başlatılamadı: ' + (res.errorMessage || 'bilinmeyen hata') }, 502, origin);
  }
  const order = { id: orderId, f, quote: q, status: 'pending', created: new Date().toISOString() };
  await env.ORDERS.put('token:' + res.token, orderId, { expirationTtl: 60 * 60 * 24 * 2 });
  await env.ORDERS.put('order:' + orderId, JSON.stringify(order), { expirationTtl: 60 * 60 * 24 * 400 });
  return json({ success: true, orderId, amount: q.amount, paymentPageUrl: res.paymentPageUrl }, 200, origin);
}

// ---- iyzico dönüşü -------------------------------------------------------
async function callback(request, env) {
  const back = (state, id) => Response.redirect(`${PAGE}?sonuc=${state}${id ? '&no=' + id : ''}`, 303);
  let token = '';
  try { token = (await request.formData()).get('token') || ''; } catch {}
  if (!token) return back('hata');

  const orderId = await env.ORDERS.get('token:' + token);
  const raw = orderId && await env.ORDERS.get('order:' + orderId);
  if (!raw) return back('hata');
  const order = JSON.parse(raw);
  if (order.status === 'paid') return back('basarili', order.id);

  const r = await iyzico(env, '/payment/iyzipos/checkoutform/auth/ecom/detail', { locale: 'tr', conversationId: order.id, token });
  const paid = r.status === 'success' && r.paymentStatus === 'SUCCESS' && r.basketId === order.id &&
               Math.abs(parseFloat(r.price) - order.quote.amount) < 0.01;
  if (!paid) {
    console.log('ödeme başarısız', JSON.stringify({ id: order.id, status: r.status, paymentStatus: r.paymentStatus, err: r.errorMessage }));
    return back('basarisiz', order.id);
  }

  order.status = 'paid';
  order.payment = { paymentId: r.paymentId, paidPrice: r.paidPrice, installment: r.installment, fraudStatus: r.fraudStatus, at: new Date().toISOString() };
  await env.ORDERS.put('order:' + order.id, JSON.stringify(order), { expirationTtl: 60 * 60 * 24 * 400 });

  const payRows = [
    ['Sipariş no', order.id], ['Tutar', `${trFmt(order.quote.amount)} TL (${order.quote.usd} USD)`],
    ['Kur', `${order.quote.rate} (${order.quote.rateSource || 'TCMB döviz satış'}, ${order.quote.rateDate})`],
    ['Tahsil edilen', `${r.paidPrice} TL${r.installment > 1 ? ' · ' + r.installment + ' taksit' : ''}`],
    ['iyzico ödeme no', r.paymentId],
  ];
  if (r.fraudStatus === 0) payRows.push(['Uyarı', 'iyzico bu ödemeyi incelemeye aldı, lisans işlemini başlatmadan önce paneli kontrol edin.']);

  await sendMail(env, {
    to: [NOTIFY_TO], reply_to: order.f.email,
    subject: `Peplink lisans ödemesi alındı – ${order.f.storeCode} ${order.f.storeName} – ${order.f.serial}`,
    html: `<div style="font-family:Arial,sans-serif;color:#0e1a3a"><h2 style="margin:0 0 12px">Yeni Peplink lisans yenileme ödemesi</h2>
      ${table(orderRows(order))}<h3 style="margin:20px 0 8px">Ödeme</h3>${table(payRows)}</div>`,
    text: [...orderRows(order), ...payRows].map(([k, v]) => `${k}: ${v}`).join('\n'),
  });
  await sendMail(env, {
    to: [order.f.email], reply_to: NOTIFY_TO,
    subject: `Ödemeniz alındı – Peplink lisans yenileme (${order.id})`,
    html: `<div style="font-family:Arial,sans-serif;color:#0e1a3a"><p>Sayın ${esc(order.f.contactName)},</p>
      <p>Peplink lisans yenileme ödemeniz başarıyla alındı. Lisans işleminiz başlatılıyor; tamamlandığında size bilgi vereceğiz.</p>
      ${table([['Sipariş no', order.id], ['Mağaza', `${order.f.storeCode} – ${order.f.storeName}`], ['Cihaz', `${order.f.model} · ${order.f.serial}`],
               ['Lisans süresi', '3 yıl'], ['Ödenen tutar', `${r.paidPrice} TL`]])}
      <p style="margin-top:20px">Umvion Teknoloji · 0212 807 17 74 · info@umvion.com</p></div>`,
  });
  return back('basarili', order.id);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    try {
      if (request.method === 'OPTIONS') return json({}, 204, origin);
      if (url.pathname === '/iyzico/callback' && request.method === 'POST') return await callback(request, env);

      // Kontrol adresi: tarayıcıdan açılabilir, ayarların eksik olup olmadığını gösterir
      if (url.pathname === '/' || url.pathname === '/durum') {
        return json({
          success: true, servis: 'Umvion ödeme', ortam: (env.IYZI_BASE || '').includes('sandbox') ? 'TEST (sandbox)' : 'CANLI',
          ayarlar: { IYZI_API_KEY: !!env.IYZI_API_KEY, IYZI_SECRET_KEY: !!env.IYZI_SECRET_KEY, RESEND_API_KEY: !!env.RESEND_API_KEY,
                     IYZI_BASE: env.IYZI_BASE || 'EKSİK', ORDERS_KV: !!env.ORDERS },
        }, 200, origin);
      }
      if (url.pathname === '/peplink/quote' && request.method === 'GET') {
        try { return json({ success: true, ...(await quote()) }, 200, origin); }
        catch (e) { return json({ success: false, message: 'Kur alınamadı.' }, 503, origin); }
      }
      if (!ALLOWED_ORIGINS.includes(origin)) return json({ success: false, message: 'İzin verilmeyen kaynak.' }, 403, origin);
      if (url.pathname === '/peplink/start' && request.method === 'POST') {
        if (!env.ORDERS || !env.IYZI_API_KEY || !env.IYZI_SECRET_KEY) {
          return json({ success: false, message: 'Ödeme servisi ayarları eksik. Lütfen bizi arayın: 0212 807 17 74' }, 500, origin);
        }
        return await start(request, env, origin);
      }
      return json({ success: false, message: 'Bulunamadı.' }, 404, origin);
    } catch (e) {
      console.log('Beklenmeyen hata', String(e && e.stack || e));
      return json({ success: false, message: 'Ödeme servisinde beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.' }, 500, origin);
    }
  },
};
