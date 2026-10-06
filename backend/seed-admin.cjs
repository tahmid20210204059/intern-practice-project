require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

async function seedAdmin() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env before running this script.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const existing = await mongoose.connection.db.collection('users').findOne({ email: adminEmail });
  if (existing) {
    console.log('Admin already exists:', adminEmail);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await mongoose.connection.db.collection('users').insertOne({
    name: 'Admin',
    email: adminEmail,
    passwordHash,
    role: 'admin',
    skills: [],
    experiences: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log('Admin created successfully for:', adminEmail);
  process.exit(0);
}

seedAdmin();