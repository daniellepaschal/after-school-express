const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start} ms)`
    );
  });
  next();
});

app.get('/', (req, res) => {
  res.json({ message: 'After School Club API is running. Try GET /lessons' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});