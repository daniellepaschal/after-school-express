require('dotenv').config();
const { MongoClient } = require('mongodb');

const lessons = [
  { topic: 'Math',     location: 'Ebene',         price: 1200, space: 5, icon: 'fa-calculator',  image: 'images/math.svg' },
  { topic: 'Music',    location: 'Curepipe',      price: 1500, space: 5, icon: 'fa-music',       image: 'images/music.svg' },
  { topic: 'Art',      location: 'Quatre Bornes', price: 1100, space: 5, icon: 'fa-paint-brush', image: 'images/art.svg' },
  { topic: 'Football', location: 'Rose Hill',     price: 900,  space: 5, icon: 'fa-futbol-o',    image: 'images/football.svg' },
  { topic: 'Science',  location: 'Moka',          price: 1400, space: 5, icon: 'fa-flask',       image: 'images/science.svg' },
  { topic: 'English',  location: 'Port Louis',    price: 1000, space: 5, icon: 'fa-book',        image: 'images/english.svg' },
  { topic: 'Coding',   location: 'Ebene',         price: 1800, space: 5, icon: 'fa-code',        image: 'images/coding.svg' },
  { topic: 'Chess',    location: 'Vacoas',        price: 800,  space: 5, icon: 'fa-trophy',      image: 'images/chess.svg' },
  { topic: 'Drama',    location: 'Phoenix',       price: 1300, space: 5, icon: 'fa-star',        image: 'images/drama.svg' },
  { topic: 'Swimming', location: 'Flic en Flac',  price: 1600, space: 5, icon: 'fa-life-ring',   image: 'images/swimming.svg' }
];

async function seed() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.DB_NAME || 'afterschool');

  await db.collection('lesson').deleteMany({});
  const result = await db.collection('lesson').insertMany(lessons);
  console.log(`Inserted ${result.insertedCount} lessons`);

  await client.close();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});