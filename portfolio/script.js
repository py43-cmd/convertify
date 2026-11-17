/* ============================================================
   Priyanshu — portfolio interactions
   No dependencies. Everything here is vanilla JS.
   ============================================================ */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  /* ── Theme ───────────────────────────────────────────────── */
  const root = document.documentElement;
  const themeToggle = $("#themeToggle");
  const themeColor = $('meta[name="theme-color"]');
  const storedTheme = localStorage.getItem("portfolio-theme");
  const initialTheme = storedTheme === "light" || storedTheme === "dark" ? storedTheme : "dark";

  function applyTheme(theme) {
    root.dataset.theme = theme;
    localStorage.setItem("portfolio-theme", theme);
    const isLight = theme === "light";
    themeToggle.setAttribute("aria-label", isLight ? "Switch to dark theme" : "Switch to light theme");
    if (themeColor) themeColor.setAttribute("content", isLight ? "#f5f3ec" : "#07070a");
  }
  applyTheme(initialTheme);

  themeToggle.addEventListener("click", () => {
    applyTheme(root.dataset.theme === "dark" ? "light" : "dark");
    showToast(root.dataset.theme === "light" ? "Lights on." : "Lights off.");
  });

  /* ── Scroll progress ─────────────────────────────────────── */
  const progressBar = $("#progressBar");
  const navWrap = $("#navWrap");

  function onScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    progressBar.style.width = pct + "%";
    navWrap.classList.toggle("scrolled", window.scrollY > 12);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  /* ── Reveal on scroll ────────────────────────────────────── */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );
  $$(".reveal").forEach((el) => revealObserver.observe(el));

  // Safety net: if IntersectionObserver is throttled (background tab, some
  // embedded previews), still reveal anything already in the viewport.
  function revealInView() {
    const limit = window.innerHeight * 0.94;
    $$(".reveal:not(.in)").forEach((el) => {
      if (el.getBoundingClientRect().top < limit) el.classList.add("in");
    });
  }
  revealInView();
  window.addEventListener("scroll", revealInView, { passive: true });
  window.addEventListener("resize", revealInView);

  /* ── Active nav link ─────────────────────────────────────── */
  const navLinks = $$(".nav-links a");
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        navLinks.forEach((link) => {
          link.classList.toggle("active", link.getAttribute("href") === "#" + id);
        });
      });
    },
    { rootMargin: "-42% 0px -52% 0px" }
  );
  $$("main section[id]").forEach((section) => sectionObserver.observe(section));

  /* ── Mobile menu ─────────────────────────────────────────── */
  const navToggle = $("#navToggle");
  const mobileMenu = $("#mobileMenu");

  function closeMobileMenu() {
    mobileMenu.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open menu");
  }

  navToggle.addEventListener("click", () => {
    const open = mobileMenu.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });

  $$("a", mobileMenu).forEach((link) => link.addEventListener("click", closeMobileMenu));
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMobileMenu();
  });

  /* ── Cursor glow ─────────────────────────────────────────── */
  const glow = $("#cursorGlow");
  if (finePointer && !reducedMotion && glow) {
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let active = false;

    window.addEventListener(
      "pointermove",
      (e) => {
        targetX = e.clientX;
        targetY = e.clientY;
        if (!active) {
          active = true;
          glow.style.opacity = "1";
        }
      },
      { passive: true }
    );

    const follow = () => {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      glow.style.transform = `translate(${currentX}px, ${currentY}px) translate(-50%, -50%)`;
      requestAnimationFrame(follow);
    };
    follow();
  }

  /* ── Project spotlight ───────────────────────────────────── */
  $$("[data-tilt]").forEach((card) => {
    card.addEventListener(
      "pointermove",
      (e) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - rect.left}px`);
        card.style.setProperty("--my", `${e.clientY - rect.top}px`);
      },
      { passive: true }
    );
  });

  /* ── Rotating role with scramble ─────────────────────────── */
  const roleEl = $("#role");
  const roles = [
    "web applications",
    "secure APIs",
    "AI-assisted tools",
    "payment flows",
    "things that ship",
  ];
  let roleIndex = 0;
  let roleToken = 0;
  const glyphs = "!<>-_\\/[]{}—=+*^?#";

  function scrambleTo(next) {
    if (reducedMotion) {
      roleEl.textContent = next;
      return;
    }
    const token = ++roleToken;
    const from = roleEl.textContent;
    const length = Math.max(from.length, next.length);
    const queue = [];

    for (let i = 0; i < length; i++) {
      const start = Math.floor(Math.random() * 12);
      const end = start + 4 + Math.floor(Math.random() * 14);
      queue.push({ from: from[i] || "", to: next[i] || "", start, end });
    }

    let frame = 0;
    const tick = () => {
      if (token !== roleToken) return;
      let output = "";
      let complete = 0;

      for (const item of queue) {
        if (frame >= item.end) {
          output += item.to;
          complete++;
        } else if (frame >= item.start) {
          output += glyphs[Math.floor(Math.random() * glyphs.length)];
        } else {
          output += item.from;
        }
      }

      roleEl.textContent = output;
      if (complete === queue.length) return;
      frame++;
      requestAnimationFrame(tick);
    };
    tick();
  }

  if (roleEl) {
    setInterval(() => {
      roleIndex = (roleIndex + 1) % roles.length;
      scrambleTo(roles[roleIndex]);
    }, 3200);
  }

  /* ── Toast ───────────────────────────────────────────────── */
  const toast = $("#toast");
  let toastTimer;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  /* ── Copy email ──────────────────────────────────────────── */
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const input = document.createElement("textarea");
      input.value = text;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    showToast("Email copied — talk soon.");
  }

  $$("[data-copy]").forEach((button) => {
    button.addEventListener("click", () => copyText(button.dataset.copy));
  });

  /* ── Command palette ─────────────────────────────────────── */
  const palette = $("#palette");
  const paletteBtn = $("#paletteBtn");
  const paletteInput = $("#paletteInput");
  const paletteList = $("#paletteList");
  let paletteItems = [];
  let paletteFiltered = [];
  let activeIndex = 0;

  const goTo = (hash) => {
    closePalette();
    const target = document.querySelector(hash);
    if (target) {
      target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      history.replaceState(null, "", hash);
    }
  };

  const commands = [
    { icon: "⌂", label: "Home", kind: "section", run: () => goTo("#top") },
    { icon: "◆", label: "Selected work", kind: "section", run: () => goTo("#work") },
    { icon: "☺", label: "About me", kind: "section", run: () => goTo("#about") },
    { icon: "⌘", label: "Tech stack", kind: "section", run: () => goTo("#stack") },
    { icon: "✉", label: "Contact", kind: "section", run: () => goTo("#contact") },
    {
      icon: "↗",
      label: "DevFlow AI — repository",
      kind: "project",
      run: () => window.open("https://github.com/py43-cmd/devflow_ai", "_blank", "noopener"),
    },
    {
      icon: "↗",
      label: "Skill Up — repository",
      kind: "project",
      run: () => window.open("https://github.com/py43-cmd/skill_up", "_blank", "noopener"),
    },
    {
      icon: "↗",
      label: "Convertify — repository",
      kind: "project",
      run: () => window.open("https://github.com/py43-cmd/convertify", "_blank", "noopener"),
    },
    {
      icon: "◐",
      label: "GitHub profile",
      kind: "link",
      run: () => window.open("https://github.com/py43-cmd", "_blank", "noopener"),
    },
    {
      icon: "✉",
      label: "Send an email",
      kind: "link",
      run: () => (window.location.href = "mailto:py431035@gmail.com"),
    },
    {
      icon: "⧉",
      label: "Copy email address",
      kind: "action",
      run: () => copyText("py431035@gmail.com"),
    },
    {
      icon: "◑",
      label: "Toggle theme",
      kind: "action",
      run: () => themeToggle.click(),
    },
  ];

  function setActive(index) {
    if (!paletteItems.length) return;
    activeIndex = (index + paletteItems.length) % paletteItems.length;
    paletteItems.forEach((item, i) => item.classList.toggle("is-active", i === activeIndex));
    paletteItems[activeIndex].scrollIntoView({ block: "nearest" });
  }

  function renderPalette(query) {
    const q = query.trim().toLowerCase();
    paletteFiltered = commands.filter(
      (command) =>
        command.label.toLowerCase().includes(q) || command.kind.toLowerCase().includes(q)
    );

    paletteList.innerHTML = "";

    if (!paletteFiltered.length) {
      const empty = document.createElement("li");
      empty.className = "palette-empty";
      empty.textContent = "No matches. Try “work”, “stack”, or “github”.";
      paletteList.appendChild(empty);
      paletteItems = [];
      return;
    }

    paletteFiltered.forEach((command) => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "palette-item";

      const icon = document.createElement("span");
      icon.className = "pi-icon";
      icon.textContent = command.icon;

      const label = document.createElement("span");
      label.textContent = command.label;

      const kind = document.createElement("span");
      kind.className = "pi-kind";
      kind.textContent = command.kind;

      button.append(icon, label, kind);
      button.addEventListener("click", () => {
        closePalette();
        command.run();
      });
      li.appendChild(button);
      paletteList.appendChild(li);
    });

    paletteItems = $$(".palette-item", paletteList);
    setActive(0);
  }

  function openPalette() {
    palette.hidden = false;
    paletteBtn.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    paletteInput.value = "";
    renderPalette("");
    window.setTimeout(() => paletteInput.focus(), 30);
  }

  function closePalette() {
    palette.hidden = true;
    paletteBtn.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  paletteBtn.addEventListener("click", () => {
    palette.hidden ? openPalette() : closePalette();
  });

  $$("[data-close-palette]").forEach((el) => el.addEventListener("click", closePalette));

  paletteInput.addEventListener("input", (e) => renderPalette(e.target.value));

  paletteInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(activeIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(activeIndex - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const command = paletteFiltered[activeIndex];
      if (command) {
        closePalette();
        command.run();
      }
    } else if (e.key === "Escape") {
      closePalette();
    }
  });

  document.addEventListener("keydown", (e) => {
    const isPaletteShortcut = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
    if (isPaletteShortcut) {
      e.preventDefault();
      palette.hidden ? openPalette() : closePalette();
    }
    if (e.key === "Escape" && !palette.hidden) closePalette();
  });

  // Show the right modifier hint on macOS.
  if (/Mac|iPhone|iPad/.test(navigator.platform)) {
    const firstKbd = $(".cmd-btn kbd");
    if (firstKbd) firstKbd.textContent = "⌘";
  }

  /* ── Footer year ─────────────────────────────────────────── */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
