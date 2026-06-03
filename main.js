// 1. Cinematic Intro Preloader
        const _reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const INTRO_MIN_MS = _reducedMotion ? 120 : 650;
        const INTRO_MAX_MS = 1200;
        let _introStartTime = Date.now();
        let _introDone = false;

        function finishIntro() {
            if (_introDone) return;
            _introDone = true;
            // Remove skip listeners
            ['pointerdown','touchstart','wheel','keydown'].forEach(ev =>
                document.removeEventListener(ev, _onUserInteract, { capture: true })
            );
            const p = document.getElementById('preloader');
            if (p) {
                const prog = document.getElementById('loader-progress');
                if (prog) prog.style.width = '100%';
                p.classList.add('preloader-out');
                const delay = _reducedMotion ? 150 : 500;
                setTimeout(() => { p.style.display = 'none'; }, delay);
            }
            buildCarouselFromConfig().then(() => {
                createCarouselIndicators();
                updateCarousel();
            });
        }

        function hidePreloader() {
            const elapsed = Date.now() - _introStartTime;
            const remaining = INTRO_MIN_MS - elapsed;
            if (remaining > 0) {
                setTimeout(finishIntro, remaining);
            } else {
                finishIntro();
            }
        }

        function _onUserInteract() { finishIntro(); }
        ['pointerdown','touchstart','wheel','keydown'].forEach(ev =>
            document.addEventListener(ev, _onUserInteract, { once: false, capture: true, passive: true })
        );
        window.__skipIntro = finishIntro;

        document.addEventListener('DOMContentLoaded', hidePreloader);
        setTimeout(finishIntro, INTRO_MAX_MS);

        // 2. Share API & Copy URL
        function shareWebsite(btn) {
            if (navigator.share) {
                navigator.share({ title: 'HCF - 新竹格鬥運動館', text: '新竹最強格鬥運動館！這輩子，總要為自己贏一次！現在預約體驗只要 $400，一起來變強吧🥊', url: window.location.href }).catch(err => console.log('Share failed:', err));
            } else {
                navigator.clipboard.writeText(window.location.href).then(() => {
                    const originalText = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-check mr-1"></i> 網址已複製！'; btn.classList.remove('bg-blue-600', 'hover:bg-blue-500'); btn.classList.add('bg-green-600', 'hover:bg-green-500');
                    setTimeout(() => { btn.innerHTML = originalText; btn.classList.remove('bg-green-600', 'hover:bg-green-500'); btn.classList.add('bg-blue-600', 'hover:bg-blue-500'); }, 2000);
                }).catch(() => {
                    const tempInput = document.createElement('input'); tempInput.value = window.location.href; document.body.appendChild(tempInput); tempInput.select(); document.execCommand('copy'); document.body.removeChild(tempInput);
                    const originalText = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-check mr-1"></i> 網址已複製！'; btn.classList.remove('bg-blue-600', 'hover:bg-blue-500'); btn.classList.add('bg-green-600', 'hover:bg-green-500');
                    setTimeout(() => { btn.innerHTML = originalText; btn.classList.remove('bg-green-600', 'hover:bg-green-500'); btn.classList.add('bg-blue-600', 'hover:bg-blue-500'); }, 2000);
                });
            }
        }

        // 3. Visual Effects (Cursor, Mouse Glow, Canvas)
        const mouseGlow = document.getElementById('mouse-glow-effect');
        const cursorDot = document.getElementById('cursor-dot');
        const cursorRing = document.getElementById('cursor-ring');
        const parallaxElements = document.querySelectorAll('.parallax-bg');
        let isTickingGlobal = false; let mouseX = 0, mouseY = 0; let ringX = 0, ringY = 0;
        
        if (window.matchMedia("(pointer: fine)").matches) {
            let cursorAnimRunning = false;
            let cursorIdleTimer;
            function animateCursor() {
                if (!cursorAnimRunning) return;
                ringX += (mouseX - ringX) * 0.15; ringY += (mouseY - ringY) * 0.15;
                if(cursorRing) cursorRing.style.transform = `translate(calc(-50% + ${ringX}px), calc(-50% + ${ringY}px))`;
                if(cursorDot) cursorDot.style.transform = `translate(calc(-50% + ${mouseX}px), calc(-50% + ${mouseY}px))`;
                requestAnimationFrame(animateCursor);
            }

            window.addEventListener('mousemove', (e) => {
                mouseX = e.clientX; mouseY = e.clientY;
                if (!cursorAnimRunning) { cursorAnimRunning = true; requestAnimationFrame(animateCursor); }
                clearTimeout(cursorIdleTimer);
                cursorIdleTimer = setTimeout(() => { cursorAnimRunning = false; }, 500);
                if (!isTickingGlobal) {
                    window.requestAnimationFrame(() => {
                        mouseGlow.style.opacity = '1';
                        mouseGlow.style.setProperty('--mouse-x', `${mouseX}px`);
                        mouseGlow.style.setProperty('--mouse-y', `${mouseY}px`);
                        isTickingGlobal = false;
                    });
                    isTickingGlobal = true;
                }
            });

            const interactiveElements = document.querySelectorAll('a, button, input, summary, .cursor-pointer, .tech-border');
            interactiveElements.forEach(el => {
                el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
                el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
            });

            window.addEventListener('mouseleave', () => { mouseGlow.style.opacity = '0'; if(cursorDot) cursorDot.style.opacity = '0'; if(cursorRing) cursorRing.style.opacity = '0'; });
            window.addEventListener('mouseenter', () => { if(cursorDot) cursorDot.style.opacity = '1'; if(cursorRing) cursorRing.style.opacity = '1'; });

            document.querySelectorAll('.tech-border').forEach(card => {
                const overlay = document.createElement('div'); overlay.classList.add('glow-overlay'); card.appendChild(overlay);
                let isTickingCard = false;
                card.addEventListener('mousemove', e => {
                    if (!isTickingCard) {
                        window.requestAnimationFrame(() => {
                            const rect = card.getBoundingClientRect();
                            card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
                            card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
                            isTickingCard = false;
                        });
                        isTickingCard = true;
                    }
                });
            });

            window.addEventListener('scroll', () => {
                const scrolled = window.scrollY;
                parallaxElements.forEach(el => {
                    const speed = el.getAttribute('data-speed') || 0.1;
                    const yPos = -(scrolled * speed);
                    el.style.transform = `translateY(${yPos}px)`;
                });
            }, { passive: true });

            const canvas = document.getElementById('bg-canvas'); const ctx = canvas.getContext('2d');
            let cachedCyanRgb = '';
            function updateCachedColors() { cachedCyanRgb = getComputedStyle(document.documentElement).getPropertyValue('--theme-cyan-rgb').trim(); }
            let w, h, pts = [];
            function resize() { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }
            class P {
                constructor() { this.x=Math.random()*w; this.y=Math.random()*h; this.vx=(Math.random()-.5)*0.2; this.vy=(Math.random()-.5)*0.2; this.s=Math.random()*1.5; }
                update() { this.x+=this.vx; this.y+=this.vy; if(this.x<0||this.x>w)this.vx*=-1; if(this.y<0||this.y>h)this.vy*=-1; }
                draw() { ctx.beginPath(); ctx.arc(this.x,this.y,this.s,0,Math.PI*2); ctx.fillStyle=`rgba(${cachedCyanRgb},0.15)`; ctx.fill(); }
            }
            function init() { resize(); updateCachedColors(); pts=[]; const isMobile = window.innerWidth < 768; const isTablet = window.innerWidth < 1024; const particleCount = isMobile ? 0 : (isTablet ? 15 : 40); for(let i=0;i<particleCount;i++) pts.push(new P()); }
            let animRunning = true;
            function anim() {
                if (!animRunning) return;
                ctx.clearRect(0,0,w,h); ctx.strokeStyle=`rgba(${cachedCyanRgb},0.03)`; ctx.lineWidth=0.5;
                for(let i=0;i<pts.length;i++){ for(let j=i+1;j<pts.length;j++){ const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y; if(dx*dx+dy*dy<10000){ ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);ctx.stroke(); } } }
                pts.forEach(p=>{p.update();p.draw();}); requestAnimationFrame(anim);
            }
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) { animRunning = false; }
                else { animRunning = true; requestAnimationFrame(anim); }
            });
            window.addEventListener('resize', init); init(); anim();
        }

        // 4. Mobile Menu & Drawers
        const mm = document.getElementById('mobile-menu'), bd = document.getElementById('brand-drawer'), db = document.getElementById('drawer-backdrop');
        function toggleMobileMenu() { if (!bd.classList.contains('-translate-x-full')) bd.classList.add('-translate-x-full'); if (mm.classList.contains('translate-x-full')) { db.classList.remove('hidden'); setTimeout(()=>db.classList.remove('opacity-0'),10); mm.classList.remove('translate-x-full'); document.body.style.overflow = 'hidden'; } else { closeAllDrawers(); } }
        function toggleBrandDrawer() { if (!mm.classList.contains('translate-x-full')) mm.classList.add('translate-x-full'); if (bd.classList.contains('-translate-x-full')) { db.classList.remove('hidden'); setTimeout(()=>db.classList.remove('opacity-0'),10); bd.classList.remove('-translate-x-full'); document.body.style.overflow = 'hidden'; } else { closeAllDrawers(); } }
        function handleLogoClick() { toggleBrandDrawer(); }
        function closeAllDrawers() { mm.classList.add('translate-x-full'); bd.classList.add('-translate-x-full'); db.classList.add('opacity-0'); setTimeout(()=>db.classList.add('hidden'),300); document.body.style.overflow = ''; }

        // 5. Scroll Reveal & Navbar Shrink
        const revealObserver = new IntersectionObserver((entries) => { entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('active'); revealObserver.unobserve(entry.target); } }); }, { threshold: 0.1 });
        document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
        
        const rocketBtn = document.getElementById('rocket-top'), nav = document.getElementById('navbar');
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) { nav.classList.add('bg-black/90','backdrop-blur-md','border-b','border-white/10'); nav.classList.remove('py-4'); nav.classList.add('py-2'); } 
            else { nav.classList.remove('bg-black/90','backdrop-blur-md','border-b','border-white/10','py-2'); nav.classList.add('py-4'); }
            if (window.scrollY > 500) { rocketBtn.classList.remove('opacity-0','translate-y-20'); } else { rocketBtn.classList.add('opacity-0','translate-y-20'); }
        }, { passive: true });
        function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

        // 6. Language & Theme Toggles
        let currentLang = localStorage.getItem('hcf_lang') || 'zh';
        langTexts = { zh: { label: "EN/中", mobileLabel: "EN" }, en: { label: "中/EN", mobileLabel: "中" } };
        let i18nCache = {};
        async function loadLanguage(lang) {
            if (i18nCache[lang]) return i18nCache[lang];
            try {
                const res = await fetch(`/i18n/${lang}.json`);
                if (res.ok) { i18nCache[lang] = await res.json(); }
            } catch(e) { console.warn('i18n load failed:', e); }
            return i18nCache[lang] || {};
        }
        function getNestedValue(obj, key) {
            return key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
        }
        function applyI18nData(data) {
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const val = getNestedValue(data, el.dataset.i18n);
                if (val !== undefined) el.innerHTML = val;
            });
        }
        function toggleLanguage() { currentLang = currentLang === 'zh' ? 'en' : 'zh'; localStorage.setItem('hcf_lang', currentLang); loadLanguage(currentLang).then(applyI18nData).catch(e => console.warn('i18n apply failed:', e)); applyLanguage(); }
        function applyLanguage() {
            document.querySelectorAll('.lang-text').forEach(el => {
                el.style.opacity = '0';
                setTimeout(() => {
                    if (currentLang === 'zh') { if (el.dataset.zh) el.innerHTML = el.dataset.zh; }
                    else { if (!el.dataset.zh) el.dataset.zh = el.innerHTML; el.innerHTML = el.dataset.en; }
                    el.style.opacity = '1';
                }, 150);
            });
            const ll = document.getElementById('lang-label'); if(ll) ll.innerText = langTexts[currentLang].label;
            const ml = document.getElementById('mobile-lang-label'); if(ml) ml.innerText = langTexts[currentLang].mobileLabel;
        }
        loadLanguage(currentLang).then(data => { if (currentLang !== 'zh') applyI18nData(data); }).catch(e => console.warn('i18n init failed:', e));
        function setTheme(theme) {
            document.documentElement.classList.add('theme-transitioning');
            if(theme === 'default') { document.documentElement.removeAttribute('data-theme'); localStorage.removeItem('hcf_theme'); } 
            else { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('hcf_theme', theme); }
            const stp = document.getElementById('secret-theme-panel');
            if (stp) stp.classList.add('hidden');
            setTimeout(() => document.documentElement.classList.remove('theme-transitioning'), 400);
            updateCachedColors();
        }

        // 7. Carousel Engine
        async function buildCarouselFromConfig() {
            const inner = document.querySelector('.carousel-inner');
            if (!inner) return;
            const v = '20260323';
            let config;
            try {
                const resp = await fetch('carousel-config.json');
                if (!resp.ok) throw new Error(`Failed to fetch carousel config: ${resp.status}`);
                config = await resp.json();
            } catch (e) {
                config = { slides: [{ type: 'image', src: 'hero1.jpg', alt: 'HCF Combat' }] };
            }
            const gradient = '<div class="absolute inset-x-0 bottom-0 h-3/5 sm:h-2/5 bg-gradient-to-t from-sci-base via-sci-base/90 to-transparent pointer-events-none"></div>';
            const fragment = document.createDocumentFragment();
            config.slides.forEach((slide, i) => {
                const isFirst = i === 0;
                const div = document.createElement('div');
                div.className = 'carousel-item absolute inset-0 transition-opacity duration-1000 ' + (isFirst ? 'opacity-100 z-10 active' : 'opacity-0 z-0') + ' bg-sci-base';
                if (slide.type === 'video') {
                    const isMobileDevice = window.innerWidth < 768;
                    const isSlowConn = navigator.connection ? (navigator.connection.saveData || ['slow-2g','2g','3g'].includes(navigator.connection.effectiveType)) : false;
                    const video = document.createElement('video');
                    if (isFirst) video.id = 'hero-video';
                    video.src = slide.src + '?v=' + v;
                    if (slide.poster) video.poster = slide.poster;
                    video.muted = true;
                    video.setAttribute('playsinline', '');
                    video.setAttribute('decoding', 'async');
                    if (isFirst) {
                        if (isMobileDevice || isSlowConn) {
                            video.setAttribute('preload', 'none');
                        } else {
                            video.setAttribute('preload', 'metadata');
                            video.setAttribute('autoplay', '');
                        }
                    } else {
                        video.setAttribute('preload', 'none');
                    }
                    video.className = 'w-full h-full object-cover filter brightness-[0.85] contrast-110 saturate-105';
                    div.appendChild(video);
                } else {
                    const img = document.createElement('img');
                    img.src = slide.src + '?v=' + v;
                    img.alt = slide.alt || '';
                    img.width = 1920;
                    img.height = 1080;
                    img.setAttribute('loading', isFirst ? 'eager' : 'lazy');
                    img.setAttribute('decoding', 'async');
                    if (slide.fallback) img.dataset.fallback = slide.fallback;
                    img.className = 'w-full h-full object-cover filter brightness-[0.85] contrast-110 saturate-105';
                    div.appendChild(img);
                }
                div.insertAdjacentHTML('beforeend', gradient);
                fragment.appendChild(div);
            });
            inner.insertBefore(fragment, inner.firstChild);
            slides = document.querySelectorAll('.carousel-item');
        }

        let currentCarouselIndex = 0;
        let slides = [];
        const container = document.getElementById('carousel-indicators');
        let slideTimer;

        function createCarouselIndicators() {
            if(container && slides.length > 0) {
                slides.forEach((_, i) => {
                    const btn = document.createElement('button');
                    btn.onclick = () => goToSlide(i);
                    container.appendChild(btn);
                });
            }
        }

        function updateCarousel() {
            slides.forEach((slide, index) => {
                if (index === currentCarouselIndex) { slide.classList.remove('opacity-0', 'z-0'); slide.classList.add('opacity-100', 'z-10', 'active'); } 
                else { slide.classList.remove('opacity-100', 'z-10', 'active'); slide.classList.add('opacity-0', 'z-0'); }
            });
            if(container) {
                Array.from(container.children).forEach((btn, index) => {
                    btn.className = index === currentCarouselIndex ? 'w-6 h-1 sm:w-8 sm:h-1.5 rounded-full bg-sci-cyan shadow-[0_0_8px_rgba(var(--theme-cyan-rgb),0.8)] transition-all' : 'w-6 h-1 sm:w-8 sm:h-1.5 rounded-full bg-white/30 hover:bg-white/60 transition-all';
                });
            }
            manageSlideDuration(); 
        }

        function manageSlideDuration() {
            clearTimeout(slideTimer);
            if(slides.length === 0) return;
            const currentSlide = slides[currentCarouselIndex];
            const video = currentSlide.querySelector('video');
            
            slides.forEach(s => {
                const v = s.querySelector('video');
                if (v && v !== video) { v.pause(); v.currentTime = 0; v.removeEventListener('ended', nextSlide); }
            });

            if (video) {
                video.currentTime = 0;
                // catch error if local video file is missing
                const playPromise = video.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => { slideTimer = setTimeout(nextSlide, 5000); });
                }
                video.removeEventListener('ended', nextSlide); 
                video.addEventListener('ended', nextSlide);
            } else {
                slideTimer = setTimeout(nextSlide, 6000); 
            }
        }

        function nextSlide() { currentCarouselIndex = (currentCarouselIndex + 1) % slides.length; updateCarousel(); }
        function prevSlide() { currentCarouselIndex = (currentCarouselIndex - 1 + slides.length) % slides.length; updateCarousel(); }
        function goToSlide(index) { currentCarouselIndex = index; updateCarousel(); }
        
        if(document.getElementById('next-slide')) document.getElementById('next-slide').addEventListener('click', nextSlide);
        if(document.getElementById('prev-slide')) document.getElementById('prev-slide').addEventListener('click', prevSlide);

        // Touch swipe support for mobile carousel
        (function() {
            const carouselEl = document.querySelector('.carousel-inner');
            if (!carouselEl) return;
            const MIN_SWIPE_DISTANCE = 50;
            const MAX_VERTICAL_DRIFT = 100;
            let touchStartX = 0, touchStartY = 0, touchEndX = 0;
            carouselEl.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
                touchStartY = e.changedTouches[0].screenY;
            }, { passive: true });
            carouselEl.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].screenX;
                const diffX = touchStartX - touchEndX;
                const diffY = Math.abs(e.changedTouches[0].screenY - touchStartY);
                if (Math.abs(diffX) > MIN_SWIPE_DISTANCE && diffY < MAX_VERTICAL_DRIFT) {
                    if (diffX > 0) nextSlide();
                    else prevSlide();
                }
            }, { passive: true });
        })();

        // 8. BGM
        const bgm = document.getElementById('bgm-audio'), biD = document.getElementById('bgm-icon');
        let isMusicPlaying = false;
        function toggleBGM() {
            if (isMusicPlaying) {
                bgm.pause();
                isMusicPlaying = false;
                if(biD) { biD.classList.remove('fa-volume-high'); biD.classList.add('fa-volume-xmark'); }
            } else {
                bgm.play().then(() => {
                    isMusicPlaying = true;
                    if(biD) { biD.classList.remove('fa-volume-xmark'); biD.classList.add('fa-volume-high'); }
                    const hv = document.getElementById('hero-video'), vi = document.getElementById('video-sound-icon'), mvi = document.getElementById('menu-video-sound-icon');
                    if(hv && !hv.muted) { hv.muted = true; if(vi) { vi.classList.remove('fa-volume-high'); vi.classList.add('fa-volume-xmark'); } if(mvi) { mvi.classList.remove('fa-volume-high'); mvi.classList.add('fa-volume-xmark'); } const svi = document.getElementById('shark-video-sound-icon'); if(svi) { svi.classList.remove('fa-volume-high'); svi.classList.add('fa-volume-xmark'); }
                        const toast = document.getElementById('custom-toast'); const toastMsg = document.getElementById('toast-msg');
                        if (toast && toastMsg) { toastMsg.textContent = '🔇 影片已靜音，背景音樂播放中'; toast.style.opacity = '1'; toast.style.pointerEvents = 'auto'; setTimeout(() => { toast.style.opacity = '0'; toast.style.pointerEvents = 'none'; }, 2000); }
                    }
                }).catch(() => {
                    isMusicPlaying = false;
                    if(biD) { biD.classList.remove('fa-volume-high'); biD.classList.add('fa-volume-xmark'); }
                });
            }
        }
        function toggleVideoSound() {
            const hv = document.getElementById('hero-video'), vi = document.getElementById('video-sound-icon'), mvi = document.getElementById('menu-video-sound-icon'), svi = document.getElementById('shark-video-sound-icon');
            if (hv) {
                hv.muted = !hv.muted;
                if (hv.muted) {
                    if(vi) { vi.classList.remove('fa-volume-high'); vi.classList.add('fa-volume-xmark'); }
                    if(mvi) { mvi.classList.remove('fa-volume-high'); mvi.classList.add('fa-volume-xmark'); }
                    if(svi) { svi.classList.remove('fa-volume-high'); svi.classList.add('fa-volume-xmark'); }
                } else {
                    if(vi) { vi.classList.remove('fa-volume-xmark'); vi.classList.add('fa-volume-high'); }
                    if(mvi) { mvi.classList.remove('fa-volume-xmark'); mvi.classList.add('fa-volume-high'); }
                    if(svi) { svi.classList.remove('fa-volume-xmark'); svi.classList.add('fa-volume-high'); }
                    if (isMusicPlaying) toggleBGM();
                }
            }
        }
        // 9. Auto-play BGM on first user interaction
        // [DISABLED] 已停用自動播放 BGM — 用戶觸碰螢幕不再自動播放音樂
        // BGM 仍可通過手動點擊 toggleBGM() 按鈕來播放
        /*
        (function() {
            let bgmAutoStarted = false;
            function autoStartBGM() {
                if (bgmAutoStarted || isMusicPlaying) return;
                bgmAutoStarted = true;
                const bgmAudio = document.getElementById('bgm-audio');
                if (bgmAudio) {
                    bgmAudio.play().then(() => {
                        isMusicPlaying = true;
                        const icon = document.getElementById('bgm-icon');
                        if (icon) { icon.classList.remove('fa-volume-xmark'); icon.classList.add('fa-volume-high'); }
                        const sharkIcon = document.getElementById('shark-bgm-icon');
                        if (sharkIcon) { sharkIcon.classList.remove('fa-volume-xmark'); sharkIcon.classList.add('fa-volume-high'); }
                    }).catch(() => {
                        isMusicPlaying = false;
                        bgmAutoStarted = false;
                    });
                }
            }
            document.addEventListener('touchstart', autoStartBGM, { once: true, passive: true });
            document.addEventListener('click', autoStartBGM, { once: true });
        })();
        */
        // 10. Countdown Timers (News Event & FOMO Pricing)
        function updateCountdowns() {
            const now = new Date();
            
            // Event Countdown (April 26 - SuperD Muay Thai)
            let ey = now.getFullYear(); const eventDate = new Date(ey, 3, 26, 10, 0, 0); if(now>eventDate) ey++;
            const eDist = new Date(ey, 3, 26, 10, 0, 0).getTime() - now.getTime();
            if(document.getElementById("days")) {
                document.getElementById("days").innerText = String(Math.floor(eDist / 86400000)).padStart(2,'0');
                document.getElementById("hours").innerText = String(Math.floor((eDist % 86400000) / 3600000)).padStart(2,'0');
                document.getElementById("minutes").innerText = String(Math.floor((eDist % 3600000) / 60000)).padStart(2,'0');
                document.getElementById("seconds").innerText = String(Math.floor((eDist % 60000) / 1000)).padStart(2,'0');
                if(document.getElementById("event-days")) document.getElementById("event-days").innerText = String(Math.floor(eDist / 86400000)).padStart(2,'0');
                if(document.getElementById("event-hours")) document.getElementById("event-hours").innerText = String(Math.floor((eDist % 86400000) / 3600000)).padStart(2,'0');
            }

            // FOMO Pricing Countdown (Fixed promotional deadline - update this date for each campaign)
            const fomoDate = new Date('2026-04-30T23:59:59+08:00').getTime();
            const fDist = fomoDate - now.getTime();
            if (document.getElementById('fomo-hours')) {
                if (fDist > 0) {
                    document.getElementById('fomo-hours').innerText = String(Math.floor((fDist % 86400000) / 3600000)).padStart(2,'0');
                    document.getElementById('fomo-mins').innerText = String(Math.floor((fDist % 3600000) / 60000)).padStart(2,'0');
                    document.getElementById('fomo-secs').innerText = String(Math.floor((fDist % 60000) / 1000)).padStart(2,'0');
                } else {
                    const fomoEl = document.getElementById('fomo-hours').closest('[id]') || document.getElementById('fomo-hours').parentElement;
                    if (fomoEl) fomoEl.textContent = '🔥 優惠已結束';
                }
            }
        }
        setInterval(updateCountdowns, 1000); updateCountdowns();

        // 11. AI Chat Systems
        // Floating Shark (Bottom Right)
        let it = 0, co = false; 
        const ais = document.getElementById('ai-system'), zm = document.getElementById('zzz-mark'), ab = document.getElementById('angry-bubble');
        async function askShark(question) {
            const hBox = document.getElementById('ai-chat-history');
            hBox.innerHTML += `<div class="bg-sci-cyan/20 text-sci-cyan p-2.5 rounded-lg rounded-tr-none ml-auto w-fit border border-sci-cyan/30 mt-3 max-w-[80%] text-[11px] sm:text-xs">${question}</div>`;
            hBox.scrollTop = hBox.scrollHeight;
            const lid = 'loading-' + Date.now();
            hBox.innerHTML += `<div id="${lid}" class="bg-white/10 p-2.5 rounded-lg rounded-tl-none border border-white/5 mt-3 max-w-[85%] text-gray-400 text-[11px] sm:text-xs flex items-center gap-2"><i class="fa-solid fa-circle-notch fa-spin text-sci-cyan"></i> 運算中...</div>`;
            hBox.scrollTop = hBox.scrollHeight;
            try {
                const res = await fetch('/.netlify/functions/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: question }) });
                const data = await res.json();
                const reply = data.reply || '⚠️ 請直接點擊下方 LINE 找真人客服！';
                const engineBadge = data.engine ? `<span class="ml-1 text-[9px] opacity-40">[${data.engine}]</span>` : '';
                document.getElementById(lid).outerHTML = `<div class="bg-[#0f131a] p-3 rounded-lg rounded-tl-none border border-sci-cyan/30 mt-3 max-w-[90%] text-gray-100 text-[11px] sm:text-xs leading-relaxed shadow-[0_0_15px_rgba(var(--theme-cyan-rgb),0.1)]">${reply}${engineBadge}</div>`;
            } catch (e) {
                document.getElementById(lid).outerHTML = `<div class="bg-[#0f131a] p-3 rounded-lg rounded-tl-none border border-sci-cyan/30 mt-3 max-w-[90%] text-gray-100 text-[11px] sm:text-xs leading-relaxed">⚠️ 鯊魚教練去打沙包了！請點擊下方 LINE 找真人客服！🥊</div>`;
            }
            hBox.scrollTop = hBox.scrollHeight;
        }
        function sendUserMessage() { const input = document.getElementById('ai-user-input'); const val = input.value.trim(); if (val !== "") { askShark(val); input.value = ""; } }
        function resetIt() { if(co)return; it=0; ais.classList.remove('ai-sleeping','ai-angry'); zm.style.display='none'; ab.style.display='none'; }
        window.addEventListener('touchstart', resetIt, { passive: true }); window.addEventListener('scroll', resetIt, { passive: true });
        setInterval(() => { if(co)return; it++; if(it===5){ ais.classList.add('ai-sleeping'); zm.style.display='block'; } if(it===10){ ais.classList.remove('ai-sleeping'); zm.style.display='none'; ais.classList.add('ai-angry'); ab.style.display='block'; } }, 1000);
        function toggleChat() { co = !co; const cb = document.getElementById('ai-chat-box'); if(co){ cb.style.display='block'; resetIt(); } else { cb.style.display='none'; resetIt(); } }
        // Mascot Button: Mobile tap = open menu, long-press = open AI chat; Desktop = open AI chat
        (function() {
            var btn = document.getElementById("ai-mascot-btn");
            if (!btn) return;
            var longPressTimer = null;
            var isLongPress = false;
            var hasTouched = false;
            btn.addEventListener("touchstart", function() {
                hasTouched = true;
                isLongPress = false;
                longPressTimer = setTimeout(function() {
                    isLongPress = true;
                    toggleChat();
                }, 600);
            }, { passive: true });
            btn.addEventListener("touchend", function(e) {
                clearTimeout(longPressTimer);
                e.preventDefault();
                if (!isLongPress) {
                    toggleMobileMenu();
                }
            });
            btn.addEventListener("touchcancel", function() {
                clearTimeout(longPressTimer);
            }, { passive: true });
            btn.addEventListener("click", function() {
                if (!hasTouched) { toggleChat(); }
                setTimeout(function() { hasTouched = false; }, 300);
            });
        })();

        // ═══ APP 模式偵測 ═══
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
          || window.navigator.standalone === true
          || document.referrer.includes('android-app://');

        if (false) { // HCF：手機與 App 統一頂部導覽列（左上 LOGO／右上漢堡），停用底部 Tab Bar
          document.documentElement.classList.add('pwa-mode');

          const navbar = document.querySelector('nav');
          if (navbar) navbar.style.display = 'none';

          const tabBar = document.createElement('nav');
          tabBar.id = 'app-tab-bar';
          const p = location.pathname;
          tabBar.innerHTML = `
            <a href="/index.html" class="${p === '/index.html' || p === '/' ? 'active' : ''}">
              <i class="fa-solid fa-house"></i><span>首頁</span>
            </a>
            <a href="/classes.html" class="${p.includes('classes') ? 'active' : ''}">
              <i class="fa-solid fa-dumbbell"></i><span>課程</span>
            </a>
            <a href="https://www.fit-book.com.tw/hsinchucombat/plan/588" target="_blank" rel="noopener noreferrer" class="tab-cta">
              <i class="fa-solid fa-bolt"></i><span>預約體驗</span>
            </a>
            <a href="/team.html" class="${p.includes('team') ? 'active' : ''}">
              <i class="fa-solid fa-users"></i><span>教練</span>
            </a>
            <a href="/news.html" class="${p.includes('news') || p.includes('faq') || p.includes('pricing') || p.includes('philosophy') ? 'active' : ''}">
              <i class="fa-solid fa-newspaper"></i><span>更多</span>
            </a>
          `;
          document.body.appendChild(tabBar);

          const statusBar = document.createElement('div');
          statusBar.id = 'pwa-status-bar';
          document.body.prepend(statusBar);

          const installBtn = document.getElementById('install-app-btn');
          if (installBtn) installBtn.style.display = 'none';

          const rocket = document.getElementById('rocket-top');
          if (rocket) rocket.style.display = 'none';
        }

        // ═══ PWA 安裝引導（取代舊的小按鈕） ═══
        let deferredPrompt;
        const installAppBtn = document.getElementById('install-app-btn');

        window.addEventListener('beforeinstallprompt', (e) => {
          e.preventDefault();
          deferredPrompt = e;
          if (installAppBtn) installAppBtn.classList.remove('hidden');

          if (!isStandalone && !localStorage.getItem('hcf-install-dismissed')) {
            setTimeout(() => {
              const banner = document.createElement('div');
              banner.id = 'install-banner';
              banner.innerHTML = `
                <img src="shark_logo.png" alt="HCF" style="width:48px;height:48px;border-radius:12px;">
                <div style="flex:1;">
                  <div style="color:white;font-size:14px;font-weight:900;letter-spacing:2px;">安裝 HCF APP</div>
                  <div style="color:#888;font-size:11px;margin-top:2px;">加到主畫面，秒開體驗</div>
                </div>
                <button id="banner-install-btn" style="padding:10px 20px;background:#00f0ff;color:black;font-weight:900;font-size:12px;letter-spacing:2px;border:none;border-radius:8px;cursor:pointer;">安裝</button>
                <button id="banner-close-btn" style="background:none;border:none;color:#666;font-size:18px;cursor:pointer;padding:8px;">✕</button>
              `;
              banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:210;background:rgba(3,3,3,0.97);backdrop-filter:blur(20px);border-top:2px solid rgba(0,240,255,0.3);padding:16px 20px calc(16px + env(safe-area-inset-bottom));display:flex;align-items:center;gap:14px;animation:slideUpBanner 0.5s ease-out;box-shadow:0 -10px 40px rgba(0,0,0,0.8);';
              document.body.appendChild(banner);

              document.getElementById('banner-install-btn').addEventListener('click', async () => {
                if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; }
                banner.remove();
              });
              document.getElementById('banner-close-btn').addEventListener('click', () => {
                localStorage.setItem('hcf-install-dismissed', 'true');
                banner.remove();
              });
            }, 5000);
          }
        });

        if (installAppBtn) {
          installAppBtn.addEventListener('click', async () => {
            if (deferredPrompt) { deferredPrompt.prompt(); const { outcome } = await deferredPrompt.userChoice; if (outcome === 'accepted') { installAppBtn.classList.add('hidden'); } deferredPrompt = null; }
          });
        }

        document.addEventListener('DOMContentLoaded', () => { 
            if(currentLang==='en') applyLanguage(); 
        });

        // === Multi-Device Optimizations ===

        // A. Device Capability Detection
        const deviceCapabilities = {
            isLowMemory: navigator.deviceMemory !== undefined && navigator.deviceMemory < 4,
            isSlowConnection: navigator.connection ? (navigator.connection.saveData || ['slow-2g','2g','3g'].includes(navigator.connection.effectiveType)) : false,
            isTouchDevice: ('ontouchstart' in window) || (navigator.maxTouchPoints > 0),
            isMobile: window.innerWidth < 480,
            isTablet: window.innerWidth >= 481 && window.innerWidth <= 1024,
        };

        if (deviceCapabilities.isLowMemory || deviceCapabilities.isSlowConnection) {
            document.documentElement.classList.add('low-power-mode');
            document.querySelectorAll('.parallax-bg').forEach(el => { el.style.position = 'static'; el.style.transform = 'none'; });
        }

        // B. Lazy Video Loading via IntersectionObserver
        if ('IntersectionObserver' in window) {
            const lazyVideos = document.querySelectorAll('video[data-lazy-src]');
            const videoObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const video = entry.target;
                        if (!video.src && video.dataset.lazySrc) {
                            video.src = video.dataset.lazySrc;
                            video.load();
                        }
                        videoObserver.unobserve(video);
                    }
                });
            }, { rootMargin: '200px' });
            lazyVideos.forEach(video => videoObserver.observe(video));
        }

        // C. Mobile: Scroll-based CTA bar visibility
        (function() {
            const ctaBar = document.getElementById('mobile-cta-bar');
            if (!ctaBar || window.innerWidth >= 640) return;
            let lastScrollPos = 0;
            window.addEventListener('scroll', () => {
                const currentScrollPos = window.scrollY;
                ctaBar.style.opacity = currentScrollPos > lastScrollPos && currentScrollPos > 100 ? '0.4' : '1';
                lastScrollPos = currentScrollPos;
            }, { passive: true });
        })();

        // D. iOS: Prevent auto-zoom on input focus (ensure 16px min font)
        if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            document.querySelectorAll('input, textarea, select').forEach(el => {
                if (parseFloat(window.getComputedStyle(el).fontSize) < 16) {
                    el.style.fontSize = '16px';
                }
            });
        }

        // E. Touch: Close chat box when tapping outside (mobile mis-tap prevention)
        (function() {
            const chatBox = document.getElementById('ai-chat-box');
            const mascotImg = document.querySelector('.ai-mascot-img');
            if (!chatBox || !mascotImg) return;
            document.addEventListener('touchend', (e) => {
                if (chatBox.style.display !== 'none' && chatBox.style.display !== '' &&
                    !chatBox.contains(e.target) && !mascotImg.contains(e.target)) {
                    toggleChat();
                }
            }, { passive: true });
        })();

        // F. Tablet: Touch feedback on cards and buttons
        if (deviceCapabilities.isTouchDevice && !deviceCapabilities.isMobile) {
            document.querySelectorAll('.tech-border, button').forEach(el => {
                el.addEventListener('touchstart', () => { el.style.transform = 'scale(0.98)'; }, { passive: true });
                el.addEventListener('touchend', () => { el.style.transform = ''; }, { passive: true });
            });
        }

        // G. Desktop: Smooth scroll for anchor links
        if (window.innerWidth > 1024) {
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function(e) {
                    const href = this.getAttribute('href');
                    if (href === '#') return;
                    const target = document.querySelector(href);
                    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
                });
            });
            // Staggered reveal animation delays
            document.querySelectorAll('.reveal').forEach((el, i) => {
                el.style.transitionDelay = (i * 60) + 'ms';
            });
        }
    
        // 統一圖片錯誤處理
        document.querySelectorAll('img[data-fallback]').forEach(function(img) {
            img.addEventListener('error', function() {
                if (this.dataset.fallback && this.src !== this.dataset.fallback) {
                    this.src = this.dataset.fallback;
                }
            }, { once: true });
        });
        // === 數字計數器動畫 ===
        function animateCounter(el) {
            const target = parseInt(el.getAttribute('data-count'));
            if (isNaN(target)) return;
            const suffix = el.getAttribute('data-suffix') || '';
            const duration = 2000;
            const step = target / (duration / 16);
            let current = 0;
            const timer = setInterval(() => {
                current += step;
                if (current >= target) { current = target; clearInterval(timer); }
                el.textContent = Math.floor(current).toLocaleString() + suffix;
            }, 16);
        }
        const counterObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.dataset.animated) {
                    entry.target.dataset.animated = 'true';
                    animateCounter(entry.target);
                }
            });
        }, { threshold: 0.5 });
        document.querySelectorAll('[data-count]').forEach(el => counterObserver.observe(el));

        // === Stagger 交錯進場動畫 ===
        const staggerObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    staggerObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
        document.querySelectorAll('.stagger-item').forEach(el => staggerObserver.observe(el));

        // === 磁吸按鈕效果（桌面版） ===
        if (window.matchMedia('(pointer: fine)').matches) {
            document.querySelectorAll('.magnetic-btn').forEach(btn => {
                btn.addEventListener('mousemove', function(e) {
                    const rect = this.getBoundingClientRect();
                    const x = e.clientX - rect.left - rect.width / 2;
                    const y = e.clientY - rect.top - rect.height / 2;
                    this.style.transform = `translate(${x * 0.22}px, ${y * 0.22}px)`;
                });
                btn.addEventListener('mouseleave', function() {
                    this.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)';
                    this.style.transform = 'translate(0px, 0px)';
                });
                btn.addEventListener('mouseenter', function() {
                    this.style.transition = 'transform 0.1s linear';
                });
            });
        }

