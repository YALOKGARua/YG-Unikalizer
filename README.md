## PhotoUnikalizer 2.6.0

Уникализация и анонимизация фото с нативным ускорением, авто‑обновлениями и богатым UI.

<div align="center">
<img src="docs/hero.svg" alt="PhotoUnikalizer Hero" width="100%"/>

[![Electron](https://img.shields.io/badge/Electron-33.x-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.x-149ECA?logo=react&logoColor=white)](https://react.dev/)
[![Sharp](https://img.shields.io/badge/Sharp-0.33-6E4A7E)](https://sharp.pixelplumbing.com/)
[![EXIF](https://img.shields.io/badge/EXIF-Native%20XMP%2FEXIF-3B7DDD)](#metadata)
[![License](https://img.shields.io/badge/License-MIT-22C55E)](#лицензия)
</div>

### Особенности

- **Поддерживаемые форматы**: JPG, PNG, WEBP, AVIF, HEIC/HEIF
- **Уникализация**: управляемые дрейфы размера/цвета, ограничение ширины
- **Метаданные**: очистка/запись EXIF/IPTC/XMP, чистка GPS
- **Fake EXIF**: пресеты camera/phone/action/drone/scanner; ISO/выдержка/диафрагма/фокус/GPS; рейтинг/метка/заголовок; software/серийник
- **Гибкое именование**: `{name}` `{index}` `{ext}` `{date}` `{uuid}` `{rand}`
- **Нативное ускорение**: C++ N‑API аддон, предсборки внутри инсталлятора
- **Поиск похожих**: aHash/dHash/pHash + расстояние Хэмминга, кластеры
- **Скорость на Windows**: WIC‑декод серого для a/d/pHash, пакетное хеширование
- **Прогресс**: ETA, скорость, live‑ивенты, уведомления системы
- **Авто‑обновления**: оверлей загрузки, %, скорость, байты, ETA; один клик установка
- **Локализация**: RU/UK/EN в комплекте, переключатель и сохранение
- **Fun**: вкладка Crash/Slots с анимациями

<img src="docs/flow.svg" alt="Flow" width="100%"/>

### Системные требования

- Windows 10/11 x64
- Пользователям не нужны dev‑инструменты (нативный модуль входит в установщик)

### Установка и запуск (dev)

```bash
npm install
npm run dev
```

### Сборка (production)

```bash
npm run build
npm run dist
```

### Скрипты

```bash
npm run dev
npm run dist
npm run native:build
npm run native:prebuild
npm run chat:build && npm run chat:server
npm run assets:icons
```

### Архитектура

- **Electron main/preload**: изолированный IPC, окна без рамки, меню разработчика, авто‑обновления (`electron-updater`) с GitHub fallback
- **Renderer (React + Vite + Tailwind)**: UI с анимациями (`framer-motion`, `@react-spring/web`), тосты, виртуальные гриды
- **Нативный модуль (C++)**: `wicDecodeGray8`, a/d/pHash, индекс Хэмминга, кластеризация, запись/очистка метаданных
- **WASM (AssemblyScript)**: вспомогательные хэши серого (a/dHash)
- **Chat WS‑сервер**: `server/chat-server.ts` с админ‑панелью, geo‑IP событиями и историей

### Metadata

- Запись EXIF/IPTC/XMP встроенным нативным писателем без внешних утилит
- Поля: автор, описание, copyright, ключевые слова, владелец, creator tool, рейтинг/метка/заголовок
- GPS: полная очистка или генерация фейковых координат/высоты, пресеты локаций

### Командная строка и настройки

- Переменные окружения: `DEV_MENU_PASSWORD`, `CHAT_ADMIN_PASSWORD`, `INDIGO_*`
- В рендерере доступ к API только через `preload` (`window.api.*`)

### Release

1. Обновить `CHANGELOG.md` и версию: `npm run release:patch|minor|major` (текущая 2.6.0)
2. Предсборки нативного модуля при изменении C++: `npm run native:prebuild`
3. Сборка инсталлятора: `npm run dist`
4. Публикация GitHub Release с заметками (отображаются в приложении)

### Три быстрых сценария

- Массовая конверсия JPG→AVIF/HEIC с очисткой GPS и fake EXIF
- Поиск дубликатов с помощью a/d/pHash и группировка по Хэммингу
- Экспорт профилей Indigo по токену через встроенный инструмент

### Технологии и версии

- Electron ^33, Vite ^5, React ^18, Tailwind ^3
- Sharp ^0.33, electron-updater ^6, ws ^8

### Лицензия

MIT © YALOKGAR