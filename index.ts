// Copyright (c) 2022 Matthew A. Miller

import * as pulumi from "@pulumi/pulumi";

import { digitaloceanStack } from "./digitalocean";
import { dockerStack } from "./docker";

const stack = pulumi.getStack();
const config = new pulumi.Config();

switch (stack) {
  case "digitalocean-prod":
    digitaloceanStack(stack, config);
    break;
  case "docker-prod":
    dockerStack(stack, config);
    break;
}
