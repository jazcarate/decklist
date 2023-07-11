import { serialize } from "cookie";
import { AUTH_COOKIE, sign } from "./auth";

interface Env {
    db: KVNamespace,
    SIGNING_SECRET: string,
    ADMIN_PASSWORD: string,
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
    const auth = request.headers.get("Authorization");
    if (!auth) {
        return new Response("", { headers: new Headers([["WWW-Authenticate", "Basic"]]), status: 401, statusText: "Unauthorized" });
    }

    const [token, password] = atob(auth.substring("Basic ".length)).split(":", 2);

    if (password !== env.ADMIN_PASSWORD) {
        return new Response("", { status: 403, statusText: "Forbidden" })
    }
    console.log("New admin!");

    // TODO duplicated de [slug]/login.ts
    const user = {
        token: token,
        admin: true,
    }

    const jwtCookie = await sign({ ...user }, env.SIGNING_SECRET);
    const newAuthCookie = serialize(AUTH_COOKIE, jwtCookie, {
        httpOnly: true,
        sameSite: true,
        secure: true,
        maxAge: 2147483647
    });

    const url = new URL(request.url);

    const headers = new Headers([
        ["Set-Cookie", newAuthCookie],
        ["Location", `${url.protocol}//${url.host}/admin`]
    ]);

    return new Response("", {
        headers, status: 307, statusText: "Temporary Redirect"
    });
}