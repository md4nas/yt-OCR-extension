@echo off
echo Killing Java processes that might be using ports...

REM Kill processes using common Spring Boot ports
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080 :8081 :8082 :9090 :9091"') do (
    echo Killing process %%a
    taskkill /PID %%a /F 2>nul
)

echo Done! All Java processes using common ports have been terminated.
pause