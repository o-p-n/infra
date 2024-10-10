import * as k8s from "@pulumi/kubernetes";

export function outputs(release: k8s.helm.v3.Release) {
  const { name, chart, version } = release;
  const repository = release.repositoryOpts.repo;

  return {
    name,
    chart,
    version,
    repository,
  }
}

