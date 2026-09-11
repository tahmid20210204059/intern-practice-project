require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const users = await mongoose.connection.db.collection('users').find({}).toArray();
  console.log('Total users:', users.length);
  users.forEach(u => console.log('-', u.email));
  process.exit(0);
});