require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { spawn } = require('child_process');

const app = express();
app.use(express.json());
app.use(cors());

const API_KEY = process.env.API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const outputFolder = process.env.OUTPUT_FOLDER || path.join(__dirname, 'audios_temp');
const MAX_DURATION = parseInt(process.env.MAX_DURATION) || 600;
const ytDlpPath = process.env.YT_DLP_PATH || '.\\yt-dlp.exe';
const proxyUrl = process.env.PROXY_URL || '';
const proxyArgs = proxyUrl ? ['--proxy', proxyUrl] : [];

if (!fs.existsSync(outputFolder)) fs.mkdirSync(outputFolder, { recursive: true });

function authMiddleware(req, res, next) {
    const key = req.headers['x-api-key'];
    if (!key || key !== API_KEY) return res.status(401).json({ error: 'Não autorizado. Envie x-api-key no header.' });
    next();
}

const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: 'Muitas requisições. Aguarde um momento.' }
});
app.use('/transcrever', limiter, authMiddleware);

function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
}

app.post('/transcrever', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: 'URL faltando' });

        const videoId = extractVideoId(url);
        if (!videoId) return res.status(400).json({ error: 'URL do YouTube inválida' });

        console.log(`🔍 Verificando duração do vídeo...`);

        const duracao = await new Promise((resolve, reject) => {
            const proc = spawn(ytDlpPath, [...proxyArgs, '--print', 'duration', url], { shell: true });
            let output = '';
            let errOutput = '';
            proc.stdout.on('data', d => output += d);
            proc.stderr.on('data', d => errOutput += d);
            proc.on('close', code => {
                if (errOutput) console.error(`⚠️ yt-dlp: ${errOutput.trim()}`);
                if (code !== 0) return reject(`Erro ao obter duração (exit ${code})`);
                resolve(parseFloat(output.trim()));
            });
            proc.on('error', reject);
        });

        if (duracao > MAX_DURATION) {
            const minutos = Math.floor(duracao / 60);
            const maxMin = Math.floor(MAX_DURATION / 60);
            return res.status(400).json({
                error: `Vídeo de ${minutos}min excede o limite de ${maxMin}min. Escolha um vídeo mais curto.`
            });
        }

        console.log(`✅ Duração: ${Math.floor(duracao / 60)}min ${Math.floor(duracao % 60)}s`);
        const timestamp = Date.now();
        const audioFile = path.join(outputFolder, `audio_${timestamp}.webm`);

        console.log(`🚀 Baixando áudio...`);
        const downloader = spawn(ytDlpPath, [...proxyArgs, '--no-playlist', '-f', 'bestaudio[ext=webm]', '-o', audioFile, url], { shell: true });

        downloader.on('close', async (code) => {
            if (code !== 0) return res.status(500).json({ error: 'Erro no download' });

            console.log(`✅ Áudio baixado, enviando para Groq Whisper...`);
            const formData = new FormData();
            formData.append('file', fs.createReadStream(audioFile));
            formData.append('model', 'whisper-large-v3');
            formData.append('response_format', 'verbose_json');

            try {
                const response = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', formData, {
                    headers: { ...formData.getHeaders(), 'Authorization': `Bearer ${GROQ_API_KEY}` }
                });
                const legendaJson = response.data.segments.map(s => ({
                    start: s.start,
                    end: s.end,
                    text: s.text.trim()
                }));
                res.json({ status: 'success', data: legendaJson });
            } catch (err) {
                res.status(500).json({ error: 'Erro na IA', details: err.message });
            } finally {
                if (fs.existsSync(audioFile)) fs.unlinkSync(audioFile);
            }
        });
    } catch (err) {
        console.error(`❌ Erro: ${err}`);
        res.status(500).json({ error: 'Erro interno', details: err.message || err });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🔥 API rodando local em http://localhost:${PORT}`));