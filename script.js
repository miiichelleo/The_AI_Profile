const STAGE_WIDTH = 1512;
const STAGE_HEIGHT = 982;
const EXPERIENCE_MS = 45000;
const EXPORT_SERVICE_URL = "";
const VIZ_DATA_SRC = "./Final_Viz/Final_AI_Biometrics.json";
const PARTICIPANT_ROUND_KEY = "the-ai-profile-participant-round";
const OLLAMA_CONFIG = {
  endpoint: "http://127.0.0.1:11434/api/generate",
  remoteEndpoint: "https://miiichelleo.github.io/The_AI_Profile/.example/api/profile",
  model: "granite4.1:3b",
  prompts: {
    personType: "Describe the overall person type suggested by these interaction measurements in 1-2 sentences. example: 'You are a curious and confident thinker'",
    ageGroup: "Infer an exaggerated age group from these interaction measurements. Shortly use a number range and the corresponding generation (ages from 13-101). Use 3-4 word only.",
    educationLevel: "Infer an exaggerated education level from these interaction measurements. Mention what degree level they have obtained.  Use 3-4 words only.",
    profession: "Infer an exaggerated profession from these interaction measurements. Also add a brief explanation.  Use 3-4 words only.",
    decisionMakingStyle: "Infer an exaggerated decision-making style from these interaction measurements. Use 3-4 words only.",
    curiosity: "Infer an exaggerated curiosity level from these interaction measurements. Use 3-4 words only.",
    confidenceScore: "Infer an exaggerated confidence score from these interaction measurements. Show in percentage out of 100 (e.g., 75%). Low scores indicate low confidence. Return a short label only.",
    attentionLevel: "Infer an exaggerated attention level from these interaction measurements. Use 3-4 words only.",
    engagementLevel: "Infer an exaggerated engagement level from these interaction measurements. Focus on how concentrated and engaged thhe user was. Use 3-4 words only.",
    stressLevel: "Infer an exaggerated stress level from these interaction measurements. Use 3-4 words only.",
    assessmentSummary: "Write one short paragraph of 2 to 3 sentences describing the exaggerated personality interpretation. Make strong assumptions about the user's personality and characture type. Make it a bit over the top. Adress the user directly. Also try not to repeat to much of what has already been said."
  }
};
const PROJECT_EMAIL_INTRO = "The AI Profile is an interactive project about how everyday interaction data can be collected as behavioural biometrics and interpreted by AI systems. The profile below is intentionally exaggerated and should not be treated as a factual assessment.";

const ASSETS = {
  introNetwork: "./icons/Ai_icon.svg",
  homeProfileIcon: "./icons/Ai_icon.svg",
  profileIcon: "./Your_profile/yourprofile_icon.svg",
  pausedIconCircle: "./icons/questionmark_icon.png",
  pausedIconHourglass: "./icons/sandhour_icon.svg"
};

const introCopy = {
  profile: [
    "Today, AI systems collect vast amounts of personal data to uniquely identify individuals.",
    "Such biometric data can easily be collected and tracked due to the rise of digital applications. From iris patterns to fingerprints and typing rhythms, such data can be used to identify, classify or make predictions about people.",
    "Although these AI systems are often presented as objective, the conclusions they produce can be inaccurate, biased or misleading, depending largely on how they are designed, trained and deployed.",
    "This interactive data visualization explores the network between biometric data, AI profiling and automated bias. While, based on the reported incidents from the \"AI Incident Database\", AI was implemted to create categorizations as an additional topic layer.",
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
  profile: null,
  sessionStartedAt: null,
  sessionNumber: "001",
  ollamaStatus: "idle",
  profileSource: "",
  ollamaError: "",
  metrics: createMetrics()
};

const app = document.getElementById("app");
const stageShell = document.getElementById("stage-shell");
const profileLayout = {
  scale: 1,
  offsetX: 0,
  offsetY: 0
};

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
  const scale = Math.min(window.innerWidth / STAGE_WIDTH, window.innerHeight / STAGE_HEIGHT, 1);
  const profileScale = Math.min(
    (window.innerWidth - 24) / STAGE_WIDTH,
    (window.innerHeight - 16) / STAGE_HEIGHT,
    1
  );
  const profileWidth = STAGE_WIDTH * profileScale;
  const profileHeight = STAGE_HEIGHT * profileScale;
  const stageWidth = STAGE_WIDTH * scale;
  const stageHeight = STAGE_HEIGHT * scale;
  const offsetX = (window.innerWidth - stageWidth) / 2;
  const offsetY = (window.innerHeight - stageHeight) / 2;
  profileLayout.scale = profileScale;
  profileLayout.offsetX = Math.max(0, (window.innerWidth - profileWidth) / 2);
  profileLayout.offsetY = Math.max(0, (window.innerHeight - profileHeight) / 2);

  applyProfileLayout();
}

