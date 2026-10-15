/**
 * Umvion – iletişim formu → Resend
 * Cloudflare Worker olarak çalışır. Resend API anahtarı koda yazılmaz;
 * Cloudflare panelinde RESEND_API_KEY adlı "Secret" olarak saklanır.
 */

// ---- Ayarlar -------------------------------------------------------------
const TO = 'info@umvion.com';                                // mesajların gideceği adres
const FROM = 'Umvion Web Sitesi <form@umvion.com>';          // Resend'de doğrulanmış alan adından
const ALLOWED_ORIGINS = ['https://www.umvion.com', 'https://umvion.com'];
const LIMITS = { name: 120, company: 160, email: 200, phone: 40, service: 120, message: 5000 };
// --------------------------------------------------------------------------

const json = (data, status, origin) =>
  new Response(status === 204 ? null : JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Vary': 'Origin',
    },
  });

const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = ALLOWED_ORIGINS.includes(origin);
    const corsOrigin = allowed ? origin : ALLOWED_ORIGINS[0];

    if (request.method === 'OPTIONS') return json({}, allowed ? 204 : 403, corsOrigin);
    if (request.method !== 'POST') return json({ success: false, message: 'Yalnızca POST kabul edilir.' }, 405, corsOrigin);
    if (!allowed) return json({ success: false, message: 'İzin verilmeyen kaynak.' }, 403, corsOrigin);

    let form;
    try {
      const type = request.headers.get('Content-Type') || '';
      form = type.includes('application/json')
        ? new Map(Object.entries(await request.json()))
        : await request.formData();
    } catch {
      return json({ success: false, message: 'Form verisi okunamadı.' }, 400, corsOrigin);
    }

    // Bot tuzağı: gerçek ziyaretçiler bu gizli kutuyu işaretlemez
    if (form.get('botcheck')) return json({ success: true }, 200, corsOrigin);

    const f = {};
    for (const [key, max] of Object.entries(LIMITS)) {
      f[key] = String(form.get(key) || '').trim().slice(0, max);
    }
    if (!f.name || !f.message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) {
      return json({ success: false, message: 'Ad, geçerli e-posta ve mesaj zorunludur.' }, 422, corsOrigin);
    }

    const rows = [
      ['Ad soyad', f.name], ['Şirket', f.company || '-'], ['E-posta', f.email],
      ['Telefon', f.phone || '-'], ['Hizmet', f.service || '-'],
    ];
    const html = `
      <div style="font-family:Arial,sans-serif;font-size:15px;color:#0e1a3a">
        <h2 style="margin:0 0 16px">Web sitesinden yeni talep</h2>
        <table cellpadding="6" style="border-collapse:collapse">
          ${rows.map(([k, v]) => `<tr><td style="color:#4a5672">${k}</td><td><b>${esc(v)}</b></td></tr>`).join('')}
        </table>
        <p style="margin:20px 0 6px;color:#4a5672">Mesaj</p>
        <div style="white-space:pre-wrap;padding:14px;background:#f3f6fb;border-radius:8px">${esc(f.message)}</div>
        <p style="margin-top:20px;font-size:13px;color:#4a5672">Bu e-postayı yanıtladığınızda cevabınız doğrudan ${esc(f.email)} adresine gider.</p>
      </div>`;
    const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n') + `\n\nMesaj:\n${f.message}`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        reply_to: f.email,
        subject: `Web sitesi talebi - ${f.service || 'Genel'} - ${f.name}`.slice(0, 200),
        html,
        text,
      }),
    });

    if (!res.ok) {
      console.log('Resend hatası', res.status, await res.text());
      return json({ success: false, message: 'E-posta gönderilemedi.' }, 502, corsOrigin);
    }
    return json({ success: true }, 200, corsOrigin);
  },
};
