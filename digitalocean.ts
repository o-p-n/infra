import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";

export function digitaloceanStack(stack: string, config: pulumi.Config) {
  const doToken = config.requireSecret("do_auth_token");

  const userData = `#cloud-config
apt:
  sources:
    docker.list:
      source: deb [arch=amd64] https://download.docker.com/linux/ubuntu $RELEASE stable
      key: |
        -----BEGIN PGP PUBLIC KEY BLOCK-----

        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
        YT90qFF93M3v01BbxP+EIY2/9tiIPbrd
        =0YYh
        -----END PGP PUBLIC KEY BLOCK-----

packages:
  - docker-ce
  - docker-ce-cli
  - containerd.io
  - docker-compose-plugin

package_update: true
package_upgrade: true
package_reboot_if_required: true

users:
  - name: admin
    ssh-authorized-keys:
      - sk-ssh-ed25519@openssh.com AAAAGnNrLXNzaC1lZDI1NTE5QG9wZW5zc2guY29tAAAAIOiwDWKGku4uY/dm3VyLVn/Q5d6DKsv3+UvzY55p87rIAAAABHNzaDo= personal yubikey-5c-nano 070
      - sk-ssh-ed25519@openssh.com AAAAGnNrLXNzaC1lZDI1NTE5QG9wZW5zc2guY29tAAAAIJRu0fWqCFxanfufqC18iIu+kLZ2B3+eJvuEzBCScG/tAAAABHNzaDo= personal yubikey-5c 864
    sudo: ['ALL=(ALL) NOPASSWD:ALL']
    shell: /usr/bin/bash
    groups: sudo, docker
    no_user_group: true
  
runcmd:
  - iptables -P INPUT DROP
  - iptables -A INPUT -i lo -j ACCEPT
  - iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
  - iptables -A INPUT -p tcp --dport 22 -j ACCEPT
  - iptables -A INPUT -p tcp --dport 80 -j ACCEPT
  - iptables -A INPUT -p tcp --dport 443 -j ACCEPT
  - iptables -A INPUT -p udp --dport 443 -j ACCEPT
  - iptables -P FORWARD DROP
  - iptables -A FORWARD -i eth1 -o eth0 -j ACCEPT
  - docker swarm init --advertise-addr $(hostname -I | awk '{print $3}')`;

  const _default = new digitalocean.Domain("default", {name: "outer-planes.net"}, {
      protect: true,
  });
  const ns1 = new digitalocean.DnsRecord("ns1", {
    domain: _default.id,
    name: "@",
    ttl: 1800,
    type: "NS",
    value: "ns1.digitalocean.com.",
  }, {
    protect: true,
  });
  const ns2 = new digitalocean.DnsRecord("ns2", {
    domain: _default.id,
    name: "@",
    ttl: 1800,
    type: "NS",
    value: "ns2.digitalocean.com.",
  }, {
    protect: true,
  });
  const ns3 = new digitalocean.DnsRecord("ns3", {
    domain: _default.id,
    name: "@",
    ttl: 1800,
    type: "NS",
    value: "ns3.digitalocean.com.",
  }, {
    protect: true,
  });

  const mx1 = new digitalocean.DnsRecord("mx1", {
    domain: _default.id,
    name: "@",
    priority: 1,
    ttl: 1800,
    type: "MX",
    value: "aspmx.l.google.com.",
  }, {
    protect: true,
  });
  const mx2 = new digitalocean.DnsRecord("mx2", {
    domain: _default.id,
    name: "@",
    priority: 5,
    ttl: 1800,
    type: "MX",
    value: "alt1.aspmx.l.google.com.",
  }, {
    protect: true,
  });
  const mx3 = new digitalocean.DnsRecord("mx3", {
    domain: _default.id,
    name: "@",
    priority: 5,
    ttl: 1800,
    type: "MX",
    value: "alt2.aspmx.l.google.com.",
  }, {
    protect: true,
  });
  const mx4 = new digitalocean.DnsRecord("mx4", {
    domain: _default.id,
    name: "@",
    priority: 10,
    ttl: 1800,
    type: "MX",
    value: "alt3.aspmx.l.google.com.",
  }, {
    protect: true,
  });
  const mx5 = new digitalocean.DnsRecord("mx5", {
    domain: _default.id,
    name: "@",
    priority: 10,
    ttl: 1800,
    type: "MX",
    value: "alt4.aspmx.l.google.com.",
  }, {
    protect: true,
  });

  const txtSpf = new digitalocean.DnsRecord("txtSpf", {
    domain: _default.id,
    name: "@",
    ttl: 86400,
    type: "TXT",
    value: "v=spf1 include:_spf.google.com ~all",
  }, {
    protect: true,
  });
  const txtKeybase = new digitalocean.DnsRecord("txtKeybase", {
    domain: _default.id,
    name: "_keybase",
    ttl: 3600,
    type: "TXT",
    value: "keybase-site-verification=B63zuCQwOofMV2JohWWXCas-pNlqQZmiwsbzbNaU0Bo",
  }, {
    protect: true,
  });
  const txtGoogle = new digitalocean.DnsRecord("txtGoogle", {
    domain: "outer-planes.net",
    name: "@",
    ttl: 86400,
    type: "TXT",
    value: "google-site-verification=x16tjnYyfxwSP957-vpBpf_7J-iPbKMBQQSnW1k4jxg",
  }, {
    protect: true,
  });

  const droplet = new digitalocean.Droplet("o-p.n", {
    name: "o-p.n",
    image: "ubuntu-22-04-x64",
    region: "nyc1",
    size: "s-1vcpu-2gb-amd",
    ipv6: true,
    monitoring: true,
    userData: userData,
  });
  const dropletA = new digitalocean.DnsRecord("o-p.n-A", {
    domain: _default.id,
    name: "@",
    ttl: 30,
    type: "A",
    value: droplet.ipv4Address,
  }, { dependsOn: [_default, droplet] });
  const dropletWildA = new digitalocean.DnsRecord("o-p.n-wildA", {
    domain: _default.id,
    name: "*",
    ttl: 30,
    type: "A",
    value: droplet.ipv4Address,
  }, { dependsOn: [_default, droplet] });
  const dropletAAAA = new digitalocean.DnsRecord("o-p.n-AAAA", {
    domain: _default.id,
    name: "@",
    ttl: 30,
    type: "AAAA",
    value: droplet.ipv6Address,
  }, { dependsOn: [_default, droplet] });
  const dropletWildAAAA = new digitalocean.DnsRecord("o-p.n-wildAAAA", {
    domain: _default.id,
    name: "*",
    ttl: 30,
    type: "AAAA",
    value: droplet.ipv6Address,
  }, { dependsOn: [_default, droplet] });
}