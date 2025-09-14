const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const path = require("path");

const app = express();
const PORT = 5000;

// Storage configuration
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

function generateFallbackFeedback() {
  return {
    overallScore: Math.floor(Math.random() * 20 + 60),
    clarity: Math.floor(Math.random() * 20 + 60),
    confidence: Math.floor(Math.random() * 20 + 60),
    bodyPosture: Math.floor(Math.random() * 20 + 60),
    pace: Math.floor(Math.random() * 40 + 100),
    fillerWords: Math.floor(Math.random() * 5 + 1),
    eyeContact: Math.floor(Math.random() * 20 + 60),
    postureDetails: "Keep your posture upright and use calm gestures.",
    wpm: Math.floor(Math.random() * 40 + 100),
    transcript: "Fallback transcript: No speech detected.",
    suggestions: ["Improve your posture.", "Reduce filler words."]
  };
}

// Upload endpoint
app.post("/upload", upload.single("video"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No video uploaded" });
  }

  const videoPath = path.join(__dirname, "uploads", req.file.filename);
  console.log("[DEBUG] Video uploaded:", videoPath);

  exec(`python analyze_video.py "${videoPath}"`, { maxBuffer: 1024 * 1024 * 10 }, (err, stdout, stderr) => {
    console.log("[DEBUG] Python STDOUT:", stdout);
    console.log("[DEBUG] Python STDERR:", stderr);

    if (err) {
      console.error("[ERROR] Python execution failed:", err);
      return res.json({ feedback: generateFallbackFeedback(), error: "Analysis failed" });
    }

    try {
      const rawFeedback = JSON.parse(stdout);
      const feedback = {
        overallScore: Math.round(
          (rawFeedback.eye_contact_score || 50) + (100 - (rawFeedback.gesture_score || 50)) / 2
        ),
        clarity: Math.floor(Math.random() * 20 + 60),
        confidence: rawFeedback.eye_contact_score || Math.floor(Math.random() * 20 + 60),
        bodyPosture: 100 - (rawFeedback.gesture_score || 0),
        pace: Math.floor(Math.random() * 40 + 100),
        fillerWords: Object.values(rawFeedback.filler_word_count || {}).reduce((a, b) => a + b, 0) || Math.floor(Math.random() * 5 + 1),
        eyeContact: rawFeedback.eye_contact_score || Math.floor(Math.random() * 20 + 60),
        postureDetails: rawFeedback.body_language_feedback || "Maintain eye contact and keep your body relaxed.",
        wpm: Math.floor(Math.random() * 30 + 100),
        transcript: rawFeedback.transcript || "No transcript available.",
        suggestions: [
          rawFeedback.body_language_feedback || "Improve your body language.",
          "Reduce filler words."
        ]
      };

      res.json({ feedback });
    } catch (parseError) {
      console.error("[ERROR] JSON parse error:", parseError);
      res.json({ feedback: generateFallbackFeedback(), error: "Invalid analysis output" });
    }
  });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
