import newTemplate from "../src/new.html";
import foo from "../src/foo.html";
import Mustache from "mustache";

interface Env {
    db: KVNamespace
    content: R2Bucket
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
    const html = Mustache.render(newTemplate, { date: new Date().toISOString() }, { foo });
    return new Response(html, {
        headers: {
            "content-type": "text/html;charset=UTF-8",
        },
    });
}