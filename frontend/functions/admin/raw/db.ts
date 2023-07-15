interface Env {
    db: KVNamespace,
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
    const allDb = (await env.db.list()).keys;
    console.info({ allDb });

    return Response.json(allDb);
}
