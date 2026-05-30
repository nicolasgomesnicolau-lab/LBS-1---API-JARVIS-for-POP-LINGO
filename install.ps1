Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  INSTALACAO JARVIS API POP LINGO" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$repoUrl = "https://github.com/nicolasgomesnicolau-lab/LBS-1---API-JARVIS-for-POP-LINGO.git"

# 1. Clone se nao estiver na pasta do projeto
if (-not (Test-Path ".\server.js")) {
    Write-Host "[1/5] Clonando repositorio..." -ForegroundColor Yellow
    git clone $repoUrl
    Set-Location -LiteralPath "LBS-1---API-JARVIS-for-POP-LINGO"
} else {
    Write-Host "[1/5] Ja esta na pasta do projeto" -ForegroundColor Green
}

# 2. Instalar dependencias Node
Write-Host "[2/5] Instalando dependencias Node..." -ForegroundColor Yellow
npm install

# 3. Baixar yt-dlp.exe
Write-Host "[3/5] Baixando yt-dlp..." -ForegroundColor Yellow
$ytDlpUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
Invoke-WebRequest -Uri $ytDlpUrl -OutFile "yt-dlp.exe" -UseBasicParsing
Write-Host "  yt-dlp.exe baixado" -ForegroundColor Green

# 4. Baixar ffmpeg + ffprobe
Write-Host "[4/5] Baixando ffmpeg..." -ForegroundColor Yellow
$ffmpegZip = "$env:TEMP\ffmpeg.zip"
Invoke-WebRequest -Uri "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip" -OutFile $ffmpegZip -UseBasicParsing
if (Test-Path "$env:TEMP\ffmpeg_temp") { Remove-Item -Recurse -Force "$env:TEMP\ffmpeg_temp" }
Expand-Archive -Path $ffmpegZip -DestinationPath "$env:TEMP\ffmpeg_temp" -Force
$ffmpegBin = Get-ChildItem -Path "$env:TEMP\ffmpeg_temp" -Recurse -Include "ffmpeg.exe" | Select-Object -First 1
if ($ffmpegBin) {
    Copy-Item -Path $ffmpegBin.FullName -Destination ".\ffmpeg.exe" -Force
    Write-Host "  ffmpeg.exe baixado" -ForegroundColor Green
}
$ffprobeBin = Get-ChildItem -Path "$env:TEMP\ffmpeg_temp" -Recurse -Include "ffprobe.exe" | Select-Object -First 1
if ($ffprobeBin) {
    Copy-Item -Path $ffprobeBin.FullName -Destination ".\ffprobe.exe" -Force
    Write-Host "  ffprobe.exe baixado" -ForegroundColor Green
}
Remove-Item -Recurse -Force "$env:TEMP\ffmpeg_temp"
Remove-Item -Force $ffmpegZip

# 5. Baixar ngrok
Write-Host "[5/5] Baixando ngrok..." -ForegroundColor Yellow
$ngrokZip = "$env:TEMP\ngrok.zip"
Invoke-WebRequest -Uri "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip" -OutFile $ngrokZip -UseBasicParsing
Expand-Archive -Path $ngrokZip -DestinationPath "." -Force
Remove-Item -Force $ngrokZip
Write-Host "  ngrok.exe baixado" -ForegroundColor Green

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  INSTALACAO CONCLUIDA!" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "PROXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Crie o arquivo .env (ou edite se ja existe):" -ForegroundColor White
Write-Host "   GROQ_API_KEY=gsk_seu_token_aqui" -ForegroundColor Gray
Write-Host "   API_KEY=uma_senha_forte_qualquer" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Configure o ngrok:" -ForegroundColor White
Write-Host "   Crie conta em https://ngrok.com" -ForegroundColor Gray
Write-Host "   Pegue o token em https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor Gray
Write-Host "   Execute: .\ngrok.exe config add-authtoken SEU_TOKEN" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Tudo pronto! Use o LIGAR_JARVIS.bat" -ForegroundColor Green
Write-Host "   Ele abre o servidor + ngrok automaticamente." -ForegroundColor Green
Write-Host ""
pause
