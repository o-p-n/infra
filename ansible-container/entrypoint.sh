#! /usr/bin/env bash

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
