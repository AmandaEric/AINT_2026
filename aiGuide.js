// ----------------------------------------------------------
// aiguide.js – OpenAI Follow-Up & Evaluation Service
// ----------------------------------------------------------

import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.AI_PORT || 3001;

// ----------------------------------------------------------
// OpenAI Client
// ----------------------------------------------------------
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// ----------------------------------------------------------
// Health Check
// ----------------------------------------------------------
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "AINT AI API is working!"
    });
});

// ----------------------------------------------------------
// AI Follow-Up Endpoint
// ----------------------------------------------------------
app.post("/api/generate-followup", async (req, res) => {
    try {
        const { originalQuestion, studentResponse, category } = req.body;

        console.log("\n================================");
        console.log("AI EVALUATION REQUEST");
        console.log("================================");
        console.log("Question:", originalQuestion);
        console.log("Student Response:", studentResponse);
        console.log("Category:", category);

        if (!originalQuestion || !studentResponse) {
            return res.status(400).json({
                error: "Question and student response are required."
            });
        }

        const prompt = `
You are an AI evaluator for a student performance evaluation system.

The student was asked this question:
${originalQuestion}

The question category is:
${category}

The student answered:
${studentResponse}

Evaluate the student's answer.
If the student understands the question well, do NOT ask another question.
If the student needs to explain their answer more, ask ONE helpful follow-up question.
Do not give the student the answer.

Return ONLY valid JSON using exactly this format:
{
    "needsFollowUp": true or false,
    "evaluation": "Short explanation of the student's answer.",
    "followUpQuestion": "One helpful follow-up question or empty string if not needed.",
    "score": number between 0 and 100
}`;

        const response = await client.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: "You are an AI assistant that responds strictly in valid JSON." },
                { role: "user", content: prompt }
            ]
        });

        const text = response.choices[0].message.content;

        console.log("\nAI RESPONSE:");
        console.log(text);

        let result;
        try {
            result = JSON.parse(text);
        } catch (error) {
            console.log("Could not parse AI JSON output. Fallback triggered.");
            result = {
                needsFollowUp: true,
                evaluation: text,
                followUpQuestion: "Can you explain your answer in more detail?",
                score: 0
            };
        }

        res.json(result);

    } catch (error) {
        console.error("AI ERROR:", error);

        res.status(500).json({
            error: "AI request failed.",
            details: error.message
        });
    }
});

// ----------------------------------------------------------
// Start AI Server
// ----------------------------------------------------------
app.listen(PORT, () => {
    console.log("\n================================");
    console.log("AINT AI API IS RUNNING");
    console.log("================================");
    console.log(`Server URL:  http://localhost:${PORT}`);
    console.log(`AI Endpoint: http://localhost:${PORT}/api/generate-followup`);
    console.log("================================\n");
});