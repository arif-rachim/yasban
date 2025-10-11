import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const servers = await prisma.server.findMany({
    select: { id: true, name: true, status: true }
  });

  console.log('\n📋 Available servers:\n');
  servers.forEach(s => {
    console.log(`  ${s.id}`);
    console.log(`  Name: ${s.name}`);
    console.log(`  Status: ${s.status}`);
    console.log('');
  });

  if (servers.length > 0) {
    console.log('💡 To run MCP runtime in dev mode, use:');
    console.log(`   npm run dev:mcp -- --server ${servers[0].id} --transport sse\n`);
  } else {
    console.log('⚠️  No servers found. Create a server first in the GUI.\n');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
