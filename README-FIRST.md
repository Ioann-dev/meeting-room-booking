# Куда положить эти файлы и как запускать Claude Code

## Правильная структура

Распакуй содержимое ZIP **прямо в корневую папку будущего проекта**.

Должно получиться примерно так:

```text
meeting-room-booking/
├── CLAUDE.md
├── README-FIRST.md
├── docs/
│   ├── original-spec.pdf
│   ├── original-spec-participant-requirements.md
│   ├── development-plan.pdf
│   └── development-plan.md
├── prompts/
│   ├── START-HERE.md
│   ├── 00-discovery.md
│   ├── 01-workspace.md
│   ├── ...
│   ├── 14-release-audit.md
│   ├── REVIEW-PHASE.md
│   └── COMMIT-PLAN.md
└── [здесь Claude Code будет создавать apps/, packages/, package.json и т.д.]
```

`CLAUDE.md` должен находиться **именно в корне репозитория** рядом с будущим `package.json`.

## Первый запуск

Открой Terminal в папке `meeting-room-booking` и запусти Claude Code из этой папки.

Первое сообщение Claude Code:

```text
Read CLAUDE.md and prompts/START-HERE.md.
Follow them exactly.
Do not modify any code yet.
```

После его анализа:

```text
Execute prompts/00-discovery.md exactly.
Do not start Phase 01.
```

Когда Phase 00 готова:

```text
Use prompts/REVIEW-PHASE.md to review Phase 00.
Fix only issues belonging to Phase 00.
Do not start Phase 01.
```

После успешной проверки:

```text
Phase 00 is approved.
Execute prompts/01-workspace.md exactly.
Do not start Phase 02.
```

И дальше по той же схеме:

```text
Phase N
→ REVIEW-PHASE
→ исправления/проверки
→ следующая Phase
```

## Важно

- Не отправляй Claude все 15 фаз одним большим сообщением.
- Не проси `build the whole project`.
- Не заставляй делать пустые коммиты ради числа 112.
- 112 — целевой план осмысленной истории. Каждый commit должен соответствовать реальному изменению.
- Не переписывай Git-историю ради внешнего вида.
- Проверяй результат каждой фазы до следующей.
- Перед сдачей обязательно выполняется Phase 14.

## Почему рядом лежат PDF и Markdown

PDF оставлены как оригинальные документы.

Markdown-версии нужны, чтобы Claude Code мог надежно читать требования непосредственно из репозитория
без зависимости от того, насколько хорошо конкретная среда обрабатывает PDF.
