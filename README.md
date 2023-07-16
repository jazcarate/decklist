# Deck lists

## Development

```bash
cd frontend && npm run dev
```

To make yourself an admin, go to <http://127.0.0.1:8788/makeAdmin> and use `123` as the password (`ADMIN_PASSWORD` env var)

KV:
events:[slug] -> secret (metadata: name)
event:[slug]:mails:[id] -> {date: number} (metadata: from, name, note?, reviewed: false)

user:[slug]:[token] -> timestamp

R2:
event:[slug]:mail:[id]:attachments:[#]
