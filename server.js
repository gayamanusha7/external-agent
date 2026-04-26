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


// 🟢 ✅ FIXED AGENT CARD
app.get("/.well-known/agent-card.json", (req, res) => {
    res.status(200).json({
        name: "External Healthcare Agent",
        description: "Healthcare agent using MCP",
        version: "1.0.0",

        url: "https://external-agent-production.up.railway.app",

        // 🔥 REQUIRED
        defaultInputModes: ["text"],
        defaultOutputModes: ["text"],

        // 🔥 REQUIRED
        supportedInterfaces: [
            {
                url: "https://external-agent-production.up.railway.app",
                protocolBinding: "http",
                protocolVersion: "1.0.0"
            }
        ],

        // 🔥 REQUIRED (UI uses this)
        skills: [
            {
                id: "ask",
                name: "Ask Healthcare Question",
                description: "Fetch patient summary using MCP"
            }
        ],

        // 🔥 REQUIRED (execution uses this)
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
    const { question } = req.body;

    try {
        console.log("🔥 External Agent Called");

        const fhirBaseUrl = req.headers["x-fhir-server-url"];
        const patientId = req.headers["x-patient-id"];
        const token = req.headers["x-fhir-access-token"];

        console.log("Headers:", { fhirBaseUrl, patientId });

        const toolName = question?.toLowerCase().includes("patient")
            ? "get_patient_summary"
            : null;

        if (!toolName) {
            return res.json({
                message: "No relevant tool found"
            });
        }

        const mcpResponse = await fetch(MCP_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` }),
                ...(fhirBaseUrl && { "X-FHIR-Server-URL": fhirBaseUrl }),
                ...(patientId && { "X-Patient-ID": patientId })
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: {
                    name: toolName,
                    arguments: {
                        patient_id: patientId || "example"
                    }
                }
            })
        });

        const data = await mcpResponse.json();

        const content = data?.result?.content?.[0]?.text;

        return res.json({
            agent: "External Healthcare Agent",
            question,
            response: content ? JSON.parse(content) : data
        });

    } catch (error) {
        console.error("❌ Error:", error.message);

        return res.status(500).json({
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`External agent running on ${PORT}`);
});
