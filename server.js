const http = require("node:http");
const https = require("node:https");
const fs = require("node:fs");

const PORT = Number(process.env.PORT || 8787);
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434/api/generate";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const TLS_KEY_PATH = process.env.TLS_KEY_PATH;
const TLS_CERT_PATH = process.env.TLS_CERT_PATH;

const prompts = {
  personType: "Describe the overall person type suggested by these interaction measurements in 1-2 sentences.",
  ageGroup: "Infer an exaggerated age group using a number range and generation. Use 3-4 words.",
  educationLevel: "Infer an exaggerated education level. Use 3-4 words.",
  profession: "Infer an exaggerated profession. Use 3-4 words.",
  decisionMakingStyle: "Infer an exaggerated decision-making style. Use 3-4 words.",
  curiosity: "Infer an exaggerated curiosity level. Use 3-4 words.",
  confidenceScore: "Infer an exaggerated confidence score as a percentage.",
  attentionLevel: "Infer an exaggerated attention level. Use 3-4 words.",
  engagementLevel: "Infer an exaggerated engagement level. Use 3-4 words.",
  stressLevel: "Infer an exaggerated stress level. Use 3-4 words.",
  assessmentSummary: "Write one short paragraph of 2-3 sentences describing the exaggerated personality interpretation. Mention confidence, risk, and anomaly in natural prose."
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
  return `You are generating an intentionally exaggerated fictional profile for an interactive art project.
Do not make factual psychological, demographic, medical, or identity claims.

Measured interaction data:
${JSON.stringify(metrics, null, 2)}

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
