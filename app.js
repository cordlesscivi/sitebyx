/* =========================================================
   SHARED APPLICATION LOGIC
   Работает на всех 4-х страницах: index, about, services, contact
   ========================================================= */

(function () {
    'use strict';

    var cfg = window.SITE_CONFIG || {};

    // ── PRELOADER ──────────────────────────────────────────
    var preloader = document.getElementById('preloader');
    if (preloader) {
        window.addEventListener('load', function () {
            setTimeout(function () { preloader.classList.add('hidden'); }, 1200);
        });
    }

    // ── NAVBAR SCROLL EFFECT ───────────────────────────────
    var navbar = document.getElementById('navbar');
    if (navbar) {
        window.addEventListener('scroll', function () {
            navbar.classList.toggle('scrolled', window.pageYOffset > 50);
        });
    }

    // ── MOBILE MENU ─────────────────────────────────────────
    var menuToggle = document.getElementById('menuToggle');
    var navLinks = document.getElementById('navLinks');
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', function () {
            navLinks.classList.toggle('active');
        });
        Array.prototype.forEach.call(navLinks.querySelectorAll('a'), function (link) {
            link.addEventListener('click', function () { navLinks.classList.remove('active'); });
        });
    }

    // ── BACK TO TOP ─────────────────────────────────────────
    var backToTop = document.getElementById('backToTop');
    if (backToTop) {
        window.addEventListener('scroll', function () {
            if (window.pageYOffset > 300) backToTop.classList.add('visible');
            else backToTop.classList.remove('visible');
        });
        backToTop.addEventListener('click', function (e) {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // ── REVEAL АНИМАЦИИ ПРИ СКРОЛЛЕ ─────────────────────────
    var observerOpts = { threshold: 0.15, rootMargin: '0px 0px -50px 0px' };
    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, observerOpts);

    function observeReveals() {
        Array.prototype.forEach.call(
            document.querySelectorAll('.section, .reveal'),
            function (el) { observer.observe(el); }
        );
    }

    // ── TOAST (уведомления) ────────────────────────────────
    function showToast(msg, type) {
        type = type || 'success';
        var container = document.getElementById('toastContainer');
        if (!container) return;

        var toast = document.createElement('div');
        toast.className = 'toast ' + type;
        toast.setAttribute('role', 'alert');
        toast.textContent = msg;
        container.appendChild(toast);

        requestAnimationFrame(function () { toast.classList.add('show'); });

        setTimeout(function () {
            toast.classList.remove('show');
            setTimeout(function () { toast.remove(); }, 400);
        }, 3500);
    }
    // выносим в глобальную область — нужны кнопкам с onclick="showToast(...)"
    window.showToast = showToast;

    // ── ЭФФЕКТ РЯБИ НА КНОПКАХ ─────────────────────────────
    function attachRipple() {
        Array.prototype.forEach.call(
            document.querySelectorAll('.btn, .cta-btn, .submit-btn'),
            function (btn) {
                btn.style.position = 'relative';
                btn.style.overflow = 'hidden';
                btn.addEventListener('click', function (e) {
                    var rect = btn.getBoundingClientRect();
                    var ripple = document.createElement('span');
                    ripple.style.position = 'absolute';
                    ripple.style.width = ripple.style.height = '24px';
                    ripple.style.background = 'rgba(255,255,255,.4)';
                    ripple.style.borderRadius = '50%';
                    ripple.style.transform = 'translate(-50%, -50%)';
                    ripple.style.left = (e.clientX - rect.left) + 'px';
                    ripple.style.top = (e.clientY - rect.top) + 'px';
                    ripple.style.pointerEvents = 'none';
                    btn.appendChild(ripple);
                    setTimeout(function () { ripple.remove(); }, 600);
                });
            }
        );
    }

    // ── ЛОГИКА ТАРИФОВ ─────────────────────────────────────
    // Кнопка «Выбрать тариф» → ведёт на страницу контактов
    // с уже выбранной услугой (?tariff=ip|ooo|fl|audit|consult)
    function attachTariffButtons() {
        Array.prototype.forEach.call(
            document.querySelectorAll('[data-tariff]'),
            function (btn) {
                btn.addEventListener('click', function () {
                    var tariff = btn.getAttribute('data-tariff');
                    var label = btn.getAttribute('data-tariff-name') || 'услуга';
                    var target = 'contact.html?tariff=' + encodeURIComponent(tariff);
                    // показываем подтверждение, пока переходим
                    showToast('Тариф «' + label + '» выбран. Заполните заявку — мы перезвоним.', 'success');
                    setTimeout(function () { window.location.href = target; }, 700);
                });
            }
        );
    }

    // Предзаполнение выпадающего списка услуг из ?tariff=
    function applyTariffFromUrl() {
        var params = new URLSearchParams(window.location.search);
        var tariff = params.get('tariff');
        var select = document.getElementById('service');
        if (!tariff || !select) return;

        var match = Array.prototype.find.call(select.options, function (opt) {
            return opt.value === tariff;
        });
        if (match) {
            select.value = tariff;
            // подсветить метку, т.к. значение уже выбрано
            var label = select.parentElement.querySelector('label');
            if (label) {
                label.style.top = '-.75rem';
                label.style.left = '.75rem';
                label.style.fontSize = '.75rem';
                label.style.color = 'var(--primary)';
            }
        }
    }

    // ── ОТПРАВКА ФОРМЫ НА ПОЧТУ ────────────────────────────
    /**
     * Логика «Оставить заявку»:
     * 1) Если в config.js заполнен formEndpoint — отправляем POST (fetch).
     *    Подойдёт любой сервис: Formspree / Getform / Web3Forms.
     * 2) Если endpoint пустой — открываем почтовую программу (mailto)
     *    с готовым письмом на адрес из config.email.
     */
    function submitRequest(formEl, fields) {
        var data = {};
        var valid = true;

        fields.forEach(function (f) {
            var inp = formEl.querySelector('[name="' + f.name + '"]');
            if (!inp) return;

            var val = (inp.value || '').trim();

            if (f.required !== false && !val) {
                valid = false;
                inp.classList.add('invalid');
                inp.focus();
            } else {
                inp.classList.remove('invalid');
            }

            if (f.name === 'phone') {
                data.phone = val.replace(/\D/g, '');
            } else {
                data[f.name] = val;
            }
        });

        if (!valid) {
            showToast('Пожалуйста, заполните все обязательные поля', 'error');
            return false;
        }

        var btn = formEl.querySelector('button[type="submit"]');
        var originalText = btn ? btn.textContent : '';
        if (btn) { btn.disabled = true; btn.textContent = 'Отправка…'; }

        // ── Способ 1: отправка на серверный endpoint ──
        if (cfg.formEndpoint) {
            return fetch(cfg.formEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(data)
            })
                .then(function (res) {
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    return res;
                })
                .then(function () {
                    showToast(cfg.successMessage || 'Спасибо! Заявка отправлена. Мы скоро перезвоним.');
                    formEl.reset();
                    if (btn) { btn.textContent = originalText; btn.disabled = false; }
                    try { localStorage.setItem('lastFormData', JSON.stringify(data)); } catch (e) {}
                    return true;
                })
                .catch(function (err) {
                    console.error('Endpoint error, fallback to mailto:', err);
                    // если сервер не ответил — пробуем через почту
                    mailtoFallback(formEl, data, btn, originalText);
                    return false;
                });
        }

        // ── Способ 2: mailto (работает без всяких регистраций) ──
        mailtoFallback(formEl, data, btn, originalText);
        return true;
    }

    function mailtoFallback(formEl, data, btn, originalText) {
        var email = cfg.email;

        if (!email) {
            showToast('Не указан email в config.js — некуда отправить заявку', 'error');
            if (btn) { btn.textContent = originalText; btn.disabled = false; }
            return;
        }

        var subject = encodeURIComponent('Заявка с сайта — ' + (data.name || 'без имени'));
        var body = encodeURIComponent(
            'Здравствуйте!\n\n' +
            'Получена заявка с сайта «Бухгалтерия Беларуси».\n\n' +
            '— Данные клиента —\n' +
            'Имя:        ' + (data.name || '—') + '\n' +
            'Телефон:    ' + (data.phone || '—') + '\n' +
            'Email:      ' + (data.email || '—') + '\n' +
            'Услуга:     ' + (data.service || '—') + '\n\n' +
            '— Комментарий —\n' +
            (data.message || '—') + '\n\n' +
            'Отправлено автоматически с сайта.'
        );

        showToast('Открывается почтовая программа — отправьте письмо, и мы вам перезвоним');
        window.location.href = 'mailto:' + email + '?subject=' + subject + '&body=' + body;

        formEl.reset();
        if (btn) { btn.textContent = originalText; btn.disabled = false; }
    }

    // ── МАСКА ТЕЛЕФОНА (+375) ──────────────────────────────
    function attachPhoneMask() {
        var phoneInput = document.getElementById('phone');
        if (!phoneInput) return;

        phoneInput.addEventListener('focus', function () {
            if (!this.value) this.value = '+375 ';
        });

        phoneInput.addEventListener('input', function (e) {
            var digits = e.target.value.replace(/\D/g, '');
            if (digits.indexOf('375') !== 0) return;

            digits = '375' + digits.slice(3);
            var rest = digits.slice(3);
            var out = '+375';

            if (rest.length) out += ' (' + rest.slice(0, 2);
            if (rest.length >= 2) out += ')';
            if (rest.length > 2) out += ' ' + rest.slice(2, 5);
            if (rest.length > 5) out += '-' + rest.slice(5, 7);
            if (rest.length > 7) out += '-' + rest.slice(7, 9);

            e.target.value = out;
        });
    }

    // ── РАБОЧИЕ ЧАСЫ (с подсветкой сегодняшнего дня) ────────
    function renderHours() {
        var host = document.getElementById('hoursList');
        if (!host) return;

        var days = [
            { d: 'Понедельник', h: '09:00 - 18:00' },
            { d: 'Вторник', h: '09:00 - 18:00' },
            { d: 'Среда', h: '09:00 - 18:00' },
            { d: 'Четверг', h: '09:00 - 18:00' },
            { d: 'Пятница', h: '09:00 - 18:00' },
            { d: 'Суббота', h: 'выходной' },
            { d: 'Воскресенье', h: 'выходной' }
        ];
        var today = (new Date().getDay() + 6) % 7;

        host.innerHTML = days.map(function (day, i) {
            return '<div class="hours-row' + (i === today ? ' today' : '') + '">' +
                '<span>' + day.d + '</span><span>' + day.h + '</span></div>';
        }).join('');
    }

    // ── ИНИЦИАЛИЗАЦИЯ ──────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {
        observeReveals();
        attachRipple();
        attachTariffButtons();
        attachPhoneMask();
        renderHours();
        applyTariffFromUrl();

        // подсветка активного пункта меню
        var here = window.location.pathname.split('/').pop() || 'index.html';
        Array.prototype.forEach.call(
            document.querySelectorAll('.nav-links a'),
            function (link) {
                var href = link.getAttribute('href');
                if (href === here || (here === '' && href === 'index.html')) {
                    link.classList.add('active');
                }
            }
        );

        // обработчик формы
        var form = document.querySelector('form[role="contact"]');
        if (form) {
            var fields = [
                { name: 'name', required: true },
                { name: 'phone', required: true },
                { name: 'email', required: false },
                { name: 'service', required: true },
                { name: 'message', required: true }
            ];
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                submitRequest(form, fields);
            });

            // снимаем подсветку ошибки при вводе
            Array.prototype.forEach.call(
                form.querySelectorAll('input, textarea, select'),
                function (el) {
                    el.addEventListener('input', function () {
                        el.classList.remove('invalid');
                    });
                }
            );
        }
    });
})();
