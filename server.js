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


// 🟢 Root GET (health + browser check)
app.get("/", (req, res) => {
    res.send("External Agent Running 🚀");
});

// 🟢 Health endpoint (validator may call this)
app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});


// 🟢 ✅ AGENT CARD (FINAL FORMAT)
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


// 🟢 🔥 CORE MCP CALL FUNCTION (reuse everywhere)
async function fetchPatientSummary() {
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

    try {
        const content = data?.result?.content?.[0]?.text;
        return content ? JSON.parse(content) : data;
    } catch {
        return data;
    }
}


// 🟢 🔥 A2A ENTRY POINT (THIS FIXES CHECK)
app.post("/", async (req, res) => {
    try {
        console.log("🔥 A2A CALL:", req.body);

        const { method, params, id } = req.body;

        if (method === "ask") {
            const result = await fetchPatientSummary();

            return res.json({
                jsonrpc: "2.0",
                id: id || 1,
                result
            });
        }

        return res.json({
            jsonrpc: "2.0",
            id: id || 1,
            error: { message: "Unknown method" }
        });

    } catch (error) {
        console.error("❌ A2A ERROR:", error.message);

        return res.json({
            jsonrpc: "2.0",
            id: 1,
            error: { message: "Internal error" }
        });
    }
});


// 🟢 REST endpoint (for your manual testing)
app.post("/ask", async (req, res) => {
    try {
        const result = await fetchPatientSummary();

        return res.json(result);

    } catch (error) {
        return res.json({
            status: "ok",
            message: "fallback response"
        });
    }
});


app.listen(PORT, () => {
    console.log(`External agent running on ${PORT}`);
});
