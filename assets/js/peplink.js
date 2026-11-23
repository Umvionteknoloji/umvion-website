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

  // Güncel tutarlar, süre ve ödeme yöntemi
  var PRICES = { kart: { 1: 85, 2: 170, 3: 245 }, havale: { 1: 63, 2: 123, 3: 180 } };  // Worker yanıt vermezse
  var rate = 0, amounts = { kart: {}, havale: {} };
  var havale = document.getElementById('pl-havale');
  var upload = document.getElementById('pl-upload'), fileInput = document.getElementById('p-dekont'), fileName = document.getElementById('pl-file-name');
  var secure = document.getElementById('pl-secure');
  var MAX_FILE = 5 * 1024 * 1024, OK_TYPES = /\.(pdf|jpe?g|png)$/i;
  var checkFile = function () {
    var f = fileInput.files && fileInput.files[0];
    if (!f) return 'Lütfen dekontu yükleyin';
    if (!OK_TYPES.test(f.name)) return 'Dekont PDF, JPG veya PNG formatında olmalıdır';
    if (f.size > MAX_FILE) return 'Dekont dosyası en fazla 5 MB olabilir';
    return '';
  };
  fileInput.addEventListener('change', function () {
    var f = fileInput.files && fileInput.files[0];
    fileName.textContent = f ? f.name + ' (' + Math.max(1, Math.round(f.size / 1024)) + ' KB)' : 'Dekontu seçin veya buraya sürükleyin';
    upload.classList.toggle('has-file', !!f);
    upload.classList.toggle('is-invalid', !!(f && checkFile()));
  });
  var methodLabel = document.getElementById('pl-price-method');
  var hTl = document.getElementById('pl-h-tl'), hTl2 = document.getElementById('pl-h-tl2'), hUsd = document.getElementById('pl-h-usd');
  var radios = document.querySelectorAll('input[name="years"]');
  var methods = document.querySelectorAll('input[name="method"]');
  var selected = function () { var r = document.querySelector('input[name="years"]:checked'); return r ? r.value : '3'; };
  var method = function () { var r = document.querySelector('input[name="method"]:checked'); return r ? r.value : 'havale'; };
  var amountOf = function (m, y) { return amounts[m][y] || (rate ? Math.round(PRICES[m][y] * rate * 100) / 100 : 0); };

  var render = function () {
    var m = method(), y = selected(), amt = amountOf(m, y), usd = PRICES[m][y];
    document.querySelectorAll('[data-usd]').forEach(function (el) { el.textContent = PRICES[m][el.getAttribute('data-usd')] + ' USD'; });
    methodLabel.textContent = m === 'havale' ? 'Havale / EFT ile' : 'Kredi kartı ile';
    tl.textContent = amt ? fmt(amt) : usd + ' USD karşılığı';
    havale.hidden = m !== 'havale';
    document.querySelectorAll('.pl-steps[data-method]').forEach(function (ol) { ol.hidden = ol.getAttribute('data-method') !== m; });
    form.hidden = !!(result && !result.hidden && result.className.indexOf('--ok') > -1);
    upload.hidden = m !== 'havale';
    secure.textContent = m === 'havale' ? 'Dekontunuz ve bilgileriniz doğrudan bize iletilir' : 'iyzico güvencesiyle · 3D Secure';
    if (m === 'havale') {
      hTl.textContent = amt ? fmt(amt) : usd + ' USD karşılığı';
      hTl2.textContent = amt ? fmt(amt) : '—';
      hUsd.textContent = y + ' yıl · ' + usd + ' USD';
      btn.textContent = 'Havale bildirimini gönder';
    } else {
      btn.textContent = amt ? 'Güvenli ödemeye geç · ' + fmt(amt) : 'Güvenli ödemeye geç';
    }
  };
  radios.forEach(function (r) { r.addEventListener('change', render); });
  methods.forEach(function (r) { r.addEventListener('change', render); });

  // Ödeme dönüşünden gelindiyse kart seçili açılsın
  if (state) { var k = document.querySelector('input[name="method"][value="kart"]'); if (k) k.checked = true; }

  fetch(API + '/peplink/quote').then(function (r) { return r.json(); }).then(function (d) {
    if (!d.success) throw new Error();
    rate = d.rate;
    (d.plans || []).forEach(function (p) { PRICES.kart[p.years] = p.usd; amounts.kart[p.years] = p.amount; });
    (d.transfer || []).forEach(function (p) { PRICES.havale[p.years] = p.usd; amounts.havale[p.years] = p.amount; });
    var note = '1 USD = ' + d.rate.toLocaleString('tr-TR', { minimumFractionDigits: 4 }) + ' TL (' + (d.rateSource || 'TCMB döviz satış') + ', ' + d.rateDate + ').';
    rateEl.textContent = note + ' Kesin tutar ödeme anındaki kurla hesaplanır.';
    render();
  }).catch(render);
  render();

  // Kopyala düğmeleri
  document.querySelectorAll('.pl-copy').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = document.getElementById(b.getAttribute('data-copy')).textContent.replace(/\s+TL$/, '').trim();
      if (b.getAttribute('data-copy') === 'pl-iban') t = t.replace(/\s+/g, '');
      var done = function () { var l = b.querySelector('span'); l.textContent = 'Kopyalandı'; b.classList.add('is-done'); setTimeout(function () { l.textContent = 'Kopyala'; b.classList.remove('is-done'); }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, done); else done();
    });
  });

  form.addEventListener('input', function (e) {
    var f = e.target.closest('.field'); if (f) f.classList.remove('is-invalid');
  });

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    msg.classList.remove('is-visible');
    var bad = [], msgs = [];
    form.querySelectorAll('input[required]').forEach(function (el) {
      var v = el.value.trim(), label = el.closest('.field').querySelector('label').textContent.replace(' *', ''), why = '';
      if (!v) why = label + ' boş bırakılamaz';
      else if (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) why = 'E-posta adresi geçerli değil (örnek: ad@firma.com)';
      else if (el.name === 'taxNumber' && !/^\d{10,11}$/.test(v)) why = 'Vergi numarası 10 haneli olmalıdır';
      else if (el.name === 'phone' && v.replace(/\D/g, '').length < 10) why = 'Telefon numarası eksik görünüyor';
      el.closest('.field').classList.toggle('is-invalid', !!why);
      if (why) { bad.push(el); msgs.push(why); }
    });
    if (bad.length) { showError(msgs.join(' · ')); bad[0].focus(); return; }
    if (!form.elements.acceptTerms.checked) { showError('Devam etmek için sözleşme onayını işaretleyin.'); return; }

    if (method() === 'havale') {
      var fe = checkFile();
      upload.classList.toggle('is-invalid', !!fe);
      if (fe) { showError(fe); return; }
      var fd = new FormData(form);
      fd.set('years', selected()); fd.set('acceptTerms', 'on');
      btn.disabled = true; var hl = btn.textContent; btn.textContent = 'Gönderiliyor…';
      fetch(API + '/peplink/havale', { method: 'POST', body: fd })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d.success) throw new Error(d.message || '');
          result.className = 'pl-result pl-result--ok';
          result.innerHTML = '<span class="success-mark" aria-hidden="true"></span><h2>Havale bildiriminiz alındı</h2>' +
            '<p>Dekontunuz ve bilgileriniz bize ulaştı; özetini e-posta adresinize gönderdik. Ödemeniz hesabımıza geçtiğinde lisans işleminizi başlatıp size bilgi vereceğiz. Bildirim no: <b>' + d.ref + '</b></p>' +
            '<a class="btn btn--ghost" href="index.html">Ana sayfaya dön</a>';
          result.hidden = false; form.hidden = true; havale.hidden = true;
          document.querySelector('.pl-method').hidden = true;
          result.scrollIntoView({ block: 'start', behavior: 'smooth' });
        })
        .catch(function (e) {
          var m = e && e.message;
          if (!m || /fetch|network|load failed/i.test(m)) m = 'Bildirim gönderilemedi. Lütfen tekrar deneyin veya dekontu info@umvion.com adresine e-postayla gönderin.';
          showError(m); btn.disabled = false; btn.textContent = hl;
        });
      return;
    }

    var data = {};
    new FormData(form).forEach(function (v, k) { if (k !== 'dekont') data[k] = v; });
    data.acceptTerms = true;
    data.years = selected();
    btn.disabled = true; var label = btn.textContent; btn.textContent = 'Ödeme sayfası hazırlanıyor…';
    fetch(API + '/peplink/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.success || !d.paymentPageUrl) throw new Error(d.message || '');
        location.href = d.paymentPageUrl;          // iyzico güvenli ödeme sayfası
      })
      .catch(function (e) {
        var m = e && e.message;
        if (!m || /fetch|network|load failed/i.test(m)) m = 'Ödeme servisine bağlanılamadı. Lütfen birkaç dakika sonra tekrar deneyin veya 0212 807 17 74 numarasını arayın.';
        showError(m);
        btn.disabled = false; btn.textContent = label;
      });
  });
})();
