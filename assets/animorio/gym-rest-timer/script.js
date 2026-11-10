/*
  "The gym rest timer with the set that logs itself" from Animorio · https://animorio.com
  License: free on your own sites and your clients’ sites, paid work included.
  Not for resale, redistribution, templates or code collections · https://animorio.com/en/license/
*/
/* The gym rest timer with the set that logs itself
   The rest timer widget of a strength training app, a card of smoked glass on a near black page. On top the
   exercise and its sets as small capsules; in the middle a dial of thin ticks around the weight of the set you are
   on. Pressing Log set the button gives under the finger and draws a check, the capsule of the set fills on a
   spring, the volume of the day rolls up and the card turns into the rest: the weight slips away, the time rolls in
   digit by digit, the ticks light up in amber one after the other and a blurred arc of light sits under them. The
   time goes down with digits that roll on their reels, the ticks go out with it (the arc chases them on a spring),
   the heart rate comes down. Plus 15 and minus 15 change the rest on a spring; in the last seconds the amber turns
   lime, and at zero the card swells by a hair: your set again. After the last set of an exercise the next one comes
   in. Left alone, the widget lifts by itself. */

/* ---- valori da cambiare ---- */
const COPY = {
  fa: { day:'جلسهٔ قدرت', kg:'کیلوگرم', reps:'تکرار', yourSet:'ست بعدی', rest:'استراحت', log:'ثبت ست', skip:'رد استراحت', next:'بعدی', upNext:'حرکت بعد', volume:'حجم تمرین', bpm:'ضربان', restOver:'استراحت تمام شد', setLogged:'ست ثبت شد. زمان استراحت:', seconds:'ثانیه', added:'اضافه شد', removed:'کم شد', exercises:[{name:'پرس سینه',kg:60,reps:8},{name:'اسکوات',kg:50,reps:10},{name:'پرس سرشانه',kg:24,reps:10}] },
  en: { day:'Strength session', kg:'kg', reps:'reps', yourSet:'Next set', rest:'Rest', log:'Log set', skip:'Skip rest', next:'Next', upNext:'Up next', volume:'Training volume', bpm:'bpm', restOver:'Rest over', setLogged:'Set logged. Rest for', seconds:'seconds', added:'added', removed:'removed', exercises:[{name:'Bench press',kg:60,reps:8},{name:'Squat',kg:50,reps:10},{name:'Shoulder press',kg:24,reps:10}] },
  ar: { day:'جلسة قوة', kg:'كغ', reps:'تكرارات', yourSet:'المجموعة التالية', rest:'استراحة', log:'تسجيل المجموعة', skip:'تخطي الاستراحة', next:'التالي', upNext:'التمرين التالي', volume:'حجم التدريب', bpm:'نبضة', restOver:'انتهت الاستراحة', setLogged:'تم تسجيل المجموعة. استرح', seconds:'ثانية', added:'أضيفت', removed:'حذفت', exercises:[{name:'ضغط الصدر',kg:60,reps:8},{name:'القرفصاء',kg:50,reps:10},{name:'ضغط الكتف',kg:24,reps:10}] }
};
let locale = document.documentElement.lang || 'fa';
const copy = () => COPY[locale] || COPY.fa;
let DAY = copy().day;
let EXERCISES = copy().exercises;
const SETS = 4;                 /* how many sets each exercise has */
const REST = 60;                /* the rest between two sets, in seconds */
const STEP = 15;                /* the seconds that minus and plus take off or add */
const SPEED = 6;                /* how much faster than real the demo time runs (1 = real seconds) */
const TICKS = 48;               /* how many ticks the dial has */
const SPRING = 1;               /* how springy the moves are: 0.4 calm, 2 very bouncy */
const AUTO = true;              /* the widget lifts by itself until someone touches it */