function applyProfileLayout() {
  const profileContent = app.querySelector(".profile-content");
  if (!profileContent) {
    return;
  }
  profileContent.style.left = `${profileLayout.offsetX}px`;
  profileContent.style.top = `${profileLayout.offsetY}px`;
  profileContent.style.transform = `scale(${profileLayout.scale})`;
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

function profileMetadata() {
  const startedAt = state.sessionStartedAt || new Date();
  return {
    date: new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(startedAt),
    time: new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(startedAt),
    userNumber: state.sessionNumber
  };
}

function nextParticipantRound() {
  const storedRound = Number.parseInt(localStorage.getItem(PARTICIPANT_ROUND_KEY) || "0", 10);
  const nextRound = Number.isFinite(storedRound) ? storedRound + 1 : 1;
  localStorage.setItem(PARTICIPANT_ROUND_KEY, String(nextRound));
  return String(nextRound).padStart(3, "0");
}

function emptyProfile() {
  return {
    personType: "[Person Type]",
    demographics: ["[Age Group]", "[Education Level]", "[Profession]"],
    personality: ["[Decision-Making Style]", "[Curiosity]", "[Confidence Score]"],
    behaviour: ["[Attention Level]", "[Engagement Level]", "[Stress Level]"],
    assessment: ["[Assessment summary]"]
  };
}

function profilePrompt(metrics) {
  const prompts = Object.entries(OLLAMA_CONFIG.prompts)
    .map(([key, prompt]) => `${key}: ${prompt}`)
    .join("\n");
  return `You are generating an intentionally exaggerated fictional profile for an interactive art project.
Use only the measured interaction data below. Do not claim this is a real psychological, demographic, medical, or identity assessment.

Measured interaction data:
${JSON.stringify(metrics, null, 2)}

Field-specific prompts:
${prompts}

Return valid JSON only, with exactly these keys and string values:
${JSON.stringify(Object.keys(OLLAMA_CONFIG.prompts))}`;
}

function normalizeProfile(result) {
  const sentenceCase = (text) => {
    const normalized = text.trim().toLowerCase();
    return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : normalized;
  };
  const paragraphCase = (text) => {
    return text
      .trim()
      .toLowerCase()
      .replace(/(^|[.!?]\s+)([a-z])/g, (_match, prefix, firstLetter) => `${prefix}${firstLetter.toUpperCase()}`);
  };
  const value = (key, fallback) => {
    const candidate = result && result[key];
    return typeof candidate === "string" && candidate.trim() ? sentenceCase(candidate) : fallback;
  };
  const labeledValue = (label, key, fallback) => {
    return `${label}: ${value(key, fallback)}`;
  };
  const assessmentValue = () => {
    const candidate = result && result.assessmentSummary;
    return typeof candidate === "string" && candidate.trim()
      ? paragraphCase(candidate)
      : "[Assessment summary]";
  };
  return {
    personType: value("personType", "[Person Type]"),
    demographics: [
      labeledValue("Age Group", "ageGroup", "[Age Group]"),
      labeledValue("Education Level", "educationLevel", "[Education Level]"),
      labeledValue("Profession", "profession", "[Profession]"),
    ],
    personality: [
      labeledValue("Decision-Making Style", "decisionMakingStyle", "[Decision-Making Style]"),
      labeledValue("Curiosity", "curiosity", "[Curiosity]"),
      labeledValue("Confidence Score", "confidenceScore", "[Confidence Score]")
    ],
    behaviour: [
      labeledValue("Attention Level", "attentionLevel", "[Attention Level]"),
      labeledValue("Engagement Level", "engagementLevel", "[Engagement Level]"),
      labeledValue("Stress Level", "stressLevel", "[Stress Level]")
    ],
    assessment: [assessmentValue()]
  };
}

function profileRowsHtml(lines) {
  return lines
    .map((line) => {
      const separator = line.indexOf(":");
      const label = separator >= 0 ? line.slice(0, separator) : "";
      const value = separator >= 0 ? line.slice(separator + 1).trim() : line;
      return `<div class="profile-row"><span class="profile-row-label">${escapeHtml(label)}</span><span class="profile-row-value">${escapeHtml(value)}</span></div>`;
    })
    .join("");
}

function cornerMarkersHtml() {
  return `<span class="corner-markers" aria-hidden="true">
    <span class="corner-marker top-left"></span>
    <span class="corner-marker top-right"></span>
    <span class="corner-marker bottom-left"></span>
    <span class="corner-marker bottom-right"></span>
  </span>`;
}

function browserGeneratedProfile() {
  const speed = state.metrics.moveDuration > 0
    ? state.metrics.totalDistance / state.metrics.moveDuration
    : 0;
  const clicks = state.metrics.clickCount;
  const hover = state.metrics.hoverTime;
  const idle = state.metrics.idleTime;
  const pace = speed > 700 ? "rapid" : speed > 300 ? "steady" : "deliberate";
  const focus = idle > 12 ? "easily distracted" : hover > 5 ? "highly attentive" : "selectively focused";
  const engagement = clicks > 12 ? "highly engaged" : clicks > 5 ? "actively engaged" : "quietly observant";
  const confidence = Math.min(98, Math.max(18, Math.round(42 + speed / 35 + clicks * 2)));

  return normalizeProfile({
    personType: `${pace} ${engagement} explorer`,
    ageGroup: speed > 700 ? "18-25, Gen Z" : speed > 300 ? "26-40, Millennials" : "41-60, Gen X",
    educationLevel: clicks > 8 ? "Advanced degree" : "Bachelor's degree",
    profession: pace === "rapid" ? "Digital creator" : "Careful researcher",
    decisionMakingStyle: pace === "rapid" ? "Fast and intuitive" : "Cautious and deliberate",
    curiosity: clicks > 8 ? "Highly curious" : "Quietly curious",
    confidenceScore: `${confidence}% confidence`,
    attentionLevel: focus,
    engagementLevel: engagement,
    stressLevel: speed > 800 ? "Heightened urgency" : "Low stress",
    assessmentSummary: `Your interaction pattern suggests a ${pace} and ${engagement} approach. Confidence appears moderate at ${confidence} percent, with ${focus} shaping the overall reading.`
  });
}

async function generateProfile() {
  state.ollamaStatus = "loading";
  state.ollamaError = "";
  state.profileSource = "";
  render();

  const localHost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  const endpoint = localHost ? OLLAMA_CONFIG.endpoint : OLLAMA_CONFIG.remoteEndpoint;
  if (!localHost && endpoint.includes("YOUR_BACKEND_DOMAIN")) {
    if (state.screen !== "profile") {
      return;
    }
    state.profile = browserGeneratedProfile();
    state.profileSource = "browser";
    state.ollamaStatus = "ready";
    state.ollamaError = "Configure OLLAMA_CONFIG.remoteEndpoint for the hosted AI service.";
    render();
    return;
  }

  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 5000);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        metrics: state.metrics
      })
    });
    window.clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}`);
    }
    const payload = await response.json();
    if (state.screen !== "profile") {
      return;
    }
    const profileResult = payload.profile || payload;
    state.profile = normalizeProfile(profileResult);
    state.profileSource = localHost ? "ollama" : "backend";
    state.ollamaStatus = "ready";
  } catch (error) {
    if (state.screen !== "profile") {
      return;
    }
    state.profile = browserGeneratedProfile();
    state.profileSource = "browser";
    state.ollamaStatus = "ready";
    console.warn("Ollama is unavailable. Generated a browser profile instead.", error);
  }
  render();
}

function renderIntro(which) {
  const isProfile = which === "profile";
  const read = state.introRead[which];
  const finalLine = introCopy[which].at(-1);
  const sentenceBoundary = finalLine.lastIndexOf(". ");
  const sentenceStart = sentenceBoundary < 0 ? 0 : sentenceBoundary + 2;
  const buttonLabel = isProfile ? "How it works" : "Start Experience";
  const buttonWidth = isProfile ? 121 : 157;
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
    : `<div class="question-icon" style="width:55px;height:55px;border:1px solid #fff;border-radius:50px;font-size:32px;line-height:1;display:grid;place-items:center;">?</div>`;

  return `
    <section class="screen" data-screen="intro-${which}">
      <div class="left-rail"></div>
      ${icon}
      <div class="intro-line"></div>
      <h1 class="screen-title">${title}</h1>
      <h2 class="screen-subtitle">${subtitle}</h2>
      <div class="intro-copy ${read ? "read" : ""}" data-scroll-key="${which}" tabindex="0" aria-label="${title} description">
        ${paragraphHtml(introCopy[which].slice(0, -1), !isProfile)}
        <p>${escapeHtml(finalLine.slice(0, sentenceStart))}<span class="intro-final-sentence">${escapeHtml(finalLine.slice(sentenceStart))}</span></p>
      </div>
      <button
        class="${buttonClass} intro-cta"
        style="width:${buttonWidth}px;"
        data-action="${isProfile ? "to-how" : "start-experience"}"
        ${read ? "" : "disabled"}
      >${buttonLabel}</button>
    </section>
  `;
}

function renderSidebar(mode, showLargeHome) {
  return `
    <div class="left-rail"></div>
    <button class="home-button" data-action="sidebar-home" aria-label="The AI Profile">
      <img src="${ASSETS.homeProfileIcon}" alt="" />
    </button>
    <button class="vertical-link how" data-action="sidebar-how">How it works</button>
    <button class="vertical-link about" data-action="sidebar-about">About</button>
  `;
}

function renderTracker() {
  return `
    <div class="tracker">
      <p class="countdown">${formatCountdown(state.timerRemaining)}</p>
      <h3 class="tracker-title">Live Tracker</h3>
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
          icon: `<div class="modal-profile-icon"><img src="${ASSETS.profileIcon}" alt="" /></div>`,
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
        icon: `<div class="modal-about-icon"><img src="${ASSETS.pausedIconCircle}" alt="" /></div>`,
        title: "About the Project",
        subtitle: "A data visualization",
        copy: introCopy.about
      };
}