// Service Worker Registration
if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('[SW] Registered:', reg.scope))
          .catch(err => console.warn('[SW] Failed:', err));
      });
    }

// === Page View Tracking (Anonymous) ===
(function() {
    // Don't track admin pages
    if (window.location.pathname.includes('admin')) return;

    const deviceType = window.innerWidth < 480 ? 'mobile' : (window.innerWidth <= 1024 ? 'tablet' : 'desktop');

    // Generate or retrieve anonymous session ID
    let userId = sessionStorage.getItem('hcf_session_id');
    if (!userId) {
        userId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);
        sessionStorage.setItem('hcf_session_id', userId);
    }

    // Send page view after a short delay to not block rendering
    setTimeout(() => {
        fetch('/.netlify/functions/track-pageview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userId,
                deviceType: deviceType,
                pageUrl: window.location.pathname,
                referrer: document.referrer || 'direct'
            })
        }).catch(() => {}); // silently fail
    }, 2000);

    // Track session duration on page unload
    const startTime = Date.now();
    window.addEventListener('beforeunload', () => {
        const duration = Math.round((Date.now() - startTime) / 1000);
        navigator.sendBeacon('/.netlify/functions/track-pageview', new Blob([JSON.stringify({
            userId: userId,
            deviceType: deviceType,
            pageUrl: window.location.pathname,
            referrer: document.referrer || 'direct',
            sessionDuration: duration,
            isUpdate: true
        })], { type: 'application/json' }));
    });
})();

