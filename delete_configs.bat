@echo off
echo [PRE-LAUNCH] Deleting config folder before Minecraft starts...

set CONFIG_PATH=d:\Games\Minecraft\instances\FFTClientMinecraft1211\config

if exist "%CONFIG_PATH%" (
    echo [PRE-LAUNCH] Config folder found, deleting...
    rmdir /s /q "%CONFIG_PATH%"
    if %errorlevel% equ 0 (
        echo [PRE-LAUNCH] Config folder deleted successfully
    ) else (
        echo [PRE-LAUNCH] Error deleting config folder
    )
) else (
    echo [PRE-LAUNCH] Config folder does not exist
)

echo [PRE-LAUNCH] Pre-launch script completed
exit /b 0
