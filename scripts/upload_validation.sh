#!/usr/bin/env bash
# Upload validation-key.txt to remote webroot using scp
# Usage: ./upload_validation.sh user@host /remote/webroot/path
# Example: ./upload_validation.sh user@ftp.example.com /var/www/ledgererp.pinet.com/public_html

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 user@host /remote/webroot/path"
  exit 1
fi

REMOTE="$1"
REMOTE_PATH="$2"

echo "Uploading validation-key.txt to ${REMOTE}:${REMOTE_PATH}/validation-key.txt"
scp -P 22 validation-key.txt "${REMOTE}:${REMOTE_PATH}/validation-key.txt"
if [ $? -eq 0 ]; then
  echo "Upload successful. Verify with: curl -sS https://${REMOTE#*@}/validation-key.txt"
else
  echo "Upload failed. Check credentials and network." 
fi