// === Event Tracking System (CTA clicks, scroll depth, engagement) ===
(function() {
    if (window.location.pathname.includes('admin')) return;

    const deviceType = window.innerWidth < 480 ? 'mobile' : (window.innerWidth <= 1024 ? 'tablet' : 'desktop');
    const userId = sessionStorage.getItem('hcf_session_id') || 'anonymous';

    function trackEvent(category, eventName, metadata) {
        const payload = {
            userId,
            category,
            eventName,
            pageUrl: window.location.pathname,
            deviceType,
            metadata: metadata || {}
        };
        // Use sendBeacon for reliability, fallback to fetch
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        if (navigator.sendBeacon) {
            navigator.sendBeacon('/.netlify/functions/track-event', blob);
        } else {
            fetch('/.netlify/functions/track-event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).catch(() => {});
        }
    }

    // Expose globally for inline onclick usage
    window.hcfTrack = trackEvent;

    // ── CTA Click Tracking ─────────────────────────────────────────
    // Auto-detect CTA links by href patterns
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href], button[onclick]');
        if (!link) return;

        const href = link.getAttribute('href') || '';
        const text = (link.textContent || '').trim().slice(0, 50);

        // FitBook booking links
        if (href.includes('fit-book.com')) {
            trackEvent('cta_click', 'fitbook_booking', { label: text, href });
            trackEvent('conversion', 'booking_start', { label: text });
        }
        // LINE links
        else if (href.includes('lin.ee') || href.includes('line.me')) {
            trackEvent('cta_click', 'line_consult', { label: text });
            trackEvent('conversion', 'line_add', { label: text });
        }
        // Instagram
        else if (href.includes('instagram.com')) {
            trackEvent('cta_click', 'ig_follow', { label: text });
        }
        // Facebook
        else if (href.includes('facebook.com')) {
            trackEvent('cta_click', 'fb_follow', { label: text });
        }
        // YouTube
        else if (href.includes('youtube.com')) {
            trackEvent('cta_click', 'youtube_visit', { label: text });
        }
        // Internal pricing/booking page
        else if (href.includes('pricing.html')) {
            trackEvent('cta_click', 'pricing_view', { label: text });
        }
        // Coach profiles
        else if (href.includes('team.html')) {
            trackEvent('cta_click', 'coach_profile', { label: text });
        }
        // Class details
        else if (href.includes('classes.html')) {
            trackEvent('cta_click', 'class_detail', { label: text });
        }
        // Schedule section
        else if (href.includes('#schedule')) {
            trackEvent('cta_click', 'schedule_view', { label: text });
        }
        // Phone call
        else if (href.startsWith('tel:')) {
            trackEvent('cta_click', 'phone_call', { label: text, phone: href });
        }
    }, { passive: true });

    // ── Scroll Depth Tracking ──────────────────────────────────────
    const scrollMilestones = { 25: false, 50: false, 75: false, 100: false };
    let scrollTicking = false;

    function checkScrollDepth() {
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (scrollHeight <= 0) return;
        const pct = Math.round((window.scrollY / scrollHeight) * 100);

        [25, 50, 75, 100].forEach(milestone => {
            if (pct >= milestone && !scrollMilestones[milestone]) {
                scrollMilestones[milestone] = true;
                trackEvent('scroll', String(milestone), { page: window.location.pathname });
            }
        });
        scrollTicking = false;
    }

    window.addEventListener('scroll', () => {
        if (!scrollTicking) {
            scrollTicking = true;
            requestAnimationFrame(checkScrollDepth);
        }
    }, { passive: true });

    // ── Engagement Tracking ────────────────────────────────────────
    // Video play tracking
    document.addEventListener('play', (e) => {
        if (e.target.tagName === 'VIDEO') {
            const src = (e.target.currentSrc || e.target.src || '').split('/').pop();
            trackEvent('engagement', 'video_play', { video: src });
        }
    }, true);

    // AI Chat interaction tracking
    const origAskShark = window.askShark;
    if (typeof origAskShark === 'function') {
        window.askShark = function() {
            trackEvent('engagement', 'ai_chat_send', {});
            return origAskShark.apply(this, arguments);
        };
    }

    // Track chat open
    const chatToggle = document.getElementById('ai-mascot');
    if (chatToggle) {
        chatToggle.addEventListener('click', () => {
            trackEvent('engagement', 'ai_chat_open', {});
        }, { passive: true });
    }

    // FAQ expand tracking
    document.addEventListener('click', (e) => {
        const faqItem = e.target.closest('[data-faq], .faq-question, details summary');
        if (faqItem) {
            const q = (faqItem.textContent || '').trim().slice(0, 80);
            trackEvent('engagement', 'faq_expand', { question: q });
        }
    }, { passive: true });
})();
