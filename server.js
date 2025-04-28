import express from 'express';
import dotenv from 'dotenv';
import fetch from 'node-fetch'; // If using Node.js <18, otherwise native fetch is fine
import bodyParser from 'body-parser';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(bodyParser.json());

async function getGeminiResponse(userMessage) {
    const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + process.env.GEMINI_API_KEY;

    const systemPrompt = `Categorize the user's message into one of these categories: 
- Support Request
- Product Feedback
- Account Issue
- General Question

Respond in this format (JSON):
{
  "category": "chosen category",
  "reply": "short helpful response to user"
}`;

    const payload = {
        contents: [
            { role: "user", parts: [{ text: systemPrompt + "\n\n" + userMessage }] }
        ]
    };

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    try {
        return JSON.parse(text);
    } catch (error) {
        console.error('Failed to parse Gemini response', error);
        return { category: 'Unknown', reply: "Thanks for your message! We'll get back to you soon." };
    }
}

app.post('/api/message', async (req, res) => {
    const { message } = req.body;

    const geminiData = await getGeminiResponse(message);
    console.log('Gemini categorized:', geminiData);

    // Commented out Google Sheets for now
    // await saveToGoogleSheet({ message, category: geminiData.category });

    res.json({ reply: geminiData.reply });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
