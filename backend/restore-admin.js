require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  await mongoose.connection.db.collection('users').updateOne(
    { email: 'ibteshum.khaled123@gmail.com' },
    { $set: { role: 'admin' } }
  );
  console.log('Admin restored for Tahmid');
  process.exit(0);
});