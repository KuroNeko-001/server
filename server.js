const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

const app = express();
const port = 5001;

const cors = require("cors");

app.use(cors());
// Middleware
app.use(bodyParser.json());

// เชื่อมต่อ MongoDB
const mongoURI =
  "mongodb+srv://arm:arm@aqi-senors-rf.xk5y8sk.mongodb.net/CPE495final"; // เปลี่ยนชื่อฐานข้อมูล (ถ้าต้องการ)
// const mongoURI = 'mongodb://localhost:27017/CPE495';
mongoose
  .connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("เชื่อมต่อกับ MongoDB สำเร็จ!"))
  .catch((err) => console.error("ไม่สามารถเชื่อมต่อกับ MongoDB ได้:", err));

// ✅ Schema ที่รองรับ PM2.5 และ PM10
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

// ✅ Schema สำหรับ ModelResult
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

// ✅ สร้าง Model
const ModelResult = mongoose.model("modelresults_engvers", modelresults_engversSchema);
 

const SensorDataModel = mongoose.model("SensorData", sensorDataSchema);

// ✅ GET: ดึงข้อมูลทั้งหมด
app.get("/api/sensors", async (req, res) => {
  try {
    const allSensorData = await SensorDataModel.find();
    res.json(allSensorData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ POST: รับและบันทึกข้อมูลทั้งหมด
app.post("/api/sensors", async (req, res) => {
  try {
    const { temperature, humidity, co, so2, ozone, pm2_5, pm10, no2 } =
      req.body;

    // ตรวจสอบความครบถ้วนของข้อมูล
    if (
      typeof temperature !== "number" ||
      typeof humidity !== "number" ||
      typeof co !== "number" ||
      typeof so2 !== "number" ||
      typeof no2 !== "number" ||
      typeof ozone !== "number" ||
      typeof pm2_5 !== "number" ||
      typeof pm10 !== "number"
    ) {
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
    res.status(201).json(savedSensorData);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ✅ GET: ดึงข้อมูล ModelResult
app.get("/api/modelresults_engvers", async (req, res) => {
  try {
    // ดึงข้อมูลจาก MongoDB และกรองเฉพาะฟิลด์ที่ต้องการ
    const data = await ModelResult.find()
    .sort({ timestamp: -1 }) // -1 = ล่าสุดมาก่อน
    .limit(5)
    .select(
      "timestamp sensor_data.temperature sensor_data.humidity sensor_data.co sensor_data.so2 sensor_data.no2 sensor_data.ozone sensor_data.pm2_5 sensor_data.pm10 prediction.aqi_class prediction.aqi_label"
    ); // เลือกเฉพาะฟิลด์ที่ต้องการ
      
    // แปลงข้อมูลให้อยู่ในรูปแบบที่ต้องการ
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

// ✅ เริ่มต้นเซิร์ฟเวอร์
app.listen(port, () => {
  console.log(`เซิร์ฟเวอร์กำลังทำงานบนพอร์ต ${port}`);
});
