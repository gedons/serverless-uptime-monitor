# Authentication and User Ownership Implementation

## Objective

Implement complete authentication and authorization for the Serverless Uptime Monitor SaaS.

Authentication and user ownership must be implemented across:

* AWS infrastructure
* API Gateway
* Lambda handlers
* backend services
* DynamoDB data model
* frontend
* route protection
* API requests
* login and registration flows

Use **Amazon Cognito User Pools** as the authentication provider.

Do not redesign or remove existing working monitoring functionality unnecessarily.

---

# 1. Core Security Model

The final security model must be:

```text
User
  ↓
Amazon Cognito
  ↓
JWT Access Token
  ↓
API Gateway Cognito Authorizer
  ↓
Lambda
  ↓
Authenticated User Identity
  ↓
Authorization Check
  ↓
User-owned DynamoDB Resources
```

A user must only be able to access their own:

* monitors
* check history
* incidents
* statistics

Never trust a `userId` sent from the frontend request body.

The authenticated user identity must come from the verified Cognito JWT claims.

---

# 2. Authentication Provider

Use:

```text
Amazon Cognito User Pool
```

Do not implement custom password authentication.

Do not store passwords in DynamoDB.

Do not create custom JWT signing logic.

Use Cognito for:

* registration
* login
* password management
* password reset
* JWT generation

---

# 3. AWS Infrastructure

Update:

```text
infrastructure/template.yaml
```

to add a Cognito User Pool.

Create:

```text
UserPool
UserPoolClient
```

Use AWS SAM / CloudFormation resources.

The User Pool should support:

* email-based sign-up
* password authentication
* email verification
* password reset
* secure password requirements

The User Pool Client must support frontend authentication.

Do not configure a client secret for the browser-based frontend.

The frontend must never contain an AWS secret.

---

# 4. Cognito User Pool Configuration

Configure the User Pool with:

```text
Username / sign-in:
Email

Email verification:
Enabled

Password requirements:
Minimum 8 characters

Require:
Uppercase
Lowercase
Number

Recommended:
Symbol

Password recovery:
Email
```

Use the Cognito subject (`sub`) claim as the stable backend user identity.

The canonical application user ID should be:

```text
userId = JWT sub claim
```

Do not use email as the primary ownership identifier.

Email can change; `sub` is stable.

---

# 5. API Gateway Authorization

All monitor-related API endpoints must require authentication.

Protect:

```text
POST   /monitors
GET    /monitors
GET    /monitors/{monitorId}
PATCH  /monitors/{monitorId}
DELETE /monitors/{monitorId}

POST   /monitors/{monitorId}/check

GET    /monitors/{monitorId}/checks
GET    /monitors/{monitorId}/incidents
GET    /monitors/{monitorId}/stats
```

Use API Gateway authorization integrated with Cognito.

Do not rely only on Lambda code for authentication.

API Gateway should reject unauthenticated requests before invoking the Lambda when possible.

Public endpoints should remain public only if explicitly required.

---

# 6. SAM API Authorizer

Configure a Cognito authorizer in the SAM template.

The API should have a default authorizer where practical.

Ensure all monitor API routes require Cognito authentication.

Example architecture:

```text
Client
  │
  │ Authorization: Bearer <JWT>
  ▼
API Gateway
  │
  │ Cognito Authorizer
  ▼
Lambda
```

Use the appropriate SAM/API Gateway authorizer configuration.

Do not hardcode User Pool IDs or ARNs.

Use CloudFormation references.

---

# 7. User Identity Extraction

Create a backend authentication utility.

Suggested location:

```text
backend/src/utils/auth.ts
```

Implement a helper that extracts the authenticated Cognito user ID from the API Gateway request context.

The helper should:

1. Read the verified JWT claims from API Gateway.
2. Extract the `sub` claim.
3. Validate that it exists.
4. Return the user ID.

Concept:

```ts
const userId = getAuthenticatedUserId(event);
```

The function should not parse or verify raw JWTs itself if API Gateway/Cognito authorization already performed verification.

The backend should consume the verified request context.

Return a controlled `401 Unauthorized` or `403 Forbidden` response if authentication information is unexpectedly missing.

