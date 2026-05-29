require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const ytdl = require('@distube/ytdl-core');
const { spawn } = require('child_process');

const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use(cors());

const API_KEY = process.env.API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const outputFolder = process.env.OUTPUT_FOLDER || '/tmp/jarvis-audios';
const MAX_DURATION = parseInt(process.env.MAX_DURATION) || 600;
const COOKIE_FILE = path.join(outputFolder, 'cookies.txt');

if (!fs.existsSync(outputFolder)) fs.mkdirSync(outputFolder, { recursive: true });

function authMiddleware(req, res, next) {
    const key = req.headers['x-api-key'];
    if (!key || key !== API_KEY) {
        return res.status(401).json({ error: 'Não autorizado. Envie x-api-key no header.' });
    }
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

function parseISO8601(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const h = parseInt(match[1] || 0, 10);
    const m = parseInt(match[2] || 0, 10);
    const s = parseInt(match[3] || 0, 10);
    return h * 3600 + m * 60 + s;
}

app.post('/cookies', authMiddleware, async (req, res) => {
    try {
        const { cookies } = req.body;
        if (!cookies) {
            return res.status(400).json({
                error: 'Envie os cookies no campo "cookies".',
                como_obter: '1. Acesse youtube.com logado no Chrome. 2. DevTools > Application > Cookies > youtube.com. 3. Clique em qualquer cookie, Ctrl+A, copie como "Cookie string". 4. Envie aqui via POST /cookies com {"cookies": "seu_string_aqui"}'
            });
        }
        fs.writeFileSync(COOKIE_FILE, cookies, 'utf-8');
        console.log(`🍪 Cookies salvos (${cookies.length} chars)`);
        res.json({ status: 'success', message: 'Cookies salvos com sucesso.' });
    } catch (err) {
        console.error(`❌ Erro ao salvar cookies: ${err}`);
        res.status(500).json({ error: 'Erro ao salvar cookies' });
    }
});

app.post('/transcrever', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: 'URL faltando' });

        const videoId = extractVideoId(url);
        if (!videoId) return res.status(400).json({ error: 'URL do YouTube inválida' });

        console.log(`🔍 Buscando informações do vídeo ${videoId}...`);

        let duration;
        try {
            const ytRes = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
                params: { id: videoId, part: 'contentDetails', key: YOUTUBE_API_KEY }
            });
            if (!ytRes.data.items || ytRes.data.items.length === 0) {
                return res.status(400).json({ error: 'Vídeo não encontrado' });
            }
            duration = parseISO8601(ytRes.data.items[0].contentDetails.duration);
        } catch (ytErr) {
            console.error(`⚠️ YouTube API erro:`, ytErr.response?.data || ytErr.message);
            return res.status(500).json({ error: 'Erro ao buscar dados do vídeo', details: ytErr.message });
        }

        if (duration > MAX_DURATION) {
            const minutos = Math.floor(duration / 60);
            const maxMin = Math.floor(MAX_DURATION / 60);
            return res.status(400).json({
                error: `Vídeo de ${minutos}min excede o limite de ${maxMin}min. Escolha um vídeo mais curto.`
            });
        }

        console.log(`✅ Duração: ${Math.floor(duration / 60)}min ${Math.floor(duration % 60)}s (limite: ${MAX_DURATION}s)`);
        console.log(`🚀 Baixando áudio de ${url}`);

        const timestamp = Date.now();
        const audioFile = path.join(outputFolder, `audio_${timestamp}.webm`);

        const requestOptions = {};
        if (fs.existsSync(COOKIE_FILE)) {
            const raw = fs.readFileSync(COOKIE_FILE, 'utf-8').trim();
            if (raw) requestOptions.headers = { Cookie: raw };
        }
        await new Promise((resolve, reject) => {
            const stream = ytdl(videoId, { filter: 'audioonly', quality: 'lowestaudio', requestOptions });
            const fileStream = fs.createWriteStream(audioFile);
            stream.pipe(fileStream);
            stream.on('end', resolve);
            stream.on('error', reject);
            fileStream.on('error', reject);
        });

        console.log(`✅ Áudio baixado, enviando para Groq Whisper...`);

        const formData = new FormData();
        formData.append('file', fs.createReadStream(audioFile));
        formData.append('model', 'whisper-large-v3');
        formData.append('response_format', 'verbose_json');

        let groqResponse;
        try {
            groqResponse = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', formData, {
                headers: { ...formData.getHeaders(), 'Authorization': `Bearer ${GROQ_API_KEY}` },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });
        } finally {
            if (fs.existsSync(audioFile)) fs.unlinkSync(audioFile);
        }

        const legendaJson = groqResponse.data.segments.map(s => ({
            start: s.start,
            end: s.end,
            text: s.text.trim()
        }));

        res.json({ status: 'success', data: legendaJson });

    } catch (err) {
        console.error(`❌ Erro no handler: ${err}`);
        const msg = err.message || String(err);
        if (msg.includes('Private') || msg.includes('private')) {
            return res.status(400).json({ error: 'Vídeo privado. Escolha um vídeo público.' });
        }
        res.status(500).json({ error: 'Erro interno', details: msg });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🔥 API Pop Lingo rodando na porta ${PORT}`));