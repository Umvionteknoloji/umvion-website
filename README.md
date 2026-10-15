# Umvion Teknoloji – Kurumsal Web Sitesi

www.umvion.com'un statik HTML sürümü. Hostinger Web Hosting'e GitHub üzerinden otomatik yayınlanır.

## Yapı
```
index.html            Ana Sayfa            → https://www.umvion.com/
hizmetler.html        Hizmetlerimiz        → /hizmetler
referanslar.html      Referanslar          → /referanslar
iletisim.html         İletişim             → /iletisim
assets/css/           site.css (ortak stil), fonts.css, cookieconsent.css
assets/js/site.js     Animasyonlar, mobil menü, iletişim formu
assets/img/           Görseller (*-mobil.png = mobil görünüm kırpımı)
.htaccess             HTTPS/www yönlendirmesi, uzantısız adresler, önbellek
robots.txt, sitemap.xml
```

## Yerelde önizleme
`index.html` dosyasını tarayıcıda açın.

## Güncelleme akışı
1. Dosyayı düzenleyin (ör. `index.html` içindeki metni değiştirin).
2. Değişikliği GitHub'a gönderin (commit + push).
3. Hostinger'da otomatik dağıtım açıksa site kendiliğinden güncellenir; değilse hPanel → Git → **Deploy**.

## Notlar
- Sayfalar Hostinger AI Builder çıktısından türetildi; sınıf adları (`block-header`, `layout-element` vb.) `site.css` ile eşleşir, silinmemeli.
- İletişim formu ziyaretçinin e-posta programını açarak info@umvion.com'a mesaj hazırlar. Sunucu tarafı gönderim sonra eklenebilir.
- Fontlar `cdn.zyrosite.com` üzerinden yüklenir.
