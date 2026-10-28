# AWS deployment reference

This repository is structured for a typical AWS production layout:

## Recommended architecture

```text
Internet → ALB → ECS Service (web)
                 ECS Service (worker)
                 RDS PostgreSQL
                 ElastiCache Redis
```

## Components

| Service | Role |
| --- | --- |
| **Amazon ECS (Fargate)** | Run `apps/web` and `apps/worker` as separate services |
| **Amazon RDS (PostgreSQL)** | Primary datastore (`DATABASE_URL`) |
| **Amazon ElastiCache (Redis)** | Rate limiting, live pub/sub (`REDIS_URL`) |
| **Application Load Balancer** | HTTPS termination for the Next.js app |
| **AWS Secrets Manager** | `NEXTAUTH_SECRET`, DB credentials, webhook URLs |
| **Amazon CloudWatch** | Logs and alarms on worker failures / 5xx rate |

## Environment variables

Set the same variables as `.env.example` on both ECS task definitions. Use Secrets Manager ARNs for sensitive values.

## Migrations

Run Prisma migrate or `db push` from a one-off ECS task or CI job before deploying new app versions:

```bash
npm run db:push
npm run db:seed   # optional, non-production only
```

## Optional enhancements

- **Amazon SNS** or **EventBridge** as alert webhook targets instead of a generic URL
- **AWS WAF** in front of the ALB for additional rate control
- **Route 53** health checks as external corroboration

This folder documents topology only; Terraform/CDK can be added per your org standards.
