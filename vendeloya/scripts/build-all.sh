#!/bin/bash

echo "Building all services..."

# Build API Gateway
echo "Building API Gateway..."
cd api-gateway
npm install
npm run build
cd ..

# Build all components
for dir in components/*/; do
    if [ -f "$dir/package.json" ]; then
        echo "Building $(basename $dir)..."
        cd "$dir"
        npm install
        npm run build
        cd ../..
    fi
done

echo "Build complete!"

