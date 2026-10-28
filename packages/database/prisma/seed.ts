import dotenv from "dotenv";
import path from "path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_USER_EMAIL ?? "admin@apipulse.local";
  const password = process.env.SEED_USER_PASSWORD ?? "admin123";
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Admin",
      passwordHash,
    },
  });

  const demo = await prisma.monitor.findFirst({
    where: { userId: user.id, name: "Example HTTPBin" },
  });

  if (!demo) {
    await prisma.monitor.create({
      data: {
        userId: user.id,
        name: "Example HTTPBin",
        url: "https://httpbin.org/status/200",
        method: "GET",
        intervalSec: 30,
        expectedStatus: 200,
        alertRules: {
          create: {
            name: "Down alert",
            consecutiveDown: 2,
            latencyThresholdMs: 5000,
          },
        },
      },
    });
  }

  const demoApis = [
    {
      name: "1. HTTPBin — GET echo",
      method: "GET" as const,
      url: "https://httpbin.org/get?source=api-pulse",
      headers: [{ key: "Accept", value: "application/json", enabled: true }],
      testScript: "assert(response.status === 200, 'status 200');",
    },
    {
      name: "2. HTTPBin — POST JSON",
      method: "POST" as const,
      url: "https://httpbin.org/post",
      headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
      body: '{"title":"API Pulse test"}',
      testScript: "assert(response.status === 200);",
    },
    {
      name: "3. HTTPBin — Status 200",
      method: "GET" as const,
      url: "https://httpbin.org/status/200",
      headers: [],
      testScript: "assert(response.status === 200);",
    },
    {
      name: "4. JSONPlaceholder — Get post",
      method: "GET" as const,
      url: "https://jsonplaceholder.typicode.com/posts/1",
      headers: [{ key: "Accept", value: "application/json", enabled: true }],
      testScript: "assert(response.status === 200);",
    },
    {
      name: "5. JSONPlaceholder — Create post",
      method: "POST" as const,
      url: "https://jsonplaceholder.typicode.com/posts",
      headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
      body: '{"title":"foo","body":"bar","userId":1}',
      testScript: "assert(response.status === 201);",
    },
    {
      name: "6. GitHub — Zen quote",
      method: "GET" as const,
      url: "https://api.github.com/zen",
      headers: [{ key: "Accept", value: "text/plain", enabled: true }],
      testScript: "assert(response.status === 200);",
    },
    {
      name: "7. REST Countries — India",
      method: "GET" as const,
      url: "https://restcountries.com/v3.1/alpha/in",
      headers: [{ key: "Accept", value: "application/json", enabled: true }],
      testScript: "assert(response.status === 200);",
    },
    {
      name: "8. HTTPBin — Bearer token",
      method: "GET" as const,
      url: "https://httpbin.org/bearer",
      headers: [],
      authType: "bearer",
      authConfig: { type: "bearer", token: "api-pulse-demo-token" },
      testScript: "assert(response.status === 200);",
    },
  ];

  let collection = await prisma.apiCollection.findFirst({
    where: { userId: user.id, name: "Live Demo APIs" },
  });
  if (!collection) {
    collection = await prisma.apiCollection.create({
      data: {
        userId: user.id,
        name: "Live Demo APIs",
        description: "Public live endpoints for workspace testing",
      },
    });
    for (let i = 0; i < demoApis.length; i++) {
      const r = demoApis[i];
      await prisma.savedApiRequest.create({
        data: {
          userId: user.id,
          collectionId: collection.id,
          name: r.name,
          method: r.method,
          url: r.url,
          headers: r.headers,
          queryParams: [],
          body: "body" in r ? r.body : null,
          bodyType: "json",
          authType: "authType" in r ? r.authType : "none",
          authConfig: "authConfig" in r ? r.authConfig : {},
          testScript: r.testScript,
          sortOrder: i,
        },
      });
    }
  }

  const hasEnv = await prisma.apiEnvironment.findFirst({
    where: { userId: user.id, name: "Demo" },
  });
  if (!hasEnv) {
    await prisma.apiEnvironment.create({
      data: {
        userId: user.id,
        name: "Demo",
        isActive: true,
        variables: {
          baseUrl: "https://httpbin.org",
          postId: "1",
        },
      },
    });
  }

  console.log(`Seeded user: ${email}`);
  console.log(`Workspace collection: Live Demo APIs (${demoApis.length} requests)`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
