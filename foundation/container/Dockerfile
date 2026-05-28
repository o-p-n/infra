FROM python:3.14-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV ANSIBLE_FORCE_COLOR=true

RUN apt update \
    && apt upgrade --yes --no-install-recommends \
    && apt install --yes --no-install-recommends \
        git \
        iputils-ping \
        openssh-client \
        sshpass \
  && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    ansible==13.5.0 \
    ansible-lint==26.4.0 \
    jmespath==1.1.0 \
    netaddr==1.3.0

RUN ansible-galaxy collection install \
    community.general \
    ansible.posix \
    community.docker

RUN mkdir -p ~/.ssh && chmod 600 ~/.ssh

WORKDIR /workspace

COPY entrypoint.sh /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/bin/bash", "/usr/local/bin/entrypoint.sh"]

CMD ["ansible", "--version"]
