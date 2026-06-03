const { HCF_SYSTEM_PROMPT } = require("./shared-config");

// Use only Gemini REST endpoint to reduce SDK/ESM compatibility issues.
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

async function tryGeminiAPI(message) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const url = `${GEMINI_ENDPOINT}?key=${process.env.GEMINI_API_KEY}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [{ text: `${HCF_SYSTEM_PROMPT}\n\n用戶: ${message}` }],
      }],
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Gemini API error (${resp.status}): ${text}`);
  }

  const data = await resp.json();
  const reply = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";

  if (!reply) throw new Error("Gemini API returned empty reply");

  // Estimate tokens (Gemini doesn't always return exact counts)
  const inputTokens = data?.usageMetadata?.promptTokenCount || Math.ceil(message.length / 3);
  const outputTokens = data?.usageMetadata?.candidatesTokenCount || Math.ceil(reply.length / 3);

  return { reply, inputTokens, outputTokens };
}

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(payload),
  };
}

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    };
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method Not Allowed" });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    return jsonResponse(400, { error: "Invalid JSON" });
  }

  const message = (body?.message || "").toString().trim();
  if (!message) {
    return jsonResponse(400, { error: "Message is required" });
  }

  const startTime = Date.now();

  try {
    const { reply, inputTokens, outputTokens } = await tryGeminiAPI(message);
    const responseTime = Date.now() - startTime;

    // Log to Supabase if configured
    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
      try {
        const { createClient } = require("@supabase/supabase-js");
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
        await supabase.from("ai_interactions").insert({
          engine: "gemini",
          user_message: message,
          ai_response: reply,
          response_time: responseTime,
          tokens_input: inputTokens,
          tokens_output: outputTokens,
          success: true,
        });
      } catch (dbErr) {
        console.error("Supabase log error:", dbErr.message);
      }
    }

    return jsonResponse(200, { reply, engine: "gemini", responseTime });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error("Chat function error", error);

    // Log failure to Supabase
    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
      try {
        const { createClient } = require("@supabase/supabase-js");
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
        await supabase.from("ai_interactions").insert({
          engine: "gemini",
          user_message: message,
          ai_response: error.message,
          response_time: responseTime,
          tokens_input: 0,
          tokens_output: 0,
          success: false,
        });
      } catch (dbErr) {
        console.error("Supabase failure log error:", dbErr.message);
      }
    }

    return jsonResponse(500, { error: "鯊魚教練現在無法回應" });
  }
};
