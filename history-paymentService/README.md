# History Payment Service

Simple GraphQL microservice to store payment history entries using Prisma + MySQL.

Environment:
- `DATABASE_URL` must point to the MySQL database (same DB used by other services).

Quick start:

```bash
cd history-paymentService
npm install
npx prisma generate
npm run start
```
