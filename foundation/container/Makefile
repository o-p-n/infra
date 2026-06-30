
REPO?=o-p-n
PROJECT?=ansible
VERSION?=latest

DOCKER?=docker

.PHONY: help build

.DEFAULT_GOAL := help

help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  build    Builds the container image"
	@echo "  help     Shows this help message"

build:
	$(DOCKER) build -t $(REPO)/$(PROJECT):$(VERSION) .
