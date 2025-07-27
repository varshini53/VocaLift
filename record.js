// -----------------------------
// FIREBASE AUTH
// -----------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyChJUq8k5x0XWCz6IK9cSMjVmabDrVKY-w",
  authDomain: "vocalift-auth.firebaseapp.com",
  projectId: "vocalift-auth",
  storageBucket: "vocalift-auth.appspot.com",
  messagingSenderId: "720243332182",
  appId: "1:720243332182:web:8b4713a173f767b1349790"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

onAuthStateChanged(auth, (user) => {
  if (!user) window.location.href = "login.html";
});

// -----------------------------
// RECORDING + UPLOAD LOGIC
// -----------------------------
const recordBtn = document.getElementById("record-btn");
const stopBtn = document.getElementById("stop-btn");
const uploadBtn = document.getElementById("upload-btn");
const uploadInput = document.getElementById("upload-input");
const timerDisplay = document.querySelector(".timer");
const recordOptions = document.getElementById("record-options");
const analyzingMsg = document.getElementById("analyzing-message");

let mediaRecorder;
let recordedChunks = [];
let recording = false;
let timerInterval;
let seconds = 0;

function toggleRecordUI(isRecording) {
  if (isRecording) {
    recordBtn.style.display = "none";
    recordOptions.classList.remove("hidden");
  } else {
    recordBtn.style.display = "block";
    recordOptions.classList.add("hidden");
  }
}

function startTimer() {
  seconds = 0;
  timerInterval = setInterval(() => {
    seconds++;
    timerDisplay.textContent = new Date(seconds * 1000).toISOString().substr(14, 5);
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerDisplay.textContent = "00:00";
}

// -----------------------------
// RECORDING
// -----------------------------
recordBtn.addEventListener("click", async () => {
  if (!recording) await startRecording();
});

stopBtn.addEventListener("click", () => {
  if (recording) stopRecording();
});

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    mediaRecorder = new MediaRecorder(stream);
    recordedChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedChunks, { type: "video/mp4" });
      const file = new File([blob], `recorded_video.mp4`, { type: "video/mp4" });
      await uploadVideo(file);
    };

    mediaRecorder.start();
    recording = true;
    startTimer();
    toggleRecordUI(true);
  } catch (err) {
    alert("Unable to access camera/microphone.");
    console.error(err);
  }
}

function stopRecording() {
  if (mediaRecorder && recording) {
    mediaRecorder.stop();
    recording = false;
    stopTimer();
    toggleRecordUI(false);
  }
}

// -----------------------------
// UPLOAD
// -----------------------------
uploadBtn.addEventListener("click", () => {
  uploadInput.click();
});

uploadInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (file) {
    await uploadVideo(file);
  }
});

async function uploadVideo(file) {
  const formData = new FormData();
  formData.append("video", file);
  if (analyzingMsg) analyzingMsg.style.display = "flex";

  const timeout = setTimeout(() => {
    console.warn("Server timeout. Redirecting with fallback feedback.");
    localStorage.setItem("analysisFeedback", JSON.stringify("Processing... Please check back later."));
    window.location.href = "analysis.html";
  }, 20000); // 20s timeout

  try {
    const response = await fetch("http://localhost:5000/upload", {
      method: "POST",
      body: formData,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const data = await response.json();
    console.log("Server response:", data);

    const feedback = data.feedback || data.rawOutput || "No feedback received.";
    localStorage.setItem("analysisFeedback", JSON.stringify(feedback));
    window.location.href = "analysis.html";

  } catch (err) {
    clearTimeout(timeout);
    console.error("Upload failed:", err);
    localStorage.setItem("analysisFeedback", JSON.stringify("Error: Could not process video."));
    window.location.href = "analysis.html";
  } finally {
    if (analyzingMsg) analyzingMsg.style.display = "none";
  }
}
