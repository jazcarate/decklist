import Mustache from "mustache";

import layout from "../templates/layout.html";

export function renderFull(inner: string, view: any = {}, partials: Record<string, string> = {}): Response {
    return renderPartial(layout, view, { ...partials, inner });
}

export function renderPartial(template: string, view: any = {}, partials?: Record<string, string>): Response {
    const headers = new Headers([["Content-Type", "text/html;charset=UTF-8"]]);
    return new Response(
        Mustache.render(template, view, partials),
        {
            headers, status: 200
        });
}