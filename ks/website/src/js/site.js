/* Progressive enhancement only.

   Every feature here upgrades something that already works without it: the nav
   is a visible list until this script can collapse and reopen it, the carousel
   is a native scroll container until this script can add buttons to it, and the
   portrait swaps on hover in CSS. Nothing is hidden in the markup waiting for
   JavaScript to reveal it. */

(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const scrollBehavior = () => (reduceMotion.matches ? "auto" : "smooth");

  const slides = document.querySelectorAll(".slide");

  /* --- header shadow ----------------------------------------------------- */

  const header = document.querySelector("[data-header]");
  if (header) {
    let ticking = false;
    const sync = () => {
      header.toggleAttribute("data-scrolled", window.scrollY > 8);
      ticking = false;
    };
    /* The listener only raises a flag; the read happens in the frame, so a
       fast flick costs one layout read rather than one per scroll event. */
    addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(sync);
      },
      { passive: true }
    );
    sync();
  }

  /* --- the language switch keeps your place ------------------------------- */

  /* Switching language halfway down the page used to land the reader back at
     the top, which loses the thing they were reading. The section ids are the
     same in every locale, so the switch only needs the id of the slide the
     reader is on appended to its href.

     It is resolved when the reader reaches for the switch rather than on every
     scroll frame: that costs nothing while reading, survives a background tab
     where animation frames are suspended, and is equally current for a click,
     a middle-click and a keyboard activation. The markup is untouched, so with
     no script at all the switch is the plain link it always was. */
  const langSwitch = document.querySelector(".lang-switch");
  if (langSwitch && slides.length) {
    const roots = new Map(
      [...langSwitch.querySelectorAll("a[href]")].map((link) => [
        link,
        link.getAttribute("href")
      ])
    );
    const stamp = () => {
      /* The slide crossing the middle of the viewport is the one being read —
         at a snap point that is unambiguous, and mid-scroll it matches what
         fills most of the screen. The hero has no id, and lands at the top. */
      const middle = window.innerHeight / 2;
      let current = "";
      for (const slide of slides) {
        const box = slide.getBoundingClientRect();
        if (box.top <= middle && box.bottom > middle) {
          current = slide.id;
          break;
        }
      }
      for (const [link, root] of roots) {
        link.setAttribute("href", current ? `${root}#${current}` : root);
      }
    };
    for (const type of ["pointerdown", "focusin", "click"]) {
      langSwitch.addEventListener(type, stamp);
    }

    /* And the arrival. A cross-document fragment is scrolled to through the
       root's `scroll-behavior: smooth`, which is an animation — a tab that is
       not yet visible suspends it, and the reader lands at the top of the page
       after all. Repeating the jump without animation makes the landing
       deterministic. The id is matched against the page's own slides rather
       than passed to a selector, so a hand-typed fragment cannot become one. */
    const land = () => {
      const wanted = location.hash.slice(1);
      if (!wanted) return;
      for (const slide of slides) {
        if (slide.id !== wanted) continue;
        const root = document.documentElement;
        const previous = root.style.scrollBehavior;
        root.style.scrollBehavior = "auto";
        slide.scrollIntoView();
        root.style.scrollBehavior = previous;
        return;
      }
    };
    land();
    /* Again after load: the browser runs its own fragment scroll around then,
       and it wins whatever this script did during parsing. */
    addEventListener("load", land);
  }

  /* --- mobile navigation -------------------------------------------------- */

  const nav = document.querySelector("#site-nav");
  const toggle = document.querySelector("[data-nav-toggle]");

  if (nav && toggle) {
    /* Collapsing is claimed only now, once there is something that can undo
       it. Before this line the nav is a plain visible list. */
    nav.setAttribute("data-collapsed", "");

    /* Taking the closed menu out of the tab order is the stylesheet's job —
       see the `visibility` rule in layout.css. The script only tracks the open
       state and moves focus, so there is no JS-held copy of the breakpoint to
       fall out of step with the CSS. */
    const setOpen = (open, restoreToggleFocus = true) => {
      /* Focus must leave before the subtree becomes unfocusable, or it is
         stranded on an element nothing can reach again. */
      if (!open && restoreToggleFocus && nav.contains(document.activeElement)) {
        toggle.focus();
      }
      nav.toggleAttribute("data-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    };

    toggle.addEventListener("click", () => {
      const open = !nav.hasAttribute("data-open");
      setOpen(open);
      /* The nav sits before the toggle in the document, so Tab from the button
         would carry on past the menu it just opened. Moving focus to the first
         link puts the keyboard where the eye already is. */
      if (open) nav.querySelector("a")?.focus();
    });

    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) setOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && nav.hasAttribute("data-open")) {
        setOpen(false);
        toggle.focus();
      }
    });

    /* Keep state tidy in both directions. On narrowing, focus must leave a
       desktop nav link as CSS hides the collapsed menu; on widening the nav
       stays visible, so moving focus to the now-hidden toggle would be wrong. */
    window
      .matchMedia("(min-width: 900px)")
      .addEventListener("change", (event) => {
        if (event.matches && document.activeElement === toggle) {
          nav.querySelector("a")?.focus();
        }
        setOpen(false, !event.matches);
      });
  }

  /* --- work carousel ------------------------------------------------------ */

  const track = document.querySelector("[data-carousel-track]");
  const carousel = document.querySelector("[data-carousel]");

  if (track && carousel) {
    const prev = carousel.querySelector("[data-carousel-prev]");
    const next = carousel.querySelector("[data-carousel-next]");

    /* One press moves exactly one card: the first card's box plus the gap. */
    const step = () => {
      const card = track.firstElementChild;
      if (!card) return Math.max(track.clientWidth, 1);
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return card.getBoundingClientRect().width + gap;
    };

    /* Chrome refuses to start a smooth programmatic scroll inside a nested
       scroller while the document itself snaps (the deck), so the glide is
       animated by hand. The target lands exactly on a card boundary, which
       is also where the snap points are. */
    const glide = (direction) => {
      const size = step();
      const max = track.scrollWidth - track.clientWidth;
      const to = Math.max(
        0,
        Math.min(Math.round(track.scrollLeft / size + direction) * size, max)
      );
      if (scrollBehavior() === "auto") {
        track.scrollLeft = to;
        return;
      }
      const from = track.scrollLeft;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - start) / 320);
        track.scrollLeft = from + (to - from) * (1 - (1 - p) ** 3);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    /* The arrows sit on the vertical centre of the screenshots, not of the
       whole card — the shot is what they page through. */
    const alignArrows = () => {
      const shot = track.querySelector(".work-shot");
      if (!shot) return;
      const box = carousel.getBoundingClientRect();
      const shotBox = shot.getBoundingClientRect();
      const top = `${shotBox.top - box.top + shotBox.height / 2}px`;
      prev.style.top = top;
      next.style.top = top;
    };

    const sync = () => {
      const max = track.scrollWidth - track.clientWidth;
      /* With only a couple of projects the track does not overflow at all, and
         two permanently dead arrows read as breakage. */
      const overflows = max > 4;
      prev.hidden = !overflows;
      next.hidden = !overflows;
      if (!overflows) return;
      prev.disabled = track.scrollLeft <= 4;
      next.disabled = track.scrollLeft >= max - 4;
      alignArrows();
    };

    prev.addEventListener("click", () => glide(-1));
    next.addEventListener("click", () => glide(1));

    let scrollTick = false;
    track.addEventListener(
      "scroll",
      () => {
        if (scrollTick) return;
        scrollTick = true;
        requestAnimationFrame(() => {
          sync();
          scrollTick = false;
        });
      },
      { passive: true }
    );

    /* Card widths are percentages of the track, so a resize changes both the
       page size and whether the track overflows at all. */
    if ("ResizeObserver" in window) {
      new ResizeObserver(sync).observe(track);
    } else {
      addEventListener("resize", sync, { passive: true });
    }

    sync();
  }

  /* --- soft slide reveals -------------------------------------------------- */

  /* The hidden initial state is claimed here, not in the markup: a visitor
     without JavaScript (or with reduced motion) gets every slide fully
     visible, because the CSS only hides content under `html.reveal-on`. */
  if (slides.length && "IntersectionObserver" in window && !reduceMotion.matches) {
    document.documentElement.classList.add("reveal-on");
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          entry.target.classList.toggle("in-view", entry.isIntersecting);
        }
      },
      { threshold: 0.2 }
    );
    slides.forEach((slide) => io.observe(slide));
  }

  /* --- portrait swap on touch --------------------------------------------- */

  const portrait = document.querySelector("[data-portrait]");
  if (portrait) {
    const canHover = window.matchMedia("(hover: hover)");

    portrait.addEventListener("click", () => {
      /* Pointer devices already swap on hover; a click there would fight it. */
      if (canHover.matches) return;
      portrait.toggleAttribute("data-active");
    });

    /* The frame is focusable so the swap is reachable from the keyboard, which
       means it also needs to answer to Enter and Space like a control. */
    portrait.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      portrait.toggleAttribute("data-active");
    });

    portrait.addEventListener("blur", () => {
      portrait.removeAttribute("data-active");
    });
  }
})();
