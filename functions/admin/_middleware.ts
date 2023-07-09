import { getUser } from "../auth.js";

interface Env {
    db: KVNamespace,
    SIGNING_SECRET: string
}

export const onRequest: PagesFunction<Env> = async ({ request, env, next }) => {
    const user = await getUser(request, env.db);
    if (user == "Unauthorized")
        return new Response("Unauthorized", { status: 401, statusText: "Unauthorized" });
    if (user == "Forbidden")
        return new Response("Forbidden", { status: 403, statusText: "Forbidden" });
    if (!user.admin)
        return new Response("Forbidden", { status: 403, statusText: "Forbidden" });

    return next();
}