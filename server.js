import express from 'express';
import dotenv from 'dotenv';
import fetch from 'node-fetch'; // If using Node.js <18, otherwise native fetch is fine
import bodyParser from 'body-parser';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const { content } = result.candidates[0];
console.log('Gemini categorized:', content);

app.use(express.static('public'));
app.use(bodyParser.json());

async function getGeminiResponse(userMessage) {
    const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + process.env.GEMINI_API_KEY;

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
    

    const result = await model.generateContent(prompt);
    const rawResponse = result.response.text();
    console.log('Raw Gemini response:', rawResponse);

    let categoryAndReply = {};
    try {
        categoryAndReply = JSON.parse(rawResponse);
    } catch (error) {
        console.error('Failed to parse Gemini JSON:', error);
    }

    const { category, reply } = categoryAndReply;
    console.log('Gemini categorized:', category);
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
