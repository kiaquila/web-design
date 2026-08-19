/* Enhancement only. Without this file the page is a complete, readable CV:
   every section is visible, every link works, and the only thing missing is
   the print button — which is hidden in the markup precisely because a page
   with no script cannot honour it. */
(function () {
  "use strict";

  var doc = document.documentElement;

  var printButton = document.querySelector("[data-print]");
  if (printButton && typeof window.print === "function") {
    printButton.hidden = false;
    printButton.addEventListener("click", function () {
      window.print();
    });
  }

  var sections = [].slice.call(document.querySelectorAll("main section[id]"));
  if (!sections.length || !("IntersectionObserver" in window)) return;

  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    doc.classList.add("reveal-on");

    var reveal = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i += 1) {
          if (!entries[i].isIntersecting) continue;
          entries[i].target.classList.add("is-visible");
          reveal.unobserve(entries[i].target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.04 }
    );
    for (var i = 0; i < sections.length; i += 1) reveal.observe(sections[i]);
  }

  var navLinks = {};
  var links = document.querySelectorAll("[data-nav]");
  for (var n = 0; n < links.length; n += 1) {
    navLinks[links[n].getAttribute("data-nav")] = links[n];
  }

  /* Scroll spy: the active section is the topmost one still crossing the
     band just under the fixed masthead. */
  var onscreen = {};
  var spy = new IntersectionObserver(
    function (entries) {
      for (var i = 0; i < entries.length; i += 1) {
        onscreen[entries[i].target.id] = entries[i].isIntersecting;
      }
      var active = "";
      for (var s = 0; s < sections.length; s += 1) {
        if (onscreen[sections[s].id]) {
          active = sections[s].id;
          break;
        }
      }
      for (var id in navLinks) {
        if (!Object.prototype.hasOwnProperty.call(navLinks, id)) continue;
        if (id === active) navLinks[id].setAttribute("aria-current", "true");
        else navLinks[id].removeAttribute("aria-current");
      }
    },
    { rootMargin: "-20% 0px -60% 0px" }
  );
  for (var k = 0; k < sections.length; k += 1) spy.observe(sections[k]);
})();
