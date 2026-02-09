#!/bin/bash

# Fix Prisma Client for nextJobTypeId field
# This script regenerates the Prisma client to recognize new schema fields

echo "🔧 Fixing Prisma Client..."
echo ""

cd "$(dirname "$0")/api-server" || exit 1

echo "📂 Current directory: $(pwd)"
echo ""

echo "Step 1: Regenerating Prisma Client..."
npx prisma generate

if [ $? -eq 0 ]; then
    echo "✅ Prisma Client regenerated successfully!"
    echo ""
    echo "Step 2: Pushing schema to database..."
    npx prisma db push --skip-generate

    if [ $? -eq 0 ]; then
        echo "✅ Schema pushed to database!"
        echo ""
        echo "🎉 Done! You can now restart your backend server."
        echo ""
        echo "Run: npm start"
    else
        echo "⚠️  Database push failed. Check your DATABASE_URL in .env"
        echo "You may need to run migrations manually."
    fi
else
    echo "❌ Prisma generate failed. Check the error above."
    exit 1
fi
