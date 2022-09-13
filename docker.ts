import * as pulumi from "@pulumi/pulumi";
import * as docker from "@pulumi/docker";

export function dockerStack(stack: string, config: pulumi.Config) {
  const dockerProvider = new docker.Provider("docker", {
    host: "ssh://admin@outer-planes.net",
  });
  const dockerOpts = {
    provider: dockerProvider,
    dependsOn: dockerProvider,
  };
  
  const network = new docker.Network("public", {
    name: "public",
    driver: "overlay",
    attachable: true,
  }, dockerOpts);
  
  const certsVolume = new docker.Volume("certs", {
    name: "certs",
  }, dockerOpts);
}