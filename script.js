const STAGE_WIDTH = 1512;
const STAGE_HEIGHT = 982;
const EXPERIENCE_MS = 45000;
const EXPORT_SERVICE_URL = "";

const ASSETS = {
  introNetwork: "https://www.figma.com/api/mcp/asset/4bb35f71-019e-46d9-b283-e63510f83980",
  sidebarHome: "https://www.figma.com/api/mcp/asset/93318ab1-507b-47b7-ba43-1a1de4c55674",
  freeHome: "https://www.figma.com/api/mcp/asset/f5de9575-b827-467d-841a-8d82b57c80b2",
  pausedIconCircle: "https://www.figma.com/api/mcp/asset/8257c840-f62c-43a2-baaa-a9757231a5ce",
  pausedIconHourglass: "https://www.figma.com/api/mcp/asset/354376ce-d0bf-490c-ac70-a81ea936dc2b"
};

const introCopy = {
  profile: [
    "Today, AI systems collect vast amounts of personal data to uniquely identify individuals.",
    "Such biometric data can easily be collected and tracked due to the rise of digital applications.",
    "From iris patterns to fingerprints and typing rhythms, such data can be used to identify, classify or make predictions about people.",
    "Although these AI systems are often presented as objective, the conclusions they produce can be inaccurate, biased or misleading, depending largely on how they are designed, trained and deployed.",
    "This interactive data visualization explores the network between biometric data, AI profiling and automated bias.",
    "Through this short experience, you will see how easily everyday interactions generate data that can be used to create automated judgements."
  ],
  how: [
    "This experience takes approximately 45 seconds.",
    "While you explore the visualization, the system will collect data on the interaction, such as the click frequency and the hover time. Using these behavioural signals, an AI model will generate your unique biometric profile based on your interaction patterns.",
    "The resulting profile is intentionally exaggerated. It is not an accurate assessment of who you are. Instead, it demonstrates how AI systems can over-interpret behavioural data and produce misleading or biased conclusions when automated decisions are treated as objective.",
    "Once your profile has been revealed, you can freely explore the visualization without time restrictions or further data collection.",
    "The interaction data collected during this demonstration is used solely to support this experience and will be permanently deleted once the session ends. No personally identifiable information is collected, requested, or stored."
  ],
  about: [
    "The increasing use of AI has led to the widespread collection and analysis of biometric data, ranging from physical traits to behavioural characteristics such as walking patterns, mouse movements and interaction habits.",
    "Although these systems are often presented as objective, they can produce inaccurate, biased, or harmful outcomes when making automated classifications and predictions.",
    "This project is inspired by cases documented in the \u201cAI Incident Database\u201d, a public collection of reported AI failures and harms.",
    "Through a short interactive experience, discover how easily everyday interactions can be collected as behavioural biometric data and used to generate assumptions about you.",
    "Rather than asking whether these predictions are correct, the project invites you to question how AI systems interpret behavioural data and how much trust we should place in the automated decisions they make."
  ]
};

const state = {
  screen: "introProfile",
  introRead: {
    profile: false,
    how: false
  },
  overlay: null,
  timerRemaining: EXPERIENCE_MS,
  lastTick: 0,
  timerId: null,
  summaryOpen: false,
  exportOpen: false,
  exportNotice: "",
  metrics: createMetrics()
};

const app = document.getElementById("app");
const stageShell = document.getElementById("stage-shell");

function createMetrics() {
  const now = performance.now();
  return {
    active: false,
    totalDistance: 0,
    moveDuration: 0,
    hoverTime: 0,
    idleTime: 0,
    clickCount: 0,
    lastPointer: null,
    lastMoveAt: now,
    lastActivityAt: now,
    lastTickAt: now
  };
}

function scaleStage() {
  // Fit the stage to the viewport while preserving aspect ratio.
  const scale = Math.min(window.innerWidth / STAGE_WIDTH, window.innerHeight / STAGE_HEIGHT, 1);
  const renderedStageWidth = STAGE_WIDTH * scale;
  const horizontalGutter = Math.max(0, (window.innerWidth - renderedStageWidth) / 2);
  const gutterInDesignPx = scale > 0 ? horizontalGutter / scale : 0;
  document.documentElement.style.setProperty("--stage-scale", String(scale));
  document.documentElement.style.setProperty("--tracker-shift", `${gutterInDesignPx}px`);
  document.documentElement.style.setProperty("--screen-gutter", `${gutterInDesignPx}px`);
}

