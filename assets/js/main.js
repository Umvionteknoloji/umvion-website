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

  // Formlar: Cloudflare Worker + Resend ile doğrudan info@umvion.com'a gönderir
  document.querySelectorAll('form.js-form').forEach(function (form) {
    var msg = form.querySelector('.form-msg');
    var submit = form.querySelector('button[type="submit"]');
    var label = submit.textContent;
    var done = form.nextElementSibling && form.nextElementSibling.classList.contains('form-success') ? form.nextElementSibling : null;
    var showError = function (t) { msg.textContent = t; msg.classList.add('is-visible'); };

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
      if (missing.length) { showError('Lütfen ad soyad, geçerli bir e-posta ve mesaj alanlarını doldurun.'); missing[0].focus(); return; }

      submit.disabled = true; submit.textContent = 'Gönderiliyor...';
      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return r.ok && j.success !== false; }); })
        .then(function (ok) {
          if (!ok) throw new Error();
          form.reset(); form.hidden = true;
          if (done) { done.hidden = false; done.focus(); }
        })
        .catch(function () { showError('Mesaj gönderilemedi. Lütfen tekrar deneyin veya doğrudan info@umvion.com adresine yazın.'); })
        .then(function () { submit.disabled = false; submit.textContent = label; });
    });

    if (done) {
      var again = done.querySelector('[data-again]');
      if (again) again.addEventListener('click', function () { done.hidden = true; form.hidden = false; form.elements.name.focus(); });
    }
  });

  // Açılır pencereler (demo formu ve ekran görüntüsü büyütme)
  var modal = document.getElementById('demo-modal');
  var lightbox = document.getElementById('lightbox');
  var openDialog = function (d) { if (d.showModal) d.showModal(); else d.setAttribute('open', ''); };
  [modal, lightbox].forEach(function (d) {
    if (!d) return;
    d.addEventListener('click', function (e) {
      if (e.target === d || e.target.closest('[data-close]')) d.close();
    });
  });
  if (modal) {
    modal.addEventListener('close', function () {
      var f = modal.querySelector('form'), s = modal.querySelector('.form-success');
      if (s && !s.hidden) { s.hidden = true; f.hidden = false; }
    });
    document.querySelectorAll('[data-open-demo]').forEach(function (b) {
      b.addEventListener('click', function () { openDialog(modal); modal.querySelector('input[name="name"]').focus(); });
    });
  }
  if (lightbox) {
    var img = lightbox.querySelector('img');
    document.querySelectorAll('.shot').forEach(function (s) {
      s.addEventListener('click', function () {
        var i = s.querySelector('img');
        img.src = s.getAttribute('data-full'); img.alt = i.alt;
        openDialog(lightbox);
      });
    });
  }

  // Kaydırınca beliren "Demo isteyin" butonu
  var cta = document.getElementById('float-cta');
  var hero = document.getElementById('app-hero');
  if (cta && hero && 'IntersectionObserver' in window) {
    var dismissed = false;
    try { dismissed = sessionStorage.getItem('demo-cta-closed') === '1'; } catch (e) {}
    cta.hidden = false; cta.classList.add('is-hidden');
    new IntersectionObserver(function (entries) {
      if (dismissed) return;
      cta.classList.toggle('is-hidden', entries[0].isIntersecting);
    }, { threshold: 0.05 }).observe(hero);
    cta.querySelector('.float-close').addEventListener('click', function () {
      dismissed = true; cta.classList.add('is-hidden');
      try { sessionStorage.setItem('demo-cta-closed', '1'); } catch (e) {}
    });
  }
})();
