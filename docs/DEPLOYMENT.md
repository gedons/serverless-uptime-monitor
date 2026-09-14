# AWS Deployment Guide - Serverless Uptime Monitor

## Prerequisites
- Node.js v22+
- AWS CLI configured with valid credentials
- AWS SAM CLI installed (`sam --version`)

---

## Local Development & Build

### 1. Backend Build & Test
```powershell
cd backend
npm install
npm run typecheck
npm test
```

### 2. Infrastructure SAM Build
```powershell
cd infrastructure
sam build
```

---

## AWS Action Protocol for Deployment

To deploy the CloudFormation stack to AWS:

```text
========================================
AWS ACTION REQUIRED
========================================

What: Deploy CloudFormation infrastructure stack to AWS

Why: Provision DynamoDB tables (Monitors, CheckResults, Incidents), Lambda handlers, API Gateway REST API with Cognito Authorizer, EventBridge schedule, SNS Alert Topic, and Cognito User Pool.

Command:
cd infrastructure
sam deploy --guided

Expected Result:
CloudFormation creates resources and outputs:
- ApiUrl: API Gateway Endpoint
- UserPoolId: Cognito User Pool ID
- UserPoolClientId: Cognito App Client ID
- AlertTopicArn: SNS Topic ARN

After completing it:
Provide the ApiUrl, UserPoolId, and UserPoolClientId outputs so they can be configured in frontend environment variables.
========================================
```

---

## SNS Email Alert Subscription

After deploying SAM, subscribe your email to receive outage alerts:

```powershell
aws sns subscribe \
  --topic-arn <AlertTopicArn> \
  --protocol email \
  --notification-endpoint your-email@example.com
```

> [!IMPORTANT]
> AWS will send a subscription confirmation email. You must click the confirmation link in the email to activate downtime notifications.

---

## Frontend Deployment (Nuxt 3)

Configure `.env` or set environment variables:

```powershell
cd frontend
npm install
$env:NUXT_PUBLIC_API_BASE="<ApiUrl>"
$env:NUXT_PUBLIC_COGNITO_USER_POOL_ID="<UserPoolId>"
$env:NUXT_PUBLIC_COGNITO_CLIENT_ID="<UserPoolClientId>"
$env:NUXT_PUBLIC_AWS_REGION="eu-west-1"
npm run build
```
