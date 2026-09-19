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

# Check for GEMINI_API_KEY secret in Secret Manager or environment
DEPLOY_SECRET_FLAG=""
DEPLOY_ENV_VARS="GEMINI_MODEL=$GEMINI_MODEL,ENVIRONMENT=prod,ALLOW_DEV_TOKENS=false"

if gcloud secrets describe GEMINI_API_KEY --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "Found GEMINI_API_KEY in Secret Manager. Using Secret Manager..."
  DEPLOY_SECRET_FLAG="--set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest"
elif [ -n "${GEMINI_API_KEY:-}" ]; then
  echo "Using GEMINI_API_KEY from environment..."
  DEPLOY_ENV_VARS="$DEPLOY_ENV_VARS,GEMINI_API_KEY=$GEMINI_API_KEY"
else
  echo "WARNING: GEMINI_API_KEY not found in Secret Manager or environment."
  echo "You can set it via Secret Manager or export GEMINI_API_KEY=your_key"
fi

echo "Building container and deploying to Cloud Run..."

gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated \
  ${DEPLOY_SECRET_FLAG} \
  --set-env-vars "$DEPLOY_ENV_VARS" \
  --min-instances 1 \
  --max-instances 10 \
  --memory 1Gi \
  --cpu 1 \
  --port 8080

echo "Deployment complete! Fetching service URL..."
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format='value(status.url)')
echo "SaathiAI is live at: $SERVICE_URL"
