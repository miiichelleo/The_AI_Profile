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
  mouseSpeed: { label: "Mouse speed", low: 200, high: 1200, unit: "px/s" },
  hoverTime: { label: "Hover time", low: 0.3, high: 0.5, unit: "seconds" },
  clickFrequency: { label: "Click frequency", low: 6, high: 7, unit: "clicks/s" },
  idleTime: { label: "Idle time", low: 0.308, high: 0.308, unit: "seconds" }
};

const prompts = {
  personType: "Describe an exaggerated overall person type based on interaction measurements in a phrase. Make it funny and a bit silly, like 'a playful genius'. Do not repeat words.",
  ageGroup: "Infer an exaggerated age group from these interaction measurements. Use a number range and the corresponding generation, for ages 13-101. Use 3-4 words only.",
  educationLevel: "Infer an exaggerated education level from these interaction measurements. Mention the degree level obtained. Use 3-4 words only.",
  profession: "Infer an exaggerated profession from these interaction measurements and add a brief explanation. Use 3-4 words only.",
  decisionMakingStyle: "Infer an exaggerated decision-making style from these interaction measurements. Make it funny. Use 3-4 words only.",
  curiosity: "Infer an exaggerated curiosity level. Use 3-4 words.",
  confidenceScore: "Infer an exaggerated confidence score from these interaction measurements. Show a percentage out of 100 and return a short label only.",
  attentionLevel: "Infer an exaggerated attention level. Use 3-4 words.",
  engagementLevel: "Infer an exaggerated engagement level from concentration and personality assumptions. Use 3-4 words only.",
  stressLevel: "Infer an exaggerated stress level. Use 3-4 words.",
  assessmentSummary: "Write one short paragraph of 2-3 sentences describing the exaggerated personality interpretation. Make strong assumptions, make it over the top and funny, address the user directly, and avoid repeating the other fields."
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
  const speed = metrics.moveDuration > 0 ? metrics.totalDistance / metrics.moveDuration : 0;
  const clicksPerSecond = metrics.clickCount / EXPERIENCE_SECONDS;
  const benchmark = (value, norm) => ({
    value,
    status: value < norm.low ? "below norm" : value > norm.high ? "above norm" : "within norm",
    reference: norm.low === norm.high
      ? `${norm.low} ${norm.unit}`
      : `${norm.low}-${norm.high} ${norm.unit}`
  });
  const comparisons = {
    mouseSpeed: benchmark(speed, RESEARCH_NORMS.mouseSpeed),
    hoverTime: benchmark(Number(metrics.hoverTime) || 0, RESEARCH_NORMS.hoverTime),
    clickFrequency: benchmark(clicksPerSecond, RESEARCH_NORMS.clickFrequency),
    idleTime: benchmark(Number(metrics.idleTime) || 0, RESEARCH_NORMS.idleTime)
  };
  return `You are generating an intentionally exaggerated fictional profile for an interactive art project.
Do not make factual psychological, demographic, medical, or identity claims.

Measured interaction data:
${JSON.stringify(metrics, null, 2)}

Research-supported experimental norms. Treat these as the baseline for interpretation:
${JSON.stringify(RESEARCH_NORMS, null, 2)}

Comparison against the norms. Base the profile on these statuses; below norm means the measured value is below the reference, above norm means it exceeds the reference, and within norm means it falls inside the reference range:
${JSON.stringify(comparisons, null, 2)}

Do not invent alternative baselines. Interpret each measurement in relation to its provided norm before making any exaggerated fictional inference.

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
      format: "json",
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
