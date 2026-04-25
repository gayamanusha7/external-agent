import express from "express";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4000;

// Replace with your MCP URL
const MCP_URL = "https://healthcare-ai-6sn2.onrender.com";

app.post("/ask", async (req, res) => {
    const { question } = req.body;

    try {
        // Step 1: Call MCP (JSON-RPC)
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

        return res.json({
            question,
            mcp_result: data
        });

    } catch (error) {
        return res.status(500).json({
            error: error.message
        });
    }
});

app.get("/", (req, res) => {
    res.send("External Agent Running 🚀");
});

app.listen(PORT, () => {
    console.log(`External agent running on ${PORT}`);
});
