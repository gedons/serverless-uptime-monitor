# Serverless Uptime Monitor

## Complete Project Implementation Instructions

You are the primary development agent responsible for completing the Serverless Uptime Monitor project from its current state to a production-ready MVP.

You must first inspect the existing repository and understand what has already been implemented. Do not recreate existing work unnecessarily.

The project is being developed as a single monorepo.

---

# 1. Project Objective

Build a complete serverless uptime monitoring platform where users can:

* Create monitors
* View monitors
* View individual monitor details
* Update monitors
* Enable or disable monitors
* Delete monitors
* Automatically check monitored URLs
* Record uptime and downtime
* Record HTTP status codes
* Record response times
* Record errors
* View historical check results
* View uptime statistics
* View incidents
* Receive downtime and recovery notifications
* Manage their monitoring configuration
* Use a polished responsive dashboard

The final application should feel like a real SaaS uptime monitoring product, not a demo.

---

# 2. Existing Technology Stack

Do not replace the existing stack unless there is a strong technical reason.

## Backend

* Node.js
* TypeScript
* AWS Lambda
* API Gateway
* DynamoDB
* EventBridge
* SNS where appropriate
* CloudWatch
* AWS SAM
* AWS SDK v3
* Native `fetch`
* esbuild

## Frontend

* Nuxt
* Vue
* TypeScript
* Tailwind CSS
* Use the existing frontend stack if already initialized

## Repository

Use one monorepo:

```text
serverless-uptime-monitor/
├── backend/
├── frontend/
├── infrastructure/
├── docs/
├── ARCHITECTURE.md
├── AGENT_INSTRUCTIONS.md
├── README.md
└── .gitignore
```

Do not create separate Git repositories.

---

# 3. Current Project State

The following functionality has already been implemented.

## Infrastructure

AWS SAM is already configured.

Current region:

```text
eu-west-1
```

Current stack:

```text
uptime-monitor-dev
```

The project already has:

* `MonitorsTable`
* `CheckResultsTable`
* `CreateMonitorFunction`
* `MonitorWorkerFunction`
* API Gateway
* EventBridge scheduled worker
* DynamoDB IAM permissions
* SAM esbuild configuration

The worker is scheduled approximately every minute.

---

# 4. Existing Backend Architecture

The backend currently uses a structure similar to:

```text
backend/
├── src/
│   ├── handlers/
│   │   ├── createMonitor.ts
│   │   └── monitorWorker.ts
│   ├── repositories/
│   │   ├── monitorRepository.ts
│   │   └── checkResultRepository.ts
│   ├── services/
│   │   ├── monitorService.ts
│   │   └── httpChecker.ts
│   ├── types/
│   │   ├── monitor.ts
│   │   └── checkResult.ts
│   └── utils/
│       ├── response.ts
│       └── urlSecurity.ts
├── tests/
├── package.json
└── tsconfig.json
```

Inspect the actual repository before making assumptions.

---

# 5. Important Existing Data Models

The Monitor model currently contains approximately:

```ts
export type MonitorStatus = "UP" | "DOWN" | "UNKNOWN";

export type HttpMethod = "GET" | "HEAD";

export interface Monitor {
  monitorId: string;
  name: string;
  url: string;
  method: HttpMethod;
  interval: number;
  timeout: number;
  enabled: boolean;
  status: MonitorStatus;
  nextCheckAt: string;
  createdAt: string;
  updatedAt: string;
}
```

Check results currently contain approximately:

```ts
export type CheckStatus = "UP" | "DOWN";

export interface CheckResult {
  checkId: string;
  monitorId: string;
  status: CheckStatus;
  httpStatus?: number;
  responseTime?: number;
  error?: string;
  checkedAt: string;
}
```

Do not blindly overwrite these models. Inspect the current implementation first.

---

# 6. Critical Agent Rule: Inspect Before Modifying

Before writing code:

1. Inspect the complete repository structure.
2. Read `README.md`.
3. Read `ARCHITECTURE.md` if present.
4. Read the SAM template.
5. Read all existing backend source files.
6. Read the existing frontend source.
7. Inspect `package.json` files.
8. Inspect existing tests.
9. Run the current tests/typecheck/build.
10. Identify what is already working.
11. Create a short internal implementation checklist.

Do not recreate working features.

---

# 7. AWS Action Rule

This is extremely important.