function paragraphHtml(lines, emphasizeExaggerated = false) {
  return lines
    .map((line) => {
      const safe = escapeHtml(line);
      if (!emphasizeExaggerated) {
        return `<p>${safe}</p>`;
      }
      return `<p>${safe.replace("exaggerated", "<strong>exaggerated</strong>")}</p>`;
    })
    .join("");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function trackerMetrics() {
  const { totalDistance, moveDuration, hoverTime, idleTime, clickCount } = state.metrics;
  const speed = moveDuration > 0 ? totalDistance / moveDuration : 0;
  return {
    speed: `${Math.round(speed)} px/s`,
    hover: `${hoverTime.toFixed(1)} s`,
    clicks: `${clickCount} total`,
    idle: `${idleTime.toFixed(1)} s`
  };
}

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function deriveProfile() {
  return {
    personType: "[Person Type]",
    demographics: ["[Age Group]", "[Education Level]", "[Profession]", "[Family Status]"],
    personality: ["[Decision-Making Style]", "[Curiosity]", "[Confidence Score]"],
    behaviour: ["[Attention Level]", "[Engagement Level]", "[Stress Level]"],
    assessment: ["[Personality Traits]", "[Risk Assessment]", "[Identity Confidence]", "[Anomaly Score]"]
  };
}

function renderIntro(which) {
  const isProfile = which === "profile";
  const read = state.introRead[which];
  const buttonLabel = isProfile ? "How to works" : "Start Experience";
  const buttonWidth = isProfile ? 121 : 157;
  const buttonLeft = isProfile ? 372 : 372;
  const title = isProfile ? "The AI Profile" : "How it works";
  const subtitle = isProfile ? "Biometric data & Automated Bias" : "Interaction data & Privacy";
  const buttonClass = [
    "action-button",
    read ? "" : "disabled",
    !read && isProfile ? "ghost-disabled" : ""
  ]
    .filter(Boolean)
    .join(" ");
  const icon = isProfile
    ? `<div class="intro-icon"><img src="${ASSETS.introNetwork}" alt="" /></div>`
    : `<div class="question-icon">?</div>`;

  return `
    <section class="screen" data-screen="intro-${which}">
      <div class="left-rail"></div>
      ${icon}
      <div class="intro-line"></div>
      <h1 class="screen-title">${title}</h1>
      <h2 class="screen-subtitle">${subtitle}</h2>
      <div class="intro-copy" data-scroll-key="${which}" tabindex="0" aria-label="${title} description">
        ${paragraphHtml(introCopy[which], !isProfile)}
      </div>
      <button
        class="${buttonClass}"
        style="left:${buttonLeft}px;top:713px;width:${buttonWidth}px;"
        data-action="${isProfile ? "to-how" : "start-experience"}"
        ${read ? "" : "disabled"}
      >${buttonLabel}</button>
    </section>
  `;
}

function renderSidebar(mode, showLargeHome) {
  const img = showLargeHome ? ASSETS.freeHome : ASSETS.sidebarHome;
  return `
    <div class="left-rail"></div>
    <button class="home-button ${showLargeHome ? "large" : ""}" data-action="sidebar-home" aria-label="Home">
      <img src="${img}" alt="" />
    </button>
    <button class="vertical-link how" data-action="sidebar-how">How It works</button>
    <button class="vertical-link about" data-action="sidebar-about">About</button>
    <div class="nav-highlight ${mode}"></div>
  `;
}

function renderTracker() {
  const metrics = trackerMetrics();
  return `
    <p class="countdown">${formatCountdown(state.timerRemaining)}</p>
    <div class="tracker"></div>
    <h3 class="tracker-title">Live Tracker</h3>
    <div class="tracker-line"></div>
    <div class="tracker-copy">
      <p>Mouse speed:<span>${metrics.speed}</span></p>
      <p>Hover timed:<span>${metrics.hover}</span></p>
      <p>Click frequency:<span>${metrics.clicks}</span></p>
      <p>Idle time:<span>${metrics.idle}</span></p>
    </div>
  `;
}

function overlayConfig(type, paused) {
  if (type === "home") {
    return paused
      ? {
          icon: renderPausedIcon(),
          title: "Time Paused",
          subtitle: "The AI Profile:",
          copy: introCopy.profile
        }
      : {
          icon: `<div class="intro-icon"><img src="${ASSETS.introNetwork}" alt="" /></div>`,
          title: "The AI Profile",
          subtitle: "Biometric data & Automated Bias",
          copy: introCopy.profile
        };
  }

  if (type === "how") {
    return paused
      ? {
          icon: renderPausedIcon(),
          title: "Time Paused",
          subtitle: "How it Works:",
          copy: introCopy.how,
          emphasizeExaggerated: true
        }
      : {
          icon: `<div class="modal-icon-circle">?</div>`,
          title: "How it works",
          subtitle: "Interaction data & Privacy",
          copy: introCopy.how,
          emphasizeExaggerated: true
        };
  }

  return paused
    ? {
        icon: renderPausedIcon(),
        title: "Time Paused",
        subtitle: "About the project:",
        copy: introCopy.about
      }
    : {
        icon: `<div class="modal-icon-circle info">i</div>`,
        title: "About the Project",
        subtitle: "A data visualization",
        copy: introCopy.about
      };
}

function renderPausedIcon() {
  return `
    <div class="modal-icon-circle paused-figma-icon" aria-hidden="true">
      <img class="paused-figma-icon-circle" src="${ASSETS.pausedIconCircle}" alt="" />
      <img class="paused-figma-icon-hourglass" src="${ASSETS.pausedIconHourglass}" alt="" />
    </div>
  `;
}

function profileSummaryLines(profile, metrics) {
  return [
    `Person type: ${profile.personType}`,
    `Demographics: ${profile.demographics.join(", ")}`,
    `Personality: ${profile.personality.join(", ")}`,
    `Behaviour: ${profile.behaviour.join(", ")}`,
    `Assessment: ${profile.assessment.join(", ")}`,
    `Mouse speed: ${metrics.speed}`,
    `Hover time: ${metrics.hover}`,
    `Click frequency: ${metrics.clicks}`,
    `Idle time: ${metrics.idle}`
  ];
}

function renderExportPanel(profile, metrics) {
  return `
    <section class="export-panel" aria-label="Export PDF panel">
      <h3>Send Profile PDF</h3>
      <div class="export-line"></div>
      <p class="export-copy">Enter your email address to prepare a summarized PDF overview.</p>
      <label class="visually-hidden" for="export-email">Email address</label>
      <input id="export-email" class="export-input" type="email" placeholder="Email address" autocomplete="email" />
      <div class="export-actions">
        <button class="action-button export-action" data-action="send-export">Send PDF copy</button>
        <button class="export-cancel" data-action="close-export">Cancel</button>
      </div>
      ${state.exportNotice ? `<p class="export-notice">${escapeHtml(state.exportNotice)}</p>` : ""}
      <div class="visually-hidden" data-export-summary="${escapeHtml(profileSummaryLines(profile, metrics).join("\n"))}"></div>
    </section>
  `;
}

function renderOverlay(type, paused) {
  const config = overlayConfig(type, paused);
  return `
    <div class="modal-backdrop"></div>
    <div class="modal-box">
      <div class="modal-panel"></div>
    </div>
    ${config.icon}
    <div class="modal-line"></div>
    <h1 class="modal-title">${config.title}</h1>
    <h2 class="modal-subtitle">${config.subtitle}</h2>
    <div class="modal-copy">${paragraphHtml(config.copy, Boolean(config.emphasizeExaggerated))}</div>
    <button class="modal-close" data-action="close-overlay" aria-label="Close overlay">&times;</button>
  `;
}

function renderTracking() {
  return `
    <section class="screen" data-screen="tracking">
      ${renderSidebar(state.overlay || "home", false)}
      ${renderTracker()}
      ${state.overlay ? renderOverlay(state.overlay, true) : ""}
    </section>
  `;
}

function renderResults() {
  return `
    <section class="screen" data-screen="results">
      <div class="left-rail"></div>
      <div class="result-icon"></div>
      <div class="intro-line"></div>
      <h1 class="screen-title">Interaction complete</h1>
      <h2 class="screen-subtitle">The Results</h2>
      <div class="results-copy">
        ${paragraphHtml([
          "Your 45-second experience has finished. Your results reveal how seemingly simple interactions can generate data points that AI systems can use to create profiles, classifications and predictions.",
          "But how much trust should we place in these automated assessments?"
        ])}
      </div>
      <button class="action-button results-button" data-action="view-profile">View your Biometric pROFILE</button>
    </section>
  `;
}

function renderProfile() {
  const profile = deriveProfile();
  const metrics = trackerMetrics();
  return `
    <section class="screen" data-screen="profile">
      <div class="left-rail"></div>
      <div class="profile-content">
        <h1 class="profile-title">Your Profile</h1>
        <div class="profile-hero"><h2>${profile.personType}</h2></div>
        <section class="profile-card demographics">
          <h3 class="card-heading">DemograPHICS</h3>
          <div class="section-line"></div>
          <div class="card-copy">${paragraphHtml(profile.demographics)}</div>
        </section>
        <section class="profile-card personality">
          <h3 class="card-heading">Personality</h3>
          <div class="section-line"></div>
          <div class="card-copy">${paragraphHtml(profile.personality)}</div>
        </section>
        <section class="behaviour-card">
          <h3 class="card-heading">Behaviour</h3>
          <div class="section-line"></div>
          <div class="card-copy">${paragraphHtml(profile.behaviour)}</div>
        </section>
        <section class="assessment-card">
          <h3 class="card-heading">Assessment</h3>
          <div class="section-line"></div>
          <div class="card-copy">${paragraphHtml(profile.assessment)}</div>
        </section>
        <button class="sheet-button export" data-action="export-pdf">Export PDF</button>
        <button class="sheet-button reexplore" data-action="re-explore"><span class="icon-inline">&#8635;</span>Re-explore</button>
        ${state.exportOpen ? renderExportPanel(profile, metrics) : ""}
        ${
          state.summaryOpen
            ? `<section class="summary-box">
                <h3>Summary</h3>
                <div class="summary-line"></div>
                <div class="summary-copy">
                  <p>Mouse speed:<span>${metrics.speed}</span></p>
                  <p>Hover time:<span>${metrics.hover}</span></p>
                  <p>Click Frequency:<span>${metrics.clicks}</span></p>
                  <p>Idle time:<span>${metrics.idle}</span></p>
                </div>
                <button class="summary-close" data-action="toggle-summary" aria-label="Close summary">&times;</button>
              </section>`
            : `<button class="summary-tab" data-action="toggle-summary" aria-label="Open interaction summary">
                <div class="tab-copy">
                  <span class="tab-arrow">&#8249;</span>
                  <span class="tab-label">Interaction summary</span>
                </div>
              </button>`
        }
      </div>
    </section>
  `;
}

async function sendSummaryExport(email, summary) {
  if (!EXPORT_SERVICE_URL) {
    return {
      ok: false,
      message: "Direct PDF email sending needs a configured export service URL."
    };
  }

  try {
    const response = await fetch(EXPORT_SERVICE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        summary
      })
    });

    if (!response.ok) {
      return {
        ok: false,
        message: "Could not send the PDF right now. Please try again."
      };
    }

    return {
      ok: true,
      message: "Your PDF summary was sent successfully."
    };
  } catch (_error) {
    return {
      ok: false,
      message: "Could not connect to the export service."
    };
  }
}

