# YG Unikalizer — Changelog

Все заметные изменения в этом проекте документируются в этом файле.
Формат основан на Keep a Changelog. Версионирование — SemVer.

## 4.4.0 — 2026-01-14

### Добавлено
- **Новые библиотеки UI/UX:**
  - `@floating-ui/react` — продвинутые тултипы и поповеры
  - `vaul` — нативные drawer/sheet компоненты
  - `embla-carousel-react` — плавная карусель планов подписки
  - `react-resizable-panels` — перетаскиваемые splitter-панели
  - `@dnd-kit/modifiers` — улучшенный drag-n-drop

- **Приватные компоненты подписки:**
  - `SubscriptionManager` — менеджер подписок с оплатой USDT TRC20
  - `SubscriptionDemo` — демонстрация Premium функций
  - `FeatureGate` — контроль доступа к функциям (5 вариантов)
  - `NameGenerator` — генератор реалистичных имён
  - `OtherApp` — инструменты (Converter, Indigo, Vision, Chat, Admin)
  - Zustand store для управления состоянием подписки

### Улучшено
- **Дизайн полностью переработан:**
  - Glassmorphism эффекты с backdrop-blur
  - Градиентные карточки планов (Basic/Pro/Premium)
  - Анимации Framer Motion на всех интерактивных элементах
  - Resizable panels для Converter и SubscriptionDemo
  - Bottom Sheet drawer для мобильной оплаты
  - Карусель планов с навигацией стрелками
  - Floating UI тултипы с точным позиционированием
  - Декорация редактора кода в стиле macOS
  - Единый визуальный стиль (slate/violet/amber градиенты)

### Техническое
- Обновлены импорты `react-resizable-panels` (Group → PanelGroup, Separator → PanelResizeHandle)
- Исправлен атрибут `direction` → `orientation` для PanelGroup

## 4.3.1 — 2025-10-20
Исправления:
- Исправлен крэш при старте: `TypeError: Cannot read properties of undefined (reading 'length')`.
  - `files` теперь всегда нормализуется к пустому массиву.
  - Безопасное вычисление `canStart` и корректные зависимости `useMemo`.
- Исправлена некорректная работа хуков анимаций (react-spring):
  - Убрано условное выполнение `useSpring`, добавлены корректные deps.
  - Устранена ошибка `CSSStyleDeclaration: Indexed property setter is not supported`.

Изменения:
- Полностью удалён кастомный error overlay из рендерера.