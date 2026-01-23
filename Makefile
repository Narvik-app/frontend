# Executables (local)
COMPOSE_CMD = podman-compose
BUILDAH_CMD = buildah

# Docker containers (for backward compatibility if docker compose is still used)
NODE_CONT = $(COMPOSE_CMD) exec front

# Container repo
BUILD_REPO = benoitvignal/narvik-front

# Version extraction from package.json
VERSION_FULL := $(shell jq -r .version package.json 2>/dev/null || echo "0.0.0")
VERSION_MAJOR := $(shell echo $(VERSION_FULL) | cut -d. -f1)
VERSION_MINOR := $(shell echo $(VERSION_FULL) | cut -d. -f1-2)

# Multi-platform support
PLATFORMS = linux/amd64,linux/arm64

# Misc
.DEFAULT_GOAL = help

## —— 🎵 📦 The Buildah Makefile 📦 🎵 ——————————————————————————————————
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

## —— Buildah 📦 ————————————————————————————————————————————————————————————————

build-cloud-latest-only: ## Build using cloud and push it under latest tag (use for preprod testing)
	@echo "\033[33mWarning: Cloud builders are not supported with Buildah. Use build-latest-only instead.\033[0m"

build-latest-only: ## Build and push image under latest tag (use for preprod testing)
	@$(BUILDAH_CMD) bud --pull --no-cache -t $(BUILD_REPO):latest --target run .
	@$(BUILDAH_CMD) push $(BUILD_REPO):latest

build-prod: ## Build production image with version tags
	@$(BUILDAH_CMD) bud --pull --no-cache \
		-t $(BUILD_REPO):latest \
		-t $(BUILD_REPO):$(VERSION_MAJOR) \
		-t $(BUILD_REPO):$(VERSION_MINOR) \
		-t $(BUILD_REPO):$(VERSION_FULL) \
		--target run .

build-multiplatform: ## Build multi-platform image (amd64, arm64) and push to registry
	@echo "\033[32mBuilding multi-platform image for $(PLATFORMS)...\033[0m"
	@MANIFEST_NAME="$(BUILD_REPO):temp-manifest-$$(date +%s)-$$$$"; \
	$(BUILDAH_CMD) manifest create "$$MANIFEST_NAME"; \
	for platform in $$(echo $(PLATFORMS) | tr ',' ' '); do \
		echo "\033[33mBuilding for $$platform...\033[0m"; \
		$(BUILDAH_CMD) bud \
			--platform $$platform \
			--pull \
			--layers \
			--target run \
			--manifest "$$MANIFEST_NAME" \
			.; \
	done; \
	echo "\033[32mTagging and pushing multi-platform images...\033[0m"; \
	$(BUILDAH_CMD) manifest push --all "$$MANIFEST_NAME" "docker://$(BUILD_REPO):latest"; \
	$(BUILDAH_CMD) manifest push --all "$$MANIFEST_NAME" "docker://$(BUILD_REPO):$(VERSION_MAJOR)"; \
	$(BUILDAH_CMD) manifest push --all "$$MANIFEST_NAME" "docker://$(BUILD_REPO):$(VERSION_MINOR)"; \
	$(BUILDAH_CMD) manifest push --all "$$MANIFEST_NAME" "docker://$(BUILD_REPO):$(VERSION_FULL)"; \
	$(BUILDAH_CMD) manifest rm "$$MANIFEST_NAME"; \
	echo "\033[32mMulti-platform build complete!\033[0m"

build-cloud-prod:
	@echo "\033[33mWarning: Cloud builders are not supported with Buildah. Use build-prod instead.\033[0m"

push-prod: ## Push all production tags to registry
	@$(BUILDAH_CMD) push $(BUILD_REPO):latest
	@$(BUILDAH_CMD) push $(BUILD_REPO):$(VERSION_MAJOR)
	@$(BUILDAH_CMD) push $(BUILD_REPO):$(VERSION_MINOR)
	@$(BUILDAH_CMD) push $(BUILD_REPO):$(VERSION_FULL)

sh: ## Connect to the Node container
	@$(NODE_CONT) sh

## —— Cloudflared 🕸️ ——————————————————————————————————————————————————————————————
cloudflared-tunnel: ## Expose local env through cloudflared tunnel (url must be set to host.docker.internal:3000 on cloudflare tunnel setting)
	podman run --rm -it cloudflare/cloudflared:latest tunnel --no-autoupdate run --token $$CLOUDFLARED_TUNNEL

cloudflared-tunnel-free: ## Expose local env through cloudflared tunnel (free version is limited to 200 in-flight request)
	podman run --rm -it cloudflare/cloudflared:latest tunnel --no-autoupdate --url http://host.docker.internal:3000
