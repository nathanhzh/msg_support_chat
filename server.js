import express from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(bodyParser.json());

async function getGeminiResponse(message) {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const prompt = `
Categorize the following provider message into one of these categories:
- Support Request
- Product Feedback
- Account Issue
- Other

Respond ONLY with a JSON object like this:
{ "category": "Support Request", "reply": "Thanks for reaching out! We'll get back to you soon." }

Here is the message:
"${message}"
`;

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    const result = await response.json();

    const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('Raw Gemini response:', rawText);

    let parsed = {};
    try {
        parsed = JSON.parse(rawText);
    } catch (error) {
        console.error('Failed to parse Gemini response as JSON:', error);
        parsed = { category: "Other", reply: "Sorry, we couldn't process your request. A team member will follow up soon." };
    }

    return parsed;
}

app.post('/api/message', async (req, res) => {
    const { message } = req.body;

    const geminiData = await getGeminiResponse(message);
    console.log('Gemini categorized:', geminiData);

    // Google Sheets saving is commented out for now
    // await saveToGoogleSheet({ message, category: geminiData.category });

    res.json({ reply: geminiData.reply });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
