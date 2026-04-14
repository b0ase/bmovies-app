#!/bin/bash

echo "🔍 Checking for processes on port 4000..."

# Kill any process running on port 4000
PID=$(lsof -ti:4000)
if [ ! -z "$PID" ]; then
    echo "🔪 Killing process $PID on port 4000..."
    kill -9 $PID
    sleep 1
else
    echo "✅ No process found on port 4000"
fi

echo "🚀 Starting Next.js development server on port 4000..."
npm run dev 