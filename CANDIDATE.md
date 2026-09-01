# desk-trial

4 этапа. Форк → ветка → pull request сюда. `main` не трогать.

```bash
npm i
npm test
```

1. `stages/01-backend` — сервис заявок и http
2. `stages/02-frontend` — экран очереди
3. `stages/03-database` — postgres
4. `stages/04-redis` — лимит, кэш, идемпотентность

Третий этап:

```bash
npm run infra:up
DATABASE_URL=postgres://hiring:hiring@127.0.0.1:54329/hiring npm run test:03
```

В каждом этапе есть `TASK.md`. Тесты в `tests/` не трогать. Файлы без TODO тоже.

Локально зелёное ещё не значит что PR пройдёт — в CI вторая пачка, её в репе нет.
