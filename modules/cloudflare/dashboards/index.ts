import { join } from "path";
import * as fs from "fs";

function readDashboard(fname: string) {
  const fpath = join(__dirname, fname) + ".json";
  const content = fs.readFileSync(fpath, { encoding: "utf-8"});
  return content;
}

const dashboards = {
  tunnels: readDashboard("tunnels"),
};
export default dashboards;
