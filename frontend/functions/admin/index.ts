import { renderFull } from "../render";
import index from "../../templates/admin/index.html";

export const onRequestGet: PagesFunction = async () => {
    return renderFull(index, { title: "Admin panel" });
}