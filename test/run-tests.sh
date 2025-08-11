#!/bin/bash

# MCPresso End-to-End Test Runner
# This script runs the comprehensive end-to-end test suite

set -e

echo "🧪 Running MCPresso End-to-End Tests"
echo "====================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the mcpresso package directory."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if supertest is available
if ! npm list supertest > /dev/null 2>&1; then
    echo "📦 Installing test dependencies..."
    npm install --save-dev supertest @types/supertest
fi

echo "🔧 Building the package..."
npm run build

echo "🧪 Running end-to-end tests..."
npm run test:e2e

echo "✅ End-to-end tests completed!"

# Optional: Run specific test categories
if [ "$1" = "auth" ]; then
    echo "🔐 Running authentication tests..."
    npm test test/auth.test.ts
elif [ "$1" = "all" ]; then
    echo "🧪 Running all tests..."
    npm test
fi

echo "�� All tests passed!" 