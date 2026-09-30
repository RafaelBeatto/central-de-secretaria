@echo off
rem Wrapper do Maven: baixa a distribuicao definida em .mvn\wrapper\maven-wrapper.properties
rem (uma unica vez, em %USERPROFILE%\.m2\wrapper\dists) e executa o mvn com os argumentos recebidos.
setlocal
set "RAIZ=%~dp0"
for /f "usebackq tokens=1,* delims==" %%a in ("%RAIZ%.mvn\wrapper\maven-wrapper.properties") do (
  if "%%a"=="distributionUrl" set "URL_DISTRIBUICAO=%%b"
)
for %%f in ("%URL_DISTRIBUICAO%") do set "ARQUIVO_ZIP=%%~nxf"
set "NOME_DISTRIBUICAO=%ARQUIVO_ZIP:-bin.zip=%"
set "PASTA_DISTRIBUICAO=%USERPROFILE%\.m2\wrapper\dists\%NOME_DISTRIBUICAO%"
set "MVN_EXE=%PASTA_DISTRIBUICAO%\%NOME_DISTRIBUICAO%\bin\mvn.cmd"

if not exist "%MVN_EXE%" (
  echo Baixando %NOME_DISTRIBUICAO%...
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ErrorActionPreference='Stop';" ^
    "New-Item -ItemType Directory -Force -Path '%PASTA_DISTRIBUICAO%' | Out-Null;" ^
    "$zip=Join-Path '%PASTA_DISTRIBUICAO%' '%ARQUIVO_ZIP%';" ^
    "Invoke-WebRequest -UseBasicParsing -Uri '%URL_DISTRIBUICAO%' -OutFile $zip;" ^
    "Expand-Archive -Force -Path $zip -DestinationPath '%PASTA_DISTRIBUICAO%';" ^
    "Remove-Item $zip"
  if errorlevel 1 exit /b 1
)

"%MVN_EXE%" -f "%RAIZ%pom.xml" %*
endlocal
