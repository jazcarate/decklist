import Mustache from "mustache";

import layout from "../templates/layout.html";

export function renderFull(inner: string, view: any = {}, headers = new Headers()): Response {
    headers.append("Content-Type", "text/html;charset=UTF-8");

    return new Response(
        Mustache.render(layout, view, { inner }),
        {
            headers, status: 200
        });
}

export function renderPartial(inner: string, view: any = {}, headers = new Headers()): Response {
    headers.append("Content-Type", "text/html;charset=UTF-8");

    return new Response(
        Mustache.render(inner, view),
        {
            headers, status: 200
        });
}