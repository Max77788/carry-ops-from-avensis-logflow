#!/bin/bash

# Deploy Supabase Edge Functions
# This script deploys the send-email edge function to Supabase

echo "🚀 Deploying Supabase Edge Functions..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null
then
    echo "❌ Supabase CLI is not installed."
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if logged in
echo "Checking Supabase login status..."
if ! supabase projects list &> /dev/null
then
    echo "❌ Not logged in to Supabase."
    echo "Please run: supabase login"
    exit 1
fi

echo "✅ Logged in to Supabase"
echo ""

# Deploy send-email function
echo "📧 Deploying send-email function..."
supabase functions deploy send-email

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully deployed send-email function!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Set your Resend API key:"
    echo "   supabase secrets set RESEND_API_KEY=re_your_key_here"
    echo ""
    echo "2. Set your sender email:"
    echo "   supabase secrets set EMAIL_FROM=onboarding@yourdomain.com"
    echo ""
    echo "3. Test the function from your app!"
else
    echo ""
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi

