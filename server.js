const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const port = process.env.PORT || 5001;

// สร้าง HTTP server
const server = http.createServer(app);

// CORS
app.use(
  cors({
    origin: ["http://localhost:3000", "https://your-frontend-domain.com"],
    methods: ["GET", "POST"],
    credentials: true,
  })
);

// ใช้ express.json() แทน body-parser
app.use(express.json());

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "https://your-frontend-domain.com"],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// MongoDB connect
const mongoURI = "mongodb+srv://arm:arm@aqi-senors-rf.xk5y8sk.mongodb.net/CPE495final";
mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("เชื่อมต่อกับ MongoDB สำเร็จ!"))
  .catch((err) => console.error("เชื่อมต่อ MongoDB ไม่สำเร็จ:", err));

// [Schemas + Models เดิมตามปกติ]

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("📡 Client connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

// API routes เดิม
// GET /api/sensors
// POST /api/sensors
// GET /api/modelresults_engvers

// Start server
server.listen(port, "0.0.0.0", () => {
  console.log(`🌐 Server listening on port ${port}`);
});
