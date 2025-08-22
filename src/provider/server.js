import express from 'express';

const app = express();
app.use(express.json());

// tiny in-memory “db”
const USERS = {
  123: { id: 123, name: 'Ada Lovelace', email: 'ada@example.com', active: true }
};

// contract routes
app.get('/users/:id', (req, res) => {
  const user = USERS[req.params.id];
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.set('Content-Type', 'application/json; charset=utf-8');
  res.json(user);
});

// health
app.get('/health', (_req, res) => res.status(200).send('ok'));

// start
const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT) || 9010;
app.listen(PORT, HOST, () => {
  console.log(`Fake provider listening on http://${HOST}:${PORT}`);
});
