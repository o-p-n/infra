import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";

export default function dropletStack() {

  const sshKeysOutput = digitalocean.getSshKeysOutput() as pulumi.Output<digitalocean.GetSshKeysResult>;

  const userData = sshKeysOutput.apply((result) => {
      const botKeys = result.sshKeys.filter((ssh) => ssh.name.startsWith("bot-"))
        .map((ssh) => ssh.publicKey);
      const humanKeys = result.sshKeys.filter((ssh) => ssh.name.startsWith("human-"))
        .map((ssh) => ssh.publicKey);

      return `
#cloud-config
package_update: true
package_upgrade: true
snap:
  commands:
    - snap install microk8s --classic --channel=1.31
users:
  - name: human
    lock-password: false
    sudo: ALL=(ALL) NOPASSWD:ALL
    groups: microk8s, sudo
    shell: /bin/bash
    ssh_authorized_keys: [${humanKeys.join(", ")}]
  - name: bot
    lock-password: false
    groups: microk8s
    shell: /bin/bash
    ssh_authorized_keys: [${botKeys.join(", ")}]
ssh_genkeytypes: [ecdsa, ed25519]
ssh_pwauth: false    
`;
  });

  const sshKeys = sshKeysOutput.apply(
    (result) => result.sshKeys
      .filter((ssh) => ssh.name.startsWith("human-"))
      .map((k) => `${k.id}`)
  );

  const instance = new digitalocean.Droplet("o-p.n", {
    name: "o-p.n",
    image: "ubuntu-22-04-x64",
    region: "sfo3",
    size: "s-4vcpu-8gb",
    ipv6: true,
    monitoring: true,
    userData: userData,
    sshKeys,
  });


  return instance;
}
