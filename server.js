require('dotenv').config();

const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use(cors());

const API_KEY = process.env.API_KEY;
const outputFolder = process.env.OUTPUT_FOLDER || '/tmp/jarvis-audios';
const ytDlpPath = process.env.YT_DLP_PATH || 'yt-dlp';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MAX_DURATION = parseInt(process.env.MAX_DURATION) || 600;

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

app.post('/transcrever', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: 'URL faltando' });

        console.log(`🔍 Verificando duração do vídeo...`);

        const duracao = await new Promise((resolve, reject) => {
            const proc = spawn(ytDlpPath, ['--js-runtimes', 'node:node', '--print', 'duration', url], { shell: process.platform === 'win32' });
            let output = '';
            let errOutput = '';
            proc.stdout.on('data', d => output += d);
            proc.stderr.on('data', d => errOutput += d);
            proc.on('close', code => {
                if (errOutput) console.error(`⚠️ yt-dlp stderr: ${errOutput.trim()}`);
                if (code !== 0) return reject(`Erro ao obter duração (exit ${code}): ${errOutput.trim() || 'sem detalhes'}`);
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

        console.log(`✅ Duração: ${Math.floor(duracao / 60)}min ${Math.floor(duracao % 60)}s (limite: ${MAX_DURATION}s)`);

        const timestamp = Date.now();
        const audioFile = path.join(outputFolder, `audio_${timestamp}.mp3`);

        console.log(`🚀 Processando: ${url}`);

        const downloader = spawn(ytDlpPath, [
            '--js-runtimes', 'node:node', '--no-playlist', '-x', '--audio-format', 'mp3', '-o', audioFile, url
        ], { shell: process.platform === 'win32' });
        let dlErr = '';
        downloader.stderr.on('data', d => dlErr += d);

        downloader.on('close', async (code) => {
            if (dlErr) console.error(`⚠️ yt-dlp download stderr: ${dlErr.trim()}`);
            if (code !== 0) return res.status(500).json({ error: 'Erro no download', details: dlErr.trim() || null });

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
        console.error(`❌ Erro no handler: ${err}`);
        res.status(500).json({ error: 'Erro interno', details: err.message || err });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🔥 API Pop Lingo rodando na porta ${PORT}`));