/* global jsyaml, marked, bootstrap */

(function () {
  "use strict";

  const DATA_FILES = {
    site: "data/site.yml",
    about: "data/about.yml",
    cv: "data/cv.yml",
    researchPubs: "data/research_pubs.yml",
    hobbies: "data/hobbies.yml",
    posts: "data/posts.yml",
    contact: "data/contact.yml",
  };

  const state = {
    data: {},
    cvFilter: "all",
    postsBySlug: new Map(),
  };

  async function fetchYaml(path) {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load ${path}: ${response.status}`);
    }
    const text = await response.text();
    return jsyaml.load(text);
  }

  function splitTitle(title) {
    if (!title) return { first: "", rest: "" };
    const parts = title.trim().split(/\s+/);
    if (parts.length === 1) {
      return { first: parts[0], rest: "" };
    }
    return {
      first: parts[0],
      rest: parts.slice(1).join(" "),
    };
  }

  function getSectionColor(sectionRef) {
    if (!sectionRef) return "#57cbcc";
    if (sectionRef.startsWith("#") && /^#[0-9a-fA-F]{3,8}$/.test(sectionRef)) {
      return sectionRef;
    }
    const secId = sectionRef.startsWith("#") ? sectionRef : `#${sectionRef}`;
    if (state.data && state.data.site && Array.isArray(state.data.site.menu)) {
      const match = state.data.site.menu.find(
        (m) =>
          m.url === secId ||
          (Array.isArray(m.match_sections) && m.match_sections.includes(secId))
      );
      if (match && match.color) return match.color;
    }
    const colorMap = {
      "#about": "#6cb670",
      "#cv": "#fbbf24",
      "#research": "#818cf8",
      "#publications": "#818cf8",
      "#hobbies": "#f472b6",
      "#posts": "#fb923c",
      "#contact": "#2dd4bf",
    };
    return colorMap[secId] || "#57cbcc";
  }

  function renderSectionHeader(title, subtitle, sectionRef) {
    const { first, rest } = splitTitle(title);
    const color = getSectionColor(sectionRef);
    return `
      <div class="section-header" style="--section-accent: ${color};">
        <h2 class="section-title">
          <span class="section-title-highlight" style="color: ${color};">${first}</span>${rest ? ` <span class="text-white">${rest}</span>` : ""}
        </h2>
        ${subtitle ? `<p class="text-secondary mb-2">${subtitle}</p>` : ""}
        <div class="section-divider"></div>
      </div>
    `;
  }

  function renderCornerMenu(site) {
    const navList = document.getElementById("corner-nav-list");
    const logoImg = document.getElementById("corner-btn-logo");

    if ((site.logo_webp || site.logo) && logoImg) {
      logoImg.src = site.logo_webp || site.logo;
      logoImg.alt = site.title || "Logo";
    }

    const defaultColors = [
      "#57cbcc",
      "#6cb670",
      "#fbbf24",
      "#818cf8",
      "#f472b6",
      "#fb923c",
      "#2dd4bf",
    ];

    if (navList && Array.isArray(site.menu)) {
      navList.innerHTML = site.menu
        .map((item, idx) => {
          const matches = Array.isArray(item.match_sections)
            ? item.match_sections.join(",")
            : item.url;
          const color = item.color || defaultColors[idx % defaultColors.length];
          return `
            <li>
              <a class="corner-nav-link ${idx === 0 ? "active" : ""}"
                 href="${item.url}"
                 data-nav-target="${item.url}"
                 data-nav-matches="${matches}"
                 data-item-color="${color}"
                 style="--nav-item-color: ${color};">
                <i class="bi ${item.icon || "bi-circle"}"></i>
                <span>${item.name}</span>
              </a>
            </li>
          `;
        })
        .join("");
    }
  }

  function renderHero(site) {
    const heroBg = document.getElementById("hero-parallax-bg");
    const heroContainer = document.getElementById("hero-content");
    if (!heroContainer || !site.banner) return;

    const b = site.banner;
    if (heroBg) {
      heroBg.style.backgroundImage = `url("${b.bg_image_webp || b.bg_image}")`;
    }

    heroContainer.innerHTML = `
      <div class="hero-pulse-badge">
        ${
          site.logo_webp || site.logo
            ? `<img src="${site.logo_webp || site.logo}" alt="${b.title || site.title}">`
            : `<i class="bi bi-activity"></i>`
        }
      </div>
      <h1 class="hero-title">${b.title || site.title}</h1>
      ${
        b.subtitle
          ? `<p class="hero-subtitle">${b.subtitle.replace("•", '<span class="hero-bullet">•</span>')}</p>`
          : ""
      }
      ${
        b.tagline
          ? `
      <div>
        <a href="#about" class="scroll-down-btn" aria-label="Scroll to About section">
          <span>${b.tagline}</span>
          <i class="bi bi-chevron-double-down"></i>
        </a>
      </div>
      `
          : ""
      }
    `;
  }

  function renderAbout(about) {
    const container = document.getElementById("about-container");
    if (!container || !about || !about.enable) return;

    const parseText = (text) => {
      if (window.marked && typeof marked.parseInline === "function") {
        let html = marked.parseInline(text || "");
        return html.replace(/<a\s+(?:(?!(?:target=))[^>])+>/gi, (match) =>
          match.replace("<a ", '<a target="_blank" rel="noopener noreferrer" ')
        );
      }
      return text || "";
    };

    const paragraphsHtml = (about.paragraphs || [])
      .map((p) => `<p class="text-secondary mb-3">${parseText(p)}</p>`)
      .join("");

    container.innerHTML = `
      ${renderSectionHeader(about.title, null, "#about")}
      <div class="about-card">
        <div class="row g-0 align-items-stretch">
          <div class="col-lg-5 about-image-col" style="background-image: url('${about.image_webp || about.image}');">
          </div>
          <div class="col-lg-7 p-4 p-lg-5 d-flex flex-column justify-content-center">
            ${paragraphsHtml}
          </div>
        </div>
      </div>
    `;
  }

  const cvPointColors = [
    "#57cbcc",
    "#2dd4bf",
    "#6cb670",
    "#a3e635",
    "#fbbf24",
    "#fb923c",
    "#f472b6",
    "#c084fc",
    "#818cf8",
  ];

  function drawTimelineWave() {
    const timelineEl = document.getElementById("cv-timeline-list");
    const svgEl = document.getElementById("cv-timeline-wave");
    if (!timelineEl || !svgEl) return;

    const totalHeight = Math.max(timelineEl.offsetHeight, 200);
    const width = 64;
    const centerX = width / 2;
    const isMobile = window.innerWidth < 768;
    const amp = isMobile ? 6 : 12;

    svgEl.setAttribute("viewBox", `0 0 ${width} ${totalHeight}`);

    const items = Array.from(timelineEl.querySelectorAll(".timeline-item"));
    if (items.length === 0) return;

    const points = [{ x: centerX, y: 0 }];

    items.forEach((item, idx) => {
      const marker = item.querySelector(".timeline-marker");
      const markerY = item.offsetTop + (marker ? marker.offsetTop + marker.offsetHeight / 2 : 36);
      const dir = isMobile ? (idx % 2 === 0 ? -1 : 1) : idx % 2 === 0 ? -1 : 1;
      points.push({ x: centerX + dir * amp, y: markerY });
    });

    points.push({ x: centerX, y: totalHeight });

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const midY = (p0.y + p1.y) / 2;
      d += ` C ${p0.x} ${midY}, ${p1.x} ${midY}, ${p1.x} ${p1.y}`;
    }

    const pathEl = svgEl.querySelector("path");
    if (pathEl) {
      pathEl.setAttribute("d", d);
      pathEl.setAttribute("stroke", "url(#timelineWaveGrad)");
    }

    // Dynamic gradient stops transitioning between point colors along the path
    const gradEl = svgEl.querySelector("#timelineWaveGrad");
    if (gradEl) {
      const firstColor = items[0].getAttribute("data-item-color") || "#57cbcc";
      const lastColor = items[items.length - 1].getAttribute("data-item-color") || "#818cf8";
      const stops = [];

      stops.push(`<stop offset="0%" stop-color="${firstColor}" />`);

      items.forEach((item) => {
        const marker = item.querySelector(".timeline-marker");
        const markerY = item.offsetTop + (marker ? marker.offsetTop + marker.offsetHeight / 2 : 36);
        const color = item.getAttribute("data-item-color") || firstColor;
        const pct = Math.max(0, Math.min(100, (markerY / totalHeight) * 100)).toFixed(2);
        stops.push(`<stop offset="${pct}%" stop-color="${color}" />`);
      });

      stops.push(`<stop offset="100%" stop-color="${lastColor}" />`);
      gradEl.innerHTML = stops.join("");
    }
  }

  function renderCvTimelineItems(events, filter) {
    const filtered =
      filter === "all"
        ? events
        : events.filter((ev) => ev.category === filter);

    const itemsHtml = filtered
      .map((ev, idx) => {
        const isEdu = ev.category === "education";
        const badgeClass = isEdu ? "badge-education" : "badge-employment";
        const iconClass = isEdu ? "bi-mortarboard-fill" : "bi-briefcase-fill";
        const sideClass = idx % 2 === 0 ? "timeline-left" : "timeline-right";
        const color = ev.color || cvPointColors[idx % cvPointColors.length];
        const markerClass = ev.image ? "timeline-marker has-image" : "timeline-marker";
        const markerInner = ev.image
          ? `<img src="${ev.image}" alt="${ev.role} (${ev.period})" class="timeline-marker-img">`
          : "";
        return `
          <div class="timeline-item ${sideClass}" data-category="${ev.category}" data-item-color="${color}" style="--item-color: ${color};">
            <div class="${markerClass}" title="${ev.role} (${ev.period})">${markerInner}</div>
            <div class="timeline-card">
              <div class="timeline-meta">
                <span class="timeline-period">
                  <i class="bi bi-calendar3 me-1"></i>${ev.period}
                </span>
                <span class="timeline-badge ${badgeClass}">
                  <i class="bi ${iconClass} me-1"></i>${ev.type_label}
                </span>
              </div>
              <h3 class="timeline-role">${ev.role}</h3>
              <div class="timeline-org">${ev.organization}</div>
              ${
                ev.location
                  ? `<div class="timeline-location"><i class="bi bi-geo-alt me-1"></i>${ev.location}</div>`
                  : ""
              }
              ${ev.details ? `<p class="timeline-details">${ev.details}</p>` : ""}
            </div>
          </div>
        `;
      })
      .join("");

    return `
      <svg id="cv-timeline-wave" class="timeline-wave-svg" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="timelineWaveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#57cbcc" />
            <stop offset="100%" stop-color="#818cf8" />
          </linearGradient>
        </defs>
        <path d="" fill="none" stroke="url(#timelineWaveGrad)" stroke-width="3" stroke-linecap="round" />
      </svg>
      ${itemsHtml}
    `;
  }

  function renderCv(cv) {
    const container = document.getElementById("cv-container");
    if (!container || !cv || !cv.enable) return;

    const events = cv.events || [];
    const empCount = events.filter((e) => e.category === "employment").length;
    const eduCount = events.filter((e) => e.category === "education").length;

    container.innerHTML = `
      ${renderSectionHeader(cv.title, cv.subtitle, "#cv")}
      <div class="timeline-filter-bar" role="group" aria-label="Filter CV timeline">
        <button type="button" class="timeline-filter-btn active" data-cv-filter="all">
          All Events (${events.length})
        </button>
        <button type="button" class="timeline-filter-btn" data-cv-filter="employment">
          <i class="bi bi-briefcase me-1"></i>Employment (${empCount})
        </button>
        <button type="button" class="timeline-filter-btn" data-cv-filter="education">
          <i class="bi bi-mortarboard me-1"></i>Education (${eduCount})
        </button>
      </div>
      <div class="linear-timeline" id="cv-timeline-list">
        ${renderCvTimelineItems(events, state.cvFilter)}
      </div>
    `;

    requestAnimationFrame(drawTimelineWave);
    window.addEventListener("resize", drawTimelineWave, { passive: true });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(drawTimelineWave);
    }

    container.querySelectorAll("[data-cv-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.cvFilter = btn.getAttribute("data-cv-filter");
        container
          .querySelectorAll("[data-cv-filter]")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const listEl = document.getElementById("cv-timeline-list");
        if (listEl) {
          listEl.innerHTML = renderCvTimelineItems(events, state.cvFilter);
          requestAnimationFrame(drawTimelineWave);
        }
      });
    });
  }

  function renderResearchAndPubs(rp) {
    const researchContainer = document.getElementById("research-container");
    const pubsContainer = document.getElementById("publications-container");
    if (!rp) return;

    if (researchContainer && rp.research && rp.research.enable) {
      const r = rp.research;
      researchContainer.innerHTML = `
        ${renderSectionHeader(r.title, r.subtitle, "#research")}
        <div class="row justify-content-center mb-4">
          <div class="col-lg-8 text-center">
            <p class="lead text-secondary mb-4">${r.description}</p>
            <div class="d-flex flex-wrap justify-content-center gap-3">
              ${
                r.primary_link
                  ? `<a href="${r.primary_link.url}" target="_blank" rel="noopener noreferrer" class="btn-ddmms-primary">
                      <i class="bi ${r.primary_link.icon}"></i>
                      <span>${r.primary_link.label}</span>
                    </a>`
                  : ""
              }
              ${
                r.profile_link
                  ? `<a href="${r.profile_link.url}" target="_blank" rel="noopener noreferrer" class="btn-ddmms-outline">
                      <i class="bi ${r.profile_link.icon}"></i>
                      <span>${r.profile_link.label}</span>
                    </a>`
                  : ""
              }
              ${
                r.cmms_link
                  ? `<a href="${r.cmms_link.url}" target="_blank" rel="noopener noreferrer" class="btn-ddmms-outline">
                      <i class="bi ${r.cmms_link.icon || "bi-building"}"></i>
                      <span>${r.cmms_link.label}</span>
                    </a>`
                  : ""
              }
            </div>
          </div>
        </div>
        <div class="row g-4 mt-2">
          ${(r.highlights || [])
            .map(
              (h) => `
            <div class="col-md-4">
              <div class="surface-card">
                <div class="card-icon-badge">
                  <i class="bi ${h.icon}"></i>
                </div>
                <h3 class="h5 text-white mb-2">${h.title}</h3>
                <p class="text-secondary small flex-grow-1 mb-3">${h.description}</p>
                <a href="${h.link}" target="_blank" rel="noopener noreferrer" class="small fw-semibold">
                  Read more on DDMMS <i class="bi bi-arrow-up-right ms-1"></i>
                </a>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      `;
    }

    if (pubsContainer && rp.publications && rp.publications.enable) {
      const p = rp.publications;
      pubsContainer.innerHTML = `
        ${renderSectionHeader(p.title, p.subtitle, "#publications")}
        <div class="row justify-content-center">
          <div class="col-lg-9">
            <div class="surface-card p-4 p-lg-5 text-center">
              <div class="card-icon-badge mx-auto">
                <i class="bi bi-journal-richtext"></i>
              </div>
              <h3 class="h4 text-white mb-3">Publications &amp; Preprints on DDMMS</h3>
              <p class="text-secondary mb-4 mx-auto" style="max-width: 660px;">
                ${p.description}
              </p>
              <div class="d-flex flex-wrap justify-content-center gap-3">
                ${(p.links || [])
                  .map(
                    (link) => `
                  <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="${
                      link.primary ? "btn-ddmms-primary" : "btn-ddmms-outline"
                    }">
                    <i class="bi ${link.icon}"></i>
                    <span>${link.label}</span>
                    <i class="bi bi-box-arrow-up-right small"></i>
                  </a>
                `
                  )
                  .join("")}
              </div>
            </div>
          </div>
        </div>
      `;
    }
  }

  function renderHobbies(hobbies) {
    const container = document.getElementById("hobbies-container");
    if (!container || !hobbies || !hobbies.enable) return;

    container.innerHTML = `
      ${renderSectionHeader(hobbies.title, hobbies.subtitle, "#hobbies")}
      <div class="row g-4 justify-content-center">
        ${(hobbies.items || [])
          .map(
            (item) => `
          <div class="col-md-6">
            <article class="post-card">
              <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="d-block overflow-hidden" aria-label="${item.name}">
                <img
                  src="${item.image_webp || item.image}"
                  onerror="this.onerror=null;this.src='${item.image}';"
                  alt="${item.name}"
                  class="post-card-img"
                  loading="lazy"
                >
              </a>
              <div class="post-card-body">
                <div class="d-flex align-items-center justify-content-between mb-2">
                  <span class="timeline-badge badge-employment">
                    <i class="bi ${item.icon || "bi-tools"} me-1"></i>${item.badge || "Hobby"}
                  </span>
                </div>
                <h3 class="h5 text-white mb-2">
                  <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="text-white text-decoration-none">
                    ${item.name}
                  </a>
                </h3>
                <p class="text-secondary small flex-grow-1 mb-3">
                  ${item.description || ""}
                </p>
                <div class="mt-auto">
                  <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="btn-ddmms-outline btn-sm">
                    <span>${item.link_label || "Explore"}</span>
                    <i class="bi bi-box-arrow-up-right small"></i>
                  </a>
                </div>
              </div>
            </article>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  function openPostModal(slug) {
    const post = state.postsBySlug.get(slug);
    if (!post) return;

    const modalEl = document.getElementById("postReaderModal");
    const titleEl = document.getElementById("postModalTitle");
    const metaEl = document.getElementById("postModalMeta");
    const bodyEl = document.getElementById("postModalBody");
    if (!modalEl || !titleEl || !bodyEl) return;

    titleEl.textContent = post.title;
    metaEl.innerHTML = `
      <span><i class="bi bi-calendar3 me-1"></i>${post.date}</span>
      <span class="mx-2">•</span>
      <span><i class="bi bi-person me-1"></i>${post.author || "Alin M Elena"}</span>
    `;
    bodyEl.innerHTML = marked.parse(post.content || "");

    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  }

  function renderPosts(postsData) {
    const container = document.getElementById("posts-container");
    if (!container || !postsData || !postsData.enable) return;

    const enabledPosts = (postsData.posts || []).filter((p) => p.enable !== false);
    enabledPosts.forEach((p) => state.postsBySlug.set(p.slug, p));

    container.innerHTML = `
      ${renderSectionHeader(postsData.title, null, "#posts")}
      <div class="row g-4">
        ${enabledPosts
          .map(
            (post) => `
          <div class="col-md-6 col-lg-3">
            <article class="post-card" data-post-slug="${post.slug}" tabindex="0" role="button" aria-label="Read ${post.title}">
              <img
                src="${post.image_webp || post.image}"
                onerror="this.onerror=null;this.src='${post.image}';"
                alt="${post.title}"
                class="post-card-img"
                loading="lazy"
              >
              <div class="post-card-body">
                <div class="small text-muted mb-1">
                  <i class="bi bi-calendar3 me-1"></i>${post.date}
                </div>
                <h3 class="h5 text-white mb-2">${post.title}</h3>
                <p class="text-secondary small flex-grow-1 mb-3">
                  ${post.summary || post.description || ""}
                </p>
                <div class="mt-auto">
                  <span class="small fw-semibold text-info">
                    Read article <i class="bi bi-arrow-right ms-1"></i>
                  </span>
                </div>
              </div>
            </article>
          </div>
        `
          )
          .join("")}
      </div>
    `;

    container.querySelectorAll("[data-post-slug]").forEach((card) => {
      const trigger = () => {
        const slug = card.getAttribute("data-post-slug");
        history.replaceState(null, "", `#post/${slug}`);
        openPostModal(slug);
      };
      card.addEventListener("click", trigger);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          trigger();
        }
      });
    });

    const modalEl = document.getElementById("postReaderModal");
    if (modalEl) {
      modalEl.addEventListener("hidden.bs.modal", () => {
        if (window.location.hash.startsWith("#post/")) {
          history.replaceState(null, "", "#posts");
        }
      });
    }
  }

  function renderContact(contact, site) {
    const container = document.getElementById("contact-container");
    const footerContainer = document.getElementById("footer-container");
    if (container && contact && contact.enable) {
      container.innerHTML = `
        ${renderSectionHeader(contact.title, contact.subtitle, "#contact")}
        <div class="row g-4 align-items-stretch">
          <div class="col-lg-5">
            <div class="surface-card justify-content-center">
              <h3 class="h5 text-white mb-4">Contact Details</h3>
              <div class="d-flex flex-column gap-3">
                ${(contact.details || [])
                  .map(
                    (d) => `
                  <div class="d-flex align-items-start gap-3">
                    <div class="card-icon-badge mb-0 flex-shrink-0" style="width: 40px; height: 40px; font-size: 1.1rem;">
                      <i class="bi ${d.icon}"></i>
                    </div>
                    <div>
                      <div class="small text-muted text-uppercase">${d.label}</div>
                      ${
                        d.url
                          ? `<a href="${d.url}" class="fw-semibold">${d.value}</a>`
                          : `<div class="text-light">${d.value}</div>`
                      }
                    </div>
                  </div>
                `
                  )
                  .join("")}
              </div>
            </div>
          </div>
          <div class="col-lg-7">
            ${
              contact.map && contact.map.enable
                ? `<div class="map-frame-wrap">
                    <iframe
                      title="Daresbury Laboratory Map"
                      loading="lazy"
                      src="${contact.map.embed_url}">
                    </iframe>
                  </div>
                  <div class="text-end mt-2">
                    <a href="${contact.map.larger_map_url}" target="_blank" rel="noopener noreferrer" class="small text-secondary">
                      <i class="bi bi-map me-1"></i>View Larger Map on OpenStreetMap
                    </a>
                  </div>`
                : ""
            }
          </div>
        </div>
      `;
    }

    if (footerContainer && site) {
      const defaultPillColors = [
        "#57cbcc",
        "#a6ce39",
        "#4285f4",
        "#c9d1d9",
        "#fc6d26",
        "#0a66c2",
        "#ff3344",
      ];

      footerContainer.innerHTML = `
        <div class="d-flex justify-content-center flex-wrap gap-3 mb-3">
          ${(site.social || [])
            .map((s, idx) => {
              const color = s.color || defaultPillColors[idx % defaultPillColors.length];
              return `
            <a href="${s.url}" target="_blank" rel="noopener noreferrer"
               class="btn-social-pill btn-sm rounded-pill px-3 py-2"
               title="${s.name}"
               style="--pill-color: ${color};">
              <i class="bi ${s.icon}"></i>
              <span>${s.name}</span>
            </a>
          `;
            })
            .join("")}
        </div>
        <div class="text-secondary small">
          ${site.copyright || ""}
        </div>
      `;
    }
  }

  function applyDividers(site) {
    if (!site || !site.dividers) return;
    Object.entries(site.dividers).forEach(([key, val]) => {
      const el = document.querySelector(`[data-divider="${key}"]`);
      if (el && val) {
        const bgEl = el.querySelector(".parallax-bg") || el;
        bgEl.style.backgroundImage = `url("${val.bg_image_webp || val.bg_image}")`;
      }
    });
  }

  function initParallaxAndReveal() {
    const parallaxWindows = Array.from(
      document.querySelectorAll(".parallax-window")
    );
    const heroContent = document.getElementById("hero-content");
    let ticking = false;

    function updateParallax() {
      const viewportHeight = window.innerHeight;
      const scrollY = window.scrollY || window.pageYOffset;

      parallaxWindows.forEach((win) => {
        const bg = win.querySelector(".parallax-bg");
        if (!bg) return;
        const rect = win.getBoundingClientRect();
        if (rect.bottom < -100 || rect.top > viewportHeight + 100) return;

        const speed = parseFloat(win.getAttribute("data-parallax-speed")) || 0.38;
        const centerOffset = rect.top + rect.height / 2 - viewportHeight / 2;
        const translateY = -centerOffset * speed;
        bg.style.transform = `translate3d(0, ${translateY.toFixed(1)}px, 0)`;
      });

      if (heroContent && scrollY < viewportHeight) {
        const translateHero = scrollY * 0.28;
        const opacityHero = Math.max(0, 1 - scrollY / (viewportHeight * 0.8));
        heroContent.style.transform = `translate3d(0, ${translateHero.toFixed(1)}px, 0)`;
        heroContent.style.opacity = opacityHero.toFixed(3);
      }

      ticking = false;
    }

    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          window.requestAnimationFrame(updateParallax);
          ticking = true;
        }
      },
      { passive: true }
    );
    window.addEventListener("resize", updateParallax, { passive: true });
    updateParallax();

    // Section scroll-reveal observer
    const revealSections = document.querySelectorAll(".reveal-section");
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.12 }
    );
    revealSections.forEach((sec) => revealObserver.observe(sec));
  }

  function initCornerMenuInteractions() {
    const toggleBtn = document.getElementById("corner-menu-toggle");
    const panel = document.getElementById("corner-menu-panel");
    if (!toggleBtn || !panel) return;

    function closeMenu() {
      toggleBtn.setAttribute("aria-expanded", "false");
      panel.classList.remove("show");
    }

    function toggleMenu() {
      const expanded = toggleBtn.getAttribute("aria-expanded") === "true";
      if (expanded) {
        closeMenu();
      } else {
        toggleBtn.setAttribute("aria-expanded", "true");
        panel.classList.add("show");
      }
    }

    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    panel.addEventListener("click", (e) => {
      const link = e.target.closest("a[href^='#']");
      if (link) {
        closeMenu();
      }
    });

    document.addEventListener("click", (e) => {
      if (!panel.contains(e.target) && !toggleBtn.contains(e.target)) {
        closeMenu();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeMenu();
      }
    });

    // Scroll spy for corner menu active state and button label
    const currentSectionLabel = document.getElementById("corner-current-section");
    const sections = document.querySelectorAll("section[id]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = `#${entry.target.id}`;
            document.querySelectorAll(".corner-nav-link").forEach((link) => {
              const matches = (link.getAttribute("data-nav-matches") || link.getAttribute("href") || "")
                .split(",")
                .map((s) => s.trim());
              const isMatch = matches.includes(id);
              link.classList.toggle("active", isMatch);
              if (isMatch && currentSectionLabel) {
                currentSectionLabel.textContent = link.textContent.trim();
                const itemColor = link.getAttribute("data-item-color");
                if (itemColor) {
                  currentSectionLabel.style.color = itemColor;
                }
              }
            });
          }
        });
      },
      { rootMargin: "-35% 0px -55% 0px" }
    );

    sections.forEach((sec) => observer.observe(sec));
  }

  function handleInitialHash() {
    const hash = window.location.hash;
    if (hash && hash.startsWith("#post/")) {
      const slug = hash.replace("#post/", "");
      openPostModal(slug);
    }
  }

  async function init() {
    try {
      const [
        site,
        about,
        cv,
        researchPubs,
        hobbies,
        posts,
        contact,
      ] = await Promise.all([
        fetchYaml(DATA_FILES.site),
        fetchYaml(DATA_FILES.about),
        fetchYaml(DATA_FILES.cv),
        fetchYaml(DATA_FILES.researchPubs),
        fetchYaml(DATA_FILES.hobbies),
        fetchYaml(DATA_FILES.posts),
        fetchYaml(DATA_FILES.contact),
      ]);

      state.data = {
        site,
        about,
        cv,
        researchPubs,
        hobbies,
        posts,
        contact,
      };

      renderCornerMenu(site);
      renderHero(site);
      applyDividers(site);
      renderAbout(about);
      renderCv(cv);
      renderResearchAndPubs(researchPubs);
      renderHobbies(hobbies);
      renderPosts(posts);
      renderContact(contact, site);
      initCornerMenuInteractions();
      initParallaxAndReveal();
      handleInitialHash();
    } catch (err) {
      console.error("Error initializing site from YAML:", err);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();

