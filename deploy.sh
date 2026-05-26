#!/bin/bash
# RouteShepherd - Vercel Deployment Script
# Run this script locally to deploy to Vercel

set -e

echo "🚀 RouteShepherd - Vercel Deployment"
echo "====================================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Login to Vercel (will open browser)
echo ""
echo "📝 Step 1: Logging into Vercel..."
vercel login

# Link project
echo ""
echo "📝 Step 2: Linking project to Vercel..."
vercel link --yes

# Set environment variables
echo ""
echo "📝 Step 3: Setting environment variables..."
echo "⚠️  You will need the following values ready:"
echo "   - DATABASE_URL (Neon PostgreSQL connection string)"
echo "   - DIRECT_URL (Neon PostgreSQL direct connection string)"
echo "   - NEXTAUTH_SECRET (generate with: openssl rand -base64 32)"
echo "   - NEXTAUTH_URL (your Vercel app URL, e.g., https://routeshepherd.vercel.app)"
echo "   - GOOGLE_CLIENT_ID (from Google Cloud Console)"
echo "   - GOOGLE_CLIENT_SECRET (from Google Cloud Console)"
echo ""

read -p "Enter DATABASE_URL: " DB_URL
vercel env add DATABASE_URL production <<< "$DB_URL"

read -p "Enter DIRECT_URL: " DIRECT_URL
vercel env add DIRECT_URL production <<< "$DIRECT_URL"

NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo "Generated NEXTAUTH_SECRET: $NEXTAUTH_SECRET"
vercel env add NEXTAUTH_SECRET production <<< "$NEXTAUTH_SECRET"

read -p "Enter NEXTAUTH_URL (e.g., https://routeshepherd.vercel.app): " NEXTAUTH_URL
vercel env add NEXTAUTH_URL production <<< "$NEXTAUTH_URL"

read -p "Enter GOOGLE_CLIENT_ID (or press Enter for placeholder): " GOOGLE_CLIENT_ID
vercel env add GOOGLE_CLIENT_ID production <<< "${GOOGLE_CLIENT_ID:-placeholder}"

read -p "Enter GOOGLE_CLIENT_SECRET (or press Enter for placeholder): " GOOGLE_CLIENT_SECRET
vercel env add GOOGLE_CLIENT_SECRET production <<< "${GOOGLE_CLIENT_SECRET:-placeholder}"

# Deploy to production
echo ""
echo "📝 Step 4: Deploying to production..."
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo "🌐 Your app should be live at the URL shown above."
echo ""
echo "📌 Next steps:"
echo "   1. Run 'npx prisma db push' to create database tables"
echo "   2. Run 'npx prisma db seed' to populate with sample data"
echo "   3. Configure Google OAuth in Google Cloud Console"
echo "   4. Update GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars"
