FROM alpine/helm:3.12.0

# Install necessary tools for GitLab CI/CD deployment
RUN apk add --no-cache \
    gettext \
    curl \
    bash \
    && curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" \
    && chmod +x kubectl \
    && mv kubectl /usr/local/bin/ \
    && kubectl version --client

# Verify installations
RUN envsubst --version && kubectl version --client && helm version

LABEL maintainer="WhisperNotes Team"
LABEL description="Custom base image with Helm, kubectl, and gettext for GitLab CI/CD"