function renderFree() {
  return `
    <section class="screen" data-screen="free">
      ${renderSidebar(state.overlay || "home", true)}
      <button class="action-button start-new" data-action="restart">START A NEW EXPERIENCE</button>
      ${state.overlay ? renderOverlay(state.overlay, false) : ""}
    </section>
  `;
}

function render() {
  if (state.screen === "introProfile") {
    app.innerHTML = renderIntro("profile");
  } else if (state.screen === "introHow") {
    app.innerHTML = renderIntro("how");
  } else if (state.screen === "tracking") {
    app.innerHTML = renderTracking();
  } else if (state.screen === "results") {
    app.innerHTML = renderResults();
  } else if (state.screen === "profile") {
    app.innerHTML = renderProfile();
  } else {
    app.innerHTML = renderFree();
  }

  bindDynamicEvents();
}

function bindDynamicEvents() {
  app.querySelectorAll("[data-scroll-key]").forEach((element) => {
    const key = element.getAttribute("data-scroll-key");
    element.addEventListener("scroll", () => {
      const atBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 4;
      if (atBottom && !state.introRead[key]) {
        state.introRead[key] = true;
        render();
      }
    });
  });

  app.querySelectorAll("[data-action]").forEach((element) => {
    element.addEventListener("click", handleAction);
  });
}

