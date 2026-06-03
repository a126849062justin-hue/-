// Admin User Behavior - returns recent conversations and top questions
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

    if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };

    const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    const bearerToken = authHeader.replace('Bearer ', '');
    const params = new URLSearchParams(event.rawQuery || "");
    const queryPassword = params.get("password");
    const password = bearerToken || queryPassword;

    if (password !== process.env.ADMIN_PASSWORD) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                recentLogs: [
                    { engine: "gemini", userMessage: "費用怎麼算？", responseTime: 1820, success: true, createdAt: new Date().toISOString() },
                    { engine: "claude", userMessage: "新手適合嗎？", responseTime: 2340, success: true, createdAt: new Date(Date.now() - 60000).toISOString() },
                    { engine: "gemini", userMessage: "地點在哪？", responseTime: 1650, success: true, createdAt: new Date(Date.now() - 120000).toISOString() },
                    { engine: "claude", userMessage: "需要裝備嗎？", responseTime: 2100, success: true, createdAt: new Date(Date.now() - 180000).toISOString() },
                    { engine: "gemini", userMessage: "有私人教練嗎？", responseTime: 1900, success: true, createdAt: new Date(Date.now() - 240000).toISOString() },
                ],
                topQuestions: [
                    { question: "費用怎麼算？", count: 128 },
                    { question: "新手適合嗎？", count: 97 },
                    { question: "地點在哪？", count: 84 },
                    { question: "需要裝備嗎？", count: 61 },
                    { question: "有私人教練嗎？", count: 43 },
                ],
                note: "Supabase 未配置，顯示模擬數據",
            }),
        };
    }

    try {
        const { createClient } = require("@supabase/supabase-js");
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

        // Recent 5 conversations
        const { data: recentData } = await supabase
            .from("ai_interactions")
            .select("engine, user_message, response_time, success, created_at")
            .order("created_at", { ascending: false })
            .limit(5);

        // Top questions (aggregate by user_message)
        const { data: allMessages } = await supabase
            .from("ai_interactions")
            .select("user_message")
            .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        const questionCounts = {};
        (allMessages || []).forEach((r) => {
            const q = (r.user_message || "").substring(0, 50);
            questionCounts[q] = (questionCounts[q] || 0) + 1;
        });

        const topQuestions = Object.entries(questionCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([question, count]) => ({ question, count }));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                recentLogs: (recentData || []).map((r) => ({
                    engine: r.engine,
                    userMessage: r.user_message,
                    responseTime: r.response_time,
                    success: r.success,
                    createdAt: r.created_at,
                })),
                topQuestions,
            }),
        };
    } catch (error) {
        console.error("admin-user-behavior error:", error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};
