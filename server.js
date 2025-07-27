const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const path = require("path");

const app = express();
const PORT = 5000;

// Set up storage for uploaded videos
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// API endpoint to upload video
app.post("/upload", upload.single("video"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No video uploaded" });
  }

  const videoPath = path.join(__dirname, "uploads", req.file.filename);

  // Run Python analysis
  exec(`python analyze_video.py "${videoPath}"`, (err, stdout, stderr) => {
    if (err) {
      console.error("Error:", stderr);
      return res.status(500).json({ error: "Analysis failed" });
    }

    try {
      const feedback = JSON.parse(stdout);
      res.json(feedback);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      res.status(500).json({ error: "Invalid analysis output" });
    }
  });
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
