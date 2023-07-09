interface Env {
    db: KVNamespace
}

export const onRequestPost: PagesFunction<Env> = async ({ env, params, waitUntil }) => {
    const token = params.token as string;

    waitUntil(env.db.put(`token:${token}`, JSON.stringify({ admin: true })));

    return Response.json({ promoted: true });
}