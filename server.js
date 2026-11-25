const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'afterschool';

let db;

const isValidId = (id) => ObjectId.isValid(id) && String(id).length === 24;

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

// GET /lessons: returns all lessons as JSON
app.get('/lessons', async (req, res) => {
  try {
    const lessons = await db.collection('lesson').find({}).toArray();
    res.json(lessons);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch lessons' });
  }
});

// POST /orders: saves a new order in the "order" collection
app.post('/orders', async (req, res) => {
  try {
    const { name, phone, items } = req.body;

    if (!/^[A-Za-z\s]+$/.test(name || '') || !/^[0-9]+$/.test(phone || '')) {
      return res.status(400).json({ error: 'Name must be letters only and phone must be numbers only' });
    }
    if (!Array.isArray(items) || items.length === 0 ||
        !items.every(i => isValidId(i.lessonId) && Number(i.spaces) > 0)) {
      return res.status(400).json({ error: 'Order needs at least one valid lesson item' });
    }

    const orderItems = items.map(i => ({
      lessonId: new ObjectId(i.lessonId),
      spaces: Number(i.spaces)
    }));

    const order = {
      name: name.trim(),
      phone: phone,
      lessonIDs: orderItems.map(i => i.lessonId),
      spaces: orderItems.reduce((sum, i) => sum + i.spaces, 0),
      items: orderItems,
      createdAt: new Date()
    };

    const result = await db.collection('order').insertOne(order);
    res.status(201).json({ message: 'Order saved', orderId: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not save order' });
  }
});

// PUT /lessons/:id: updates ANY attribute(s) of a lesson
app.put('/lessons/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid lesson id' });
    }

    const updates = { ...req.body };
    delete updates._id;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const result = await db
      .collection('lesson')
      .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updates });

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    res.json({ message: 'Lesson updated', modifiedCount: result.modifiedCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update lesson' });
  }
});

// GET /search?q=...: lessons where topic, location, price or space contains q
app.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();

    if (!q) {
      const all = await db.collection('lesson').find({}).toArray();
      return res.json(all);
    }

    const regex = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const filter = {
      $or: [
        { topic: { $regex: regex, $options: 'i' } },
        { location: { $regex: regex, $options: 'i' } },
        { $expr: { $regexMatch: { input: { $toString: '$price' }, regex: regex } } },
        { $expr: { $regexMatch: { input: { $toString: '$space' }, regex: regex } } }
      ]
    };

    const results = await db.collection('lesson').find(filter).toArray();
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET /teachers: all teachers
app.get('/teachers', async (req, res) => {
  try {
    const teachers = await db.collection('teacher').find({}).toArray();
    res.json(teachers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch teachers' });
  }
});

// GET /teachers/:id/lessons: all lessons taught by one teacher
app.get('/teachers/:id/lessons', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid teacher id' });
    }
    const teacher = await db.collection('teacher').findOne({ _id: new ObjectId(req.params.id) });
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    const lessons = await db.collection('lesson').find({ _id: { $in: teacher.lessonIds } }).toArray();
    res.json(lessons);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch teacher lessons' });
  }
});

// GET /enrolment/:lessonid: number of spaces already purchased for a lesson
app.get('/enrolment/:lessonid', async (req, res) => {
  try {
    if (!isValidId(req.params.lessonid)) {
      return res.status(400).json({ error: 'Invalid lesson id' });
    }

    const lessonId = new ObjectId(req.params.lessonid);
    const orders = await db.collection('order').find({ 'items.lessonId': lessonId }).toArray();

    let enrolment = 0;
    orders.forEach(order => {
      order.items.forEach(item => {
        if (item.lessonId.equals(lessonId)) {
          enrolment += item.spaces;
        }
      });
    });

    res.json({ lessonId: req.params.lessonid, enrolment: enrolment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not get enrolment' });
  }
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