Do not expose internal details.

---

# 8. Monitor Data Model

Add ownership to every monitor.

The Monitor model must include:

```ts
userId: string;
```

Example:

```ts
export interface Monitor {
  monitorId: string;
  userId: string;

  name: string;
  url: string;

  method: "GET" | "HEAD";

  interval: number;
  timeout: number;

  enabled: boolean;

  status: "UP" | "DOWN" | "UNKNOWN";

  nextCheckAt: string;

  createdAt: string;
  updatedAt: string;
}
```

The `userId` must always come from Cognito.

Never accept this from:

```json
{
  "userId": "..."
}
```

from the client.

---

# 9. Monitor Creation Authorization

Update:

```text
POST /monitors
```

The flow must be:

```text
Authenticated User
       ↓
JWT verified by API Gateway
       ↓
Lambda extracts sub
       ↓
userId assigned to monitor
       ↓
Monitor stored
```

Example:

```ts
const userId = getAuthenticatedUserId(event);

const monitor = await createMonitor({
  ...validatedInput,
  userId
});
```

Ignore any `userId` provided in the request body.

---

# 10. Listing User Monitors

`GET /monitors` must only return monitors belonging to the authenticated user.

Do not return all monitors.

The desired query behavior is:

```text
GET /monitors

Authenticated user:
user_123

Returns:

monitors where:
userId = user_123
```

Do not perform an unrestricted DynamoDB scan in the final authenticated implementation.

---

# 11. DynamoDB Ownership Index

Update the DynamoDB design so monitors can be queried efficiently by user.

Add a Global Secondary Index.

Suggested name:

```text
UserMonitorsIndex
```

Suggested key:

```text
Partition Key:
userId

Sort Key:
createdAt
```

This should support:

```text
Get all monitors belonging to user
```

efficiently.

Do not query all monitors and filter in application code.

Use DynamoDB `Query`.

---

# 12. Existing Monitors Table

The existing table currently has:

```text
PK:
monitorId
```

Preserve the existing primary key unless a deliberate redesign is necessary.

Add:

```text
UserMonitorsIndex

PK:
userId

SK:
createdAt
```

Update:

```text
AttributeDefinitions
GlobalSecondaryIndexes
```

in the SAM template.

Document the schema.

---

# 13. Monitor Ownership Checks

For every operation involving a specific monitor:

```text
GET
PATCH
DELETE
MANUAL CHECK
CHECK HISTORY
INCIDENTS
STATS
```

the backend must verify ownership.

Required flow:

```text
Request monitorId
        ↓
Load monitor
        ↓
Authenticated userId
        ↓
Compare:

monitor.userId === authenticatedUserId
        ↓
Allowed / Forbidden
```

If the monitor does not belong to the user:

Return:

```text
404 Not Found
```

or another deliberate authorization-safe response.

Prefer not revealing that another user's monitor exists.

Do not allow cross-user access.

---

# 14. Central Ownership Authorization

Avoid duplicating ownership checks in every handler.

Create a reusable authorization helper or service.

Suggested concept:

```ts
getOwnedMonitor(
  monitorId,
  userId
)
```

Behavior:

```text
Load monitor
     ↓
Not found?
→ 404

Exists but belongs to another user?
→ 404

Belongs to user?
→ Return monitor
```

All monitor-specific handlers should use this consistently.

---

# 15. Check History Authorization

Before querying:

```text
GET /monitors/{id}/checks
```

verify that the monitor belongs to the authenticated user.

Do not allow someone to query:

```text
/checks?monitorId=someone-else
```

and retrieve another user's data.

---

# 16. Incident Authorization

Before querying:

```text
GET /monitors/{id}/incidents
```

verify monitor ownership.

Incident records should remain linked to:

```text
monitorId
```

Ownership should be enforced through the monitor.

Optionally include `userId` in incidents if useful for future query patterns.

Do not expose another user's incidents.

---

# 17. Statistics Authorization

Before calculating:

```text
GET /monitors/{id}/stats
```

verify monitor ownership.

Do not allow statistics enumeration through monitor IDs.