You are allowed to write AWS infrastructure code and AWS CLI commands, but **you must not assume that the user has authorized you to perform AWS deployment or destructive AWS operations.**

Whenever the project reaches a point where the user must perform an AWS action, STOP and notify the user.

Examples include:

* `sam deploy`
* `sam deploy --guided`
* CloudFormation stack creation
* CloudFormation stack deletion
* DynamoDB table deletion
* AWS credential configuration
* AWS Console configuration
* IAM changes requiring user approval
* SNS email subscription confirmation
* Domain/DNS configuration
* Secrets configuration
* API Gateway production configuration
* CloudWatch configuration requiring manual approval
* Any action that could incur AWS charges
* Any destructive AWS operation

Do not pretend that an AWS action has been completed.

Instead, clearly tell the user:

```text
AWS ACTION REQUIRED

Action:
<exact action>

Why:
<why this is needed>

Run:
<exact command>

Expected result:
<what they should see>

When complete, tell me:
<what output/information you need from them>
```

Then stop that part of the workflow and wait for the user.

---

# 8. Never Hide AWS Requirements

If implementation requires a new AWS resource, explicitly notify the user.

For example:

```text
AWS ACTION REQUIRED

The application now requires an SNS topic for downtime notifications.

I have added the infrastructure definition, but deployment must be performed by you.

Run:

sam deploy

After deployment, send me the Outputs section.
```

Do not simply continue as though deployment happened.

---

# 9. AWS Cost Awareness

The project is intended to operate within AWS Free Tier/low-cost usage where practical.

Do not introduce AWS services unnecessarily.

Before adding an AWS service:

1. Explain why it is needed.
2. Prefer serverless managed services.
3. Avoid unnecessary always-on infrastructure.
4. Avoid NAT gateways unless absolutely required.
5. Avoid EC2.
6. Avoid RDS unless absolutely required.
7. Avoid ECS unless absolutely required.
8. Avoid unnecessary S3 usage.
9. Keep Lambda memory and timeout reasonable.
10. Avoid creating one EventBridge schedule per monitor.
11. Avoid architectures that generate excessive DynamoDB scans or requests.

Do not claim that the project is "free" unless current AWS pricing has been verified.

---

# 10. Complete Backend API

Implement the complete monitor API.

Required endpoints:

```text
POST   /monitors
GET    /monitors
GET    /monitors/{monitorId}
PATCH  /monitors/{monitorId}
DELETE /monitors/{monitorId}
```

Optional useful endpoint:

```text
POST /monitors/{monitorId}/check
```

This can be used for manually triggering a check from the dashboard.

---

# 11. POST /monitors

The endpoint should support:

```json
{
  "name": "My Website",
  "url": "https://example.com",
  "method": "GET",
  "interval": 5,
  "timeout": 10
}
```

Validate:

* name
* URL
* HTTP method
* interval
* timeout

Supported intervals:

```text
1
5
10
15
30
60
```

Supported methods:

```text
GET
HEAD
```

Supported timeouts:

```text
5
10
15
30
```

Return appropriate HTTP status codes.

---

# 12. SSRF Protection

This is a mandatory security requirement.

The application accepts arbitrary URLs from users.

Prevent monitoring of:

```text
localhost
127.0.0.1
0.0.0.0
::1
private IPv4 ranges
private IPv6 ranges
link-local addresses
cloud metadata addresses
internal hostnames
```

Prevent DNS rebinding where reasonably possible.

Validate the hostname and resolve it before performing the request.

Do not allow redirects to bypass SSRF protection.

The HTTP checker must either:

1. Disable redirects, or
2. Validate every redirect destination before following it.

Do not weaken SSRF protection for convenience.

---

# 13. Monitor Worker

The worker should:

1. Find enabled monitors that are due.
2. Validate the URL.
3. Perform the HTTP request.
4. Measure response time.
5. Determine UP/DOWN.
6. Record the HTTP status.
7. Record errors.
8. Save the check result.
9. Update the monitor status.
10. Calculate the next check time.
11. Handle failures without terminating the entire batch.

One failed monitor must not prevent other monitors from being checked.

---

# 14. Worker Scheduling

Do not create one EventBridge schedule per monitor.

Use the existing central scheduled worker architecture.

The worker should determine which monitors are due.

Current initial implementation uses:

```text
EventBridge
    ↓
every minute
    ↓
Monitor Worker
    ↓
find due monitors
```

