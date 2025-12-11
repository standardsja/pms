# Deployment Script for Heron Server

# 1. Make sure you have the correct .env file on heron
Copy-Item .env.production .env -Force

# 2. Install dependencies if not already installed
npm install

# 3. Build the frontend with the correct API URL
$env:VITE_API_URL="http://localhost:4000"
npm run build

# 4. Start the backend server (in background)
Start-Process powershell -ArgumentList "-Command", "cd '$PWD'; npm run server:dev" -WindowStyle Hidden

# 5. Serve the built frontend
# Option A: Use a simple HTTP server
npx http-server dist -p 5173 -a 0.0.0.0

# Option B: Or use Vite preview mode
# npm run preview -- --host 0.0.0.0