# CyberCraft Launcher

CyberCraft Minecraft NeoForge Launcher — Electron bilan qurilgan.

## Texnologiyalar

- Electron
- Node.js
- HTML/CSS/JavaScript

## O'rnatish

```bash
# Paketlarni o'rnatish
npm install

# Development rejimda ishga tushirish
npm start
```

## Tuzilma

- `main.js` — Electron main process
- `preload.js` — Preload script (IPC bridge)
- `renderer/` — Renderer process modullari
  - `api.js` — Backend API integratsiyasi
  - `config.js` — Konfiguratsiya
  - `game.js` — O'yin jarayonini boshqarish
  - `init.js` — Initsializatsiya
  - `settings.js` — Sozlamalar
  - `ui.js` — Foydalanuvchi interfeysi
