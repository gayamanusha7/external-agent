import express from "express";
import cors from "cors";

const app = express();

// 🔥 IMPORTANT: enable CORS (fixes HTTP failed)
app.use(cors());

app.use(express.json());

const PORT = process.env.PORT || 4000;

// 👉 Your MCP URL
const MCP_URL = "https://healthcare-ai-6sn2.onrender.com";

// 🟢 Root check
app.get("/", (req, res) => {
    res.send("External Agent Running 🚀");
});


// 🟢 AGENT CARD (UPDATED - REQUIRED FOR A2A CHECK)
app.get("/.well-known/agent.json", (req, res) => {
    console.log("🔥 Agent card requested");

    res.json({
        name: "External Healthcare Agent",
        version: "1.0.0",
        description: "External agent that invokes MCP to fetch patient data using FHIR context",
        server: {
            base_url: "https://external-agent.onrender.com"
        },
        capabilities: {
            actions: [
                {
                    name: "ask",
                    description: "Ask healthcare-related questions",
                    endpoint: "/ask",
                    method: "POST",
                    input_schema: {
                        type: "object",
                        properties: {
                            question: { type: "string" }
                        },
                        required: ["question"]
                    }
                }
            ]
        }
    });
});


// 🟢 MAIN AGENT LOGIC
app.post("/ask", async (req, res) => {
    const { question } = req.body;

    try {
        // 👉 Extract FHIR headers if available
        const fhirBaseUrl = req.headers["x-fhir-server-url"];
        const patientId = req.headers["x-patient-id"];
        const token = req.headers["x-fhir-access-token"];

        console.log("🔥 External Agent Called");
        console.log("Headers:", { fhirBaseUrl, patientId });

        // 👉 Decide tool
        const toolName = question?.toLowerCase().includes("patient")
            ? "get_patient_summary"
            : null;

        if (!toolName) {
            return res.json({
                message: "No relevant tool found for this question"
            });
        }

        // 👉 Call MCP using JSON-RPC
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

        return res.json({
            question,
            agent: "External Healthcare Agent",
            mcp_response: data
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
