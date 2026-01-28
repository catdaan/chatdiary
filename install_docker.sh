#!/bin/bash

# Exit on error
set -e

echo "🐳 Starting Docker Installation for Debian..."

# 1. Update existing packages
echo "📦 Updating package database..."
sudo apt-get update

# 2. Install prerequisites
echo "🛠️ Installing prerequisite packages..."
sudo apt-get install -y ca-certificates curl gnupg

# 3. Add Docker's official GPG key
echo "🔑 Adding Docker GPG key..."
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 4. Set up the repository
echo "📂 Setting up Docker repository..."
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 5. Install Docker Engine
echo "⬇️ Installing Docker Engine..."
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 6. Verify installation
echo "✅ Verifying installation..."
if sudo docker run hello-world > /dev/null; then
    echo "🎉 Docker successfully installed!"
else
    echo "❌ Docker installation verification failed."
    exit 1
fi

echo "
==============================================
🚀 Docker & Docker Compose are ready!
==============================================

To run Docker commands without 'sudo', execute this command and then log out & back in:

    sudo usermod -aG docker \$USER

After that, you can deploy ChatDairy with:

    docker compose up -d --build
"
