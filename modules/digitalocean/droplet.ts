import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";

export async function stack() {
  const sshKeys = (await digitalocean.getSshKeys({})).sshKeys;

  const userData = `
#! /bin/bash
set -euo pipefail

# Setup 'admin' user
USERNAME=admin
useradd --create-home --shell "/bin/bash" \
  --groups sudo,microk8s \
  "\${USERNAME}"
passwd --delete "\${USERNAME}"
chage --lastday 0 "\${USERNAME}"

# Enable SSH keys
homedir="$(eval echo ~\${USERNAME})"
mkdir --parents "\${homedir}/.ssh"
cp /root/.ssh/authorized_keys "\${homedir}/.ssh"
chmod 0700 "\${homedir}/.ssh"
chmod 0600 "\${homedir}/.ssh/authorized_keys"
chown --recursive "\${USERNAME}":"\${USERNAME}" "\${homedir}/.ssh"

# Disable root SSH login with password
sed --in-place 's/^PermitRootLogin.*/PermitRootLogin prohibit-password/g' /etc/ssh/sshd_config
if sshd -t -q; then systemctl restart sshd; fi

# install and start kubernetes
snap install microk8s --classic --channel=1.28
microk8s start
`

  const droplet = new digitalocean.Droplet("o-p.n", {
    name: "o-p.n",
    image: "ubuntu-22-04-x64",
    region: "nyc3",
    size: "s-1vcpu-2gb-amd",
    ipv6: true,
    monitoring: true,
    sshKeys: sshKeys.map((k) => k.fingerprint),
    userData: userData,
  });


  return droplet;
}
