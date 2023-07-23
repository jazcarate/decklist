import { serialize } from "cookie";
import { AUTH_COOKIE, getUser, sign } from "./auth";

interface Env {
    SIGNING_SECRET: string,
    db: KVNamespace,
}

const MAX_AGE = 34560000;

const errorHandling: PagesFunction<Env> = async ({ next }) => {
    try {
        return await next();
    } catch (err) {
        return new Response(`${err.message}\n${err.stack}`, { status: 500 });
    }
}

const authentication: PagesFunction<Env> = async ({ request, env, next, data }) => {
    let user = await getUser(request, env.SIGNING_SECRET);
    let shouldUpdateAuth = false;
    if (!user) {
        user = { token: crypto.randomUUID(), admin: false };
        shouldUpdateAuth = true;
    }
    data.user = user;
    const response = await next();

    if (shouldUpdateAuth) {
        console.log("New login!");
        const jwtCookie = await sign(user, env.SIGNING_SECRET);
        const newAuthCookie = serialize(AUTH_COOKIE, jwtCookie, {
            httpOnly: true,
            sameSite: true,
            secure: true,
            path: "/",
            maxAge: MAX_AGE
        });
        response.headers.append("Set-Cookie", newAuthCookie);
    }
    return response
}


export const onRequest = [authentication];