require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const SEED_TAG = 'day13-ranking-seed';
const SEED_AUTHOR_EMAIL = 'ranking-seed@example.com';

async function getOrCreateSeedAuthor(users) {
  const existing = await users.findOne({ email: SEED_AUTHOR_EMAIL });
  if (existing) return existing;

  const passwordHash = await bcrypt.hash('SeedPassword123', 10);
  const result = await users.insertOne({
    name: 'Ranking Seed Author',
    email: SEED_AUTHOR_EMAIL,
    passwordHash,
    role: 'user',
    headline: '',
    bio: '',
    avatarUrl: '',
    skills: [],
    experiences: [],
    education: [],
    portfolioProjects: [],
    links: { portfolio: '', github: '', linkedin: '', facebook: '' },
    refreshTokenHash: null,
    refreshTokenExpiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { _id: result.insertedId, email: SEED_AUTHOR_EMAIL };
}

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const users = db.collection('users');
  const posts = db.collection('posts');

  const author = await getOrCreateSeedAuthor(users);
  await posts.deleteMany({ seedTag: SEED_TAG });

  const now = new Date();
  const hoursAgo = (h) => new Date(now.getTime() - h * 60 * 60 * 1000);

  const basePost = {
    authorId: author._id,
    body: 'Seed data for Day 13 ranked feed verification.',
    imageUrl: '',
    deletedAt: null,
    seedTag: SEED_TAG,
  };

  const docs = [
    { ...basePost, title: '[Seed] High engagement, fresh', likeCount: 50, commentCount: 30, createdAt: hoursAgo(1), updatedAt: hoursAgo(1) },
    { ...basePost, title: '[Seed] Zero engagement, fresh', likeCount: 0, commentCount: 0, createdAt: hoursAgo(1), updatedAt: hoursAgo(1) },
    { ...basePost, title: '[Seed] Old but engaged (expected negative rankScore)', likeCount: 10, commentCount: 5, createdAt: hoursAgo(24 * 30), updatedAt: hoursAgo(24 * 30) },
    { ...basePost, title: '[Seed] Tie A (identical stats to Tie B)', likeCount: 5, commentCount: 5, createdAt: hoursAgo(5), updatedAt: hoursAgo(5) },
    { ...basePost, title: '[Seed] Tie B (identical stats to Tie A)', likeCount: 5, commentCount: 5, createdAt: hoursAgo(5), updatedAt: hoursAgo(5) },
    { ...basePost, title: '[Seed] Most discussed outlier', likeCount: 1, commentCount: 100, createdAt: hoursAgo(10), updatedAt: hoursAgo(10) },
    { ...basePost, title: '[Seed] Soft-deleted, must never appear', likeCount: 999, commentCount: 999, deletedAt: hoursAgo(1), createdAt: hoursAgo(1), updatedAt: hoursAgo(1) },
  ];

  await posts.insertMany(docs);

  console.log(`Seeded ${docs.length} posts under author ${author.email} (${author._id}).`);
  console.log('GET /posts?sort=ranked -> High engagement, fresh should be #1; Old but engaged should have a negative rankScore.');
  console.log('GET /posts?sort=discussed -> Most discussed outlier should be #1.');
  console.log('GET /posts?sort=latest -> Zero engagement, fresh and High engagement, fresh should be the two newest.');
  console.log('Soft-deleted seed post must never appear in any of the above.');

  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});