# Deck lists

## Development

```bash
npm run dev -w backend/admin
npm run dev -w frontend
```

KV:
events:[slug] -> {passwordHash} (metadata: name)
event:[slug]:entry:[uuid] -> {from, status: [PENDING, CHECKED, IGNORED]}

token:[uuid] -> {admin}
token:[uuid]:event:[slug] -> {}

R2:
attachment:[entry_uuid]:[#] -> {r2_link}
