import express from "express";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;


// 🟢 Health check
app.get("/", (req, res) => {
    res.send("MCP Server Running 🚀");
});

app.get("/healthz", (req, res) => {
    res.send("OK");
});


// 🟢 MCP Metadata
app.get("/.well-known/mcp", (req, res) => {
    res.json({
        name: "Patient Summary MCP",
        version: "1.0.0",
        tools: [
            {
                name: "get_patient_summary",
                description: "Fetch patient summary from FHIR",
                input_schema: {
                    type: "object",
                    properties: {},
                    required: []
                }
            }
        ]
    });
});


// 🟢 MCP JSON-RPC handler
app.post("/", async (req, res) => {
    try {
        const { method, params, id } = req.body;

        if (method !== "tools/call") {
            return res.json({
                jsonrpc: "2.0",
                id,
                error: { message: "Unsupported method" }
            });
        }

        const toolName = params?.name;

        if (toolName !== "get_patient_summary") {
            return res.json({
                jsonrpc: "2.0",
                id,
                error: { message: "Unknown tool" }
            });
        }

        // 🔥 GET FHIR CONTEXT FROM HEADERS
        const fhirBase = req.headers["x-fhir-server-url"];
        const token = req.headers["x-fhir-access-token"];
        const patientId = req.headers["x-patient-id"];

        console.log("FHIR CONTEXT:", {
            fhirBase,
            patientId
        });

        if (!fhirBase || !patientId) {
            return res.json({
                jsonrpc: "2.0",
                id,
                result: {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                error: "Missing FHIR context"
                            })
                        }
                    ]
                }
            });
        }

        // 🔹 Fetch Patient
        const patientRes = await fetch(
            `${fhirBase}/Patient/${patientId}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const patient = await patientRes.json();

        const name =
            (patient.name?.[0]?.given?.join(" ") || "") +
            " " +
            (patient.name?.[0]?.family || "");

        // 🔹 Fetch Conditions
        const condRes = await fetch(
            `${fhirBase}/Condition?patient=${patientId}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const condData = await condRes.json();

        const conditions =
            condData.entry?.map(
                (c) => c.resource.code?.text || "Unknown"
            ) || [];

        // 🔹 Final response
        const result = {
            patient_id: patientId,
            name: name.trim() || "Unknown",
            conditions,
            summary:
                conditions.length > 0
                    ? `${name} has ${conditions.join(", ")}`
                    : `${name} has no recorded conditions`
        };

        return res.json({
            jsonrpc: "2.0",
            id,
            result: {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result)
                    }
                ]
            }
        });

    } catch (error) {
        console.error("❌ ERROR:", error.message);

        return res.json({
            jsonrpc: "2.0",
            id: 1,
            error: {
                message: "Server error",
                details: error.message
            }
        });
    }
});


app.listen(PORT, () => {
    console.log(`MCP Server running on ${PORT}`);
});
