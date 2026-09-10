#! /usr/bin/env bash

ssh-keyscan localhost | grep -v '#' > ~/.ssh/known_hosts

CMD="$1"
shift

case "${CMD}" in
  "playbook")
    PLAYBOOK="$1"
    shift
    case "${PLAYBOOK}" in
      "local"|"public")
        ansible-playbook /workspace/playbooks/${PLAYBOOK}.yaml "$@"
        ;;
      *)
        ansible-playbook ${PLAYBOOK} "$@"
        ;;
    esac
    ;;
  "run")
    ansible "$@"
    ;;
  "shell")
    exec /bin/bash "$@"
    ;;
esac
