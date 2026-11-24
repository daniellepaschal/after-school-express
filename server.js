const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});