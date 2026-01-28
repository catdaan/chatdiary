# ChatDairy Deployment Guide

This guide explains how to deploy ChatDairy to your VPS using Docker.

## Prerequisites

- A VPS (Virtual Private Server) with Linux (Ubuntu/Debian recommended).
- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed on the VPS.

## Steps

1. **Transfer Files**
   Upload the project files to your VPS. You can use `scp` or `rsync`, or simply git clone if you have a remote repository.
   
   If uploading manually, ensure you include:
   - `Dockerfile`
   - `docker-compose.yml`
   - `nginx.conf`
   - `package.json`
   - `package-lock.json`
   - `vite.config.js`
   - `index.html`
   - `src/` folder
   - `public/` folder

2. **Deploy**
   SSH into your VPS and navigate to the project directory. Run the following command:

   ```bash
   docker-compose up -d --build
   ```

   This command will:
   - Build the application (install dependencies, compile React code).
   - Start a web server (Nginx) in a Docker container.
   - Serve the app on port **8080**.

3. **Access**
   Open your browser and visit: `http://<your-vps-ip>:8080`

   Note: Since API keys are stored in your browser's LocalStorage, you don't need to configure server-side secrets. Just open the app and set your API key in the settings.

## Updating

To update the app after changing code:

```bash
# Pull latest code (if using git)
git pull

# Rebuild and restart
docker-compose up -d --build
```
