import { renderFull } from "../render";
import home from "../../templates/admin/home.html";

export const onRequestGet: PagesFunction = async () => {
    return renderFull(home);
}