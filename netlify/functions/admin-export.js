// Admin Export - download conversation data as CSV
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

    const params = new URLSearchParams(event.rawQuery || "");
    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    const bearerToken = authHeader.replace('Bearer ', '');
    const queryPassword = params.get("password");
    const password = bearerToken || queryPassword;

    if (password !== process.env.ADMIN_PASSWORD) {
        return { statusCode: 401, body: "Unauthorized" };
    }

    const range = params.get("range") || "week"; // day | week | month

    // Use Taiwan timezone for consistent date range calculation
    const nowTW = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
    let since;
    const now = new Date();
    if (range === "day") {
        since = new Date(nowTW.getFullYear(), nowTW.getMonth(), nowTW.getDate()).toISOString();
    } else if (range === "week") {
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    } else {
        since = new Date(nowTW.getFullYear(), nowTW.getMonth(), 1).toISOString();
    }

    const labelMap = { day: "日報", week: "週報", month: "月報" };
    const filename = `HCF_AI_${labelMap[range] || "報告"}_${nowTW.toISOString().split("T")[0]}.csv`;

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
        const mockCsv =
            "時間,引擎,問題,回應時間(ms),成功\n" +
            `${now.toISOString()},gemini,費用怎麼算？,1820,true\n` +
            `${new Date(now - 60000).toISOString()},claude,新手適合嗎？,2340,true\n`;
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
            body: "\uFEFF" + mockCsv,
        };
    }

    try {
        const { createClient } = require("@supabase/supabase-js");
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

        const { data } = await supabase
            .from("ai_interactions")
            .select("created_at, engine, user_message, response_time, tokens_input, tokens_output, success")
            .gte("created_at", since)
            .order("created_at", { ascending: false });

        const rows = [["時間", "引擎", "問題", "回應時間(ms)", "輸入Tokens", "輸出Tokens", "成功"]];
        (data || []).forEach((r) => {
            rows.push([
                r.created_at,
                r.engine || "",
                `"${(r.user_message || "").replace(/"/g, '""')}"`,
                r.response_time || 0,
                r.tokens_input || 0,
                r.tokens_output || 0,
                r.success ? "是" : "否",
            ]);
        });

        const csv = rows.map((r) => r.join(",")).join("\n");

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
            body: "\uFEFF" + csv, // BOM for Excel UTF-8
        };
    } catch (error) {
        console.error("admin-export error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
