import { buildThoughtLinePath, strokeWidthForViewport } from './thoughtLine';

let initialized = false;
let targetProgress = 0;
let displayProgress = 0;
let scrollVelocity = 0;
let rafId = 0;
let loopRunning = false;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function initThoughtProcess() {
  const section = document.getElementById('thought-process');
  const trigger = document.getElementById('thought-trigger');
  const expand = document.getElementById('thought-expand');
  const expandOrb = expand?.querySelector<HTMLElement>('.thought-expand__orb');
  const scroller = section?.querySelector<HTMLElement>('.thought-overlay__scroller');
  const scrollRoom = section?.querySelector<HTMLElement>('.thought-overlay__scroll-room');
  const track = section?.querySelector<HTMLElement>('.thought-overlay__track');
  const lineSvg = section?.querySelector<SVGSVGElement>('.thought-overlay__line');
  const linePath = section?.querySelector<SVGPathElement>('.thought-overlay__line-path');
  const intro = section?.querySelector<HTMLElement>('.thought-overlay__intro');
  const boxes = section?.querySelectorAll<HTMLElement>('.thought-box');

  if (!section || !trigger || !scrollRoom || !track || !expand || !expandOrb || !scroller) return;

  const stepCount = (boxes?.length || 0) + 1;
  let snapProgresses: number[] = [0];
  let maxTranslate = 0;
  let currentStep = 0;
  let isOpening = false;
  let expandFallbackTimer = 0;
  let isSnapping = false;
  let snapTimer = 0;
  let edgeRubber = 0;
  let lineLength = 0;
  let iconStrokesReady = false;
  const iconDrawProgress = new Map<HTMLElement, number>();

  const spring = 0.14;
  const damping = 0.84;
  const snapEase = 0.16;
  const snapProximity = 0.035;

  const scrollableDistance = () => Math.max(1, scrollRoom.offsetHeight - scroller.clientHeight);

  const progressFromStep = (step: number) => snapProgresses[clamp(step, 0, snapProgresses.length - 1)] ?? 0;

  const findNearestSnap = (progress: number) => {
    let bestIndex = 0;
    let bestDist = Infinity;

    snapProgresses.forEach((snap, index) => {
      const dist = Math.abs(progress - snap);
      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = index;
      }
    });

    return { index: bestIndex, progress: snapProgresses[bestIndex] ?? 0, dist: bestDist };
  };

  const prepareLine = () => {
    if (!lineSvg || !linePath) return;

    const pin = section.querySelector<HTMLElement>('.thought-overlay__pin');
    const width = Math.round(pin?.clientWidth || window.innerWidth);
    const height = Math.round(pin?.clientHeight || window.innerHeight);

    lineSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    lineSvg.setAttribute('preserveAspectRatio', 'none');
    linePath.setAttribute('d', buildThoughtLinePath(width, height));
    linePath.style.strokeWidth = `${strokeWidthForViewport(width)}px`;

    lineLength = linePath.getTotalLength();
    linePath.style.strokeDasharray = `${lineLength}`;
    linePath.style.strokeDashoffset = `${lineLength}`;
    linePath.style.opacity = '1';
  };

  const prepareIconStrokes = () => {
    boxes?.forEach((box) => {
      box.querySelectorAll<SVGGeometryElement>('.thought-icon__stroke').forEach((stroke) => {
        const length = stroke.getTotalLength();
        stroke.style.strokeDasharray = `${length}`;
        stroke.style.strokeDashoffset = `${length}`;
        stroke.dataset.length = `${length}`;
      });
    });
    iconStrokesReady = true;
  };

  const measure = () => {
    const viewport = track.parentElement;
    if (!viewport || !boxes?.length) {
      snapProgresses = [0];
      maxTranslate = 0;
      prepareLine();
      return;
    }

    const previousTransform = track.style.transform;
    track.style.transform = 'translate3d(0, 0, 0)';

    const viewRect = viewport.getBoundingClientRect();
    const viewCenter = viewRect.left + viewRect.width / 2;
    const translates: number[] = [0];

    boxes.forEach((box) => {
      const boxRect = box.getBoundingClientRect();
      const boxCenter = boxRect.left + boxRect.width / 2;
      translates.push(Math.max(0, boxCenter - viewCenter));
    });

    maxTranslate = translates[translates.length - 1] || 0;
    snapProgresses = translates.map((value) => (maxTranslate > 0 ? value / maxTranslate : 0));
    track.style.transform = previousTransform;

    prepareLine();
    prepareIconStrokes();
  };

  const updateIntro = (progress: number) => {
    if (!intro) return;

    const firstBoxProgress = snapProgresses[1] ?? 0.15;
    const fade = clamp(1 - progress / Math.max(firstBoxProgress * 0.85, 0.08), 0, 1);
    const eased = fade * fade * (3 - 2 * fade);
    intro.style.opacity = `${eased}`;
    intro.style.transform = `translate(-50%, calc(-50% - ${(1 - eased) * 28}px)) scale(${0.96 + eased * 0.04})`;
  };

  const updateIconDraw = (box: HTMLElement, drawAmount: number) => {
    if (!iconStrokesReady) return;

    const strokes = box.querySelectorAll<SVGGeometryElement>('.thought-icon__stroke');
    strokes.forEach((stroke, index) => {
      const length = Number(stroke.dataset.length || stroke.getTotalLength());
      const stagger = index * 0.12;
      const local = clamp((drawAmount - stagger) / Math.max(0.001, 1 - stagger), 0, 1);
      const eased = local * local * (3 - 2 * local);
      stroke.style.strokeDashoffset = `${length * (1 - eased)}`;
    });
  };

  const resetIconDraw = (box: HTMLElement) => {
    iconDrawProgress.set(box, 0);
    if (!iconStrokesReady) return;
    box.querySelectorAll<SVGGeometryElement>('.thought-icon__stroke').forEach((stroke) => {
      const length = Number(stroke.dataset.length || stroke.getTotalLength());
      stroke.style.strokeDashoffset = `${length}`;
    });
  };

  const iconDrawFromPosition = (center: number, viewCenterX: number, pinWidth: number) => {
    const drawSpan = pinWidth * 0.52;
    const offsetRight = center - viewCenterX;

    if (offsetRight <= 0) return 1;

    return clamp(1 - offsetRight / drawSpan, 0, 1);
  };

  const updateBoxReveal = () => {
    const viewW = window.innerWidth;
    const pin = track.parentElement;
    const pinRect = pin?.getBoundingClientRect();
    const viewCenterX = pinRect ? pinRect.left + pinRect.width / 2 : viewW * 0.5;
    const pinWidth = pinRect?.width ?? viewW;

    boxes?.forEach((box) => {
      const rect = box.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      const centerDistance = Math.abs(center - viewCenterX);

      const focus = clamp(1 - centerDistance / (viewW * 0.7), 0, 1);
      const enter = clamp((viewW * 1.05 - rect.left) / (viewW * 0.55), 0, 1);
      const clarity = Math.min(enter, Math.max(focus, enter > 0.2 ? 0.7 : 0));
      const easedClarity = clarity * clarity * (3 - 2 * clarity);

      const y = (1 - easedClarity) * 28;
      const scale = 0.96 + easedClarity * 0.04;

      box.style.opacity = `${easedClarity}`;
      box.style.transform = `translate3d(0, ${y}px, 0) scale(${scale})`;

      if (pinRect && (rect.right < pinRect.left - 24 || rect.left > pinRect.right + 24)) {
        if ((iconDrawProgress.get(box) ?? 0) > 0) resetIconDraw(box);
        return;
      }

      const drawRaw = iconDrawFromPosition(center, viewCenterX, pinWidth);
      const drawEased = drawRaw * drawRaw * (3 - 2 * drawRaw);
      iconDrawProgress.set(box, drawEased);
      updateIconDraw(box, drawEased);
    });
  };

  const applyProgress = (progress: number) => {
    const p = clamp(progress, 0, 1);
    const translate = maxTranslate * p + edgeRubber;

    track.style.transform = `translate3d(${-translate}px, 0, 0)`;
    updateIntro(p);
    updateBoxReveal();

    if (linePath && lineLength > 0) {
      const finalProgress = snapProgresses[snapProgresses.length - 1] || 1;
      const lineDraw = clamp(p / Math.max(finalProgress, 0.0001), 0, 1);
      linePath.style.strokeDasharray = `${lineLength}`;
      linePath.style.strokeDashoffset = `${lineLength * (1 - lineDraw)}`;
    }
  };

  const runSmoothScroll = () => {
    if (loopRunning) return;
    loopRunning = true;

    const tick = () => {
      if (section.hidden) {
        loopRunning = false;
        return;
      }

      if (isSnapping) {
        const diff = targetProgress - displayProgress;
        if (Math.abs(diff) < 0.0008) {
          displayProgress = targetProgress;
          scrollVelocity = 0;
          isSnapping = false;
          scroller.scrollTop = targetProgress * scrollableDistance();
        } else {
          displayProgress += diff * snapEase;
          scrollVelocity = 0;
          scroller.scrollTop = displayProgress * scrollableDistance();
        }
      } else {
        const force = (targetProgress - displayProgress) * spring;
        scrollVelocity = (scrollVelocity + force) * damping;
        displayProgress += scrollVelocity;

        if (
          Math.abs(targetProgress - displayProgress) < 0.0004 &&
          Math.abs(scrollVelocity) < 0.0004 &&
          edgeRubber === 0
        ) {
          displayProgress = targetProgress;
          scrollVelocity = 0;
        }
      }

      edgeRubber *= 0.84;
      if (Math.abs(edgeRubber) < 0.12) edgeRubber = 0;

      applyProgress(displayProgress);
      rafId = requestAnimationFrame(tick);
    };

    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  };

  const goToStep = (step: number, syncScroller = true) => {
    currentStep = clamp(step, 0, stepCount - 1);
    targetProgress = progressFromStep(currentStep);

    if (!syncScroller) return;

    isSnapping = true;
    scrollVelocity = 0;

    window.clearTimeout(snapTimer);
    runSmoothScroll();
  };

  const snapIfClose = () => {
    if (section.hidden) return;

    const raw = clamp(scroller.scrollTop / scrollableDistance(), 0, 1);
    const nearest = findNearestSnap(raw);

    const gaps: number[] = [];
    for (let i = 1; i < snapProgresses.length; i++) {
      gaps.push(snapProgresses[i] - snapProgresses[i - 1]);
    }
    const avgGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 1 / Math.max(stepCount - 1, 1);
    const threshold = avgGap * snapProximity;

    if (nearest.dist <= threshold) {
      goToStep(nearest.index);
      return;
    }

    currentStep = nearest.index;
    targetProgress = raw;
  };

  const onScroll = () => {
    if (section.hidden || isSnapping) return;

    const raw = clamp(scroller.scrollTop / scrollableDistance(), 0, 1);
    targetProgress = raw;
    displayProgress = raw;
    scrollVelocity = 0;
    currentStep = findNearestSnap(raw).index;
    applyProgress(displayProgress);

    runSmoothScroll();

    window.clearTimeout(snapTimer);
    snapTimer = window.setTimeout(snapIfClose, 420);
  };

  const onWheel = (event: WheelEvent) => {
    if (section.hidden) return;

    const distance = scrollableDistance();
    const atStart = scroller.scrollTop <= 0;
    const atEnd = scroller.scrollTop >= distance - 1;

    if ((atStart && event.deltaY < 0) || (atEnd && event.deltaY > 0)) {
      edgeRubber += event.deltaY * 0.1;
      edgeRubber = clamp(edgeRubber, -48, 48);
    }
  };

  const positionExpandOrb = () => {
    const rect = trigger.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height * 0.85;

    expandOrb.style.left = `${x}px`;
    expandOrb.style.top = `${y}px`;
    expand.style.setProperty('--orb-x', `${(x / window.innerWidth) * 100}%`);
    expand.style.setProperty('--orb-y', `${(y / window.innerHeight) * 100}%`);
  };

  const open = () => {
    if (isOpening || !section.hidden) return;
    isOpening = true;

    document.documentElement.style.setProperty('--dot-hover-progress', '0');
    document.documentElement.style.setProperty('--text-dim', '0');

    positionExpandOrb();
    expand.setAttribute('aria-hidden', 'false');
    expand.classList.add('is-active');

    // Force a reflow so the browser records the pre-transition transform. Batched
    // with is-expanding it can skip the transition entirely, and then transitionend
    // never fires.
    void expandOrb.offsetWidth;
    expand.classList.add('is-expanding');

    let finished = false;

    const finishOpen = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(expandFallbackTimer);
      expandOrb.removeEventListener('transitionend', onExpanded);

      section.hidden = false;
      section.setAttribute('aria-hidden', 'false');
      trigger.setAttribute('aria-expanded', 'true');
      document.body.classList.add('thought-open');

      measure();
      currentStep = 0;
      targetProgress = 0;
      displayProgress = 0;
      scrollVelocity = 0;
      edgeRubber = 0;
      iconDrawProgress.clear();
      scroller.scrollTop = 0;
      applyProgress(0);

      section.classList.add('is-visible');
      expand.classList.remove('is-expanding', 'is-active');
      expand.setAttribute('aria-hidden', 'true');

      runSmoothScroll();
      isOpening = false;
    };

    const onExpanded = (event: TransitionEvent) => {
      if (event.target !== expandOrb || event.propertyName !== 'transform') return;
      finishOpen();
    };

    expandOrb.addEventListener('transitionend', onExpanded);

    /**
     * The whole open used to hang off that one event. When it does not fire — a
     * dropped transition on a huge composited layer, a backgrounded tab — the
     * overlay never opens *and* the expand layer stays over the trigger, so no
     * further click can get through. Slightly longer than the 0.9s transition.
     */
    expandFallbackTimer = window.setTimeout(finishOpen, 1200);
  };

  const close = () => {
    if (section.hidden) return;

    loopRunning = false;
    cancelAnimationFrame(rafId);
    window.clearTimeout(snapTimer);
    window.clearTimeout(expandFallbackTimer);
    isOpening = false;
    // Never leave the expand layer up: it covers the trigger and blocks reopening.
    expand.classList.remove('is-expanding', 'is-active');
    expand.setAttribute('aria-hidden', 'true');

    section.classList.remove('is-visible');
    section.hidden = true;
    section.setAttribute('aria-hidden', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('thought-open');

    currentStep = 0;
    targetProgress = 0;
    displayProgress = 0;
    scrollVelocity = 0;
    edgeRubber = 0;
    iconDrawProgress.clear();
    scroller.scrollTop = 0;
    applyProgress(0);
  };

  if (!initialized) {
    initialized = true;

    let hoverOpenTimer = 0;
    let hoverRippleRaf = 0;
    let hoverReleaseRaf = 0;
    let hoverStart = 0;
    let hoverSceneProgress = 0;
    const hoverOpenMs = 5000;
    const hoverReleaseEase = 0.07;
    const anchor = trigger.closest<HTMLElement>('.hero__thought-anchor');

    const easeInOut = (t: number) =>
      t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const setDotHoverProgress = (value: number) => {
      hoverSceneProgress = value;
      document.documentElement.style.setProperty('--dot-hover-progress', String(value));
    };

    const cancelHoverRelease = () => {
      cancelAnimationFrame(hoverReleaseRaf);
      hoverReleaseRaf = 0;
    };

    const releaseDotHoverProgress = () => {
      cancelHoverRelease();

      const tick = () => {
        hoverSceneProgress += (0 - hoverSceneProgress) * hoverReleaseEase;
        setDotHoverProgress(hoverSceneProgress);

        if (hoverSceneProgress > 0.006) {
          hoverReleaseRaf = requestAnimationFrame(tick);
        } else {
          setDotHoverProgress(0);
        }
      };

      hoverReleaseRaf = requestAnimationFrame(tick);
    };

    const resetHoverRipples = () => {
      if (!anchor) return;
      anchor.classList.remove('is-hovered');
      anchor.style.removeProperty('--ripple-max-scale');
      anchor.style.removeProperty('--ripple-duration');
    };

    const updateHoverRipples = () => {
      if (!anchor) return;

      const elapsed = performance.now() - hoverStart;
      const progress = Math.min(1, elapsed / hoverOpenMs);
      const eased = easeInOut(progress);
      const maxScale = 5 + eased * 32;
      const duration = 2.4 + eased * 4.5;

      setDotHoverProgress(eased);
      anchor.style.setProperty('--ripple-max-scale', String(maxScale));
      anchor.style.setProperty('--ripple-duration', `${duration}s`);

      if (progress < 1) {
        hoverRippleRaf = requestAnimationFrame(updateHoverRipples);
      }
    };

    const startHoverHold = () => {
      if (!section.hidden) return;

      window.clearTimeout(hoverOpenTimer);
      cancelAnimationFrame(hoverRippleRaf);
      cancelHoverRelease();

      anchor?.classList.add('is-hovered');
      hoverStart = performance.now();
      hoverRippleRaf = requestAnimationFrame(updateHoverRipples);

      hoverOpenTimer = window.setTimeout(() => {
        endHoverHold();
        if (section.hidden) open();
      }, hoverOpenMs);
    };

    const endHoverHold = () => {
      window.clearTimeout(hoverOpenTimer);
      cancelAnimationFrame(hoverRippleRaf);
      resetHoverRipples();
      releaseDotHoverProgress();
    };

    trigger.addEventListener('click', () => {
      endHoverHold();
      if (section.hidden) open();
      else close();
    });

    trigger.addEventListener('mouseenter', startHoverHold);
    trigger.addEventListener('mouseleave', endHoverHold);

    const headerLogo = document.querySelector<HTMLAnchorElement>('.site-logo');
    if (headerLogo) {
      headerLogo.addEventListener('click', (event) => {
        if (!section.hidden) {
          event.preventDefault();
          close();
        }
      });
    }

    document.addEventListener('keydown', (event) => {
      if (section.hidden) return;

      if (event.key === 'Escape') {
        close();
        return;
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault();
        goToStep(currentStep + 1);
      }

      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        goToStep(currentStep - 1);
      }
    });

    scroller.addEventListener('scroll', onScroll, { passive: true });
    scroller.addEventListener('wheel', onWheel, { passive: true });

    scroller.addEventListener(
      'touchend',
      () => {
        window.clearTimeout(snapTimer);
        snapTimer = window.setTimeout(snapIfClose, 320);
      },
      { passive: true },
    );

    window.addEventListener('resize', () => {
      measure();
      goToStep(currentStep, false);
      displayProgress = targetProgress;
      scrollVelocity = 0;
      scroller.scrollTop = targetProgress * scrollableDistance();
      applyProgress(displayProgress);
    });

    section.querySelectorAll<HTMLAnchorElement>('.thought-box--cta .scroll-arrow-cta').forEach((link) => {
      link.addEventListener('click', () => close());
    });
  }

  measure();
  boxes?.forEach((box) => {
    box.style.opacity = '0';
  });
}
