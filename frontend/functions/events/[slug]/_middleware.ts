import { getToken } from "../../auth";

interface Env {
    SIGNING_SECRET: string,
    db: KVNamespace
}

export const onRequest: PagesFunction<Env> = async ({ request, next, params, env }) => {
    const { slug } = params;
    if (!slug)
        throw new Error("No slug");

    const token = await getToken(request);
    if (!token)
        return new Response("Unauthorized", { status: 401, statusText: "Unauthorized" });

    return next();
}