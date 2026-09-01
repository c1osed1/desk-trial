# Этап 3 — база

Postgres. Схема в `sql/schema.sql`, писать `repo.ts`.

```
npm run infra:up
DATABASE_URL=postgres://hiring:hiring@127.0.0.1:54329/hiring npm run test:03
```

listInbox — открытые и в работе, сначала горячие.

assign в одной транзакции: один сотрудник — одна заявка в работе, два человека одну заявку взять не могут. В `ticket_events` пишется что случилось.

complete — только тот, кто взял.

id в запросы клеить строкой нельзя, только `$1`, `$2`.