Keep this approach unless there is a strong scalability reason to change it.

If changing the scheduling architecture, explain the reason first.

---

# 15. Scheduling Accuracy

Review the current `nextCheckAt` implementation.

Avoid unnecessary schedule drift.

The intended behavior is:

```text
Monitor interval = 5 minutes

14:00 check
14:05 check
14:10 check
14:15 check
```

rather than:

```text
14:00 check
14:05:32 check
14:10:51 check
14:16:07 check
```

Where practical, calculate the next scheduled check based on the previous scheduled time.

Handle delayed workers safely.

Do not create duplicate checks when possible.

---

# 16. Check Result Storage

Store each check independently.

Check results should contain:

```text
checkId
monitorId
status
httpStatus
responseTime
error
checkedAt
```

Use the existing:

```text
MonitorHistoryIndex
```

to retrieve a monitor's history efficiently.

Do not store unlimited check results inside the monitor record.

---

# 17. Monitor History API

Implement:

```text
GET /monitors/{monitorId}/checks
```

Support:

* pagination
* configurable limit
* newest-first ordering
* safe maximum page size

Example:

```text
GET /monitors/mon_123/checks?limit=50
```

Response:

```json
{
  "items": [],
  "nextToken": null
}
```

Use DynamoDB pagination rather than loading the entire history.

---

# 18. Monitor Statistics

Implement backend calculations for:

* current status
* total checks
* successful checks
* failed checks
* uptime percentage
* average response time
* fastest response
* slowest response
* total downtime events
* latest check
* previous check

Prefer server-side calculations where appropriate.

Avoid loading enormous histories into Lambda memory.

---

# 19. Uptime Calculation

At minimum support:

```text
24 hours
7 days
30 days
```

The frontend should eventually allow users to select the period.

Uptime should be calculated consistently.

For example:

```text
uptime =
successful checks / total checks × 100
```

Document the exact calculation.

Do not mix incompatible definitions of uptime across different dashboard components.

---

# 20. Incident Detection

Implement incident detection.

An incident starts when a monitor transitions:

```text
UP → DOWN
```

An incident ends when:

```text
DOWN → UP
```

The system should track:

* incident ID
* monitor ID
* startedAt
* resolvedAt
* duration
* status
* cause/error
* HTTP status where available

Do not create a new incident for every failed check during one continuous outage.

For example:

```text
10:00 DOWN
10:01 DOWN
10:02 DOWN
10:03 DOWN
10:04 UP
```

This is:

```text
ONE incident
```

not four incidents.

---

# 21. Downtime and Recovery Notifications

Implement notification support.

Preferred architecture:

```text
Monitor Worker
      ↓
detect status transition
      ↓
SNS
      ↓
notification
```

Notify when:

```text
UP → DOWN
DOWN → UP
```

Do not send an alert on every failed check during an existing incident.

Support notification configuration at the monitor level where practical.

Possible future structure:

```text
notifications:
  enabled
  email
```

Do not expose secrets in source code.

---

# 22. SNS Email Subscription

If SNS email notifications require confirmation:

1. Create the SNS infrastructure.
2. Configure the subscription.
3. Deploy the infrastructure.
4. Notify the user that AWS will send a confirmation email.
5. Tell the user to confirm the subscription.
6. Do not assume confirmation occurred.

Example notification:

```text
AWS ACTION REQUIRED

The SNS notification system has been implemented.

After deployment, AWS will send a subscription confirmation email.

Please confirm the subscription before testing email alerts.

Do not continue assuming email notifications are active until confirmation is completed.
```

---

# 23. Authentication

Implement user authentication before treating the dashboard as production-ready.

Use a suitable serverless authentication approach.

Do not invent credentials or hardcode users.

The final architecture should support:

```text
User
 ↓
Authentication
 ↓
API
 ↓
User-owned monitors
```

Every monitor should belong to a user.

Introduce an owner/user identifier into the monitor model.

For example:

```text
userId
```

Then enforce ownership at the repository/API level.

A user must never be able to retrieve, modify, or delete another user's monitor simply by changing a monitor ID.

---

# 24. Authentication Architecture

Before implementing authentication:

1. Inspect the existing frontend.
2. Inspect whether authentication was already started.
3. Choose the least complex appropriate solution.
4. Keep authentication compatible with API Gateway/Lambda.
5. Do not expose JWT secrets in the frontend.
6. Do not hardcode credentials.

