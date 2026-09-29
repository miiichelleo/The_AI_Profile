const http = require("node:http");
const https = require("node:https");
const fs = require("node:fs");

const PORT = Number(process.env.PORT || 8787);
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434/api/generate";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const TLS_KEY_PATH = process.env.TLS_KEY_PATH;
const TLS_CERT_PATH = process.env.TLS_CERT_PATH;
const EXPERIENCE_SECONDS = 45;
const RESEARCH_NORMS = {
  mouseSpeed: { low: 200, high: 1200, unit: "table units" },
  hoverTime: { low: 300, high: 500, unit: "milliseconds" },
  clickFrequency: { low: 6, high: 7, unit: "clicks/second" },
  idleTime: { low: 308.7, high: 308.7, unit: "milliseconds" }
};

const prompts = {
  personType: "Describe the person type suggested by the norm deviations in one short phrase. Keep it consistent with the strongest deviation.",
  ageGroup: "Infer an exaggerated age group from the norm deviations. Use a number range and generation for ages 13-101. Use 3-4 words only.",
  educationLevel: "Infer an exaggerated education level from the norm deviations. Mention the degree level. Use 3-4 words only.",
  profession: "Infer an exaggerated profession that fits the norm deviations. Use 3-4 words only.",
  decisionMakingStyle: "Infer a decision-making style that fits the norm deviations. Use 3-4 words only.",
  curiosity: "Infer a curiosity level that fits the norm deviations. Use 3-4 words only.",
  confidenceScore: "Infer a confidence score from the norm deviations. Show a percentage out of 100. Larger positive deviations may support higher confidence; negative deviations may support lower confidence. Return a short label only.",
  attentionLevel: "Infer an attention level from the hover-time and idle-time deviations. Use 3-4 words only.",
  engagementLevel: "Infer an engagement level from the click-frequency, hover-time, and idle-time deviations. Use 3-4 words only.",
  stressLevel: "Infer a stress level from the speed, hover-time, click-frequency, and idle-time deviations. Use 3-4 words only.",
  assessmentSummary: "Write 3 short, blunt sentences as a direct character overview. Describe what kind of person the user is, including their main strengths, clear flaws, emotional habits, social behavior, contradictions, and what they probably refuse to admit about themselves. Be noticeably mean and critical, not gently positive. Make bold but believable assumptions with a slightly absurd edge. Focus on human traits such as insecurity, vanity, impatience, empathy, selfishness, ambition, avoidance, or the need for approval. Use plain language only: no metaphors, poetic phrasing, dramatic flourishes, or vague wording. Address the user directly; never be hateful or abusive."
};
const PROFILE_SCHEMA = {
  type: "object",
  properties: Object.fromEntries(Object.keys(prompts).map((key) => [key, { type: "string" }])),
  required: Object.keys(prompts),
  additionalProperties: false
};

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": CORS_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(body));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 100000) {
        reject(new Error("Request body is too large."));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function createPrompt(metrics) {
  const compareToNorm = (value, norm) => {
    const status = value < norm.low ? "below norm" : value > norm.high ? "above norm" : "within norm";
    const deviation = value < norm.low ? value - norm.low : value > norm.high ? value - norm.high : 0;
    return {
      measured: Number(value.toFixed(2)),
      reference: norm.low === norm.high ? norm.low : [norm.low, norm.high],
      unit: norm.unit,
      status,
      deviation: Number(deviation.toFixed(2))
    };
  };
  const speed = metrics.moveDuration > 0 ? metrics.totalDistance / metrics.moveDuration : 0;
  const comparisons = {
    mouseSpeed: compareToNorm(speed, RESEARCH_NORMS.mouseSpeed),
    hoverTime: compareToNorm((Number(metrics.hoverTime) || 0) * 1000, RESEARCH_NORMS.hoverTime),
    clickFrequency: compareToNorm((Number(metrics.clickCount) || 0) / EXPERIENCE_SECONDS, RESEARCH_NORMS.clickFrequency),
    idleTime: compareToNorm((Number(metrics.idleTime) || 0) * 1000, RESEARCH_NORMS.idleTime)
  };
  return `You are generating an intentionally exaggerated fictional profile for an interactive art project.
Do not make factual psychological, demographic, medical, or identity claims.

Measured interaction data compared with the fixed research norms:
${JSON.stringify(comparisons, null, 2)}

Use the measured numbers and their numeric deviations from these norms as the only basis for interpretation. Do not invent another baseline.
Interpretation rules: below norm indicates less of that measured behaviour, above norm indicates more, and within norm indicates typical behaviour. Keep all fields consistent with these directions. Do not infer a personality trait from a field unrelated to its listed measurement.
Assessment exception: use the generated profile fields as the basis for a general personality portrait. The assessment must not explain the measurements or norm deviations and must not use words such as interaction, mouse, click, hover, idle, speed, norm, deviation, or data.

Field prompts:
${Object.entries(prompts).map(([key, prompt]) => `${key}: ${prompt}`).join("\n")}

Return valid JSON only with exactly these keys and string values:
${JSON.stringify(Object.keys(prompts))}`;
}

async function generateProfile(metrics) {
  const response = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL || "granite4.1:3b",
      prompt: createPrompt(metrics),
      format: PROFILE_SCHEMA,
      stream: false,
      options: { temperature: 0.7 }
    })
  });
  if (!response.ok) {
    throw new Error(`Ollama returned ${response.status}`);
  }
  const payload = await response.json();
  return JSON.parse(payload.response);
}

async function handleRequest(request, response) {
  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }
  if (request.method !== "POST" || request.url !== "/api/profile") {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  try {
    const body = JSON.parse(await readBody(request));
    if (!body.metrics || typeof body.metrics !== "object") {
      sendJson(response, 400, { error: "metrics are required" });
      return;
    }
    const profile = await generateProfile(body.metrics);
    sendJson(response, 200, { profile });
  } catch (error) {
    console.error(error);
    sendJson(response, 502, { error: "Profile generation failed" });
  }
}

const server = TLS_KEY_PATH && TLS_CERT_PATH
  ? https.createServer({ key: fs.readFileSync(TLS_KEY_PATH), cert: fs.readFileSync(TLS_CERT_PATH) }, handleRequest)
  : http.createServer(handleRequest);

server.listen(PORT, () => {
  const protocol = TLS_KEY_PATH && TLS_CERT_PATH ? "https" : "http";
  console.log(`Profile API listening at ${protocol}://localhost:${PORT}/api/profile`);
});
