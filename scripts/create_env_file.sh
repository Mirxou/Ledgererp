#!/bin/bash
# Script to create .env file from template
# Usage: ./scripts/create_env_file.sh

echo "=========================================="
echo "Ledger ERP - Environment File Creator"
echo "=========================================="
echo ""

# Check if template exists
if [ ! -f "env.production.template" ]; then
    echo "❌ Error: env.production.template not found"
    exit 1
fi

# Check if .env already exists
if [ -f ".env" ]; then
    echo "⚠️  Warning: .env file already exists"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
fi

# Copy template
cp env.production.template .env

# Generate SECRET_KEY
echo "Generating SECRET_KEY..."
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")

# Update .env file
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/SECRET_KEY=.*/SECRET_KEY=$SECRET_KEY/" .env
else
    # Linux
    sed -i "s/SECRET_KEY=.*/SECRET_KEY=$SECRET_KEY/" .env
fi

echo ""
echo "✅ .env file created successfully!"
echo ""
echo "⚠️  IMPORTANT:"
echo "   - Review .env file and update values as needed"
echo "   - Never commit .env to Git"
echo "   - Keep SECRET_KEY secure"
echo ""
echo "Next steps:"
echo "1. Review .env file: cat .env"
echo "2. Update ENVIRONMENT=production"
echo "3. Update ALLOWED_HOSTS=ledgererp.online"
echo "4. Update CORS_ORIGINS=https://ledgererp.online"
echo ""