If adding Cognito or another AWS authentication service requires manual AWS configuration, create the infrastructure code and then notify the user of the required AWS action.

---

# 25. Authorization

All protected monitor endpoints must verify ownership.

Required:

```text
POST /monitors
GET /monitors
GET /monitors/{id}
PATCH /monitors/{id}
DELETE /monitors/{id}
GET /monitors/{id}/checks
```

The backend must determine the authenticated user from the authentication context.

Never trust:

```json
{
  "userId": "..."
}
```

from the client as the authorization source.

---

# 26. Frontend

Build a polished SaaS dashboard using the existing Nuxt/Vue/Tailwind setup.

The frontend should be:

* responsive
* mobile friendly
* accessible
* fast
* clean
* professional
* visually distinctive
* consistent

Avoid generic AI-generated dashboard styling.

Do not use excessive gradients, random glassmorphism, or unnecessary animations.

---

# 27. Frontend Pages

Implement at minimum:

```text
/
 /login
 /register
 /dashboard
 /monitors
 /monitors/new
 /monitors/[id]
 /settings
```

Adapt this structure if the existing frontend already uses another organization.

---

# 28. Dashboard

The main dashboard should show:

### Overview cards

```text
Total Monitors
Up
Down
Paused
Overall Uptime
```

### Monitor overview

Show:

* monitor name
* URL
* current status
* uptime
* response time
* interval
* last checked
* next check

### Visual status

Use clear status indicators:

```text
UP
DOWN
PAUSED
UNKNOWN
```

Do not rely solely on color.

---

# 29. Monitor List

The monitor list should support:

* search
* status filtering
* sorting
* pagination where necessary
* create monitor
* edit
* delete
* enable/disable
* manual check

Each row/card should show:

```text
Name
URL
Status
Uptime
Response time
Last check
Actions
```

---

# 30. Create Monitor UI

Create a polished form containing:

```text
Monitor name
URL
HTTP method
Check interval
Timeout
Notifications
```

Provide validation.

Do not use browser `alert()` for normal UI feedback.

Use:

* inline validation
* toast notifications
* loading states
* disabled submit buttons during requests

---

# 31. Monitor Details Page

Show:

```text
Monitor name
URL
Current status
Uptime
Response time
Interval
Timeout
Last checked
Next check
```

Include a response-time chart.

Include an uptime chart.

Include check history.

Include incident history.

Allow:

```text
Edit
Pause
Resume
Delete
Check now
```

---

# 32. Check History UI

Display:

```text
Time
Status
HTTP status
Response time
Error
```

Use pagination.

Do not fetch thousands of records unnecessarily.

---

# 33. Incident Timeline UI

Display incidents in a timeline.

Example:

```text
Today
09:41 DOWN
     Connection timeout
     Duration: 3m 21s

09:44 RECOVERED
```

The interface should make outages easy to understand.

---

# 34. Charts

Use an appropriate Vue-compatible chart library if needed.

Charts should display:

### Response time

```text
time → response time
```

### Uptime

```text
period → uptime percentage
```

Do not load huge datasets solely for chart rendering.

Aggregate data where appropriate.

---

# 35. API Client

Centralize frontend API calls.

Do not scatter raw `$fetch` calls throughout components.

Use a clean API layer such as:

```text
frontend/
└── composables/
    └── useApi.ts
```

or another appropriate architecture.

Centralize:

* authentication headers
* error handling
* API base URL
* request behavior

---

# 36. Environment Configuration

Do not hardcode:

```text
API URLs
AWS resource names
Secrets
tokens
```

Use environment variables.

For Nuxt, use appropriate runtime configuration.

Example concept:

```text
NUXT_PUBLIC_API_BASE
```

Do not expose private secrets through `public` runtime configuration.

---

# 37. Error Handling

Backend errors must return consistent JSON.

Example:

```json
{
  "error": "Monitor not found"
}
```

Frontend should display useful messages.

Do not expose:

* stack traces
* AWS credentials
* internal infrastructure details
* sensitive environment values

to users.

---

# 38. Loading States

Every asynchronous operation should have a clear loading state.

Examples:

```text
Creating monitor...
Checking...
Loading history...
Deleting...
Saving...
```

Prevent duplicate submissions.

---

# 39. Delete Confirmation

Deleting a monitor is destructive.

Require a confirmation UI.

