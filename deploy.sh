#!/bin/bash

# Configuration
VPS_USER="root"        # Replace with your VPS username
VPS_IP="43.247.134.252"   # Your VPS IP address
VPS_PORT="30000"          # Replace with your VPS SSH port (check your VPS info)
REMOTE_DIR="/root/chatdairy" # Destination directory on VPS

echo "🚀 Starting deployment to $VPS_IP on port $VPS_PORT..."

# 1. Create remote directory
echo "📂 Creating remote directory..."
ssh -p $VPS_PORT $VPS_USER@$VPS_IP "mkdir -p $REMOTE_DIR"

# 2. Upload files using rsync (excludes node_modules and .git for speed)
echo "📤 Uploading files..."
rsync -avz --progress -e "ssh -p $VPS_PORT" \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude '.DS_Store' \
    . $VPS_USER@$VPS_IP:$REMOTE_DIR

# 3. Build and run on VPS
echo "🏗️  Building and starting services on VPS..."
ssh -p $VPS_PORT $VPS_USER@$VPS_IP "cd $REMOTE_DIR && docker compose up -d --build"

echo "✅ Deployment complete! Visit http://$VPS_IP:8080"
