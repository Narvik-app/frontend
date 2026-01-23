# Buildah Migration Guide

## Overview

This project has been migrated from Docker to Buildah to support Podman and containerd-based container runtimes. This migration enables better compatibility with modern container ecosystems and provides more flexibility in deployment options.

## What Changed

### 1. Build Tool: Docker → Buildah

**Before (Docker):**
```bash
docker build -t narvik-front:latest .
docker push narvik-front:latest
```

**After (Buildah):**
```bash
buildah bud -t narvik-front:latest .
buildah push narvik-front:latest
```

### 2. Runtime: Docker → Podman

**Before (Docker):**
```bash
docker run --rm -it narvik-front:latest
docker compose up
```

**After (Podman):**
```bash
podman run --rm -it narvik-front:latest
podman-compose up
```

### 3. Makefile Commands

All Makefile targets have been updated to use Buildah and Podman:

- `make build-prod` - Build production image with version tags using Buildah
- `make build-latest-only` - Build and push latest tag
- `make push-prod` - Push all production tags to registry
- Cloud builder commands now show warnings (not supported with Buildah)

### 4. GitHub Actions

The CI/CD pipeline now uses Buildah directly instead of Docker GitHub Actions:
- Installs Buildah on Ubuntu runners
- Uses `buildah login` for authentication
- Uses `buildah bud` for building
- Uses `buildah push` for pushing images

## Installation

### Installing Buildah

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y buildah
```

**Fedora:**
```bash
sudo dnf install -y buildah
```

**macOS:**
```bash
brew install buildah
```

### Installing Podman

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y podman
```

**Fedora:**
```bash
sudo dnf install -y podman
```

**macOS:**
```bash
brew install podman
```

### Installing podman-compose (Optional)

```bash
pip3 install podman-compose
```

## Usage

### Building Images

**Local Development Build:**
```bash
# Using Buildah directly
buildah bud -t narvik-front:dev .

# Using Makefile
make build-latest-only
```

**Production Build:**
```bash
# Using Buildah directly
buildah bud --pull --no-cache \
  -t narvik-front:latest \
  -t narvik-front:3.15.1 \
  --target run .

# Using Makefile
make build-prod
```

**Multi-Platform Build (amd64 and arm64):**
```bash
# Using Buildah directly with manifest
MANIFEST_NAME="narvik-front:temp-manifest"
buildah manifest create "$MANIFEST_NAME"

# Build for amd64
buildah bud --platform linux/amd64 \
  --manifest "$MANIFEST_NAME" \
  --target run .

# Build for arm64
buildah bud --platform linux/arm64 \
  --manifest "$MANIFEST_NAME" \
  --target run .

# Push multi-platform manifest
buildah manifest push --all "$MANIFEST_NAME" "docker://narvik-front:latest"
buildah manifest rm "$MANIFEST_NAME"

# Using Makefile (recommended)
make build-multiplatform
```

> **Note:** Multi-platform builds require QEMU for cross-architecture emulation:
> ```bash
> # Ubuntu/Debian
> sudo apt-get install qemu-user-static
> # Register QEMU binary formats
> docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
> ```

### Running Containers

**Using Podman:**
```bash
# Run the container
podman run --rm -p 3000:3000 narvik-front:latest

# Run with environment variables
podman run --rm -p 3000:3000 \
  -e NODE_ENV=production \
  narvik-front:latest
```

### Pushing Images

```bash
# Login to registry
buildah login docker.io

# Push single tag
buildah push narvik-front:latest

# Push all production tags
make push-prod
```

## Benefits of Buildah/Podman

### 1. **Rootless Containers**
Podman can run containers without root privileges, enhancing security.

### 2. **Daemonless Architecture**
No background daemon required, reducing resource usage and attack surface.

### 3. **OCI Compliance**
Buildah produces OCI-compliant images compatible with:
- containerd
- CRI-O
- Docker
- Kubernetes
- Any OCI-compliant runtime

### 4. **Docker Compatibility**
Podman CLI is compatible with Docker CLI:
```bash
alias docker=podman
```

### 5. **Better CI/CD Integration**
No privileged mode required in CI/CD pipelines.

### 6. **Multi-Platform Support**
Buildah supports building images for multiple architectures (amd64, arm64, etc.) using a manifest list, enabling deployment across different hardware platforms.

## Multi-Platform Images

This project now supports multi-platform container images for:
- **linux/amd64** - Standard x86-64 architecture
- **linux/arm64** - ARM 64-bit architecture (Apple Silicon, AWS Graviton, etc.)

### Benefits of Multi-Platform Images

- **Flexibility**: Run on different hardware architectures without rebuilding
- **Cost Optimization**: Use ARM instances (often cheaper in cloud providers)
- **Development**: Develop on Apple Silicon Macs without compatibility issues
- **Production**: Deploy to ARM-based servers (AWS Graviton, Azure Cobalt)

### Using Multi-Platform Images

Multi-platform images work transparently - the container runtime automatically selects the correct architecture:

```bash
# On x86-64 system
podman run --rm narvik-front:latest  # Uses amd64 image

# On ARM64 system (M1/M2 Mac, Graviton)
podman run --rm narvik-front:latest  # Uses arm64 image
```

## Compatibility

### Docker Compatibility

The Dockerfile remains compatible with Docker if needed:
```bash
docker build -t narvik-front:latest .
docker run --rm -p 3000:3000 narvik-front:latest
```

### Image Compatibility

Images built with Buildah can be pulled and run with Docker:
```bash
# Build with Buildah
buildah bud -t narvik-front:latest .

# Run with Docker
docker run --rm -p 3000:3000 narvik-front:latest
```

Images built with Docker can be pulled and run with Podman:
```bash
# Build with Docker
docker build -t narvik-front:latest .

# Run with Podman
podman run --rm -p 3000:3000 narvik-front:latest
```

## Troubleshooting

### "buildah: command not found"

Install Buildah using your package manager (see Installation section above).

### "podman: command not found"

Install Podman using your package manager (see Installation section above).

### Permission Denied

Buildah/Podman support rootless mode. Ensure your user is in the appropriate groups:
```bash
# Add user to subuid/subgid (if needed)
sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 $USER
```

### Registry Authentication

Buildah stores credentials in `${XDG_RUNTIME_DIR}/containers/auth.json` or `$HOME/.config/containers/auth.json`:
```bash
buildah login docker.io
# or with Podman
podman login docker.io
```

## Migration Checklist for Developers

- [ ] Install Buildah and Podman
- [ ] Update local scripts to use Buildah/Podman commands
- [ ] Test building images locally with `buildah bud`
- [ ] Test running containers with `podman run`
- [ ] Update any documentation referencing Docker
- [ ] Update CI/CD pipelines if using custom scripts

## References

- [Buildah Documentation](https://buildah.io/)
- [Podman Documentation](https://podman.io/)
- [OCI Specification](https://opencontainers.org/)
- [podman-compose](https://github.com/containers/podman-compose)

## Support

For issues related to this migration, please:
1. Check this documentation
2. Review the [Buildah FAQ](https://github.com/containers/buildah/blob/main/docs/tutorials/01-intro.md)
3. Review the [Podman FAQ](https://podman.io/docs/FAQ)
4. Open an issue in the repository

---

**Migration Date:** January 2024
**Migration Version:** 3.15.1+