(() => {
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const card = $('[data-card]');
  const dayEl = $('[data-day]');
  const exEl = $('[data-ex]');
  const setsEl = $('[data-sets]');
  const ticksOff = $('[data-ticks-off]');
  const ticksOn = $('[data-ticks-on]');
  const lead = $('[data-lead]');
  const glowArc = $('[data-glowarc]');
  const labelEl = $('[data-label]');
  const weightEl = $('[data-weight]');
  const kgEl = $('[data-kg]');
  const timeEl = $('[data-time]');
  const subEl = $('[data-sub]');
  const hrEl = $('[data-hr]');
  const heart = $('[data-heart]');
  const volEl = $('[data-vol]');
  const mainBtn = $('[data-main]');
  const minusBtn = $('[data-minus]');
  const plusBtn = $('[data-plus]');
  const wordsEl = $('[data-words]');
  const check = $('[data-check]');
  const skip = $('[data-skip]');
  const shine = $('[data-shine]');
  const glowWarm = $('[data-glow-warm]');
  const glowGo = $('[data-glow-go]');
  const live = $('[data-live]');
  const css = getComputedStyle(document.documentElement);
  const C_REST = css.getPropertyValue('--rest').trim() || '#ff9a4a';
  const C_GO = css.getPropertyValue('--go').trim() || '#c8f26a';

  let exList = Array.isArray(EXERCISES) && EXERCISES.length ? EXERCISES : [{ name: 'Bench press', kg: 80, reps: 8 }];
  const nSets = Math.max(1, Math.min(8, Math.round(SETS) || 4));
  const nTicks = Math.max(12, Math.min(90, Math.round(TICKS) || 48));
  const restLen = Math.max(5, REST || 60);
  const stepLen = Math.max(1, STEP || 15);
  const speed = Math.max(0.1, SPEED || 1);
  const sp = Math.max(0.2, SPRING || 1);
  const BACK = 'back.out(' + (1.1 + 0.9 * sp).toFixed(2) + ')';
  const ELASTIC = 'elastic.out(' + (0.8 + 0.2 * sp).toFixed(2) + ', ' + Math.max(0.25, 0.55 - 0.15 * sp).toFixed(2) + ')';
  const TIMES = String.fromCharCode(215);
  const MID = String.fromCharCode(183);

  const S = { ex: 0, done: Math.min(2, nSets - 1), mode: 'work', rem: 0, total: restLen, shown: 0, vel: 0, drawn: -1, hr: 128, hrGoal: 128, auto: AUTO, added: false, last: -1 };
  dayEl.textContent = DAY;

  const fmtVol = (v) => Math.round(v).toLocaleString('en-US');
  const ex = () => exList[S.ex % exList.length];
  const setLine = (e) => e.kg + ' ' + copy().kg + ' ' + TIMES + ' ' + e.reps + ' ' + copy().reps;
  const say = (t) => { live.textContent = t; };

  /* ---------------------------------------------------------------- the dial */
  const NS = 'http://www.w3.org/2000/svg';
  const SWEEP = 300;
  const angleOf = (i) => -SWEEP / 2 + (SWEEP * i) / (nTicks - 1);
  const on = [];
  for (let i = 0; i < nTicks; i++) {
    for (const g of [ticksOff, ticksOn]) {
      const l = document.createElementNS(NS, 'line');
      l.setAttribute('x1', '110');
      l.setAttribute('x2', '110');
      l.setAttribute('y1', '6');
      l.setAttribute('y2', '18');
      l.setAttribute('transform', 'rotate(' + angleOf(i).toFixed(2) + ' 110 110)');
      if (g === ticksOn) { l.style.opacity = '0'; on.push(l); }
      g.appendChild(l);
    }
  }
  /* the arc of light under the ticks */
  const polar = (a, r) => [110 + r * Math.sin((a * Math.PI) / 180), 110 - r * Math.cos((a * Math.PI) / 180)];
  const p0 = polar(-SWEEP / 2, 98);
  const p1 = polar(SWEEP / 2, 98);
  glowArc.setAttribute('d', 'M' + p0[0].toFixed(2) + ' ' + p0[1].toFixed(2) + ' A98 98 0 1 1 ' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2));

  const drawDial = (f) => {
    f = Math.max(0, Math.min(1, f));
    if (Math.abs(f - S.drawn) < 0.0005) return;
    S.drawn = f;
    const lit = f * (nTicks - 1);
    for (let i = 0; i < nTicks; i++) {
      const k = Math.max(0, Math.min(1, lit - i + 1));
      on[i].style.opacity = k ? k.toFixed(3) : '0';
    }
    glowArc.style.strokeDasharray = (f * 0.999).toFixed(4) + ' 1';
    lead.setAttribute('transform', 'rotate(' + angleOf(Math.min(nTicks - 1, lit)).toFixed(2) + ' 110 110)');
    lead.style.opacity = f > 0.002 && S.mode === 'rest' ? '1' : '0';
  };

  /* ---------------------------------------------------------------- the reels of the time */
  const reels = [];
  const makeReel = () => {
    const r = document.createElement('span');
    r.className = 'reel';
    const strip = document.createElement('span');
    strip.className = 'reel__strip';
    for (let d = 0; d <= 9; d++) {
      const s = document.createElement('span');
      s.textContent = String(d);
      strip.appendChild(s);
    }
    r.appendChild(strip);
    timeEl.appendChild(r);
    reels.push({ strip, d: 0 });
  };
  makeReel();
  const colon = document.createElement('span');
  colon.className = 'rest__colon';
  colon.textContent = ':';
  timeEl.appendChild(colon);
  makeReel();
  makeReel();

  const setTime = (sec, roll, dur) => {
    sec = Math.max(0, Math.min(599, Math.ceil(sec)));
    const ds = [Math.floor(sec / 60), Math.floor((sec % 60) / 10), sec % 10];
    ds.forEach((d, i) => {
      const r = reels[i];
      if (r.d === d && roll !== 'force') return;
      r.d = d;
      if (!roll || REDUCED) gsap.set(r.strip, { yPercent: -10 * d });
      else gsap.to(r.strip, { yPercent: -10 * d, duration: dur || 0.42, ease: BACK, overwrite: true, delay: roll === 'stagger' ? i * 0.07 : 0 });
    });
  };
  setTime(0);

  /* ---------------------------------------------------------------- the sets */
  const caps = [];
  const buildSets = () => {
    setsEl.textContent = '';
    caps.length = 0;
    for (let i = 0; i < nSets; i++) {
      const c = document.createElement('span');
      c.className = 'rest__set';
      const f = document.createElement('span');
      f.className = 'rest__set-fill';
      c.appendChild(f);
      setsEl.appendChild(c);
      caps.push({ c, f });
    }
  };
  buildSets();
  const paintSets = () => {
    caps.forEach((k, i) => {
      gsap.set(k.f, { scaleX: i < S.done ? 1 : 0 });
      k.c.classList.toggle('is-now', i === S.done && S.mode === 'work');
    });
  };

  /* ---------------------------------------------------------------- swaps */
  const swapText = (el, text, dir = 1) => {
    if (el.textContent === text) return;
    if (REDUCED) {
      gsap.timeline().to(el, { opacity: 0, duration: 0.14 }).add(() => { el.textContent = text; }).to(el, { opacity: 1, duration: 0.2 });
      return;
    }
    gsap.timeline()
      .to(el, { yPercent: -70 * dir, opacity: 0, filter: 'blur(3px)', duration: 0.16, ease: 'power2.in' })
      .add(() => { el.textContent = text; })
      .fromTo(el, { yPercent: 70 * dir, opacity: 0, filter: 'blur(3px)' }, { yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: 0.42, ease: BACK });
  };

  const countTo = (el, from, to, dur, fmt) => {
    const o = { v: from };
    gsap.to(o, { v: to, duration: REDUCED ? 0.01 : dur, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(o.v); } });
  };

  const pressFace = (btn) => {
    const face = btn.querySelector('[data-face]');
    if (REDUCED) return;
    gsap.timeline()
      .to(face, { scale: 0.93, y: 1, duration: 0.09, ease: 'power2.out' })
      .to(face, { scale: 1, y: 0, duration: 0.6, ease: ELASTIC });
  };

  const setColor = (c, dur) => gsap.to(card, { '--acc': c, duration: dur, ease: 'power2.inOut', overwrite: 'auto' });
  const setGlow = (warm, dur) => {
    gsap.to(glowWarm, { opacity: warm * 0.34, duration: dur, ease: 'power2.inOut', overwrite: 'auto' });
    gsap.to(glowGo, { opacity: (1 - warm) * 0.22, duration: dur, ease: 'power2.inOut', overwrite: 'auto' });
  };

  const showBig = (which) => {
    const inEl = which === 'time' ? timeEl : weightEl;
    const outEl = which === 'time' ? weightEl : timeEl;
    if (REDUCED) {
      gsap.to(outEl, { opacity: 0, duration: 0.2 });
      gsap.to(inEl, { opacity: 1, duration: 0.3, delay: 0.1 });
      return;
    }
    gsap.to(outEl, { opacity: 0, y: -14, scale: 0.94, filter: 'blur(6px)', duration: 0.26, ease: 'power2.in', overwrite: true });
    gsap.fromTo(inEl, { opacity: 0, y: 16, scale: 0.96, filter: 'blur(6px)' }, { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.6, delay: 0.14, ease: BACK, overwrite: true });
  };

  const setMainWords = (text, icon) => {
    swapText(wordsEl, text);
    if (icon === 'skip') {
      gsap.to(check, { opacity: 0, duration: 0.15 });
      gsap.fromTo(skip, { opacity: 0, x: REDUCED ? 0 : -4 }, { opacity: 1, x: 0, duration: 0.4, delay: 0.1, ease: BACK });
    } else {
      gsap.to(skip, { opacity: 0, duration: 0.15 });
      gsap.set(check, { opacity: 1, strokeDashoffset: 1 });
    }
  };

  const refreshLocale = (next) => {
    if (COPY[next]) locale = next;
    DAY = copy().day;
    EXERCISES = copy().exercises;
    exList = EXERCISES;
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'en' ? 'ltr' : 'rtl';
    dayEl.textContent = DAY;
    exEl.textContent = ex().name;
    const unit = $('[data-unit]');
    const volume = $('[data-volume]');
    const volumeUnit = $('[data-volume-unit]');
    const bpm = $('[data-bpm]');
    if (unit) unit.textContent = copy().kg;
    if (volume) volume.textContent = copy().volume;
    if (volumeUnit) volumeUnit.textContent = copy().kg;
    if (bpm) bpm.textContent = copy().bpm;
    minusBtn.setAttribute('aria-label', locale === 'fa' ? '۱۵ ثانیه از استراحت کم کن' : locale === 'ar' ? 'اطرح ١٥ ثانية من الاستراحة' : 'Take 15 seconds off the rest');
    plusBtn.setAttribute('aria-label', locale === 'fa' ? '۱۵ ثانیه به استراحت اضافه کن' : locale === 'ar' ? 'أضف ١٥ ثانية إلى الاستراحة' : 'Add 15 seconds to the rest');
    labelEl.textContent = S.mode === 'rest' ? copy().rest : copy().yourSet;
    subEl.textContent = S.mode === 'rest' ? copy().next + ' · ' + setLine(ex()) : ex().reps + ' ' + copy().reps + ' · RPE 8';
    wordsEl.textContent = S.mode === 'rest' ? copy().skip : copy().log;
    mainBtn.setAttribute('aria-label', S.mode === 'rest' ? copy().skip : copy().log);
  };
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'atlas-language') refreshLocale(event.data.lang);
  });

  /* ---------------------------------------------------------------- the states */
  const toWork = (first) => {
    S.mode = 'work';
    S.rem = 0;
    minusBtn.disabled = true;
    plusBtn.disabled = true;
    const e = ex();
    kgEl.textContent = String(e.kg);
    paintSets();
    if (first) {
      labelEl.textContent = copy().yourSet;
      subEl.textContent = e.reps + ' ' + copy().reps + ' ' + MID + ' RPE 8';
      gsap.set(timeEl, { opacity: 0 });
      gsap.set(weightEl, { opacity: 1 });
      return;
    }
    setTime(0, true, 0.3);
    swapText(labelEl, copy().yourSet);
    swapText(subEl, e.reps + ' ' + copy().reps + ' ' + MID + ' RPE 8');
    setMainWords(copy().log, 'check');
    showBig('weight');
    setColor(C_GO, 0.5);
    setGlow(0, 0.9);
    /* the card swells by a hair: time to lift */
    if (!REDUCED) {
      gsap.timeline()
        .to(card, { scale: 1.016, duration: 0.18, ease: 'power2.out' })
        .to(card, { scale: 1, duration: 0.9, ease: ELASTIC });
      gsap.fromTo(on, { opacity: 0.9 }, { opacity: 0, duration: 0.6, stagger: { each: 0.008, from: 'end' }, ease: 'power2.out' });
    }
    const now = caps[S.done];
    if (now && !REDUCED) gsap.fromTo(now.c, { scaleY: 1.8 }, { scaleY: 1, duration: 0.7, ease: ELASTIC });
    say(copy().restOver + '. ' + e.name + ', ' + setLine(e));
    if (S.auto) gsap.delayedCall(1.9, autoLog);
  };

  const logSet = () => {
    const e = ex();
    pressFace(mainBtn);
    /* the check draws itself in the button, a shine runs through it */
    gsap.fromTo(check, { strokeDashoffset: 1, opacity: 1 }, { strokeDashoffset: 0, duration: REDUCED ? 0.01 : 0.36, ease: 'power2.out' });
    if (!REDUCED) gsap.fromTo(shine, { xPercent: 0, opacity: 1 }, { xPercent: 360, opacity: 0.2, duration: 0.7, ease: 'power2.inOut' });
    /* the capsule fills on a spring */
    const k = caps[S.done];
    if (k) {
      k.c.classList.remove('is-now');
      gsap.fromTo(k.f, { scaleX: 0 }, { scaleX: 1, duration: REDUCED ? 0.2 : 0.7, ease: REDUCED ? 'none' : ELASTIC });
    }
    const v0 = parseFloat(volEl.textContent.replace(/,/g, '')) || 0;
    countTo(volEl, v0, v0 + e.kg * e.reps, 0.9, fmtVol);
    if (!REDUCED) gsap.fromTo(volEl, { y: -2 }, { y: 0, duration: 0.6, ease: ELASTIC });
    S.done += 1;
    S.hrGoal = 146;
    const last = S.done >= nSets;
    say(copy().setLogged + ' ' + Math.round(restLen) + ' ' + copy().seconds + '.');
    gsap.delayedCall(REDUCED ? 0.1 : 0.42, () => toRest(last));
  };

  const toRest = (last) => {
    S.mode = 'rest';
    S.total = restLen;
    S.rem = restLen;
    S.added = false;
    S.last = -1;
    minusBtn.disabled = false;
    plusBtn.disabled = false;
    setTime(0, false);
    setTime(restLen, 'stagger', 0.7);
    showBig('time');
    swapText(labelEl, copy().rest);
    if (last) {
      /* the exercise is over: the next one comes in, its sets empty out */
      S.ex = (S.ex + 1) % exList.length;
      const n = ex();
      gsap.delayedCall(REDUCED ? 0.1 : 0.7, () => {
        swapText(exEl, n.name);
        S.done = 0;
        if (REDUCED) caps.forEach((c) => gsap.to(c.f, { scaleX: 0, duration: 0.3 }));
        else gsap.to(caps.map((c) => c.f), { scaleX: 0, transformOrigin: '100% 50%', duration: 0.42, stagger: { each: 0.05, from: 'end' }, ease: 'power2.inOut', onComplete: () => caps.forEach((c) => gsap.set(c.f, { transformOrigin: '0% 50%' })) });
      });
      swapText(subEl, copy().upNext + ' ' + MID + ' ' + n.name);
    } else {
      swapText(subEl, copy().next + ' ' + MID + ' ' + setLine(ex()));
    }
    setMainWords(copy().skip, 'skip');
    setColor(C_REST, 0.6);
    setGlow(1, 1);
    /* the ticks light up one after the other */
    S.shown = REDUCED ? 1 : 0;
    S.vel = 0;
  };

  const addRest = (sec) => {
    if (S.mode !== 'rest') return;
    S.rem = Math.max(0, Math.min(599, S.rem + sec));
    S.total = Math.max(S.total, S.rem);
    setTime(S.rem, true, 0.5);
    if (!REDUCED) gsap.fromTo(timeEl, { scale: sec > 0 ? 1.06 : 0.95 }, { scale: 1, duration: 0.7, ease: ELASTIC });
    say(Math.abs(sec) + ' ' + copy().seconds + ' ' + (sec > 0 ? copy().added : copy().removed) + '.');
    if (S.rem <= 0) toWork(false);
  };

  /* ---------------------------------------------------------------- the clock and the springs */
  let lastT = 0;
  const tick = (t) => {
    const dt = Math.min(1 / 30, lastT ? (t - lastT) / 1000 : 0);
    lastT = t;
    if (S.mode === 'rest') {
      S.rem -= dt * speed;
      const sec = Math.ceil(Math.max(0, S.rem));
      if (sec !== S.last) {
        S.last = sec;
        if (S.drawnTime !== undefined) setTime(sec, true, Math.min(0.42, 0.6 / speed + 0.04));
        S.drawnTime = sec;
        /* the last seconds: the amber turns lime */
        if (S.rem <= 3 * Math.max(1, speed / 2) && S.rem > 0 && !S.warned) {
          S.warned = true;
          setColor(C_GO, Math.max(0.4, S.rem / speed));
          setGlow(0, Math.max(0.4, S.rem / speed));
        }
      }
      if (S.auto && !S.added && S.rem < S.total * 0.62) { S.added = true; autoPress(plusBtn, () => addRest(stepLen)); }
      if (S.rem <= 0) { S.warned = false; S.rem = 0; toWork(false); }
      S.hrGoal = 104;
    } else {
      S.warned = false;
    }
    /* the arc and the ticks chase the time on a spring */
    const goal = S.mode === 'rest' ? S.rem / S.total : 0;
    if (REDUCED) S.shown = goal;
    else {
      const k = 120 * sp * 0.7 + 40, c = 2 * Math.sqrt(k) * (0.55 + 0.3 / sp);
      S.vel += ((goal - S.shown) * k - S.vel * c) * dt;
      S.shown += S.vel * dt;
    }
    drawDial(S.shown);
    /* the heart rate */
    const hrNow = S.hr + (S.hrGoal - S.hr) * Math.min(1, dt * (S.hrGoal > S.hr ? 2.2 : 0.06 * Math.min(8, speed)));
    S.hr = hrNow;
    const hrShown = String(Math.round(hrNow));
    if (hrEl.textContent !== hrShown) hrEl.textContent = hrShown;
    requestAnimationFrame(tick);
  };

  /* the heart beats with the rate: a tiny squeeze of the outline */
  const beat = () => {
    if (!REDUCED) gsap.fromTo(heart, { scale: 1.16 }, { scale: 1, duration: 0.32, ease: 'power2.out', transformOrigin: '50% 60%' });
    gsap.delayedCall(60 / Math.max(50, S.hr), beat);
  };

  /* ---------------------------------------------------------------- the hands */
  const press = (btn) => {
    if (btn === mainBtn) {
      if (S.mode === 'work') logSet();
      else { pressFace(mainBtn); S.rem = 0; S.warned = false; toWork(false); }
    } else if (btn === plusBtn && S.mode === 'rest') { pressFace(plusBtn); addRest(stepLen); }
    else if (btn === minusBtn && S.mode === 'rest') { pressFace(minusBtn); addRest(-stepLen); }
  };
  [mainBtn, plusBtn, minusBtn].forEach((b) => b.addEventListener('click', () => press(b)));

  const autoPress = (btn, fn) => {
    if (!S.auto) return;
    pressFace(btn);
    fn();
  };
  const autoLog = () => {
    if (!S.auto || S.mode !== 'work') return;
    logSet();
  };
  const handsOn = (ev) => {
    if (!ev.isTrusted || !S.auto) return;
    S.auto = false;
    gsap.killTweensOf(autoLog);
  };
  window.addEventListener('pointerdown', handsOn, { capture: true });
  window.addEventListener('keydown', handsOn, { capture: true });

  /* ---------------------------------------------------------------- the start */
  const start = () => {
    exEl.textContent = ex().name;
    volEl.textContent = fmtVol(S.done * ex().kg * ex().reps);
    toWork(true);
    gsap.set(card, { '--acc': C_GO });
    if (REDUCED) gsap.to(card, { opacity: 1, duration: 0.5 });
    else {
      gsap.fromTo(card, { opacity: 0, y: 18, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 1.1, ease: 'expo.out' });
      gsap.from([dayEl, exEl, setsEl], { opacity: 0, y: 6, duration: 0.7, stagger: 0.06, delay: 0.15, ease: 'power3.out' });
      gsap.from(weightEl, { opacity: 0, y: 10, filter: 'blur(6px)', duration: 0.8, delay: 0.3, ease: BACK });
      gsap.fromTo(on, { opacity: 0 }, { opacity: 0.85, duration: 0.25, stagger: 0.012, delay: 0.25, yoyo: true, repeat: 1, repeatDelay: 0.05, ease: 'power1.out' });
    }
    S.drawn = -1;
    requestAnimationFrame(tick);
    beat();
    if (S.auto) gsap.delayedCall(2.2, autoLog);
  };
  const go = () => {
    S.drawnTime = 0;
    const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    fonts.then(start, start);
  };
  if (document.readyState === 'complete') go();
  else window.addEventListener('load', go, { once: true });
})();
