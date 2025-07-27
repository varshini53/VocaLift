import sys
import json
import subprocess
import whisper
import re

def extract_audio(video_path, audio_path="temp_audio.wav"):
    cmd = ["ffmpeg", "-y", "-i", video_path, "-q:a", "0", "-map", "a", audio_path]
    subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    return audio_path

def transcribe_audio(audio_path):
    model = whisper.load_model("base")
    result = model.transcribe(audio_path)
    return result["text"]

def count_filler_words(text):
    fillers = ["um", "uh", "like", "you know", "so", "actually", "basically", "literally"]
    clean_text = re.sub(r'[^\w\s]', '', text.lower())
    filler_count = {}
    for word in fillers:
        pattern = rf"\b{word}\b"
        count = len(re.findall(pattern, clean_text))
        if count > 0:
            filler_count[word] = count
    return filler_count

def analyze_video(video_path):
    audio_path = extract_audio(video_path)
    transcript = transcribe_audio(audio_path)
    filler_count = count_filler_words(transcript)

    # Debugging
    print(f"Transcript: {transcript}", file=sys.stderr)
    print(f"Filler Count: {filler_count}", file=sys.stderr)

    feedback = {
        "transcript": transcript,
        "filler_word_count": filler_count,
        "eye_contact_score": 80,
        "gesture_score": 20,
        "body_language_feedback": "Maintain eye contact and avoid excessive gestures."
    }
    return feedback

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No video file provided"}))
        sys.exit(1)

    video_path = sys.argv[1]
    try:
        feedback = analyze_video(video_path)
        print(json.dumps(feedback))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
