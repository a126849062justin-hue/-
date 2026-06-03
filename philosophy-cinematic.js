(function () {
  'use strict';

  const section = document.querySelector('.hcf-philosophy-cinematic');
  if (!section) return;

  /* ── Prefers-reduced-motion: show final state immediately ── */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    section.querySelectorAll('.hcf-card').forEach(function (c) {
      c.style.opacity = '1';
      c.style.transform = 'none';
    });
    var ml = section.querySelector('.hcf-merge-logo');
    if (ml) { ml.style.opacity = '1'; ml.style.transform = 'none'; }
    return;
  }

  /* ── Low-power device detection (< 4 GB RAM = skip heavy flash effect) ── */
  var isLowPower = typeof navigator.deviceMemory !== 'undefined' && navigator.deviceMemory < 4;

  /* ═══════════════════════════════════════════════════════════════
     MOBILE init — CSS scroll-snap + IntersectionObserver
     ═══════════════════════════════════════════════════════════════ */
  function initMobile() {
    var outer      = section.querySelector('.hcf-hscroll-outer');
    var dots       = section.querySelectorAll('.hcf-dot');
    var mergeStage = section.querySelector('.hcf-merge-stage');
    var mergeLogo  = section.querySelector('.hcf-merge-logo');
    var panels     = section.querySelectorAll('.hcf-card, .hcf-merge-stage');

    /* Dot indicator synced to scroll position */
    if (outer && dots.length && panels.length) {
      function onScroll() {
        var outerLeft  = outer.getBoundingClientRect().left;
        var outerCenterX = outerLeft + outer.clientWidth / 2;
        var closestIdx = 0;
        var minDist = Infinity;
        panels.forEach(function (panel, i) {
          var r = panel.getBoundingClientRect();
          var panelCenter = r.left + r.width / 2;
          var dist = Math.abs(panelCenter - outerCenterX);
          if (dist < minDist) { minDist = dist; closestIdx = i; }
        });
        dots.forEach(function (d, i) {
          d.classList.toggle('hcf-dot--active', i === closestIdx);
        });
      }
      outer.addEventListener('scroll', onScroll, { passive: true });
    }

    /* Reveal merge logo when merge stage scrolls into view */
    if (mergeStage && mergeLogo) {
      var mergeObs = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          mergeLogo.classList.add('hcf-merge-logo--visible');
          mergeObs.disconnect();
        }
      }, { threshold: 0.35 });
      mergeObs.observe(mergeStage);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     DESKTOP init — GSAP ScrollTrigger horizontal scroll + merge anim
     ═══════════════════════════════════════════════════════════════ */
  function initDesktop() {
    var outer      = section.querySelector('.hcf-hscroll-outer');
    var track      = section.querySelector('.hcf-hscroll-track');
    var cards      = gsap.utils.toArray('.hcf-card', section);
    var pieces     = gsap.utils.toArray('.hcf-merge-piece', section);
    var flash      = section.querySelector('.hcf-impact-flash');
    var mergeLogo  = section.querySelector('.hcf-merge-logo');

    if (!outer || !track || !cards.length) return;

    /* 3 cards + 1 merge panel = 4 panels total
       Extra MERGE_PAD scroll allows merge animation while track is stationary */
    var numCards    = cards.length;        // 3
    var numPanels   = numCards + 1;        // 4 (3 cards + merge stage)
    var MERGE_PAD   = 0.9;                 // extra scroll room for merge anim

    var getTrackDist = function () { return (numPanels - 1) * window.innerWidth; }; // numCards panels of horizontal movement
    var getTotalScroll = function () { return ((numPanels - 1) + MERGE_PAD) * window.innerWidth; }; // + extra room for merge anim

    /* Initial states — mark elements for GPU compositing */
    gsap.set(cards, { xPercent: 100, opacity: 0, scale: 0.96 });
    gsap.set(cards[0], { xPercent: 0, opacity: 1, scale: 1 });   // first card starts visible
    gsap.set(pieces, { opacity: 0 });
    gsap.set(mergeLogo, { opacity: 0, scale: 0.6, transformOrigin: 'center center' });
    if (flash) gsap.set(flash, { opacity: 0 });

    /* ── Main timeline ── */
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: outer,
        start: 'top top',
        end: function () { return '+=' + getTotalScroll(); },
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        fastScrollEnd: true,
      }
    });

    /* 1. Horizontal track movement (ease:none = linear with scroll)
          Duration = numPanels - 1 = 3, so 1 time unit ≈ 1 panel of scroll */
    tl.to(track, {
      x: function () { return -getTrackDist(); },
      ease: 'none',
      duration: numPanels - 1,
    }, 0);

    /* 2. Card entrance / exit animations */
    for (var i = 1; i < cards.length; i++) {
      /* Slide card in from the right as it comes into view */
      tl.to(cards[i], {
        xPercent: 0, opacity: 1, scale: 1,
        duration: 0.55, ease: 'power3.out',
      }, i - 0.40);

      /* Previous card shrinks/dims slightly */
      tl.to(cards[i - 1], {
        scale: 0.92, opacity: 0.4,
        duration: 0.45, ease: 'power2.inOut',
      }, i - 0.12);
    }

    /* 3. Merge stage animations (start after last card exits, during MERGE_PAD window)
          merge start time in timeline: numPanels - 1 = 3 (track is done moving)
          but we begin a bit before track stops so it overlaps nicely */
    var ms = (numPanels - 1) - 0.25;  // = 2.75 (slightly before last card fully visible)

    /* 3a. Pieces fly in from spread positions */
    var pieceOrigins = [
      { x: -220, y: -140, rotation: -28, scale: 0.5 },   // triangle: top-left
      { x:  220, y: -140, rotation:  28, scale: 0.5 },   // shark:    top-right
      { x:    0, y:  180, rotation:   0, scale: 0.5 },   // anchor:   bottom-center
    ];

    pieces.forEach(function (piece, i) {
      var o = pieceOrigins[i] || { x: 0, y: 0, rotation: 0, scale: 0.5 };
      tl.fromTo(piece,
        { opacity: 0, x: o.x, y: o.y, rotation: o.rotation, scale: o.scale },
        { opacity: 1, x: 0,   y: 0,   rotation: 0,          scale: 1,
          duration: 0.32, ease: 'power3.out' },
        ms + 0.05 + i * 0.07
      );
    });

    /* 3b. Pieces converge to center (scale to nothing) */
    tl.to(pieces, {
      x: 0, y: 0, scale: 0.08, opacity: 0,
      duration: 0.24, ease: 'power4.in', stagger: 0.025,
    }, ms + 0.55);

    /* 3c. Flash burst */
    if (flash && !isLowPower) {
      tl.fromTo(flash,
        { opacity: 0 },
        { opacity: 1, duration: 0.07, ease: 'none' },
        ms + 0.79
      );
      tl.to(flash, { opacity: 0, duration: 0.22 }, ms + 0.86);
    }

    /* 3d. Logo reveal */
    tl.to(mergeLogo, {
      opacity: 1, scale: 1,
      duration: 0.45, ease: 'power3.out',
    }, ms + 0.82);

    /* Cleanup when matchMedia context is destroyed */
    return function () {
      tl.kill();
    };
  }

  /* ═══════════════════════════════════════════════════════════════
     Bootstrap — use gsap.matchMedia for correct orientation cleanup
     ═══════════════════════════════════════════════════════════════ */
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    var mm = gsap.matchMedia();

    mm.add('(min-width: 769px)', function () {
      return initDesktop();
    });

    mm.add('(max-width: 768px)', function () {
      initMobile();
    });
  } else {
    /* Fallback without GSAP — mobile scroll-snap still works via CSS */
    if (window.matchMedia('(max-width: 768px)').matches) {
      initMobile();
    }
  }

})();
