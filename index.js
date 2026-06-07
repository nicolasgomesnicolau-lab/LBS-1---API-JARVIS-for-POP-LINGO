require('dotenv').config();

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const outputFolder = process.env.OUTPUT_FOLDER || `C:/Users/W4xxy/Downloads/jarvis`;
const ytDlpPath = process.env.YT_DLP_PATH || '.\\yt-dlp.exe';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
    console.log('❌ GROQ_API_KEY não encontrada. Verifique o .env');
    process.exit(1);
}

const url = process.argv[2];
if (!url) {
    console.log('❌ Uso: node index.js "URL_DO_YOUTUBE"');
    process.exit(1);
}

async function rodar() {
    const timestamp = Date.now();
    const audioFile = path.join(outputFolder, `audio_${timestamp}.mp3`);

    console.log('--- 🎵 1. Baixando Áudio do YouTube ---');

    const downloader = spawn(ytDlpPath, [
        '--no-playlist',
        '-x',
        '--audio-format', 'mp3',
        '-o', audioFile,
        url
    ], { shell: process.platform === 'win32' });

    downloader.on('close', async (code) => {
        if (code !== 0) return console.log('❌ Erro no download. Verifique o link.');

        console.log('--- ⚡ 2. Transcrevendo via Groq (Large-v3) ---');

        const formData = new FormData();
        formData.append('file', fs.createReadStream(audioFile));
        formData.append('model', 'whisper-large-v3');
        formData.append('response_format', 'verbose_json');

        try {
            const start = Date.now();
            const response = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', formData, {
                headers: {
                    ...formData.getHeaders(),
                    'Authorization': `Bearer ${GROQ_API_KEY}`
                }
            });

            const duration = ((Date.now() - start) / 1000).toFixed(2);
            console.log(`\n✅ SUCESSO! Transcrição em ${duration}s:`);

            const segments = response.data.segments;
            let vttContent = "WEBVTT\n\n";

            segments.forEach(seg => {
                const startStr = new Date(seg.start * 1000).toISOString().substr(11, 12);
                const endStr = new Date(seg.end * 1000).toISOString().substr(11, 12);
                vttContent += `${startStr} --> ${endStr}\n${seg.text.trim()}\n\n`;
            });

            const vttFile = audioFile.replace('.mp3', '.vtt');
            fs.writeFileSync(vttFile, vttContent);

            console.log('====================================');
            console.log(vttContent.replace('WEBVTT\n\n', ''));
            console.log('====================================');
            console.log(`📂 Salvo em: ${vttFile}`);

        } catch (err) {
            console.log('❌ Erro na IA:', err.response?.data || err.message);
        }

        if (fs.existsSync(audioFile)) fs.unlinkSync(audioFile);
        process.exit();
    });
}

rodar();
