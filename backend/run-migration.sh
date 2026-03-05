#!/bin/bash

echo "🚀 Starting Prisma DB Push..."
echo "================================"

# Navigate to backend directory
cd "$(dirname "$0")"

# Run db push to sync schema with database
npx prisma db push --accept-data-loss

# Check if successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database schema updated successfully!"
    echo ""
    echo "📋 New fields added to Job model:"
    echo "  - draftFiles (Json)"
    echo "  - draftSubmittedAt (DateTime)"
    echo "  - draftCount (Int)"
    echo "  - rebriefReason (String)"
    echo "  - rebriefCount (Int)"
    echo "  - rebriefAt (DateTime)"
    echo "  - rebriefResponse (String)"
    echo ""
    echo "🎯 Next steps:"
    echo "  1. Restart your backend server"
    echo "  2. Test Draft Submit feature"
    echo "  3. Test Rebrief feature"
    echo ""
else
    echo ""
    echo "❌ Database push failed!"
    echo ""
    echo "💡 Troubleshooting:"
    echo "  1. Check if PostgreSQL is running"
    echo "  2. Verify DATABASE_URL in .env"
    echo "  3. Check database permissions"
    echo ""
    exit 1
fi
