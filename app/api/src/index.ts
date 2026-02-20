import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { db, setupDB } from "./db/index.js";
import { analyzeSwingVideo, generateLessonRoadmap, extractLaunchMonitorData } from "./services/gemini.service.js";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../../uploads")));

setupDB();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, "uploads/");
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
const upload = multer({ storage });


app.post("/api/swings/upload", upload.single("video"), async (req, res) => {
  try {
    const file = req.file;
    const { club, playerId = "usr_12345" } = req.body;

    if (!file || !club) {
      return res.status(400).json({ error: "Missing video file or club type" });
    }

    const swingId = uuidv4();
    const videoUrl = `/uploads/${file.filename}`;
    const absolutePath = file.path;

    const insertSwing = db.prepare(`
            INSERT INTO swings (id, playerId, club, videoUrl, analyzed) 
            VALUES (?, ?, ?, ?, 0)
        `);
    insertSwing.run(swingId, playerId, club, videoUrl);

    console.log(`Sending video to Gemini for analysis (Type: ${file.mimetype})...`);
    const aiData = await analyzeSwingVideo(absolutePath, club, file.mimetype);

    if (aiData) {
      const insertMetrics = db.prepare(`
                INSERT INTO swing_metrics (
                    id, swingId, addressTimeMs, topTimeMs, impactTimeMs, finishTimeMs,
                    addressAngles, topAngles, impactAngles, finishAngles,
                    estimatedClubSpeed, estimatedClubPath, estimatedDistance
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

      insertMetrics.run(
        uuidv4(),
        swingId,
        aiData.timestampsMs.address,
        aiData.timestampsMs.top,
        aiData.timestampsMs.impact,
        aiData.timestampsMs.finish,
        JSON.stringify(aiData.addressAngles),
        JSON.stringify(aiData.topAngles),
        JSON.stringify(aiData.impactAngles),
        JSON.stringify(aiData.finishAngles),
        aiData.estimatedClubSpeed,
        aiData.estimatedClubPath,
        aiData.estimatedDistance
      );

      const roadmaps = await generateLessonRoadmap(aiData, club);
      if (roadmaps && roadmaps.length > 0) {
        const insertLesson = db.prepare(`
                    INSERT INTO lessons (id, swingId, goalType, drills, aiReview)
                    VALUES (?, ?, ?, ?, ?)
                `);
        for (const rm of roadmaps) {
          insertLesson.run(uuidv4(), swingId, rm.goalType, JSON.stringify(rm.drills), rm.aiReview);
        }
      }

      db.prepare('UPDATE swings SET analyzed = 1 WHERE id = ?').run(swingId);
    }

    res.json({ message: "Upload queued and analyzed", swingId });
  } catch (e: unknown) {
    console.error(e);
    res.status(500).json({ error: (e as Error).message });
  }
});

app.post("/api/swings/:id/launch-monitor", upload.single("image"), async (req, res) => {
  try {
    const file = req.file;
    const swingId = req.params.id;

    if (!file) return res.status(400).json({ error: "Missing image" });

    const absolutePath = file.path;
    const imageUrl = `/uploads/${file.filename}`;

    const data = await extractLaunchMonitorData(absolutePath);

    if (data) {
      const insertLM = db.prepare(`
                INSERT INTO launch_monitor_data (
                    id, swingId, imageUrl, ballSpeed, clubSpeed, smashFactor, carry, spinRate, extractedRawText
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
      const lmId = uuidv4();
      insertLM.run(
        lmId, swingId, imageUrl,
        data.ballSpeed, data.clubSpeed, data.smashFactor, data.carry, data.spinRate, data.extractedRawText
      );
      res.json({ message: "Launch monitor data attached." });
    } else {
      res.json({ message: "File uploaded, AI unavailable." });
    }
  } catch (e: unknown) {
    console.error(e);
    res.status(500).json({ error: (e as Error).message });
  }
});

app.get("/api/swings", (_req, res) => {
  try {
    const swings = db.prepare(`
            SELECT s.*, m.estimatedDistance, m.estimatedClubSpeed
            FROM swings s
            LEFT JOIN swing_metrics m ON s.id = m.swingId
            ORDER BY s.createdAt DESC
        `).all();

    res.json(swings);
  } catch (e: unknown) {
    console.error(e);
    res.status(500).json({ error: (e as Error).message });
  }
});

app.get("/api/swings/:id", (req, res) => {
  const swingId = req.params.id;

  const swing = db.prepare('SELECT * FROM swings WHERE id = ?').get(swingId);
  if (!swing) return res.status(404).json({ error: "Not found" });

  const metrics = db.prepare('SELECT * FROM swing_metrics WHERE swingId = ?').get(swingId);
  if (metrics) {
    ['addressAngles', 'topAngles', 'impactAngles', 'finishAngles'].forEach(key => {
      const mRecord = metrics as Record<string, unknown>;
      if (typeof mRecord[key] === 'string') {
        mRecord[key] = JSON.parse(mRecord[key] as string);
      }
    });
  }

  const lessons = db.prepare('SELECT * FROM lessons WHERE swingId = ?').all(swingId);
  const launchData = db.prepare('SELECT * FROM launch_monitor_data WHERE swingId = ?').get(swingId);

  res.json({ swing, metrics, lessons, launchData });
});

app.listen(port, () => {
  console.log(`BFF Server running on http://localhost:${port}`);
});
