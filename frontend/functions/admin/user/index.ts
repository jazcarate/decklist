interface Env {
    db: KVNamespace
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
    const tokens = await env.db.list({ prefix: "token:" });

    return Response.json(tokens.keys);
}