---

# 18. Manual Check Authorization

Before performing:

```text
POST /monitors/{id}/check
```

verify ownership.

Manual checks can consume AWS resources.

Only the owner of the monitor may trigger them.

Also retain existing:

* SSRF protection
* timeout protection
* rate limiting if implemented

Authentication must not weaken SSRF protection.

---

# 19. Worker Behavior

The scheduled monitoring worker is an internal AWS process.

The worker must:

* continue processing monitors
* not require Cognito authentication
* not expose an API endpoint
* use its Lambda IAM permissions

The worker should process monitors across all users.

Ownership is an API access concern.

The worker is trusted internal infrastructure.

---

# 20. Internal Lambda Permissions

Do not accidentally apply Cognito authorization to:

```text
EventBridge
    ↓
MonitorWorkerFunction
```

The worker is invoked by EventBridge.

Cognito authorization applies to user-facing API Gateway routes.

Keep internal AWS invocation separate from public API authentication.

---

# 21. Notification Ownership

Notifications should remain associated with the correct monitor.

If notifications are configured per monitor, only the monitor owner can modify notification settings.

Do not expose another user's notification configuration.

Do not return sensitive notification information unnecessarily.

---

# 22. Frontend Authentication

Implement complete frontend authentication using Cognito.

The frontend must support:

```text
Register
Login
Logout
Session persistence
Authenticated API requests
Protected routes
Password reset
```

Use a Cognito-compatible frontend library or a clean direct integration.

Prefer a mature library compatible with Nuxt 3 and Vue 3.

Do not implement custom password storage.

Do not send passwords to your own backend API.

Passwords should go directly through Cognito authentication flows.

---

# 23. Recommended Frontend Authentication Approach

Choose a stable Cognito-compatible approach.

The frontend should be able to:

```text
Sign up
Confirm email
Sign in
Store session securely
Refresh session
Get access token
Sign out
```

Do not invent custom token storage if the selected authentication library provides secure session management.

Document the chosen library and why it was selected.

---

# 24. Frontend Environment Variables

Add Cognito configuration through environment variables.

Example:

```text
NUXT_PUBLIC_COGNITO_USER_POOL_ID
NUXT_PUBLIC_COGNITO_CLIENT_ID
NUXT_PUBLIC_AWS_REGION
NUXT_PUBLIC_API_BASE
```

The exact names can differ, but configuration must be centralized.

Do not hardcode:

* User Pool ID
* Client ID
* API Gateway URL

inside frontend source code.

Create:

```text
frontend/.env.example
```

Example:

```text
NUXT_PUBLIC_AWS_REGION=eu-west-1
NUXT_PUBLIC_COGNITO_USER_POOL_ID=
NUXT_PUBLIC_COGNITO_CLIENT_ID=
NUXT_PUBLIC_API_BASE=
```

Do not commit actual `.env` files.

---

# 25. Cognito Configuration Output

Update the SAM outputs.

Add:

```text
UserPoolId
UserPoolClientId
```

Also keep:

```text
ApiUrl
AlertTopicArn
```

Example outputs:

```text
ApiUrl

UserPoolId

UserPoolClientId

AlertTopicArn
```

The user will use these outputs to configure the frontend.

---

# 26. Frontend Runtime Configuration

Update:

```text
frontend/nuxt.config.ts
```

to expose only the necessary public Cognito configuration.

Example concept:

```ts
runtimeConfig: {
  public: {
    apiBase: process.env.NUXT_PUBLIC_API_BASE,
    awsRegion: process.env.NUXT_PUBLIC_AWS_REGION,
    cognitoUserPoolId:
      process.env.NUXT_PUBLIC_COGNITO_USER_POOL_ID,
    cognitoClientId:
      process.env.NUXT_PUBLIC_COGNITO_CLIENT_ID
  }
}
```

Do not put secrets in public runtime config.

The Cognito User Pool Client for the browser must not use a client secret.

---

# 27. Login Page

Implement:

```text
/login
```

Include:

```text
Email
Password
Login button
Link to registration
Forgot password
```

Requirements:

