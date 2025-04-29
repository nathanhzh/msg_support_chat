import express from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import { GoogleGenAI } from "@google/genai";
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const ai = new GoogleGenAI({ apiKey: `${process.env.GEMINI_API_KEY}` });
const sessionHistory = [];

app.use(express.static('public'));
app.use(bodyParser.json());

async function getGeminiResponse(message) {
    const prompt = `
    Only respond with a single JSON object. Do not include any extra explanation.
    Only redirect them to other links, or say you will submit a request. Do not offer to do stuff for them.
    For simple things like password reset, changing name/username, etc, redirect them to a link. In this case, "ready_for_submit" can be false.
    Respond in a polite manner, such as "Thank you for your request! We have submitted your request and will get back to you."
    
    Categorize the message into the following categories: "Support Request", "Product Feature", "Account Issue".
    If it doesn't fit into any of these categories, specify "Other".
    
    For the ready_for_submit, analyze the message to see if there is enough detail to submit a meaningful request. IF YOU ASK A FOLLOW-UP QUESTION, ready_for_submit SHOULD BE FALSE.
    If it is ready to submit, say you will submit a request and put the appropriate information in "details". Ask if they need additional help. Also set "ready_for_submit" to be true.
    If it is ready_for_submit, also rank the priority for low, medium, and high, depending on the urgency of the request. Major bug issues, account issues, etc are high urgency.
    Smaller bugs are low urgency, and additional features to the website are medium urgency.
    If there is not enough information, ask a follow-up question. Set "ready_for_submit" to be false, and ask more details in the "reply" section.
    
    Respond in this format:
    {
    "category": "",
    "details": "",
    "priority": "",
    "reply": "",
    "ready_for_submit": true
    }
    `;
    
    if (sessionHistory.length === 0) {
        sessionHistory.push(prompt);
    }
    sessionHistory.push(`Here is a provider message: "${message}"`);    

    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: sessionHistory,
    });

    const result = response.text;
    let parsed = {};
    sessionHistory.push(result);
    console.log(result);

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
    
    if (!parsed.category || !parsed.reply || typeof parsed.ready_for_submit !== 'boolean') {
        parsed = {
            category: 'Other',
            details: '',
            priority: 'Low',
            reply: "Sorry, we couldn't process your request. Could you please try again?",
            ready_for_submit: false
        };
    }
    
    return parsed;
}

async function saveToGoogleSheet({ name, priority, category, details }) {
    const auth = new JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];
    const now = new Date();
    const newRequest = await sheet.addRow({ Time: now.toString(), Name: name, Priority: priority, Category: category, Details: details });
}

app.post('/api/message', async (req, res) => {
    const { message } = req.body;
    
    const geminiData = await getGeminiResponse(message);

    if (geminiData.ready_for_submit == true) {
        await saveToGoogleSheet({
            name: "test",
            priority: geminiData.priority,
            category: geminiData.category,
            details: geminiData.details
        });
    }
    res.json({ reply: geminiData.reply });
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
