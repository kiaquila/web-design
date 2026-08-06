/* Alpha Lumen — the only client-side script on the site.

   The header works without it: the catalogue menus are native <details>
   disclosures and the navigation is visible by default. This script adds the
   behaviour browsers do not give for free — a mobile menu toggle, closing
   sibling menus, and dismissing an open menu with a click outside or Escape. */

(function () {
  "use strict";

  var nav = document.getElementById("primary-nav");
  var toggle = document.querySelector(".nav-toggle");
  var menus = Array.prototype.slice.call(document.querySelectorAll(".nav-menu"));
  var mobile = window.matchMedia("(max-width: 900px)");

  function closeMenus(except) {
    menus.forEach(function (menu) {
      if (menu !== except) menu.open = false;
    });
  }

  function syncViewport() {
    if (!nav || !toggle) return;
    if (mobile.matches) {
      nav.hidden = toggle.getAttribute("aria-expanded") !== "true";
    } else {
      nav.hidden = false;
      toggle.setAttribute("aria-expanded", "false");
    }
    closeMenus(null);
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.hidden = open;
      if (open) closeMenus(null);
    });
  }

  menus.forEach(function (menu) {
    menu.addEventListener("toggle", function () {
      if (menu.open) closeMenus(menu);
    });
  });

  document.addEventListener("click", function (event) {
    if (mobile.matches) return;
    if (event.target.closest(".nav-item--menu")) return;
    closeMenus(null);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    closeMenus(null);
    if (
      mobile.matches &&
      toggle &&
      toggle.getAttribute("aria-expanded") === "true"
    ) {
      toggle.setAttribute("aria-expanded", "false");
      nav.hidden = true;
      toggle.focus();
    }
  });

  if (mobile.addEventListener) mobile.addEventListener("change", syncViewport);
  syncViewport();
})();
