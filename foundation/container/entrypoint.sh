#! /usr/bin/env bash

ssh-keyscan localhost | grep -v '#' > ~/.ssh/known_hosts

CMD="$1"
shift

case "${CMD}" in
  "playbook")
    ansible-playbook -i inventory "$@"
    ;;
  "run")
    ansible "$@"
    ;;
  "shell")
    exec "${SHELL}" "$@"
    ;;
esac
