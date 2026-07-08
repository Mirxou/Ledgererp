#!/bin/sh
while true; do
  cd /home/z/my-project
  NODE_OPTIONS="--max-old-space-size=512" node node_modules/.bin/next dev -p 3000 2>/tmp/next-dev-err.log
  echo "Server died, restarting in 3s..." >> /tmp/next-dev-err.log
  sleep 3
done