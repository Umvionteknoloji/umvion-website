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

  // İletişim formu: e-posta programında hazır mesaj açar
  var form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var v = function (n) { return (form.elements[n].value || '').trim(); };
      var err = document.getElementById('form-error');
      if (!v('name') || !v('email') || !v('message')) { err.classList.add('is-visible'); return; }
      err.classList.remove('is-visible');
      var body = 'Ad Soyad: ' + v('name') + '\nŞirket: ' + v('company') + '\nE-posta: ' + v('email') +
                 '\nTelefon: ' + v('phone') + '\nHizmet: ' + v('service') + '\n\n' + v('message');
      window.location.href = 'mailto:info@umvion.com?subject=' +
        encodeURIComponent('Web sitesi talebi - ' + v('service')) + '&body=' + encodeURIComponent(body);
    });
  }
})();
