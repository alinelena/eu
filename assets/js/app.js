/* global jsyaml, marked, bootstrap */

(function () {
  "use strict";

  const DATA_FILES = {
    site: "data/site.yml",
    about: "data/about.yml",
    cv: "data/cv.yml",
    researchPubs: "data/research_pubs.yml",
    collaborators: "data/collaborators.yml",
    news: "data/news.yml",
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

  function renderSectionHeader(title, subtitle) {
    const { first, rest } = splitTitle(title);
    return `
      <div class="section-header">
        <h2 class="section-title">
          ${first} ${rest ? `<span class="accent">${rest}</span>` : ""}
        </h2>
        ${subtitle ? `<p class="text-secondary mb-2">${subtitle}</p>` : ""}
        <div class="section-divider"></div>
      </div>
    `;
  }

  function renderCornerMenu(site) {
    const navList = document.getElementById("corner-nav-list");
    const quickLinks = document.getElementById("corner-quick-links");
    const logoImg = document.getElementById("corner-btn-logo");

    if (site.logo && logoImg) {
      logoImg.src = site.logo;
      logoImg.alt = site.title || "Logo";
    }

    if (navList && Array.isArray(site.menu)) {
      navList.innerHTML = site.menu
        .map(
          (item, idx) => `
          <li>
            <a class="corner-nav-link ${idx === 0 ? "active" : ""}" href="${item.url}" data-nav-target="${item.url}">
              <i class="bi ${item.icon || "bi-circle"}"></i>
              <span>${item.name}</span>
            </a>
          </li>
        `
        )
        .join("");
    }

    if (quickLinks && Array.isArray(site.social)) {
      quickLinks.innerHTML = site.social
        .slice(0, 4)
        .map(
          (s) => `
          <a class="corner-quick-badge" href="${s.url}" target="_blank" rel="noopener noreferrer">
            <i class="bi ${s.icon}"></i>
            <span>${s.name}</span>
          </a>
        `
        )
        .join("");
    }
  }

  function renderHero(site) {
    const heroSection = document.getElementById("hero");
    const heroContainer = document.getElementById("hero-content");
    if (!heroSection || !heroContainer || !site.banner) return;

    const b = site.banner;
    heroSection.style.backgroundImage = `url("${b.bg_image_webp || b.bg_image}")`;

    const badgesHtml = Array.isArray(b.badges)
      ? `<div class="hero-badges">
          ${b.badges
            .map(
              (badge) => `
              <a href="${badge.url}" class="hero-pill" target="_blank" rel="noopener noreferrer">
                <i class="bi ${badge.icon}"></i>
                <span>${badge.label}</span>
                <i class="bi bi-arrow-up-right small opacity-75"></i>
              </a>
            `
            )
            .join("")}
        </div>`
      : "";

    heroContainer.innerHTML = `
      <div class="hero-pulse-badge">
        ${
          site.logo
            ? `<img src="${site.logo}" alt="${b.title}">`
            : `<i class="bi bi-activity"></i>`
        }
      </div>
      <h1 class="hero-title">${b.title || site.title}</h1>
      ${b.subtitle ? `<p class="hero-subtitle">${b.subtitle}</p>` : ""}
      ${badgesHtml}
      <div>
        <a href="#about" class="scroll-down-btn" aria-label="Scroll to About section">
          <span>${b.tagline || "Explore"}</span>
          <i class="bi bi-chevron-double-down"></i>
        </a>
      </div>
    `;
  }

  function renderAbout(about) {
    const container = document.getElementById("about-container");
    const funfactsSection = document.getElementById("funfacts-section");
    if (!container || !about || !about.enable) return;

    const paragraphsHtml = (about.paragraphs || [])
      .map((p) => `<p class="text-secondary mb-3">${p}</p>`)
      .join("");

    container.innerHTML = `
      ${renderSectionHeader(about.title)}
      <div class="about-card">
        <div class="row g-0 align-items-stretch">
          <div class="col-lg-5 about-image-col" style="background-image: url('${about.image_webp || about.image}');">
          </div>
          <div class="col-lg-7 p-4 p-lg-5 d-flex flex-column justify-content-center">
            ${about.lead ? `<p class="lead text-light fw-semibold mb-3">${about.lead}</p>` : ""}
            ${paragraphsHtml}
            <div class="mt-2 d-flex flex-wrap gap-2">
              <a href="#cv" class="btn-ddmms-outline btn-sm">
                <i class="bi bi-clock-history"></i> View Timeline CV
              </a>
              <a href="https://ddmms.elena.re/alin-marin-elena.html" target="_blank" rel="noopener noreferrer" class="btn-ddmms-outline btn-sm">
                <i class="bi bi-globe2"></i> DDMMS Group Profile
              </a>
            </div>
          </div>
        </div>
      </div>
    `;

    if (funfactsSection && about.funfacts && about.funfacts.enable) {
      const ff = about.funfacts;
      funfactsSection.style.backgroundImage = `url("${ff.bg_image_webp || ff.bg_image}")`;
      funfactsSection.innerHTML = `
        <div class="container position-relative" style="z-index: 2;">
          <div class="row g-4 justify-content-center">
            ${(ff.items || [])
              .map(
                (item) => `
              <div class="col-6 col-md-3">
                <div class="stat-card">
                  <div class="stat-icon"><i class="bi ${item.icon}"></i></div>
                  <div class="stat-count">${item.count}</div>
                  <div class="stat-label">${item.title}</div>
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `;
    }
  }

  function renderCvTimelineItems(events, filter) {
    const filtered =
      filter === "all"
        ? events
        : events.filter((ev) => ev.category === filter);

    return filtered
      .map((ev) => {
        const isEdu = ev.category === "education";
        const badgeClass = isEdu ? "badge-education" : "badge-employment";
        const iconClass = isEdu ? "bi-mortarboard-fill" : "bi-briefcase-fill";
        return `
          <div class="timeline-item" data-category="${ev.category}">
            <div class="timeline-marker" title="${ev.type_label}"></div>
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
  }

  function renderCv(cv) {
    const container = document.getElementById("cv-container");
    if (!container || !cv || !cv.enable) return;

    const events = cv.events || [];
    const empCount = events.filter((e) => e.category === "employment").length;
    const eduCount = events.filter((e) => e.category === "education").length;

    container.innerHTML = `
      ${renderSectionHeader(cv.title, cv.subtitle)}
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
        ${renderSectionHeader(r.title, r.subtitle)}
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
        ${renderSectionHeader(p.title, p.subtitle)}
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

  function renderCollaborators(collab) {
    const container = document.getElementById("collaborators-container");
    if (!container || !collab || !collab.enable) return;

    container.innerHTML = `
      ${renderSectionHeader(collab.title)}
      <div class="row g-4 justify-content-center">
        ${(collab.members || [])
          .map(
            (m) => `
          <div class="col-md-8 col-lg-6">
            <div class="surface-card flex-md-row align-items-center gap-4">
              <img
                src="${m.image_webp || m.image}"
                onerror="this.onerror=null;this.src='${m.image}';"
                alt="${m.name}"
                class="collab-avatar"
                loading="lazy"
              >
              <div>
                <h3 class="h5 text-white mb-1">${m.name}</h3>
                ${m.affiliation ? `<div class="small text-info mb-2">${m.affiliation}</div>` : ""}
                <p class="text-secondary small mb-2">${m.content}</p>
                ${(m.links || [])
                  .map(
                    (l) => `
                  <a href="${l.url}" target="_blank" rel="noopener noreferrer" class="small fw-semibold">
                    <i class="bi ${l.icon} me-1"></i>${l.label} <i class="bi bi-arrow-up-right"></i>
                  </a>
                `
                  )
                  .join("")}
              </div>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  function renderNews(news) {
    const container = document.getElementById("news-container");
    if (!container || !news || !news.enable) return;

    container.innerHTML = `
      ${renderSectionHeader(news.title)}
      <div class="row g-4">
        ${(news.items || [])
          .map(
            (item) => `
          <div class="col-md-6">
            <div class="surface-card flex-row align-items-start gap-3">
              <img
                src="${item.image_webp || item.image}"
                onerror="this.onerror=null;this.src='${item.image}';"
                alt="${item.name}"
                class="news-thumb"
                loading="lazy"
              >
              <div>
                <div class="d-flex flex-wrap align-items-center gap-2 mb-1">
                  <h3 class="h6 text-white mb-0">${item.name}</h3>
                  <span class="badge bg-dark border border-secondary text-secondary">${item.date}</span>
                </div>
                <div class="text-secondary small mb-0">
                  ${marked.parseInline(item.content || "")}
                </div>
              </div>
            </div>
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
      ${renderSectionHeader(postsData.title)}
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
        ${renderSectionHeader(contact.title, contact.subtitle)}
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
      footerContainer.innerHTML = `
        <div class="d-flex justify-content-center flex-wrap gap-3 mb-3">
          ${(site.social || [])
            .map(
              (s) => `
            <a href="${s.url}" target="_blank" rel="noopener noreferrer" class="btn-ddmms-outline btn-sm rounded-pill px-3" title="${s.name}">
              <i class="bi ${s.icon}"></i>
              <span>${s.name}</span>
            </a>
          `
            )
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
        el.style.backgroundImage = `url("${val.bg_image_webp || val.bg_image}")`;
      }
    });
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
              const isMatch = link.getAttribute("href") === id;
              link.classList.toggle("active", isMatch);
              if (isMatch && currentSectionLabel) {
                currentSectionLabel.textContent = link.textContent.trim();
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
        collaborators,
        news,
        posts,
        contact,
      ] = await Promise.all([
        fetchYaml(DATA_FILES.site),
        fetchYaml(DATA_FILES.about),
        fetchYaml(DATA_FILES.cv),
        fetchYaml(DATA_FILES.researchPubs),
        fetchYaml(DATA_FILES.collaborators),
        fetchYaml(DATA_FILES.news),
        fetchYaml(DATA_FILES.posts),
        fetchYaml(DATA_FILES.contact),
      ]);

      state.data = {
        site,
        about,
        cv,
        researchPubs,
        collaborators,
        news,
        posts,
        contact,
      };

      renderCornerMenu(site);
      renderHero(site);
      applyDividers(site);
      renderAbout(about);
      renderCv(cv);
      renderResearchAndPubs(researchPubs);
      renderCollaborators(collaborators);
      renderNews(news);
      renderPosts(posts);
      renderContact(contact, site);
      initCornerMenuInteractions();
      handleInitialHash();
    } catch (err) {
      console.error("Error initializing site from YAML:", err);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
