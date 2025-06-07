import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import auth from "./middleware/auth.js";
import User from "./models/User.js";

dotenv.config();
const app = express();
const __dirname = path.resolve();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

mongoose.connect(process.env.MONGO_URI).then(() => console.log("MongoDB connected"));

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const exists = await User.findOne({ username });
  if (exists) return res.status(400).send("User already exists");

  const hashed = await bcrypt.hash(password, 10);
  await User.create({ username, password: hashed });
  res.redirect("/login.html");
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).send("Invalid credentials");

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  res.json({ token });
});

app.post("/generate-pdf", auth, (req, res) => {
  const { text } = req.body;

  const doc = new PDFDocument();
  const filePath = path.join(__dirname, "output.pdf");
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);
  doc.text(text);
  doc.end();

  stream.on("finish", () => {
    res.download(filePath, "your-content.pdf", () => fs.unlinkSync(filePath));
  });
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
