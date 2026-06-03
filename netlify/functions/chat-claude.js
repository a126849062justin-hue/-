const { HCF_SYSTEM_PROMPT } = require("./shared-config");

exports.handler = async (event) => {
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            },
            body: ""
        };
    }

    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

    try {
        if (!process.env.ANTHROPIC_API_KEY) {
            return {
                statusCode: 503,
                headers,
                body: JSON.stringify({ error: "Claude API 未配置，請設定 ANTHROPIC_API_KEY 環境變數。" }),
            };
        }

        const { message } = JSON.parse(event.body || "{}");
        if (!message) {
            return { statusCode: 400, headers, body: JSON.stringify({ reply: "請輸入問題！" }) };
        }

        const Anthropic = require("@anthropic-ai/sdk");
        const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

        const startTime = Date.now();
        const response = await client.messages.create({
            model: "claude-3-5-haiku-20241022",
            max_tokens: 256,
            system: HCF_SYSTEM_PROMPT,
            messages: [{ role: "user", content: message }],
        });

        const reply = response.content[0].text;
        const responseTime = Date.now() - startTime;
        const inputTokens = response.usage?.input_tokens || 0;
        const outputTokens = response.usage?.output_tokens || 0;

        // Log to Supabase if configured
        if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
            try {
                const { createClient } = require("@supabase/supabase-js");
                const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
                await supabase.from("ai_interactions").insert({
                    engine: "claude",
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

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ reply, engine: "claude", responseTime }),
        };

    } catch (error) {
        console.error("Claude AI 錯誤:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ reply: "⚠️ 鯊魚教練去打沙包了！請直接點擊下方 LINE 找真人客服！🥊" }),
        };
    }
};
