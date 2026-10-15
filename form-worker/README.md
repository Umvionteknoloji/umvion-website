# İletişim formu – Cloudflare Worker

`worker.js`, sitedeki iletişim formunu Resend üzerinden info@umvion.com'a gönderir.
Resend API anahtarı bu dosyada değil, Cloudflare panelinde `RESEND_API_KEY` adlı Secret olarak tutulur.

Ayarlar (alıcı adres, gönderen adres, izin verilen alan adları) dosyanın en üstündedir.
Değiştirdikten sonra kodu Cloudflare panelindeki editöre yapıştırıp **Deploy** edin.