Do not immediately delete from a single accidental click.

---

# 40. Pause and Resume

Implement monitor enable/disable.

When disabled:

```text
enabled = false
status = UNKNOWN or PAUSED
```

The worker must skip disabled monitors.

Resuming should correctly calculate the next check time.

---

# 41. Manual Check

Implement:

```text
POST /monitors/{id}/check
```

where appropriate.

The manual check should:

* validate ownership
* validate URL
* perform the check
* store the result
* update monitor status
* return the result

Do not allow manual checks to bypass SSRF protection.

---

# 42. Security Requirements

Apply:

* strict input validation
* SSRF protection
* authentication
* authorization
* least privilege IAM
* safe CORS
* rate limiting where appropriate
* no secrets in Git
* safe error responses
* safe URL handling
* pagination
* bounded request sizes

Do not use:

```text
Access-Control-Allow-Origin: *
```

in the final authenticated production API unless there is a deliberate reason.

Configure CORS correctly for the frontend domain.

---

# 43. CORS

During local development, support the local frontend origin.

For production, configure an explicit allowed origin.

Do not blindly use:

```text
*
```

for authenticated APIs.

If the production domain is not yet known, make the allowed origin configurable through infrastructure/environment configuration.

---

# 44. Rate Limiting

Protect expensive endpoints.

Especially:

```text
POST /monitors
POST /monitors/{id}/check
```

Avoid allowing a user to trigger unlimited manual checks.

A simple serverless-compatible approach is acceptable.

Do not introduce Redis merely for rate limiting unless there is a strong reason.

---

# 45. Observability

Add useful CloudWatch logging.

Worker logs should include:

```text
monitorId
status
HTTP status
response time
errors
```

Do not log:

* secrets
* authentication tokens
* sensitive user information

Use structured logging where practical.

---

# 46. Tests

Add tests for important backend behavior.

At minimum test:

### Monitor creation

* valid monitor
* missing name
* invalid URL
* invalid method
* invalid interval
* invalid timeout

### SSRF protection

Test:

```text
localhost
127.0.0.1
10.x.x.x
172.16.x.x
192.168.x.x
169.254.x.x
::1
```

### HTTP checker

Test:

* successful response
* HTTP 4xx
* HTTP 5xx
* timeout
* network failure

### Worker

Test:

* due monitor
* disabled monitor
* successful check
* failed check
* check result creation
* monitor status update

### Authorization

Test:

* owner can access monitor
* another user cannot access monitor

---

# 47. TypeScript Standards

Use strict TypeScript.

Avoid:

```ts
any
```

unless there is a justified reason.

Prefer explicit interfaces/types.

Keep functions focused.

Avoid giant handlers.

Business logic should live in services.

DynamoDB operations should live in repositories.

---

# 48. Backend Architecture

Prefer:

```text
handlers
    ↓
services
    ↓
repositories
    ↓
DynamoDB
```

For example:

```text
handler
  ↓
validate request
  ↓
service
  ↓
repository
  ↓
DynamoDB
```

Do not place all application logic directly inside Lambda handlers.

---

# 49. Frontend Architecture

Keep components reusable.

Prefer:

```text
components/
composables/
pages/
layouts/
middleware/
types/
utils/
```

Avoid giant page components.

Extract reusable components.

---

# 50. Documentation

Maintain:

```text
README.md
ARCHITECTURE.md
docs/API.md
docs/DEPLOYMENT.md
docs/AWS.md
```

Documentation should explain:

* architecture
* setup
* local development
* environment variables
* API endpoints
* AWS deployment
* AWS resources
* monitoring worker
* database design
* security
* notification setup
* troubleshooting

Update documentation whenever architecture changes.

---

# 51. AWS Deployment Documentation

Document every manual AWS action.

For example:

```text
1. Run sam build
2. User runs sam deploy
3. User confirms CloudFormation changes
4. User configures SNS email confirmation
5. User configures production frontend URL
```

Clearly distinguish:

```text
AGENT ACTION
```

from:

```text
USER AWS ACTION
```

---

# 52. AWS Notification Protocol

Whenever the user needs to perform an AWS action, stop and provide:

```text
========================================
AWS ACTION REQUIRED
========================================

What:
...

Why:
...

Command:
...

Expected result:
...

After completing it:
...
========================================
```

Do not continue assuming success.

---

# 53. Git

Use meaningful commits.

