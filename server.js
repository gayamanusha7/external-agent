import express from "express";

const app = express();

// 🔥 Manual CORS
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }

    next();
});

app.use(express.json());

const PORT = process.env.PORT || 4000;

// 👉 MCP URL
const MCP_URL = "https://healthcare-ai-6sn2.onrender.com";

// 🟢 Root
app.get("/", (req, res) => {
    res.send("External Agent Running 🚀");
});

// 🟢 Health check (IMPORTANT)
app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});


// 🟢 AGENT CARD
app.get("/.well-known/agent-card.json", (req, res) => {
    res.status(200).json({
        name: "External Healthcare Agent",
        description: "Healthcare agent using MCP",
        version: "1.0.0",

        url: "https://external-agent-production.up.railway.app",

        defaultInputModes: ["text"],
        defaultOutputModes: ["text"],

        supportedInterfaces: [
            {
                url: "https://external-agent-production.up.railway.app",
                protocolBinding: "http",
                protocolVersion: "1.0.0"
            }
        ],

        skills: [
            {
                id: "ask",
                name: "Ask Healthcare Question",
                description: "Fetch patient summary using MCP",
                tags: ["healthcare", "patient", "mcp"]
            }
        ],

        capabilities: {
            actions: [
                {
                    name: "ask",
                    description: "Ask healthcare questions",
                    method: "POST",
                    path: "/ask",

                    input_schema: {
                        type: "object",
                        properties: {
                            question: { type: "string" }
                        },
                        required: ["question"]
                    },

                    output_schema: {
                        type: "object"
                    }
                }
            ]
        }
    });
});


// 🟢 MAIN AGENT
app.post("/ask", async (req, res) => {
    const question = req.body?.question || "default patient";

    try {
        const mcpResponse = await fetch(MCP_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: {
                    name: "get_patient_summary",
                    arguments: {
                        patient_id: "example"
                    }
                }
            })
        });

        const data = await mcpResponse.json();

        let parsedResponse;

        try {
            const content = data?.result?.content?.[0]?.text;
            parsedResponse = content ? JSON.parse(content) : data;
        } catch {
            parsedResponse = data;
        }

        return res.json(parsedResponse);

    } catch (error) {
        console.error("❌ Error:", error.message);

        return res.json({
            status: "ok",
            message: "fallback response"
        });
    }
});

app.listen(PORT, () => {
    console.log(`External agent running on ${PORT}`);
});
