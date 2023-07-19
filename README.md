# Deck lists

## Development

```bash
cd frontend && npm run dev
```

To make yourself an admin, go to <http://127.0.0.1:8788/makeAdmin> and use `123` as the password (`ADMIN_PASSWORD` env var)

KV:
events:[slug] -> secret (metadata: name)
event:[slug]:mails:[id] -> void (metadata: from, name, subject, note?, date(number), reviewed: false)
event:[slug]:mail:[id]:attachments:[#] -> void (metadata: ok: boolean, problem?: string)

scans:event:[slug]:mail:[id]:attachments:[#] -> void (metadata: created, vtid)
user:[slug]:[token] -> timestamp

R2:
event:[slug]:mail:[id]:attachments:[#]
