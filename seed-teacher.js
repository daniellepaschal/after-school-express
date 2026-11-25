const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config();
const { MongoClient } = require('mongodb');

async function seed() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.DB_NAME || 'afterschool');

  const lessons = await db.collection('lesson').find({}).toArray();

  const teachers = [
    {
      firstName: 'Haardik',
      lastName: 'Gautam',
      lessonIds: lessons.map(l => l._id)
    },
    {
      firstName: 'Maya',
      lastName: 'Ramsamy',
      lessonIds: lessons
        .filter(l => ['Art', 'Music', 'Drama', 'English', 'Science'].includes(l.topic))
        .map(l => l._id)
    }
  ];

  await db.collection('teacher').deleteMany({});
  const result = await db.collection('teacher').insertMany(teachers);
  console.log(`Inserted ${result.insertedCount} teachers`);
  teachers.forEach(t => {
    console.log(`${t.firstName} ${t.lastName}: ${t.lessonIds.length} lessons`);
  });

  await client.close();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});