* client-side validation
* useful backend/Cognito error messages
* loading state
* disabled submit during authentication
* accessible form
* no browser alert() dialogs

---

# 28. Registration Page

Implement:

```text
/register
```

Include:

```text
Email
Password
Confirm Password
Create Account
```

Validate:

* valid email
* password requirements
* password confirmation

After registration:

```text
User registers
       ↓
Cognito sends verification email/code
       ↓
User confirms account
       ↓
User can log in
```

Implement the confirmation flow.

---

# 29. Account Confirmation

Implement a route or flow for account confirmation.

Example:

```text
/confirm-account
```

Support:

```text
Email
Verification code
Confirm account
```

Also support:

```text
Resend verification code
```

Do not assume the account is confirmed immediately after registration.

---

# 30. Forgot Password

Implement:

```text
/forgot-password
```

Flow:

```text
Enter email
      ↓
Cognito sends reset code
      ↓
User enters code
      ↓
User sets new password
```

Support:

```text
Request reset
Confirm reset
```

Use Cognito.

Do not implement your own password reset system.

---

# 31. Logout

Implement logout.

Logout must:

* clear the local authenticated session using the selected auth library
* clear cached user state
* redirect to login or landing page

Do not leave an expired UI session pretending the user is logged in.

---

# 32. Auth State

Create a centralized authentication composable/store.

Suggested concept:

```text
useAuth()
```

Expose:

```ts
user
isAuthenticated
isLoading

signUp()
confirmSignUp()
signIn()
signOut()

forgotPassword()
confirmForgotPassword()

getAccessToken()
```

Avoid duplicating authentication logic across pages.

---

# 33. API Authentication Header

Update the frontend API client.

Every protected API request must include:

```text
Authorization: Bearer <JWT>
```

The token must come from the active Cognito session.

Suggested concept:

```ts
const token = await getAccessToken();

headers: {
  Authorization: `Bearer ${token}`
}
```

Do not hardcode tokens.

Do not store a token in source code.

---

# 34. Correct Token Type

Verify which token type the API Gateway Cognito authorizer expects.

Use the correct Cognito JWT token consistently.

Document the choice.

Do not assume that any arbitrary token will work.

Test an authenticated API request against the deployed API.

---

# 35. API Client Error Handling

Handle:

```text
401 Unauthorized
403 Forbidden
```

appropriately.

Example behavior:

```text
401
↓
Session invalid or expired
↓
Refresh session if supported
or
Redirect to login
```

Do not silently continue with failed authentication.

---

# 36. Protected Frontend Routes

Protect:

```text
/dashboard
/monitors
/monitors/new
/monitors/[id]
/settings
```

Unauthenticated users should be redirected to:

```text
/login
```

Logged-in users should not be unnecessarily redirected away from protected pages.

---

# 37. Guest Routes

Public routes should include:

```text
/
/login
/register
/confirm-account
/forgot-password
```

Adjust as necessary for the existing application.

If a logged-in user visits:

```text
/login
```

redirect them to:

```text
/dashboard
```

where appropriate.

---

# 38. Nuxt Route Middleware

Implement centralized route middleware.

Suggested:

```text
frontend/middleware/auth.ts
```

Behavior:

```text
Protected route
      ↓
Authenticated?
      ↓
Yes → allow
No  → redirect /login
```

Avoid manually checking authentication in every page.

---

# 39. API CORS

Because the frontend will send:

```text
Authorization
```

headers, update API Gateway CORS correctly.

Allow:

```text
Content-Type
Authorization
```

methods:

```text
GET
POST
PATCH
DELETE
OPTIONS
```

Do not use unrestricted:

```text
Access-Control-Allow-Origin: *
```

for the final authenticated production frontend unless explicitly required and safe.

Make the frontend origin configurable.

Support local development origin separately.

Example concept:

```text
http://localhost:3000
```

for development.

Production origin should be configured after the frontend deployment URL is known.

Document how to update the allowed origin.

---

# 40. Important Deployment Order

Authentication infrastructure affects the API.

The recommended deployment order is:

```text
1. Update backend code
2. Update SAM infrastructure
3. Run tests
4. Run typecheck
5. Run SAM build

STOP

6. User deploys SAM
7. Get outputs:
   - ApiUrl
   - UserPoolId
   - UserPoolClientId
   - AlertTopicArn

8. Configure frontend environment variables

9. Build frontend

10. Deploy frontend
```

Do not claim Cognito IDs exist until the SAM stack has actually been deployed.

---

# 41. Existing Data Migration

The current Monitors table may contain monitors created before authentication was added.

Inspect the current project state.

Do not silently break existing records.

Choose and document one approach.

Preferred options:

### Development Environment

If this is a development-only stack:

```text
Existing test monitors can be deleted
and recreated under authenticated users.
```

### Existing Important Data

If existing monitor data must be preserved:

```text
Create a documented migration strategy
to assign existing monitors to a user.
```

Do not deploy a schema change that makes existing data inaccessible without documenting the impact.

---

# 42. DynamoDB GSI Deployment Warning

Adding:

```text
UserMonitorsIndex
```

to an existing DynamoDB table changes infrastructure.

Review whether CloudFormation can update the table safely.

Do not delete or replace the table unless explicitly approved.

If SAM/CloudFormation requires a replacement:

STOP and notify the user:

```text
AWS ACTION REQUIRED

The DynamoDB schema change would replace an existing table.

Potential impact:
Existing monitor data could be lost.

Do not deploy until the migration strategy is confirmed.
```

---

# 43. Backend Tests

Add or update tests.

At minimum:

## Authentication utility

Test:

```text
valid Cognito sub
missing auth context
missing sub
```

## Monitor creation

Verify:

```text
Authenticated user ID
is stored as monitor.userId
```

Verify:

```text
Request body userId
cannot override authenticated user ID
```

## Ownership

Test:

```text
Owner can access monitor
Different user cannot access monitor
```

Apply tests to:

```text
GET monitor
PATCH monitor
DELETE monitor
manual check
check history
incidents
stats
```

---

# 44. Frontend Validation

Verify:

```text
Registration works
Email confirmation works
Login works
Logout works
Protected routes work
API requests include JWT
Expired/invalid session is handled
Password reset works
```

Do not declare frontend authentication complete without testing these flows.

---

# 45. Backend API Testing

Test:

### Unauthenticated Request

```text
GET /monitors
```

Expected:

```text
401 Unauthorized
```

### Authenticated User A

Create:

```text
Monitor A
```

### Authenticated User B

Attempt:

```text
GET /monitors/{Monitor A ID}
```

Expected:

```text
404 Not Found
```

or the project's deliberate safe authorization response.

User B must never receive Monitor A data.

---

# 46. IAM Permissions

Review all Lambda IAM permissions after authentication changes.

Apply least privilege.

The Cognito authorizer should not require application Lambdas to have broad Cognito permissions unless specifically necessary.

Do not add:

```text
cognito:*
```

to Lambda policies unnecessarily.

---

# 47. No Secrets in Git

Verify:

```text
.env
.env.local
.aws
credentials
access keys
```

are ignored.

Update:

```text
.gitignore
```

if necessary.

Create:

```text
.env.example
```

instead.

---

# 48. Documentation

Update:

```text
README.md
ARCHITECTURE.md
docs/API.md
docs/AWS.md
docs/DEPLOYMENT.md
```

Document:

* Cognito architecture
* registration
* confirmation
* login
* logout
* password reset
* protected API
* authorization
* monitor ownership
* required environment variables
* AWS outputs

Update architecture diagrams.

---

# 49. API Documentation

Update API documentation to state that all monitor APIs require:

```text
Authorization: Bearer <JWT>
```

Example:

```http
GET /monitors
Authorization: Bearer eyJ...
```

Document:

```text
401 Unauthorized
```

for missing or invalid authentication.

Do not include real tokens in documentation.

---

# 50. Final Architecture

The completed architecture should look approximately like:

```text
                    ┌─────────────────┐
                    │     Nuxt App    │
                    └────────┬────────┘
                             │
                    Cognito Authentication
                             │
                             ▼
                       JWT Token
                             │
                             ▼
                    ┌─────────────────┐
                    │   API Gateway   │
                    │ Cognito Auth    │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    Lambdas      │
                    └────────┬────────┘
                             │
               ┌─────────────┼─────────────┐
               ▼             ▼             ▼
          Monitors      Check Results   Incidents
          DynamoDB        DynamoDB      DynamoDB


EventBridge
     │
     ▼
Monitor Worker
     │
     ├──────────────► Check websites
     │
     ├──────────────► DynamoDB
     │
     └──────────────► SNS Alerts
```

---

# 51. Completion Checklist

Before declaring authentication complete:

```text
[ ] Cognito User Pool exists in SAM template
[ ] Cognito User Pool Client exists
[ ] Browser client has no secret
[ ] Email sign-up works
[ ] Email confirmation works
[ ] Login works
[ ] Logout works
[ ] Password reset works
[ ] JWT session works
[ ] Protected frontend routes work
[ ] API requests include JWT
[ ] API Gateway authorizer is configured
[ ] Unauthenticated API requests are rejected
[ ] userId comes from Cognito sub
[ ] Monitor includes userId
[ ] UserMonitorsIndex exists
[ ] GET /monitors only returns user's monitors
[ ] Monitor ownership checks work
[ ] Cross-user access is blocked
[ ] Manual check requires ownership
[ ] History requires ownership
[ ] Incidents require ownership
[ ] Stats require ownership
[ ] Worker continues functioning
[ ] SSRF protection remains active
[ ] Backend tests pass
[ ] Backend typecheck passes
[ ] Frontend build passes
[ ] SAM build passes
[ ] No secrets are committed
[ ] Documentation is updated
[ ] SAM outputs include Cognito configuration
```

---

# 52. Agent Working Procedure

Follow this sequence:

```text
1. Inspect the existing repository.

2. Inspect the existing SAM template.

3. Inspect the existing backend handlers.

4. Inspect the Monitor repository and DynamoDB schema.

5. Inspect the frontend architecture.

6. Create a concise implementation plan.

7. Implement Cognito infrastructure.

8. Implement API Gateway authorization.

9. Implement backend identity extraction.

10. Add user ownership to Monitor.

11. Add UserMonitorsIndex.

12. Update repositories.

13. Update all handlers.

14. Add ownership checks.

15. Update tests.

16. Implement frontend authentication.

17. Implement login and registration.

18. Implement confirmation.

19. Implement password reset.

20. Implement protected routes.

21. Update API client authentication headers.

22. Update CORS.

23. Run tests.

24. Run backend typecheck.

25. Run frontend typecheck/build.

26. Run SAM build.

27. Review all changes.

28. Update documentation.

29. Commit changes.

30. Report the exact AWS deployment action required.
```

---

# 53. AWS Action Protocol

Do not perform or claim AWS deployment.

After all code is ready and:

```text
backend typecheck passes
backend tests pass
frontend build passes
sam build passes
```

notify the user:

```text
========================================
AWS ACTION REQUIRED
========================================

What:
Deploy the updated SAM stack containing Cognito and API authorization.

Why:
The application now requires AWS Cognito User Pool resources and API Gateway authorization.

Command:

cd infrastructure
sam deploy

Expected Outputs:

- ApiUrl
- UserPoolId
- UserPoolClientId
- AlertTopicArn

After deployment:

Send me the complete CloudFormation Outputs.

Do not continue assuming deployment succeeded until the outputs are available.

========================================
```

---

# 54. Final Instruction

Authentication is not complete merely because Cognito resources exist.

The feature is complete only when all of the following work together:

```text
User registers
      ↓
User confirms account
      ↓
User logs in
      ↓
Cognito creates session
      ↓
Frontend receives valid token
      ↓
Frontend calls protected API
      ↓
API Gateway validates authentication
      ↓
Lambda receives verified user identity
      ↓
Backend uses Cognito sub as userId
      ↓
DynamoDB stores user ownership
      ↓
User can only access their own monitors
```

Do not weaken existing:

* SSRF protection
* validation
* incident detection
* worker behavior
* notification functionality

to implement authentication.

Preserve existing functionality while adding authentication and authorization securely.
