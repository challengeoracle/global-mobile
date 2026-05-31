import { execSync } from "node:child_process";

import appJson from "./app.json";

function getCommitReference() {
    try {
        return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
    } catch {
        return "desconhecido";
    }
}

const config = {
    ...appJson.expo,
    extra: {
        commitReference: getCommitReference(),
    },
};

export default config;
