import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";

export function stack() {
  const sshKeys = digitalocean.getSshKeysOutput() as pulumi.Output<digitalocean.GetSshKeysResult>;

  const userData = sshKeys.apply((result) => {
      const botKeys = result.sshKeys.filter((ssh) => ssh.name.startsWith("bot-"))
        .map((ssh) => `"${ssh.fingerprint}"`);
      const humanKeys = result.sshKeys.filter((ssh) => ssh.name.startsWith("human-"))
        .map((ssh) => `"${ssh.fingerprint}"`);

      return `
#cloud-config
users:
  - name: human
    lock-password: false
    groups: sudo, microk8s
    shell: /bin/bash
    sudo: ["ALL (ALL): NOPASSWD:ALL"]
    ssh-authorized-keys: [${humanKeys.join(", ")}]
  - name: bot
    lock-password: false
    groups: microk8s
    shell: /bin/bash
    ssh-authorized-keys: [${botKeys.join(", ")}]
runcmd:
  - sed -i -e '/^PermitRootLogin/s/^.*$/PermitRootLogin no/' /etc/ssh/sshd_config
  - restart ssh
  - snap install microk8s --classic --channel=1.28
  - microk8s start
`;
  });

  const instance = new digitalocean.Droplet("o-p.n", {
    name: "o-p.n",
    image: "ubuntu-22-04-x64",
    region: "nyc3",
    size: "s-2vcpu-2gb-amd",
    ipv6: true,
    monitoring: true,
    userData: userData,
  });


  return instance;
}
