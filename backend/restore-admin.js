require('dotenv').config();
const mongoose = require('mongoose');

const email = process.env.RESTORE_ADMIN_EMAIL;
if (!email) {
  console.error('RESTORE_ADMIN_EMAIL must be set in .env before running this script.');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const result = await mongoose.connection.db.collection('users').updateOne({ email }, { $set: { role: 'admin' } });
  console.log(result.matchedCount ? 'Admin role restored.' : 'No user found for RESTORE_ADMIN_EMAIL.');
  process.exit(0);
});