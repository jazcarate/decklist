interface Env {
    SIGNING_SECRET: string,
    db: KVNamespace
}

const AUTH_PREFIX = "Bearer ";

export const onRequest: PagesFunction<Env> = async ({ request, next, params, env }) => {
    const { slug } = params;
    if (!slug)
        throw new Error("No slug");


    const auth = request.headers.get("Authorization");
    if (!auth.startsWith(AUTH_PREFIX))
        return new Response("Unauthorized", { status: 401, statusText: "Unauthorized" });

    const token = auth.substring(AUTH_PREFIX.length);
    const authorized = await env.db.get(`token:${token}:event:${slug}`);
    if (!authorized) {
        return new Response("Forbidden", { status: 403, statusText: "Forbidden" });
    }

    return next();
}