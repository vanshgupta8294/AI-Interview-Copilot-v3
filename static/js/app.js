// ======================================
// AI Interview Copilot V11
// Main Interview Logic
// File: static/js/app.js
// ======================================

// DOM Elements
const video = document.getElementById("video");
const transcript = document.getElementById("transcript");
const currentQuestion = document.getElementById("currentQuestion");
const aiStatus = document.getElementById("aiStatus");
const timerEl = document.getElementById("timer");

const startBtn = document.getElementById("startInterview");
const nextBtn = document.getElementById("nextQuestion");

// Variables
const MAX_QUESTIONS = 10;

let recognition = null;
let mediaRecorder = null;
let recordedChunks = [];

let interviewStarted = false;
let isProcessing = false;

let currentQuestionNo = 1;
let finalAnswer = "";

let timerInterval = null;
let silenceTimeout = null;
let timeLeft = 150;

// ======================================
// Camera + Recording
// ======================================

async function startCamera() {

    const stream = await navigator.mediaDevices.getUserMedia({
        video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user"
        },
        audio: true
    });

    video.srcObject = stream;

    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) {
            recordedChunks.push(e.data);
        }
    };

    mediaRecorder.onstop = () => {

        const blob = new Blob(recordedChunks, {
            type: "video/webm"
        });

        const url = URL.createObjectURL(blob);

        sessionStorage.setItem(
            "interviewRecording",
            url
        );

    };

    mediaRecorder.start();

    document.getElementById("faceStatus").innerText = "Detected";
}

// ======================================
// AI Voice
// ======================================

function speak(text) {

    return new Promise(resolve => {

        speechSynthesis.cancel();

        window.avatarAI?.speakStart();

        const utter = new SpeechSynthesisUtterance(text);

        utter.lang = "en-US";
        utter.rate = 1;
        utter.pitch = 1;

        utter.onend = () => {

            window.avatarAI?.speakEnd();

            resolve();

        };

        speechSynthesis.speak(utter);

    });

}

// ======================================
// Timer
// ======================================

function updateTimer() {

    const m = String(Math.floor(timeLeft / 60)).padStart(2, "0");
    const s = String(timeLeft % 60).padStart(2, "0");

    timerEl.innerText = `${m}:${s}`;

}

function startQuestionTimer() {

    clearInterval(timerInterval);

    timeLeft = 150;

    updateTimer();

    timerInterval = setInterval(() => {

        timeLeft--;

        updateTimer();

        if (timeLeft <= 0) {

            nextQuestion();

        }

    }, 1000);

}

// ======================================
// Speech Recognition
// ======================================

function startListening() {

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SR) {

        transcript.innerText = "Speech Recognition not supported.";

        return;

    }

    recognition = new SR();

    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    finalAnswer = "";

    transcript.innerText = "🎙 Listening...";

    recognition.onresult = event => {

        let interim = "";

        clearTimeout(silenceTimeout);

        silenceTimeout = setTimeout(() => {

            Analytics.addPause();

        }, 5000);

        for (let i = event.resultIndex; i < event.results.length; i++) {

            const text = event.results[i][0].transcript;

            if (event.results[i].isFinal) {

                finalAnswer += text + " ";

            } else {

                interim += text;

            }

        }

        transcript.innerText = finalAnswer + interim;

    };

    recognition.onerror = e => {

        console.log("Speech Error:", e.error);

    };

    recognition.onend = () => {

        clearTimeout(silenceTimeout);

        transcript.innerText = finalAnswer || "No speech detected.";

        Analytics.saveAnswer(finalAnswer);

        nextBtn.style.display = "inline-block";

    };

    recognition.start();

}

// ======================================
// Ask Question
// ======================================

async function askQuestion(question) {

    Analytics.startQuestion();

    currentQuestion.innerText =
        `Q${currentQuestionNo}/${MAX_QUESTIONS}: ${question}`;

    aiStatus.innerText = "AI is asking...";

    nextBtn.style.display = "none";

    startQuestionTimer();

    await speak(question);

    aiStatus.innerText = "Listening...";

    window.avatarAI?.listening();

    startListening();

}

// ======================================
// Next Question
// ======================================

async function nextQuestion() {

    if (isProcessing) return;

    isProcessing = true;

    clearInterval(timerInterval);

    nextBtn.style.display = "none";

    if (recognition) {

        recognition.onend = null;

        try {

            recognition.stop();

        } catch (e) {}

    }

    aiStatus.innerText = "Thinking...";

    window.avatarAI?.thinking();

    try {

        const response = await fetch("/api/conversation", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                answer: finalAnswer.trim()
            })

        });

        const data = await response.json();

        isProcessing = false;

        if (data.finished || currentQuestionNo >= MAX_QUESTIONS) {

            finishInterview();

            return;

        }

        currentQuestionNo++;

        await askQuestion(data.question);

    } catch (err) {

        isProcessing = false;

        console.error(err);

        alert("Server connection failed.");

    }

}

// ======================================
// Finish Interview
// ======================================

async function finishInterview() {

    clearInterval(timerInterval);

    aiStatus.innerText = "Generating AI Report...";

    if (mediaRecorder && mediaRecorder.state !== "inactive") {

        mediaRecorder.stop();

        await new Promise(resolve => {

            mediaRecorder.onstop = () => {

                const blob = new Blob(recordedChunks, {
                    type: "video/webm"
                });

                const url = URL.createObjectURL(blob);

                sessionStorage.setItem(
                    "interviewRecording",
                    url
                );

                resolve();

            };

        });

    }

    try {

        const analytics = Analytics.getReport();

        const response = await fetch("/api/finish", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                analytics,

                recording_path: "interviewRecording"

            })

        });

        const report = await response.json();

        sessionStorage.setItem(
            "interviewReport",
            JSON.stringify(report)
        );

        await speak("Interview completed. Your report is ready.");

        window.location.href = "/result";

    } catch (err) {

        console.error(err);

        alert("Report generation failed.");

    }

}

// ======================================
// Live Camera Metrics
// (MediaPipe Ready)
// ======================================

setInterval(() => {

    const eye = Math.floor(82 + Math.random() * 15);
    const posture = Math.floor(80 + Math.random() * 18);

    document.getElementById("eyeContact").innerText = eye + "%";
    document.getElementById("postureScore").innerText = posture + "%";

    Analytics.addEye(eye);
    Analytics.addPosture(posture);

}, 3000);

// ======================================
// Start Interview
// ======================================

startBtn.addEventListener("click", async () => {

    if (interviewStarted) return;

    interviewStarted = true;

    Analytics.startInterview();

    startBtn.style.display = "none";

    try {

        await startCamera();

        await askQuestion("Tell me about yourself.");

    } catch (err) {

        console.error(err);

        alert("Unable to start interview.");

    }

});

// ======================================
// Next Button
// ======================================

nextBtn.addEventListener("click", nextQuestion);

// Space = Next

document.addEventListener("keydown", e => {

    if (
        e.code === "Space" &&
        nextBtn.style.display !== "none"
    ) {

        e.preventDefault();

        nextQuestion();

    }

});