# Pop Lingo Jarvis API 🤖

Backend que baixa áudio do YouTube e transcreve via Groq Whisper.

---

## 🚀 Deploy na Nuvem (Railway, Render, Fly.io)

1. **Envie este repositório** para a plataforma. O `Dockerfile` já instala `ffmpeg` e `yt-dlp` — não precisa subir `.exe` nem `.env`.

2. **No painel da plataforma, vá em "Environment Variables"** e cadastre **apenas essas duas** (sem elas a API não funciona):

| Variável | O que colocar |
|---|---|
| `GROQ_API_KEY` | Sua chave da Groq (começa com `gsk_`) |
| `API_KEY` | Uma senha forte qualquer, tipo `BKPMa9gNh4Jz1vLTG7idXocREsuIjYpt` |

> As outras (`PORT`, `MAX_DURATION`, `OUTPUT_FOLDER`, `YT_DLP_PATH`) já têm valor padrão no código — só cadastre se quiser mudar.

3. **Pronto.** A plataforma gera uma URL pública tipo `https://jarvis-api.railway.app`. Use essa URL nas requisições.

---

## ⚙️ Ajustes

### Rate limit (requisições por minuto)

Arquivo `server.js`, linhas 30-34:

```js
const limiter = rateLimit({
    windowMs: 60 * 1000,  // 60 segundos
    max: 10,              // quantas requisições permitidas nesse tempo
    message: { error: 'Muitas requisições. Aguarde um momento.' }
});
```

### Duração máxima do vídeo

Mude o `MAX_DURATION` nas variáveis de ambiente. Valor em segundos: `300` = 5min, `1200` = 20min.

---

## 📡 API - Perguntas e Respostas

### O que eu envio?

Uma requisição `POST` para `https://SUA_URL/transcrever`:
- **Header:** `x-api-key: SUA_CHAVE`
- **Body (JSON):** `{ "url": "https://youtube.com/watch?v=VIDEO_ID" }`

### O que eu recebo?

**Sucesso (200):**
```json
{
  "status": "success",
  "data": [
    { "start": 0.5, "end": 3.2, "text": "Olá, bem-vindo ao vídeo" },
    { "start": 3.5, "end": 7.8, "text": "hoje vamos aprender sobre..." }
  ]
}
```

**Erros:**
| Status | Resposta | Motivo |
|---|---|---|
| `400` | `{ "error": "URL faltando" }` | Body sem `url` |
| `400` | `{ "error": "...excede o limite..." }` | Vídeo muito longo |
| `401` | `{ "error": "Não autorizado..." }` | `x-api-key` errado/ausente |
| `429` | `{ "error": "Muitas requisições..." }` | Rate limit excedido |
| `500` | `{ "error": "Erro no download" }` | Download falhou |

### Exemplo em JavaScript

```js
const res = await fetch('https://sua-url.com/transcrever', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'SUA_CHAVE'
  },
  body: JSON.stringify({
    url: 'https://youtube.com/watch?v=VIDEO_ID'
  })
});
const data = await res.json();
console.log(data.data);
```
