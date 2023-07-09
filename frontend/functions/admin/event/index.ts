interface Env {
    db: KVNamespace
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
    const events = await env.db.list({ prefix: "events:" });

    return Response.json(events);
}