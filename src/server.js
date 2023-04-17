import express from "express";
import cors from "cors";
import path from "path";
import {db, connectToDb} from "./db.js";
import fs from "fs";
import admin from "firebase-admin";
import "dotenv/config";
import {fileURLToPath} from "url";

// when type is not equal to the module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Credentials
const credentials = JSON.parse(fs.readFileSync("./credentials.json"));
// Initialize admin on server and connect it to firebase project
admin.initializeApp({credential: admin.credential.cert(credentials)});

const app = express();
app.use(express.json());
// app.use(cors());
app.use(express.static(path.join(__dirname, "../build")));

app.get(/^(?!\/api).+/, (req, res) => {
  res.sendFile(path.join(__dirname, "../build/index.html"));
});

// Authorize users
app.use(async (req, res, next) => {
  const {authtoken} = req.headers;
  // Load the user whose token matches with that user
  if (authtoken) {
    try {
      req.user = await admin.auth().verifyIdToken(authtoken);
    } catch (error) {
      return res.sendStatus(400); //added return here to stop further function requests like next() if error
    }
  }
  req.user = req.user || {};
  // carry out program execution of others as well
  next();
});

app.get("/api/articles/:name", async (req, res) => {
  const {name} = req.params;
  const {uid} = req.user;

  const article = await db.collection("articles").findOne({name});
  if (article) {
    // users already upvoted the article
    const upvoteIds = article.upvoteIds || [];
    article.canUpvote = uid && !upvoteIds.includes(uid);
    res.json(article);
  } else {
    res.sendStatus(404);
  }
});

// Middleware
app.use((req, res, next) => {
  if (req.user) {
    next();
  } else {
    res.sendStatus(401);
  }
});

// Adding upvotes to articles
app.put("/api/articles/:name/upvote", async (req, res) => {
  const {name} = req.params;
  const {uid} = req.user;

  const article = await db.collection("articles").findOne({name});
  if (article) {
    // users already upvoted the article
    const upvoteIds = article.upvoteIds || [];
    const canUpvote = uid && !upvoteIds.includes(uid);
    if (canUpvote) {
      await db
        .collection("articles")
        .updateOne({name}, {$inc: {upvotes: 1}, $push: {upvoteIds: uid}});
    }
    // const article = articlesInfo.find((a) => a.name === name); local
    const updatedArticle = await db.collection("articles").findOne({name});
    res.json(updatedArticle);
  } else {
    res.send("article doesn't exist");
  }
});

// Adding Comments to articles
app.post("/api/articles/:name/comments", async (req, res) => {
  const {name} = req.params;
  const {text} = req.body; //contains input from user frontend
  const {email} = req.user; //firebase authorized email of the registered user
  await db.collection("articles").updateOne(
    {name},
    {
      $push: {comments: {postedBy: email, text}},
    }
  );
  //Load updated article
  const article = await db.collection("articles").findOne({name});

  article ? res.json(article) : res.send("Article doesn't exist");
});

const PORT = process.env.PORT || 8000;
// DB & Server Connected
connectToDb(() => {
  console.log("SUCCESSFULLY CONNECTED TO DATABASE");
  app.listen(PORT, () => {
    console.log("Server is on port " + PORT);
  });
});
