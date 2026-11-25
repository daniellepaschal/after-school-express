require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'afterschool';

let db;

app.use(cors());
app.use(express.json());

// Logger middleware: prints every request to the console
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start} ms)`
    );
  });
  next();
});

// Static middleware: serves lesson images, or an error if the file is missing
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/images', (req, res) => {
  res.status(404).json({ error: `Image not found: ${req.path}` });
});

app.get('/', (req, res) => {
  res.json({ message: 'After School Club API is running. Try GET /lessons' });
});

// Connect to Atlas first, then start listening
async function start() {
  if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI. Create a .env file (see .env.example).');
    process.exit(1);
  }
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log(`Connected to MongoDB Atlas, database "${DB_NAME}"`);
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});