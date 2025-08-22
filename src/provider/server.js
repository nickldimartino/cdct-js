import express from 'express';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health
app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

// Minimal fake data
app.get('/users/:id', (req, res) => {
  const { id } = req.params;
  if (id === '123') {
    return res.status(200).json({
      id: 123,
      name: 'Jane Doe',
      email: 'jane.doe@example.com',
      active: true
    });
  }
  return res.status(404).json({ error: 'Not found' });
});

const port = Number(process.env.PORT || 9010);
const host = process.env.HOST || '127.0.0.1';

app.listen(port, host, () => {
  console.log(`Fake provider listening on http://${host}:${port}`);
});