function renderPausedIcon() {
  return `
    <div class="modal-icon-circle paused-figma-icon" aria-hidden="true">
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

function renderVisualizationLayer() {
  return `
    <section class="viz-layer" aria-label="AI biometrics visualization">
      <div id="viz-canvas" class="viz-canvas" role="img" aria-label="AI biometrics visualization"></div>
      <p class="drag-tip">Tipp: Click and Drag me!</p>
      <div class="viz-legend" aria-label="Visualization legend">
        <h3 class="viz-legend-title">Graph Legend</h3>
        <div class="viz-legend-group">
          <h4 class="viz-legend-subtitle">Biometrical Analysis</h4>
          <div class="viz-legend-line"></div>
          <div class="viz-legend-bio-grid" data-legend-bio-grid></div>
        </div>
        <div class="viz-legend-line"></div>
        <span class="legend-item">
          <span class="legend-icon"><img src="./icons/legend/AI_classification.svg" alt="" /></span>
          AI Classification
        </span>
        <span class="legend-item">
          <span class="legend-icon"><img src="./icons/legend/AI_harm.svg" alt="" /></span>
          AI Harm
        </span>
      </div>
    </section>
  `;
}

function renderTracking() {
  return `
    <section class="screen" data-screen="tracking">
      <div class="menu-bar">${renderSidebar(state.overlay || "home", false)}</div>
      <div class="data-viz">${renderVisualizationLayer()}</div>
      <div class="timer">${renderTracker()}</div>
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
      <button class="action-button results-button" data-action="view-profile">Your Biometric Profile</button>
    </section>
  `;
}

function renderProfile() {
  const profile = state.profile || emptyProfile();
  const metrics = trackerMetrics();
  const metadata = profileMetadata();
  const summaryStateClass = state.summaryOpen ? "summary-open" : "summary-closed";
  const ollamaMessage = state.ollamaStatus === "loading"
    ? "Generating profile with Ollama..."
    : state.ollamaError || (state.ollamaStatus === "ready"
      ? state.profileSource === "browser" ? "Generated from your interaction data" : `Generated with ${OLLAMA_CONFIG.model}`
      : "Profile generation not started");
  return `
    <section class="screen" data-screen="profile">
      <div class="menu-bar">${renderSidebar(state.overlay || "home", false)}</div>
      <div class="data-viz">
        <div class="profile-content ${summaryStateClass}">
          <div class="profile-frame-decor" aria-hidden="true">
            <span class="profile-frame-line top"></span>
            <span class="profile-frame-line hero-rule"></span>
            <span class="profile-frame-line bottom"></span>
            <span class="profile-frame-line center"></span>
            <span class="profile-frame-line right"></span>
            <span class="profile-frame-line divider"></span>
          </div>
          <h1 class="profile-title">"Your Profile</h1>
          <h2 class="profile-question">To what extent are the results correct ?</h2>
          <p class="ollama-status" role="status">${escapeHtml(ollamaMessage)}</p>
          <div class="profile-hero">
            ${cornerMarkersHtml()}
            <img class="profile-hero-icon" src="./Your_profile/yourprofile_icon.svg" alt="" />
            <h2>"${profile.personType}"</h2>
          </div>
          <div class="profile-lower-row">
            <section class="profile-panel demographics">
              <div class="profile-image">${cornerMarkersHtml()}<img src="./Your_profile/demographic_icon.svg" alt="" /></div>
              <h3 class="profile-heading">DemograPHICS</h3>
              <div class="section-line"></div>
              <div class="profile-description">${profileRowsHtml(profile.demographics)}</div>
            </section>
            <section class="profile-panel personality">
              <div class="profile-image">${cornerMarkersHtml()}<img src="./Your_profile/personality_icon.svg" alt="" /></div>
              <h3 class="profile-heading">Personality</h3>
              <div class="section-line"></div>
              <div class="profile-description">${profileRowsHtml(profile.personality)}</div>
            </section>
          </div>
          <div class="profile-right-column">
            <section class="profile-panel behaviour">
              <div class="profile-image">${cornerMarkersHtml()}<img src="./Your_profile/behavior_icon.svg" alt="" /></div>
              <h3 class="profile-heading">Behaviour</h3>
              <div class="section-line"></div>
              <div class="profile-description">${profileRowsHtml(profile.behaviour)}</div>
            </section>
            <section class="profile-panel assessment">
              <h3 class="profile-heading">Final Assessment</h3>
              <div class="section-line"></div>
              <div class="profile-description">${paragraphHtml(profile.assessment)}</div>
            </section>
          </div>
          <button class="sheet-button export" data-action="export-pdf">Export PDF</button>
          <button class="sheet-button reexplore" data-action="re-explore"><span class="icon-inline">&#8635;</span>Re-explore</button>
          <div class="profile-footer" aria-label="Profile metadata">
            <div class="profile-meta date"><strong>DATE</strong><i aria-hidden="true"></i><span>(${metadata.date})</span></div>
            <div class="profile-meta time"><strong>TIME</strong><i aria-hidden="true"></i><span>(${metadata.time})</span></div>
            <div class="profile-meta user-number"><strong>USER NR.</strong><i aria-hidden="true"></i><span>(${metadata.userNumber})</span></div>
          </div>
          ${state.exportOpen ? renderExportPanel(profile, metrics) : ""}
        </div>
      </div>
      <div class="timer">
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
      ${state.ollamaStatus === "loading" ? `
        <div class="profile-loading" role="status" aria-live="polite">
          <span class="loading-ring" aria-hidden="true"></span>
          <p>Generating your profile...</p>
        </div>
      ` : ""}
      ${state.overlay ? renderOverlay(state.overlay, false) : ""}
    </section>
  `;
}

async function sendSummaryExport(email, summary) {
  if (!EXPORT_SERVICE_URL) {
    const subject = encodeURIComponent("My AI Profile");
    const body = encodeURIComponent(
      `${PROJECT_EMAIL_INTRO}\n\nYour interaction analysis:\n${summary}\n\nA PDF can be saved from the browser print dialog and attached to this email.`
    );
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
    return {
      ok: true,
      message: ""
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
      <div class="menu-bar">${renderSidebar(state.overlay || "home", true)}</div>
      <div class="data-viz">${renderVisualizationLayer()}</div>
      <div class="timer"></div>
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

  applyProfileLayout();
  bindDynamicEvents();
  mountVisualization();
}

async function mountVisualization() {
  const host = app.querySelector("#viz-canvas");
  if (!host) {
    return;
  }

  if (host.dataset.vizMounted === "loading" || host.dataset.vizMounted === "true") {
    return;
  }

  if (typeof window.renderForceGraph !== "function" || typeof window.d3 === "undefined") {
    host.dataset.vizMounted = "error";
    return;
  }

  host.dataset.vizMounted = "loading";
  try {
    await window.renderForceGraph(host, { dataUrl: VIZ_DATA_SRC });
    host.dataset.vizMounted = "true";
  } catch (_error) {
    host.dataset.vizMounted = "error";
  }
}

function unlockIntroCta(key) {
  const copy = app.querySelector(`[data-scroll-key="${key}"]`);
  const button = app.querySelector(`[data-scroll-key="${key}"] ~ .intro-cta`);
  if (!button) {
    return;
  }

  copy.classList.add("read");
  button.disabled = false;
  button.classList.remove("disabled", "ghost-disabled");
}

function bindDynamicEvents() {
  app.querySelectorAll("[data-scroll-key]").forEach((element) => {
    const key = element.getAttribute("data-scroll-key");
    element.addEventListener("scroll", () => {
      const atBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 4;
      element.classList.toggle("read", element.scrollTop > 0);
      if (atBottom && !state.introRead[key]) {
        state.introRead[key] = true;
        unlockIntroCta(key);
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
    if (state.screen === "tracking" || state.screen === "free" || state.screen === "profile") {
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
    state.profile = emptyProfile();
    state.ollamaStatus = "loading";
    state.ollamaError = "";
    state.summaryOpen = false;
    state.exportOpen = false;
    state.exportNotice = "";
    render();
    generateProfile();
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
  state.sessionStartedAt = null;
  state.profile = null;
  state.ollamaStatus = "idle";
  state.profileSource = "";
  state.ollamaError = "";
  state.introRead.profile = false;
  state.introRead.how = false;
  state.timerRemaining = EXPERIENCE_MS;
  state.metrics = createMetrics();
}

function startExperience() {
  state.screen = "tracking";
  state.overlay = null;
  state.timerRemaining = EXPERIENCE_MS;
  state.sessionStartedAt = new Date();
  state.sessionNumber = nextParticipantRound();
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
  const countdown = app.querySelector(".countdown");
  if (!countdown) {
    return;
  }
  countdown.textContent = formatCountdown(state.timerRemaining);
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