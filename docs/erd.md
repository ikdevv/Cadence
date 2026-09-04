# Entity relationship diagram

Generated from `apps/api/prisma/*.prisma`. Two relationships carry the design and
are annotated below the diagram.

```mermaid
erDiagram
    User ||--o{ RefreshToken : "has sessions"
    User ||--o{ Invitation : "invited by"
    User ||--o{ Report : "owns"
    User ||--o{ ReviewAction : "reviewed"
    Project ||--o{ Report : "categorises"
    Report ||--o{ ReportVersion : "has versions"
    Report |o--|| ReportVersion : "currentVersionId"
    Report ||--o{ ReviewAction : "has reviews"
    ReportVersion ||--o{ Task : ""
    ReportVersion ||--o{ Blocker : ""
    ReportVersion ||--o{ Achievement : ""
    ReportVersion ||--o{ HoursEntry : ""
    ReportVersion ||--o{ ReviewAction : "commented against"

    User {
        string id PK
        string email UK
        string passwordHash
        string name
        enum role "MEMBER|MANAGER|ADMIN"
        boolean isActive
    }
    RefreshToken {
        string id PK
        string userId FK
        string tokenHash
        datetime expiresAt
        datetime revokedAt "null while valid"
    }
    Invitation {
        string id PK
        string email
        enum role
        string tokenHash UK
        enum status "PENDING|ACCEPTED|EXPIRED|CANCELLED"
        datetime expiresAt
        string invitedById FK
    }
    Project {
        string id PK
        string name UK
        string code UK
        string color
        boolean isActive "soft delete"
    }
    Report {
        string id PK
        string userId FK
        string projectId FK
        date weekStart "Monday; unique with userId"
        enum status "DRAFT|SUBMITTED|NEEDS_CORRECTION|APPROVED"
        string currentVersionId FK "version under review / approved / being edited"
    }
    ReportVersion {
        string id PK
        string reportId FK
        int versionNumber "unique with reportId"
        datetime submittedAt "null = the editable version"
        string notes
        string links
        string nextWeekPlan
    }
    Task {
        string id PK
        string versionId FK
        string name
        enum priority
        enum status
        int plannedPct
        int actualPct
        decimal hoursPlanned
        decimal hoursSpent
        string deliverable
    }
    Blocker {
        string id PK
        string versionId FK
        string description
        boolean isKeyIssue
    }
    Achievement {
        string id PK
        string versionId FK
        string description
        boolean isKeyHighlight
    }
    HoursEntry {
        string id PK
        string versionId FK
        enum taskType "unique with versionId"
        decimal hours
    }
    ReviewAction {
        string id PK
        string reportId FK
        string versionId FK "which version the comment was made against"
        string reviewerId FK
        enum action "APPROVE|REQUEST_CHANGES"
        string comment
        datetime createdAt
    }
```

## The two annotations that matter

**`Report.currentVersionId`** points at the version under review, approved, or
being edited. It is denormalized deliberately and kept correct inside the same
transaction as every status change, so analytics joins
`Report → currentVersion → children` directly instead of running a correlated
subquery for "the latest submitted version".

**`ReviewAction.versionId`** records which version a comment was made against.
Because the row is written in the same transaction that clones v(n) into v(n+1),
"which version was this comment about" is a column rather than a heuristic — and
the same append-only table gives the full comment history for free.

## Regenerating

The diagram above is maintained by hand against the schema. To generate one
instead:

```bash
pnpm --filter cadence-api add -D prisma-erd-generator @mermaid-js/mermaid-cli
# add a generator block to apps/api/prisma/schema.prisma, then:
pnpm --filter cadence-api exec prisma generate
```
