require('dotenv').config();

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;

const USERS = [
  { name: 'Alice Rahman', email: 'alice.test@example.com', password: 'AlicePass123' },
  { name: 'Bob Hasan', email: 'bob.test@example.com', password: 'BobPass123' },
  { name: 'Carol Ahmed', email: 'carol.test@example.com', password: 'CarolPass123' },
  { name: 'Dave Islam', email: 'dave.test@example.com', password: 'DavePass123' },
];

async function apiFetch(path, token, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(`${options.method || 'GET'} ${path} failed: ${json.message}`);
  }
  return json.data;
}

async function ensureUser(u) {
  try {
    const data = await apiFetch('/auth/signup', null, {
      method: 'POST',
      body: JSON.stringify({ name: u.name, email: u.email, password: u.password }),
    });
    return { token: data.access_token, id: data.user.id, name: u.name };
  } catch (err) {
    if (!String(err.message).includes('already registered')) throw err;
    const data = await apiFetch('/auth/login', null, {
      method: 'POST',
      body: JSON.stringify({ email: u.email, password: u.password }),
    });
    return { token: data.access_token, id: data.user.id, name: u.name };
  }
}

function createPost(token, title, body) {
  return apiFetch('/posts', token, { method: 'POST', body: JSON.stringify({ title, body }) });
}

function react(token, targetType, targetId, type) {
  return apiFetch('/reactions', token, { method: 'POST', body: JSON.stringify({ targetType, targetId, type }) });
}

function comment(token, postId, body, parentCommentId) {
  const payload = parentCommentId ? { postId, body, parentCommentId } : { postId, body };
  return apiFetch('/comments', token, { method: 'POST', body: JSON.stringify(payload) });
}

async function seed() {
  const [alice, bob, carol, dave] = await Promise.all(USERS.map(ensureUser));
  console.log('Users ready:', [alice, bob, carol, dave].map((u) => u.name).join(', '));

  const post1 = await createPost(
    alice.token,
    'Why I switched from REST to GraphQL',
    'After 3 years of maintaining REST APIs, we moved our main service to GraphQL. Here is what changed for the team and what I would do differently.',
  );
  const post2 = await createPost(
    bob.token,
    'Just deployed my first NestJS microservice 🚀',
    'Took a while to get the Docker setup right but it is finally live. Happy to share the compose file if anyone wants it.',
  );
  const post3 = await createPost(
    carol.token,
    'Tips for writing clean React components',
    'Small components, colocated state, and avoiding prop drilling with context where it actually makes sense. What are your rules of thumb?',
  );
  const post4 = await createPost(
    alice.token,
    'Anyone using Zod with React Hook Form in production?',
    'Curious about performance with large nested schemas. Sharing experiences would help a lot.',
  );

  await react(bob.token, 'post', post1._id, 'like');
  await react(carol.token, 'post', post1._id, 'love');
  await react(dave.token, 'post', post1._id, 'wow');

  await react(alice.token, 'post', post2._id, 'like');
  await react(carol.token, 'post', post2._id, 'care');

  await react(dave.token, 'post', post3._id, 'like');

  const c1 = await comment(bob.token, post1._id, 'This is super helpful, thanks Alice!');
  await comment(carol.token, post1._id, 'Agreed, GraphQL has been great for us too.', c1._id);
  await comment(dave.token, post1._id, 'How do you handle N+1 queries on the resolvers?');
  await react(alice.token, 'comment', c1._id, 'like');

  await comment(carol.token, post2._id, 'Congrats on the deploy! 🎉');

  console.log('\nSeed complete. Test accounts (password same for all users of the given pattern):');
  USERS.forEach((u) => console.log(`  ${u.email} / ${u.password}`));
  console.log('\nPosts created:');
  console.log(`  Top/Most Discussed candidate -> /posts/${post1._id}  (3 reactions, 3 comments incl. 1 reply)`);
  console.log(`  Latest candidate            -> /posts/${post2._id}  (2 reactions, 1 comment)`);
  console.log(`  Low engagement               -> /posts/${post3._id}  (1 reaction, 0 comments)`);
  console.log(`  Zero engagement               -> /posts/${post4._id}  (0 reactions, 0 comments)`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });