/* Umvion – Hostinger Builder çalışma zamanının yerine geçen küçük betik */
(function () {
  // 1) Kaydırınca beliren animasyonlar
  var targets = document.querySelectorAll('.transition, [data-animation-role]');
  function activate(el) {
    el.setAttribute('data-animation-state', 'active');
    if (el.tagName === 'IMG' || el.getAttribute('data-animation-role') === 'image') el.classList.add('loaded');
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { activate(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.1 });
    targets.forEach(function (el) { io.observe(el); });
  } else {
    targets.forEach(activate);
  }

  // 2) Mobil menü (hamburger)
  var burger = document.querySelector('.block-header__hamburger-menu');
  var dropdown = document.querySelector('.block-header-layout-mobile__dropdown');
  if (burger && dropdown) {
    burger.addEventListener('click', function () {
      var open = !burger.classList.contains('burger--open');
      burger.classList.toggle('burger--open', open);
      dropdown.classList.toggle('block-header-layout-mobile__dropdown--open', open);
      burger.setAttribute('aria-expanded', open);
    });
  }

  // 3) İletişim formu – e-posta istemcisini açar (sunucu tarafı form eklenene kadar)
  var form = document.querySelector('form.form__control');
  if (form) {
    var send = function (ev) {
      ev.preventDefault();
      var v = function (id) { var el = form.querySelector('#' + id); return el ? el.value.trim() : ''; };
      var name = v('Name'), email = v('Email'), phone = v('Phone'), msg = v('Message');
      if (!name || !email || !msg) { alert('Lütfen zorunlu (*) alanları doldurun.'); return; }
      var body = 'Ad Soyad: ' + name + '\nE-posta: ' + email + '\nTelefon: ' + phone + '\n\n' + msg;
      window.location.href = 'mailto:info@umvion.com?subject=' +
        encodeURIComponent('Web Sitesi Talebi - ' + name) + '&body=' + encodeURIComponent(body);
    };
    form.addEventListener('submit', send);
    var btn = form.querySelector('button');
    if (btn) btn.addEventListener('click', send);
  }
})();
