/* Umvion – site betikleri */
(function () {
  // Mobil menü
  var btn = document.querySelector('.menu-toggle');
  var nav = document.getElementById('nav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open);
      btn.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
    });
  }

  // Hizmetler sayfası: alt menüde bulunulan bölümü işaretle
  var links = document.querySelectorAll('.subnav a');
  if (links.length && 'IntersectionObserver' in window) {
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove('is-active'); });
        var a = map[e.target.id];
        if (a) { a.classList.add('is-active'); a.scrollIntoView({ block: 'nearest', inline: 'center' }); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  // İletişim formu: Cloudflare Worker + Resend ile doğrudan info@umvion.com'a gönderir
  var form = document.getElementById('contact-form');
  if (form) {
    var msg = document.getElementById('form-error');
    var btn2 = document.getElementById('form-submit');
    var done = document.getElementById('form-success');
    var showError = function (text) { msg.textContent = text; msg.classList.add('is-visible'); };

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      msg.classList.remove('is-visible');
      var missing = [];
      ['name', 'email', 'message'].forEach(function (n) {
        var el = form.elements[n], field = el.closest('.field');
        var bad = !el.value.trim() || (n === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()));
        field.classList.toggle('is-invalid', bad);
        if (bad) missing.push(el);
      });
      if (missing.length) {
        showError('Lütfen ad soyad, geçerli bir e-posta ve mesaj alanlarını doldurun.');
        missing[0].focus();
        return;
      }

      var data = new FormData(form);
      btn2.disabled = true; btn2.textContent = 'Gönderiliyor...';

      fetch(form.action, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok && j.success !== false }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error();
          form.reset(); form.hidden = true; done.hidden = false; done.focus();
        })
        .catch(function () {
          showError('Mesaj gönderilemedi. Lütfen tekrar deneyin veya doğrudan info@umvion.com adresine yazın.');
        })
        .then(function () { btn2.disabled = false; btn2.textContent = 'Mesajı gönder'; });
    });

    document.getElementById('form-again').addEventListener('click', function () {
      done.hidden = true; form.hidden = false; form.elements.name.focus();
    });
  }
})();
