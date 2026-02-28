# Container runtime detection (supports docker and podman)
CONTAINER_RUNTIME ?= $(shell command -v podman >/dev/null 2>&1 && echo podman || echo docker)
CONTAINER_COMP = $(CONTAINER_RUNTIME) compose

# Docker containers
NODE_CONT = $(CONTAINER_COMP) exec front

# Container repo
BUILD_REPO = benoitvignal/narvik-front

# Misc
.DEFAULT_GOAL = help

## —— 🎵 🐳 The Narvik Makefile 🐳 🎵 ——————————————————————————————————
help: ## Outputs this help screen
	@grep -E '(^[a-zA-Z0-9\./_-]+:.*?##.*$$)|(^##)' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}{printf "\033[32m%-30s\033[0m %s\n", $$1, $$2}' | sed -e 's/\[32m##/[33m/'

## —— Local Development 💻 ——————————————————————————————————————————————————————
generate-local-ssl: ## Generate local SSL certificates using mkcert
	@if ! command -v mkcert >/dev/null 2>&1; then \
		echo "\033[31mmkcert is not installed. Please install it from https://github.com/FiloSottile/mkcert\033[0m"; \
		exit 1; \
	fi
	@echo "\033[32mGenerating local SSL certificates...\033[0m"
	@mkcert localhost
	@chmod +x localhost.pem localhost-key.pem
	@echo "\033[32mCertificates generated and permissions set.\033[0m"

## —— Container 🐳 —————————————————————————————————————————————————————————————

build-cloud-latest-only: ## Build using cloud and push it under latest tag (use for preprod testing)
	@$(CONTAINER_RUNTIME) buildx build . --builder cloud-benoitvignal-narvik-cloud --pull --no-cache -t $(BUILD_REPO):latest --target run
	@$(CONTAINER_RUNTIME) image push $(BUILD_REPO):latest

build-prod:
	@$(CONTAINER_RUNTIME) build --pull --no-cache -t $(BUILD_REPO):latest -t $(BUILD_REPO):`cat package.json | grep version | grep '\([0-9]\+\.\?\)\{3\}' -o | grep '^[0-9]\+\+' -o` -t $(BUILD_REPO):`cat package.json | grep version | grep '\([0-9]\+\.\?\)\{3\}' -o | grep '^[0-9]\+\.[0-9]\+' -o` -t $(BUILD_REPO):`cat package.json | grep version | grep '\([0-9]\+\.\?\)\{3\}' -o` --target run .

build-cloud-prod:
	@$(CONTAINER_RUNTIME) buildx build . --builder cloud-benoitvignal-narvik-cloud --pull --no-cache -t $(BUILD_REPO):latest -t $(BUILD_REPO):`cat package.json | grep version | grep '\([0-9]\+\.\?\)\{3\}' -o | grep '^[0-9]\+\+' -o` -t $(BUILD_REPO):`cat package.json | grep version | grep '\([0-9]\+\.\?\)\{3\}' -o | grep '^[0-9]\+\.[0-9]\+' -o` -t $(BUILD_REPO):`cat package.json | grep version | grep '\([0-9]\+\.\?\)\{3\}' -o` --target run

sh: ## Connect to the Node container
	@$(NODE_CONT) sh

## —— Cloudflared 🕸️ ——————————————————————————————————————————————————————————————
cloudflared-tunnel: ## Expose local env through cloudflared tunnel (url must be set to host.docker.internal:3000 on cloudflare tunnel setting)
	$(CONTAINER_RUNTIME) run --rm -it cloudflare/cloudflared:latest tunnel --no-autoupdate run --token $$CLOUDFLARED_TUNNEL

cloudflared-tunnel-free: ## Expose local env through cloudflared tunnel (free version is limited to 200 in-flight request)
	$(CONTAINER_RUNTIME) run --rm -it cloudflare/cloudflared:latest tunnel --no-autoupdate --url http://host.docker.internal:3000
