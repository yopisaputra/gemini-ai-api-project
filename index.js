const express = require('express');
const dotenv = require('dotenv');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const wasi = require("node:wasi");

dotenv.config();
const app = express();
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

const upload = multer({ dest: 'uploads/' });

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Gemini API server is running on http://localhost:${PORT}`);
})


/* Implementasi Teks */
app.post('/generate-text', async (req, res) => {
    const { prompt, prompt2, prompt3 } = req.body;

    try {
        const result = await model.generateContent( [prompt, prompt2, prompt3] );
        const response = result.response;
        res.status(200).json( {output: response.text() } )
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

/* Implementasi Gambar */
app.post('/generate-from-image', upload.single('image'), async (req, res) => {
    const prompt = req.body.prompt || "Describe the image";
    const image = imageToGenerativePart(req.file.path);

    try {
        const result = await model.generateContent([prompt, image]);
        const response = await result.response;
        res.json({ output: response.text() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        fs.unlinkSync(req.file.path);
    }
})

/* Implementasi File */
app.post('/generate-from-document', upload.single('document'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    const prompt = req.body.prompt || "Analyze this document";
    const filePath = req.file.path;
    const buffer = fs.readFileSync(filePath);
    const base64Data = buffer.toString('base64');
    const mimeType = req.file.mimetype;

    try {
        const documentPart = {
            inlineData: { data: base64Data, mimeType }
        };

        const result = await model.generateContent([prompt, documentPart]);
        const response = await result.response;
        res.json( { output: response.text() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        fs.unlinkSync(filePath);
    }
});

/* Implementasi File */
app.post('/generate-from-audio', upload.single('audio'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No audio file uploaded" });
    }

    const prompt = req.body.prompt || "What does this audio say?";
    const audioBuffer = fs.readFileSync(req.file.path);
    const base64Audio = audioBuffer.toString('base64');
    const audioPart = {
        inlineData: { data: base64Audio, mimeType: req.file.mimetype }
    };

    try {
        const result = await model.generateContent([prompt, audioPart]);
        const response = await result.response;
        res.json( { output: response.text() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        fs.unlinkSync(req.file.path);
    }
})