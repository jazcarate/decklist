import * as fs from 'fs';
import Mustache from "mustache";
import path from 'path';

const DIST = "dist";

fs.rmSync(DIST)
fs.cpSync("public/", DIST);

let index = Mustache.render(fs.readFileSync("public/index.html"));
fs.writeFile(path.join(DIST, "index.html"), index);