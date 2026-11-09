# Peplink lisans ödemesi – Cloudflare Worker

`worker.js`, peplink-lisans.html sayfasındaki formu iyzico Ortak Ödeme Sayfası'na bağlar.
Anahtarlar bu dosyada değil, Cloudflare panelinde saklanır:

| Ad | Tür | Değer |
|---|---|---|
| IYZI_API_KEY | Secret | iyzico API anahtarı |
| IYZI_SECRET_KEY | Secret | iyzico güvenlik anahtarı |
| RESEND_API_KEY | Secret | Resend API anahtarı |
| IYZI_BASE | Text | Test: https://sandbox-api.iyzipay.com · Canlı: https://api.iyzipay.com |
| ORDERS | KV namespace bağlantısı | peplink-orders |

Fiyat (179 USD), bildirim adresi ve taksit seçenekleri dosyanın en üstündeki ayarlardan değiştirilir.