Examples:

```text
feat: add monitor CRUD endpoints
feat: add monitor history API
feat: add incident detection
feat: add uptime statistics
feat: add notification service
feat: add authentication
feat: build monitor dashboard
fix: prevent private network monitoring
test: add monitor worker tests
docs: update deployment guide
```

Do not create meaningless commits such as:

```text
update
changes
stuff
final
```

---

# 54. Development Workflow

For each major feature:

```text
1. Inspect existing implementation
2. Plan
3. Implement backend
4. Typecheck
5. Test
6. Implement frontend
7. Test
8. Build
9. Review security
10. Update documentation
11. Commit
12. Continue
```

Do not build everything first and test only at the end.

---

# 55. Build Validation

Backend:

```powershell
cd backend
npm run typecheck
npm run build
```

Infrastructure:

```powershell
cd infrastructure
sam build
```

Frontend:

Use the project's actual package scripts, for example:

```powershell
npm run typecheck
npm run build
```

if available.

Run all relevant checks before declaring a feature complete.

---

# 56. Existing AWS Resources

Do not delete existing resources simply because the architecture is being improved.

Before changing:

```text
MonitorsTable
CheckResultsTable
CreateMonitorFunction
MonitorWorkerFunction
```

understand the existing CloudFormation/SAM state.

Prefer migrations over destructive replacement.

---

# 57. DynamoDB Design

Current tables:

```text
MonitorsTable
    PK: monitorId

CheckResultsTable
    PK: checkId

MonitorHistoryIndex
    PK: monitorId
    SK: checkedAt
```

Preserve this design unless there is a demonstrated reason to change it.

If introducing:

```text
userId
```

for authentication, evaluate whether a new index is required for efficient user-owned monitor queries.

Do not perform table redesign without documenting the migration impact.

---

# 58. Scalability

The project should initially support a reasonable small SaaS workload.

Avoid premature complexity.

However, design the code so the architecture can later support:

```text
hundreds/thousands of monitors
```

without rewriting the entire application.

If the current DynamoDB scan becomes a clear bottleneck, introduce an appropriate indexing/scheduling strategy.

Document the reason.

---

# 59. Worker Concurrency

Do not allow a large number of monitors to cause uncontrolled concurrent HTTP requests.

Consider:

* bounded concurrency
* Lambda timeout
* per-monitor timeout
* batch processing

The worker must remain reliable when multiple monitors are due simultaneously.

---

# 60. HTTP Monitoring Semantics

Default behavior:

```text
2xx and 3xx:
UP
```

or define the chosen behavior explicitly and use it consistently.

Do not automatically classify every non-200 response as an infrastructure failure without documenting the rule.

For example:

```text
200 → UP
301 → UP
302 → UP
404 → DOWN
500 → DOWN
timeout → DOWN
DNS failure → DOWN
```

Use the project's final documented rule consistently.

---

# 61. Incident Rules

A single failed request should create an incident only when the monitor transitions from UP/UNKNOWN into DOWN according to the chosen incident policy.

Avoid noisy notifications.

A practical initial policy:

```text
UP → DOWN
    create incident + notification

DOWN → DOWN
    update existing incident only

DOWN → UP
    resolve incident + recovery notification

UP → UP
    normal check
```

---

# 62. Dashboard Status

The dashboard should never display stale status without context.

Show:

```text
Current status
Last checked
```

If a monitor has never been checked:

```text
UNKNOWN
Never checked
```

---

# 63. Empty States

Design useful empty states.

Examples:

```text
No monitors yet

Create your first monitor to start tracking uptime.
```

For history:

```text
No check history yet.
```

For incidents:

```text
No incidents recorded.
Your services are looking good.
```

---

# 64. Responsive Design

Test at:

```text
mobile
tablet
desktop
large desktop
```

Do not build desktop-only dashboards.

Tables should have an appropriate mobile representation.

---

# 65. Accessibility

Include:

* semantic HTML
* keyboard navigation
* visible focus states
* labels
* accessible buttons
* sufficient contrast
* status text in addition to colors
* appropriate ARIA attributes where necessary

---

# 66. UI Design Direction

The visual identity should communicate:

```text
reliability
monitoring
infrastructure
clarity
professional SaaS
```

Avoid making it look like an admin template.

Use a strong typography system.

Use subtle animation only where it improves UX.

Use consistent spacing, cards, borders, status indicators and charts.

