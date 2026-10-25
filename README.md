# Agency

Учебный план и выполненные этапы: [ROADMAP.md](ROADMAP.md).

Архив получает дела через `GET /api/cases`. Запуск Angular и API описан ниже.
Миграции, заполнение и резервные копии: [database/README.md](database/README.md).

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.2.2.

## Development server

Один раз установить зависимости через `pnpm install --frozen-lockfile` и
скопировать `server/.env.example` в закрытый локальный файл:

```bash
(umask 077; cp -n server/.env.example server/.env)
chmod 600 server/.env
```

В редакторе заполнить в `server/.env` пароль PGPASSWORD для `agency_app`.
Для локального запуска оставить API_PORT=3000, PGHOST=127.0.0.1 и PGPORT=15432.
Пароль не помещать в Git и не передавать в чат. Нужны Node.js 22.22+ и pnpm,
а также настроенное SSH-подключение `cutesnipe`.

Для локальной разработки с PostgreSQL на VPS используем одну команду:

```bash
pnpm dev
```

Открыть `http://localhost:4200/`. Команда запускает SSH-туннель, API и Angular
в одном терминале; Ctrl+C останавливает всю связку. Angular автоматически
обновляется при изменениях. Для запуска только Angular остаётся `pnpm start`.

Перед первым общим запуском остановить вручную запущенные API, Angular и
туннель в старых терминалах, чтобы освободить порты. При ошибке одного процесса
остальные процессы этого запуска тоже останавливаются. API ждёт туннель,
а Angular — успешный ответ `GET /api/cases`.

Путь запроса: Angular → локальный прокси → API → SSH-туннель → PostgreSQL.
Туннель использует локальный порт 15432; API — порт 3000. Для диагностики API:
`curl --fail-with-body http://127.0.0.1:3000/api/cases`.
Для отдельного запуска API — `pnpm api:dev` (требует уже открытого туннеля).
На VPS API использует PGPORT=5432 без туннеля; его публикация пока не настроена.

Сервер состоит из трёх файлов: `server/index.ts` запускает API и создаёт
подключение к базе, `server/app.ts` обрабатывает HTTP-запрос,
`server/cases.ts` получает дела SQL-запросом через обычную функцию `getCases(pool)`.
API запускается напрямую из TypeScript через `tsx`; отдельная сборка пока не нужна.
Проверка серверных типов без сборки: `pnpm exec tsc -p server/tsconfig.json`.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
