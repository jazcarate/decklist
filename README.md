# Deck lists

## Development

```bash
cd frontend && npm run dev
```

KV:
events:[slug] -> {passwordHash} (metadata: name)
event:[slug]:entry:[uuid] -> {from, status: [PENDING, CHECKED, IGNORED]}

user:[token]:event:[slug] -> {}

R2:
attachment:[entry_uuid]:[#] -> {r2_link}
