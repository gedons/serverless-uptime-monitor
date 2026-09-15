# AWS Deployment Guide — Serverless Uptime Monitor

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | v22+ | [nodejs.org](https://nodejs.org) |
| AWS CLI | v2 | [docs.aws.amazon.com/cli](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) |
| AWS SAM CLI | latest | [docs.aws.amazon.com/serverless-application-model](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) |
| Git | any | [git-scm.com](https://git-scm.com) |

---

## Production Deployment (CI/CD — Recommended)

The backend deploys automatically via **GitHub Actions** on every push to `master` that touches `backend/**` or `infrastructure/**`.

### Required GitHub Secrets

Go to your GitHub repository → **Settings → Secrets and variables → Actions** and add:

| Secret Name | Description |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM user access key ID |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret access key |

The IAM user needs permissions for: `CloudFormation`, `Lambda`, `API Gateway`, `DynamoDB`, `Cognito`, `SNS`, `SES`, `S3` (for SAM artifacts), `IAM` (for SAM role creation).

### Pipeline Stages

```
push to master
      │
      ▼
[validate-and-test]
  1. npm ci
  2. npm run typecheck
  3. npm run test (22 Vitest tests)
  4. sam validate
      │
      ▼ (on success)
[deploy-backend]
  1. npm ci
  2. npm install -g esbuild
  3. sam build
  4. sam deploy → uptime-monitor-dev stack
```

### Frontend Deployment (AWS Amplify)

The frontend is deployed via **AWS Amplify native GitHub integration** — not via GitHub Actions.

1. Connect your GitHub repo to AWS Amplify.
2. Set the build root to `frontend/`.
3. Add the following environment variables in Amplify → App settings → Environment variables:
   ```
   NUXT_PUBLIC_API_BASE          = https://<api-id>.execute-api.eu-west-1.amazonaws.com/Prod
   NUXT_PUBLIC_COGNITO_USER_POOL_ID = <UserPoolId>
   NUXT_PUBLIC_COGNITO_CLIENT_ID    = <UserPoolClientId>
   NUXT_PUBLIC_AWS_REGION           = eu-west-1
   ```
4. Amplify auto-detects Nuxt 3 (Nitro preset) and builds/deploys SSR on every `master` push.

---

## First-Time Manual Deployment

Use this approach to bootstrap the stack before CI/CD is configured.

### 1. Configure AWS CLI
```bash
aws configure
# Enter: Access Key ID, Secret Access Key, region (eu-west-1), output format (json)
```

### 2. Build & Test Backend
```bash
cd backend
npm install
npm run typecheck
npm test
```

### 3. Deploy Infrastructure
```bash
cd infrastructure
sam build
sam deploy --guided
```

The `--guided` wizard will prompt for:
- Stack name: `uptime-monitor-dev`
- Region: `eu-west-1`
- `FrontendCorsOrigin`: your Amplify URL (e.g. `https://master.d271vygs1aytqt.amplifyapp.com`)
- Confirm IAM role creation: `y`

On completion, note the stack **Outputs**:

| Output Key | Use |
|---|---|
| `ApiUrl` | Set as `NUXT_PUBLIC_API_BASE` |
| `UserPoolId` | Set as `NUXT_PUBLIC_COGNITO_USER_POOL_ID` |
| `UserPoolClientId` | Set as `NUXT_PUBLIC_COGNITO_CLIENT_ID` |
| `AlertTopicArn` | Used for SNS email subscriptions |

Subsequent deploys (no `--guided`):
```bash
sam build
sam deploy
```

---

## SES Email Alerts Setup

The monitor worker sends email alerts via AWS SES. Before alerts work in production:

### 1. Verify sender identity in SES
```bash
aws ses verify-email-identity --email-address alerts@yourdomain.com --region eu-west-1
```

### 2. (Optional) Subscribe to SNS topic for ops alerts
```bash
aws sns subscribe \
  --topic-arn <AlertTopicArn> \
  --protocol email \
  --notification-endpoint your-email@example.com \
  --region eu-west-1
```

> [!IMPORTANT]
> AWS SES starts in **sandbox mode** by default — you can only send to verified email addresses. To send to any recipient, request production access in the SES console under **Account dashboard → Request production access**.

---

## Local Development

### Backend
```bash
cd backend
npm install
npm run typecheck   # TypeScript type-check only (no emit)
npm test            # Vitest unit tests
npm run build       # tsc compile to dist/
```

### Frontend
```bash
cd frontend
npm install

# Create .env file:
echo "NUXT_PUBLIC_API_BASE=https://<api-id>.execute-api.eu-west-1.amazonaws.com/Prod" > .env
echo "NUXT_PUBLIC_COGNITO_USER_POOL_ID=<UserPoolId>" >> .env
echo "NUXT_PUBLIC_COGNITO_CLIENT_ID=<UserPoolClientId>" >> .env
echo "NUXT_PUBLIC_AWS_REGION=eu-west-1" >> .env

npm run dev         # http://localhost:3000
```

### CORS Note
The `samconfig.toml` sets `FrontendCorsOrigin` to the Amplify production URL. For local dev, redeploy SAM with:
```bash
sam deploy --parameter-overrides "FrontendCorsOrigin=http://localhost:3000"
```

Or temporarily add `http://localhost:3000` to the allowed origins list in `template.yaml` during development.

---

## Updating the Stack

After making changes to `infrastructure/template.yaml` or backend handlers:

```bash
cd infrastructure
sam build
sam deploy   # uses samconfig.toml, no prompts
```

GitHub Actions handles this automatically on push to `master`.

---

## Tearing Down

To remove all AWS resources:
```bash
aws cloudformation delete-stack --stack-name uptime-monitor-dev --region eu-west-1
```

> [!CAUTION]
> This permanently deletes all DynamoDB data (monitors, check results, incidents). There is no recovery once the stack is deleted.