---

# 67. Mobile Navigation

Provide an appropriate mobile navigation experience.

Do not allow the desktop sidebar to simply overflow on small screens.

---

# 68. Notifications UX

Allow the user to configure notification preferences where implemented.

Clearly show:

```text
Notifications enabled
Notifications disabled
```

Do not imply that notifications are active until the backend configuration is actually complete.

---

# 69. Environment Files

Create appropriate examples such as:

```text
.env.example
```

Never commit:

```text
.env
```

or secrets.

Document every required variable.

---

# 70. Final Security Review

Before declaring the project complete, perform a security review covering:

```text
Authentication
Authorization
SSRF
CORS
Input validation
DynamoDB permissions
IAM permissions
Secrets
Error handling
Rate limiting
URL redirects
CloudWatch logs
Frontend environment variables
```

Fix discovered issues.

---

# 71. Final End-to-End Test

The final system must be tested as a complete flow:

```text
User registers
      ↓
User logs in
      ↓
Dashboard loads
      ↓
User creates monitor
      ↓
Monitor saved
      ↓
Worker detects due monitor
      ↓
Website checked
      ↓
Check result stored
      ↓
Monitor status updated
      ↓
Dashboard displays status
      ↓
History appears
      ↓
Statistics update
      ↓
Website failure simulated
      ↓
DOWN detected
      ↓
Incident created
      ↓
Notification sent
      ↓
Website recovers
      ↓
UP detected
      ↓
Incident resolved
      ↓
Recovery notification sent
```

---

# 72. Production Readiness Checklist

Before declaring completion, verify:

```text
[ ] Monitor CRUD works
[ ] Monitor validation works
[ ] SSRF protection works
[ ] Worker works
[ ] EventBridge trigger works
[ ] Check results work
[ ] History API works
[ ] Uptime statistics work
[ ] Incident detection works
[ ] Recovery detection works
[ ] Notifications work
[ ] Authentication works
[ ] Authorization works
[ ] Dashboard works
[ ] Monitor details work
[ ] Charts work
[ ] Mobile UI works
[ ] Error states work
[ ] Loading states work
[ ] Tests pass
[ ] TypeScript passes
[ ] SAM build passes
[ ] Frontend build passes
[ ] Documentation is updated
[ ] No secrets are committed
[ ] IAM permissions are least privilege
[ ] AWS manual actions are documented
[ ] Git history is clean
```

---

# 73. Agent Completion Rules

Do not say:

```text
Project completed
```

until the checklist above has been addressed.

If an AWS action is required before you can continue, stop and notify the user.

If an AWS action is optional, explain that it is optional rather than blocking the implementation.

If a feature cannot be safely implemented without user input, explain exactly what decision is required.

Do not silently make major architecture decisions that materially affect:

* AWS cost
* security
* authentication
* data migration
* production deployment
* user privacy

---

# 74. Final Deliverables

At completion, the repository should contain:

```text
serverless-uptime-monitor/
├── backend/
├── frontend/
├── infrastructure/
├── docs/
│   ├── API.md
│   ├── AWS.md
│   └── DEPLOYMENT.md
├── ARCHITECTURE.md
├── AGENT_INSTRUCTIONS.md
├── README.md
├── package.json
└── .gitignore
```

The application should be a complete working serverless uptime monitoring SaaS MVP.

---

# 75. Start Here

Do not immediately start rewriting code.

First:

1. Inspect the repository.
2. Inspect the current Phase 1 and Phase 2 implementation.
3. Run the current backend typecheck.
4. Run the current SAM build.
5. Inspect the frontend state.
6. Determine exactly which features are already complete.
7. Create an implementation plan based on the actual repository.
8. Begin with the remaining backend API and data-layer functionality.
9. Test each major feature.
10. Build the frontend after the API contracts are stable.
11. Implement authentication and authorization before production deployment.
12. Complete notifications and incidents.
13. Perform the final security and end-to-end review.
14. Notify the user whenever an AWS action is required.

**Do not ask the user to repeat information already present in the repository or this instruction file.**

**Do not stop merely because an AWS deployment is needed. Prepare all required code/configuration first, then clearly notify the user that they need to perform the AWS action.**

**Never claim that an AWS deployment, subscription confirmation, DNS change, credential configuration, or console action was completed unless the user explicitly confirms it or the available tooling provides verified evidence.**
