FROM python:3.14-slim AS main

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

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && rm requirements.txt

COPY requirements.yml .
RUN ansible-galaxy collection install -r requirements.yml \
    && rm requirements.yml

RUN mkdir -p ~/.ssh && chmod 600 ~/.ssh

WORKDIR /workspace

COPY entrypoint.sh /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/bin/bash", "/usr/local/bin/entrypoint.sh"]

CMD ["ansible", "--version"]
