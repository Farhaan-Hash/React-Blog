import {MongoClient} from "mongodb";

let db;
async function connectToDb(cb) {
  // Database Name
  const dbName = "react-blog-db";
  const url = `mongodb+srv://node-server:${process.env.MONGO_PASSWORD}@cluster0.6c9tipz.mongodb.net/?retryWrites=true&w=majority`;
  const client = new MongoClient(url);
  await client.connect();
  db = client.db(dbName);
  cb();
}

export {db, connectToDb};
