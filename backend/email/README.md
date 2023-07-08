# Email handler

<https://dash.cloudflare.com/f5396e3735b54465f00ce7a9f315f0ae/decklist.fun/email/routing/overview>

events:[slug] -> {creationDate, passwordHash} (metadata: name)
event:[slug]:entry:[uuid] -> {from, status: [PENDING, CHECKED, IGNORED]}

R2:
attachment:[entry_uuid]:[#] -> {r2_link}
