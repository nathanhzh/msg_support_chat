import express from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const ai = new GoogleGenAI({ apiKey: `${process.env.GEMINI_API_KEY}`});

app.use(express.static('public'));
app.use(bodyParser.json());

async function getGeminiResponse(message) {
    const prompt = `
    Only respond with a single JSON object. Do not include any extra explanation.
    Only redirect them to other links, or say you will submit a request. Do not offer to do stuff for them.
    Respond in a polite manner, such as "Thank you for your request! We have submitted your request and will get back to you."

    Here is a provider message: "${message}"
    Categorize the message into the following categories: "Support Request", "Product Feature", "Account Issue".
    If it doesn't fit into any of these categories, specify "Other".

    Respond in this format:
    {
    "category": "",
    "reply": ""
    }
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt
    });

    const result = response.text;
    console.log('Raw Gemini response:', result);

    let parsed = {};

    try {
        parsed = JSON.parse(result);
    } catch (err) {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                parsed = JSON.parse(jsonMatch[0]);
            } catch (innerErr) {
                console.error('Failed to parse Gemini extracted JSON:', innerErr);
            }
        } else {
            console.error('No valid JSON object found in Gemini response.');
        }
    }

    if (!parsed.category || !parsed.reply) {
        parsed = {
            category: 'Other',
            reply: "Sorry, we couldn't process your request. A team member will follow up soon."
        };
    }

    return parsed;
}

app.post('/api/message', async (req, res) => {
    const { message } = req.body;
    
    console.log(message);
    const geminiData = await getGeminiResponse(message);

    res.json({ reply: geminiData.reply, feedback: { category: geminiData.category, info: geminiData.info }, needsMoreInfo: geminiData.needs_more_info });
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
