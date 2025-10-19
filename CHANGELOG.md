# YG Unikalizer — Changelog

Все заметные изменения в этом проекте документируются в этом файле.
Формат основан на Keep a Changelog. Версионирование — SemVer.

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