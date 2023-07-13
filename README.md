# Deck lists

## Development

```bash
cd frontend && npm run dev
```

To make yourself an admin, go to <http://127.0.0.1:8788/makeAdmin> and use `123` as the password (`ADMIN_PASSWORD` env var)

KV:
events:[slug] -> {secret} (metadata: name)
event:[slug]:entry:[uuid] -> {from, status: [PENDING, CHECKED, IGNORED]}

user:[token]:event:[slug] -> timestamp

R2:
attachment:[entry_uuid]:[#] -> {r2_link}
