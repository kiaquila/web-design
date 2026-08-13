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
  const controls = document.querySelector("[data-carousel-controls]");

  if (track && controls) {
    const prev = controls.querySelector("[data-carousel-prev]");
    const next = controls.querySelector("[data-carousel-next]");

    /* One press moves one full page of cards, whatever the breakpoint decided
       a page holds. */
    const page = () => Math.max(track.clientWidth, 1);

    const sync = () => {
      const max = track.scrollWidth - track.clientWidth;
      /* With only a couple of projects the track does not overflow at all, and
         two permanently dead arrows read as breakage. */
      const overflows = max > 4;
      controls.toggleAttribute("hidden", !overflows);
      if (!overflows) return;
      prev.disabled = track.scrollLeft <= 4;
      next.disabled = track.scrollLeft >= max - 4;
    };

    prev.addEventListener("click", () => {
      track.scrollBy({ left: -page(), behavior: scrollBehavior() });
    });
    next.addEventListener("click", () => {
      track.scrollBy({ left: page(), behavior: scrollBehavior() });
    });

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
  const slides = document.querySelectorAll(".slide");
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
