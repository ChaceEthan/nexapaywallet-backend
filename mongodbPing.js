// Load environment variables
require('dotenv').config({ path: './backend/.env' }); 
const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = process.env.MONGO_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    // Ping the admin database to verify connection
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Ping Successful: You successfully connected to MongoDB!");
  } catch (err) {
    console.error("❌ Ping Failed:", err.message);
  } finally {
    await client.close();
  }
}

run();

module.exports = client;