async function handleAction(event) {
  const action = event.currentTarget.getAttribute("data-action");
  if (action === "to-how") {
    state.screen = "introHow";
    render();
    return;
  }

  if (action === "start-experience") {
    startExperience();
    return;
  }

  if (action === "sidebar-home") {
    if (state.screen === "tracking") {
      state.overlay = "home";
    } else if (state.screen === "free") {
      state.overlay = "home";
    }
    render();
    return;
  }

  if (action === "sidebar-how") {
    state.overlay = "how";
    render();
    return;
  }

  if (action === "sidebar-about") {
    state.overlay = "about";
    render();
    return;
  }

  if (action === "close-overlay") {
    state.overlay = null;
    render();
    return;
  }

  if (action === "view-profile") {
    stopTicker();
    state.screen = "profile";
    state.summaryOpen = false;
    state.exportOpen = false;
    state.exportNotice = "";
    render();
    return;
  }

  if (action === "toggle-summary") {
    state.summaryOpen = !state.summaryOpen;
    render();
    return;
  }

  if (action === "re-explore") {
    state.screen = "free";
    state.overlay = null;
    state.summaryOpen = false;
    state.exportOpen = false;
    state.exportNotice = "";
    render();
    return;
  }

  if (action === "restart") {
    resetExperience();
    render();
    return;
  }

  if (action === "export-pdf") {
    state.exportOpen = true;
    state.exportNotice = "";
    render();
    return;
  }

  if (action === "close-export") {
    state.exportOpen = false;
    state.exportNotice = "";
    render();
    return;
  }

  if (action === "send-export") {
    const emailInput = app.querySelector("#export-email");
    const summaryNode = app.querySelector("[data-export-summary]");
    const email = emailInput ? emailInput.value.trim() : "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      state.exportNotice = "Please enter a valid email address.";
      render();
      return;
    }

    const summary = summaryNode ? summaryNode.getAttribute("data-export-summary") || "" : "";
    const result = await sendSummaryExport(email, summary);
    state.exportNotice = result.message;
    render();
  }
}

