import { User } from "../auth.js";

interface Env {
    db: KVNamespace,
}

export const onRequest: PagesFunction<Env> = async ({ data, next, request }) => {
    const user = data.user as User | null;

    if (!user || !user.admin) {
        const url = new URL(request.url)
        return Response.redirect(`${url.protocol}//${url.host}`);
    }

    return next();
}