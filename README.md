# Pop Lingo Jarvis API

Backend que baixa áudio do YouTube e transcreve via Groq Whisper. Roda **localmente** na sua máquina e é exposto via **ngrok** para ser consumido pelo Lovable ou qualquer frontend.

## Requisitos

Antes de começar, instale:

| Programa | Onde baixar |
|---|---|
| **Node.js 18+** | [nodejs.org](https://nodejs.org) |
| **yt-dlp.exe** | [github.com/yt-dlp/yt-dlp/releases](https://github.com/yt-dlp/yt-dlp/releases/latest) (baixar `yt-dlp.exe`) |
| **ffmpeg.exe + ffprobe.exe** | [ffmpeg.org](https://ffmpeg.org/download.html) ou [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) (baixar `ffmpeg-release-essentials.zip`) |
| **ngrok.exe** | [ngrok.com/download](https://ngrok.com/download) (criar conta grátis) |

Coloque todos os `.exe` na **mesma pasta do projeto**.

## Instalação

```powershell
git clone https://github.com/nicolasgomesnicolau-lab/LBS-1---API-JARVIS-for-POP-LINGO.git
cd LBS-1---API-JARVIS-for-POP-LINGO
npm install
```

Crie o arquivo `.env` na raiz do projeto:

```env
GROQ_API_KEY=gsk_seu_token_aqui
API_KEY=uma_senha_forte_qualquer
```

> **GROQ_API_KEY**: chave da Groq (começa com `gsk_`). Crie uma em [console.groq.com/keys](https://console.groq.com/keys)
> **API_KEY**: senha que você escolhe para autenticar as requisições (pode ser qualquer string)

## Como usar

### 1. Ligar o servidor

Dê **dois cliques** no arquivo `LIGAR_JARVIS.bat`. Ele abre duas janelas:

- **Janela 1:** API rodando em `http://localhost:3000`
- **Janela 2:** Túnel ngrok expondo o servidor para internet

### 2. Pegar a URL pública

Na janela do **ngrok**, procure a linha:

```
Forwarding    https://abc123.ngrok-free.app -> http://localhost:3000
```

A URL `https://abc123.ngrok-free.app` é o seu endpoint público. Use ela no Lovable.

> Se preferir um domínio fixo (gratuito), crie um **Static Domain** no [dashboard ngrok](https://dashboard.ngrok.com/cloud-edge/domains) e atualize o `LIGAR_JARVIS.bat` com `--domain=seu-dominio.ngrok-free.app`.

### 3. Transcrever um vídeo

```powershell
curl -s -X POST "https://SEU_DOMINIO.ngrok-free.app/transcrever" ^
  -H "Content-Type: application/json" ^
  -H "x-api-key: SUA_API_KEY" ^
  -d '{\"url\":\"https://www.youtube.com/watch?v=VIDEO_ID\"}'
```

## Exemplo de resposta

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

## Códigos de erro

| Status | Motivo |
|---|---|
| `400` | URL inválida, faltando ou vídeo muito longo |
| `401` | `x-api-key` ausente ou incorreto |
| `429` | Muitas requisições (limite: 10/min) |
| `500` | Erro no download ou na transcrição |

## Variáveis de ambiente (.env)

| Variável | Obrigatória | Padrão | Descrição |
|---|---|---|---|
| `GROQ_API_KEY` | Sim | — | Chave da API Groq |
| `API_KEY` | Sim | — | Chave secreta para autenticar requisições |
| `PORT` | Não | `3000` | Porta do servidor |
| `MAX_DURATION` | Não | `600` | Duração máxima do vídeo em segundos |
| `OUTPUT_FOLDER` | Não | `./audios_temp` | Pasta de áudios temporários |

## Ajustes

### Rate limit

No `server.js`:

```js
const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: 'Muitas requisições. Aguarde um momento.' }
});
```

Mude `max` para aumentar/diminuir o limite por minuto.

### Duração máxima

Via `.env`: `MAX_DURATION=1200` (20 minutos).
