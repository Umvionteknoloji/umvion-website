/* Peplink lisans yenileme – iyzico ödeme akışı */
(function () {
  var API = 'https://umvion-odeme.serdox.workers.dev';   // ödeme Worker adresi
  var form = document.getElementById('pl-form');
  if (!form) return;
  var msg = form.querySelector('.form-msg');
  var btn = document.getElementById('pl-submit');
  var tl = document.getElementById('pl-tl');
  var rateEl = document.getElementById('pl-rate');
  var result = document.getElementById('pl-result');
  var fmt = function (n) { return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL'; };
  var showError = function (t) { msg.textContent = t; msg.classList.add('is-visible'); msg.scrollIntoView({ block: 'center', behavior: 'smooth' }); };

  // Ödeme dönüşü: ?sonuc=basarili|basarisiz|hata
  var q = new URLSearchParams(location.search), state = q.get('sonuc'), no = q.get('no');
  if (state) {
    var texts = {
      basarili: ['ok', 'Ödemeniz alındı', 'Teşekkür ederiz. Lisans işleminiz başlatılıyor; sipariş özetiniz e-posta adresinize gönderildi.' + (no ? ' Sipariş no: <b>' + no + '</b>' : '')],
      basarisiz: ['err', 'Ödeme tamamlanamadı', 'Kartınızdan tahsilat yapılmadı. Bilgilerinizi kontrol edip tekrar deneyebilir ya da 0212 807 17 74 numarasından bize ulaşabilirsiniz.'],
      hata: ['err', 'Bir sorun oluştu', 'Ödeme sonucu doğrulanamadı. Kartınızdan çekim yapıldıysa lütfen info@umvion.com adresine yazın, hemen kontrol edelim.']
    };
    var t = texts[state] || texts.hata;
    result.className = 'pl-result pl-result--' + t[0];
    result.innerHTML = '<span class="success-mark" aria-hidden="true"></span><h2>' + t[1] + '</h2><p>' + t[2] + '</p>' +
      (t[0] === 'ok' ? '<a class="btn btn--ghost" href="index.html">Ana sayfaya dön</a>' : '<button class="btn btn--primary" type="button" id="pl-retry">Tekrar dene</button>');
    result.hidden = false;
    if (t[0] === 'ok') form.hidden = true;
    var retry = document.getElementById('pl-retry');
    if (retry) retry.addEventListener('click', function () { result.hidden = true; history.replaceState(null, '', location.pathname); });
  }

  // Güncel tutar
  fetch(API + '/peplink/quote').then(function (r) { return r.json(); }).then(function (d) {
    if (!d.success) throw new Error();
    tl.textContent = fmt(d.amount);
    rateEl.textContent = '1 USD = ' + d.rate.toLocaleString('tr-TR', { minimumFractionDigits: 4 }) + ' TL (TCMB döviz satış, ' + d.rateDate + '). Kesin tutar ödeme anındaki kurla hesaplanır.';
    btn.textContent = 'Güvenli ödemeye geç · ' + fmt(d.amount);
  }).catch(function () { tl.textContent = '179 USD karşılığı'; });

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    msg.classList.remove('is-visible');
    var bad = [];
    form.querySelectorAll('input[required]').forEach(function (el) {
      var v = el.value.trim(), ok = !!v;
      if (el.type === 'email') ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      if (el.name === 'taxNumber') ok = /^\d{10,11}$/.test(v);
      el.closest('.field').classList.toggle('is-invalid', !ok);
      if (!ok) bad.push(el);
    });
    if (bad.length) { showError('Lütfen işaretli alanları kontrol edin. Vergi numarası 10 haneli olmalıdır.'); bad[0].focus(); return; }
    if (!form.elements.acceptTerms.checked) { showError('Devam etmek için sözleşme onayını işaretleyin.'); return; }

    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = v; });
    data.acceptTerms = true;
    btn.disabled = true; var label = btn.textContent; btn.textContent = 'Ödeme sayfası hazırlanıyor…';
    fetch(API + '/peplink/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.success || !d.paymentPageUrl) throw new Error(d.message || '');
        location.href = d.paymentPageUrl;          // iyzico güvenli ödeme sayfası
      })
      .catch(function (e) {
        showError((e && e.message) || 'Ödeme başlatılamadı. Lütfen tekrar deneyin veya 0212 807 17 74 numarasını arayın.');
        btn.disabled = false; btn.textContent = label;
      });
  });
})();
