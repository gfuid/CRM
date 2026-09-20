const { connectDB, disconnectDB } = require('../config/db');
const { seedMongoDB } = require('../config/seed');

const run = async () => {
  console.log('🚀 Running MongoDB manual seeder...');
  const connected = await connectDB();
  if (!connected) {
    console.error('❌ Could not connect to MongoDB. Aborting seed.');
    process.exit(1);
  }

  await seedMongoDB();
  await disconnectDB();
  console.log('✨ Seed script completed.');
  process.exit(0);
};

run();
