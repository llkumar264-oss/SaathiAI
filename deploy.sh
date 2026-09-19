#!/usr/bin/env bash
# SaathiAI Cloud Run Deployment Script
# Prerequisites: gcloud CLI configured, Secret Manager secrets created.

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project)}"
REGION="${REGION:-asia-south1}"
SERVICE_NAME="saathi-ai"
GEMINI_MODEL="${GEMINI_MODEL:-gemini-2.5-flash}"

echo "============================================================"
echo " Deploying SaathiAI to Google Cloud Run"
echo " Project: $PROJECT_ID | Region: $REGION"
echo "============================================================"

# Check for GEMINI_API_KEY secret in Secret Manager
if ! gcloud secrets describe GEMINI_API_KEY --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "Error: GEMINI_API_KEY secret not found in Secret Manager!"
  echo "Create it first with:"
  echo "  gcloud secrets create GEMINI_API_KEY --replication-policy=automatic"
  echo "  printf '%s' '\$YOUR_KEY' | gcloud secrets versions add GEMINI_API_KEY --data-file=-"
  exit 1
fi

echo "Building container and deploying to Cloud Run..."

# NOTE ON RATE LIMITING & SCALING:
# SaathiAI uses an in-memory sliding window rate limiter (slowapi) per instance.
# --max-instances is set to 10 to balance cost and traffic surges.
# For distributed multi-instance rate limiting across multiple instances,
# configure Redis (Google Cloud Memorystore) by setting REDIS_URL in Secret Manager.

gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --set-env-vars GEMINI_MODEL="$GEMINI_MODEL",ENVIRONMENT=prod,ALLOW_DEV_TOKENS=false \
  --min-instances 1 \
  --max-instances 10 \
  --memory 1Gi \
  --cpu 1 \
  --port 8080

echo "Deployment complete! Fetching service URL..."
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format='value(status.url)')
echo "SaathiAI is live at: $SERVICE_URL"