function resetExperience() {
  stopTicker();
  state.screen = "introProfile";
  state.overlay = null;
  state.summaryOpen = false;
  state.exportOpen = false;
  state.exportNotice = "";
  state.introRead.profile = false;
  state.introRead.how = false;
  state.timerRemaining = EXPERIENCE_MS;
  state.metrics = createMetrics();
}

function startExperience() {
  state.screen = "tracking";
  state.overlay = null;
  state.timerRemaining = EXPERIENCE_MS;
  state.metrics = createMetrics();
  state.metrics.active = true;
  state.lastTick = performance.now();
  startTicker();
  render();
}

function startTicker() {
  stopTicker();
  state.timerId = window.setInterval(() => {
    if (state.screen !== "tracking") {
      return;
    }

    const now = performance.now();
    const delta = now - state.lastTick;
    state.lastTick = now;

    if (!state.overlay) {
      state.timerRemaining = Math.max(0, state.timerRemaining - delta);
      const inactiveMs = now - state.metrics.lastActivityAt;
      if (inactiveMs > 1500) {
        state.metrics.idleTime += delta / 1000;
      }
    }

    if (state.timerRemaining <= 0) {
      state.metrics.active = false;
      stopTicker();
      state.screen = "results";
      state.overlay = null;
      render();
      return;
    }

    if (!state.overlay) {
      updateTrackerValues();
    }
  }, 100);
}

function stopTicker() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function updateTrackerValues() {
  const tracker = app.querySelector(".tracker-copy");
  const countdown = app.querySelector(".countdown");
  if (!tracker || !countdown) {
    return;
  }
  const metrics = trackerMetrics();
  countdown.textContent = formatCountdown(state.timerRemaining);
  tracker.innerHTML = `
    <p>Mouse speed:<span>${metrics.speed}</span></p>
    <p>Hover timed:<span>${metrics.hover}</span></p>
    <p>Click frequency:<span>${metrics.clicks}</span></p>
    <p>Idle time:<span>${metrics.idle}</span></p>
  `;
}

function trackPointer(event) {
  if (!state.metrics.active || state.screen !== "tracking" || state.overlay) {
    return;
  }

  const now = performance.now();
  const current = { x: event.clientX, y: event.clientY };
  if (state.metrics.lastPointer) {
    const dt = (now - state.metrics.lastMoveAt) / 1000;
    const dx = current.x - state.metrics.lastPointer.x;
    const dy = current.y - state.metrics.lastPointer.y;
    const distance = Math.hypot(dx, dy);
    state.metrics.totalDistance += distance;
    state.metrics.moveDuration += Math.max(dt, 0);
    if (distance < 10) {
      state.metrics.hoverTime += Math.max(dt, 0);
    }
  }
  state.metrics.lastPointer = current;
  state.metrics.lastMoveAt = now;
  state.metrics.lastActivityAt = now;
}

function trackClick() {
  if (!state.metrics.active || state.screen !== "tracking" || state.overlay) {
    return;
  }

  const now = performance.now();
  state.metrics.clickCount += 1;
  state.metrics.lastActivityAt = now;
}

window.addEventListener("resize", scaleStage);
stageShell.addEventListener("mousemove", trackPointer);
stageShell.addEventListener("click", trackClick);

scaleStage();
render();