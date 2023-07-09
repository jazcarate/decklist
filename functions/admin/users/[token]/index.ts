interface Env {
    db: KVNamespace,
}

export const onRequestDelete: PagesFunction<Env> = async ({ env, params, waitUntil }) => {
    const token = params.token as string;
    if (!token)
        return new Response("Missing event slug", { status: 400, statusText: "Bad Request" });

    const eventPermissions = await env.db.list({ prefix: `token:${token}:event:` });
    const deletePerms = eventPermissions.keys.map(e => env.db.delete(e.name));

    waitUntil(Promise.all([
        env.db.delete(`token:${token}`),
        ...deletePerms
    ]));
    return new Response(`Deleting user ${token} (${eventPermissions.keys.length} permissions)...`, { status: 202, statusText: "Accepted" });
}