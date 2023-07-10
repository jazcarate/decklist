import { getUser } from "./auth";

interface Env {
    SIGNING_SECRET: string,
    db: KVNamespace,
}

const errorHandling: PagesFunction<Env> = async ({ next }) => {
    try {
        return await next();
    } catch (err) {
        return new Response(`${err.message}\n${err.stack}`, { status: 500 });
    }
}

const authentication: PagesFunction<Env> = async ({ request, env, next, data }) => {
    const user = await getUser(request, env.SIGNING_SECRET);
    data.user = user;
    return next();
}


export const onRequest = [errorHandling, authentication];