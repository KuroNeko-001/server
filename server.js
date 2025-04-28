// server.js
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const port = process.env.PORT || 5001;

// สร้าง HTTP server และ bind กับ express
const server = http.createServer(app);

// ตั้งค่า CORS สำหรับ HTTP API
app.use(cors());
app.use(bodyParser.json());

// สร้าง Socket.IO server พร้อม CORS + fallback transports
const io = new Server(server, {
  cors: {
    origin: "*",   // <<--- อนุญาตทุก origin
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

// เชื่อมต่อกับ MongoDB
const mongoURI =
  "mongodb+srv://arm:arm@aqi-senors-rf.xk5y8sk.mongodb.net/CPE495final";
mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("เชื่อมต่อกับ MongoDB สำเร็จ!"))
  .catch((err) => console.error("เชื่อมต่อ MongoDB ไม่สำเร็จ:", err));

// ====== Schema & Model ======
const sensorDataSchema = new mongoose.Schema({
  temperature: Number,
  humidity: Number,
  co: Number,
  so2: Number,
  no2: Number,
  ozone: Number,
  pm2_5: Number,
  pm10: Number,
  timestamp: { type: Date, default: Date.now },
});
const SensorDataModel = mongoose.model("SensorData", sensorDataSchema);

const modelresults_engversSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  sensor_data: {
    temperature: { type: Number, required: true },
    humidity: { type: Number, required: true },
    co: { type: Number, required: true },
    so2: { type: Number, required: true },
    no2: { type: Number, required: true },
    ozone: { type: Number, required: true },
    pm2_5: { type: Number, required: true },
    pm10: { type: Number, required: true },
  },
  prediction: {
    aqi_class: { type: Number, required: true },
    aqi_label: { type: String, required: true },
  },
});
const ModelResult = mongoose.model(
  "modelresults_engvers",
  modelresults_engversSchema
);

// ====== Socket.IO ======
io.on("connection", (socket) => {
  console.log("📡 Client connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

// ====== HTTP Routes ======

// GET: ดึงข้อมูล SensorData ทั้งหมด
app.get("/api/sensors", async (req, res) => {
  try {
    const allSensorData = await SensorDataModel.find();
    res.json(allSensorData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST: รับและบันทึก SensorData พร้อม broadcast ผ่าน Socket.IO
app.post("/api/sensors", async (req, res) => {
  try {
    const { temperature, humidity, co, so2, ozone, pm2_5, pm10, no2 } =
      req.body;

    // validate
    const nums = [temperature, humidity, co, so2, no2, ozone, pm2_5, pm10];
    if (nums.some((v) => typeof v !== "number")) {
      return res
        .status(400)
        .json({ error: "ข้อมูลที่ส่งมาไม่ถูกต้อง ต้องเป็นตัวเลขทั้งหมด" });
    }

    const newSensorData = new SensorDataModel({
      temperature,
      humidity,
      co,
      so2,
      no2,
      ozone,
      pm2_5,
      pm10,
    });
    const savedSensorData = await newSensorData.save();

    // broadcast ผ่าน Socket.IO
    io.emit("sensorData", savedSensorData);
    console.log("🔔 Emitted sensorData:", savedSensorData);

    res.status(201).json(savedSensorData);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET: ดึง ModelResult ล่าสุด 5 รายการ
app.get("/api/modelresults_engvers", async (req, res) => {
  try {
    const data = await ModelResult.find()
      .sort({ timestamp: -1 })
      .limit(5)
      .select(
        "timestamp sensor_data.temperature sensor_data.humidity sensor_data.co sensor_data.so2 sensor_data.no2 sensor_data.ozone sensor_data.pm2_5 sensor_data.pm10 prediction.aqi_class prediction.aqi_label"
      );
    const formattedData = data.map((item) => ({
      timestamp: item.timestamp,
      temperature: item.sensor_data.temperature,
      humidity: item.sensor_data.humidity,
      co: item.sensor_data.co,
      so2: item.sensor_data.so2,
      no2: item.sensor_data.no2,
      ozone: item.sensor_data.ozone,
      pm2_5: item.sensor_data.pm2_5,
      pm10: item.sensor_data.pm10,
      aqi_class: item.prediction.aqi_class,
      aqi_label: item.prediction.aqi_label,
    }));
    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ====== Start Server ======
server.listen(port, "0.0.0.0", () => {
  console.log(`🌐 Server listening on port ${port}`);
});
