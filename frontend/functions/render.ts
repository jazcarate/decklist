import Mustache from "mustache";

import layout from "../templates/layout.html";

export function renderFull(inner: string, view: any = {}): Response {
    return new Response(
        Mustache.render(layout, view, { inner }),
        {
            headers: {
                "content-type": "text/html;charset=UTF-8",
            },
        });
}