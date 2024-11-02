#!/bin/bash

# Build the application
npm run build

# Deploy to server
rsync -avz --delete dist/ user@server:/var/www/call-of-jacob/
rsync -avz server/ user@server:/opt/call-of-jacob/server/

# Restart services
ssh user@server 'sudo systemctl restart call-of-jacob' 