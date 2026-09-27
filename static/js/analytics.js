// ======================================
// AI Interview Copilot V11
// Real Analytics Engine
// File: static/js/analytics.js
// ======================================

const Analytics = (() => {

    const fillerWordsList = [
        "um",
        "uh",
        "like",
        "actually",
        "basically",
        "you know",
        "so",
        "hmm",
        "okay"
    ];

    const data = {
        interviewStart: null,
        interviewEnd: null,

        totalWords: 0,
        fillerWords: 0,
        longPauses: 0,

        speakingTime: 0,
        wpm: 0,

        eyeSamples: [],
        postureSamples: [],

        confidenceTimeline: [],

        questions: []
    };

    let questionStart = null;

    // ==========================
    // Interview Start
    // ==========================

    function startInterview() {
        data.interviewStart = Date.now();
    }

    // ==========================
    // Question Start
    // ==========================

    function startQuestion() {
        questionStart = Date.now();
    }

    // ==========================
    // Save Answer
    // ==========================

    function saveAnswer(answer) {

        const clean = (answer || "").trim();

        const words = clean
            .split(/\s+/)
            .filter(Boolean);

        const wordCount = words.length;

        data.totalWords += wordCount;

        let fillers = 0;

        words.forEach(word => {

            if (fillerWordsList.includes(word.toLowerCase())) {
                fillers++;
            }

        });

        data.fillerWords += fillers;

        let seconds = 0;

        if (questionStart) {
            seconds = Math.max(
                1,
                Math.round((Date.now() - questionStart) / 1000)
            );
        }

        data.speakingTime += seconds;

        if (data.speakingTime > 0) {
            data.wpm = Math.round(
                data.totalWords / (data.speakingTime / 60)
            );
        }

        const eye = average(data.eyeSamples) || 80;
        const posture = average(data.postureSamples) || 80;

        const confidence = calculateConfidence({
            words: wordCount,
            fillers,
            eye,
            posture,
            seconds
        });

        data.confidenceTimeline.push(confidence);

        data.questions.push({
            answer: clean,
            words: wordCount,
            fillers,
            seconds,
            confidence
        });
    }

    // ==========================
    // Long Pause
    // ==========================

    function addPause() {
        data.longPauses++;
    }

    // ==========================
    // Eye Contact
    // ==========================

    function addEye(value) {
        data.eyeSamples.push(value);
    }

    // ==========================
    // Posture
    // ==========================

    function addPosture(value) {
        data.postureSamples.push(value);
    }

    // ==========================
    // Confidence Formula
    // ==========================

    function calculateConfidence(obj) {

        let score = 0;

        // Answer Length (30)
        score += Math.min(30, obj.words * 0.6);

        // Eye Contact (25)
        score += obj.eye * 0.25;

        // Posture (20)
        score += obj.posture * 0.20;

        // Speaking Time (15)
        score += Math.min(15, obj.seconds / 4);

        // Penalty
        score -= obj.fillers * 2;

        score = Math.round(score);

        return Math.max(0, Math.min(100, score));
    }

    // ==========================
    // Average Helper
    // ==========================

    function average(arr) {

        if (!arr.length) return 0;

        return Math.round(
            arr.reduce((a, b) => a + b, 0) / arr.length
        );
    }

    // ==========================
    // Final Report
    // ==========================

    function getReport() {

        data.interviewEnd = Date.now();

        return {
            interviewDuration: Math.round(
                (data.interviewEnd - data.interviewStart) / 1000
            ),

            totalWords: data.totalWords,
            fillerWords: data.fillerWords,
            longPauses: data.longPauses,
            speakingTime: data.speakingTime,
            wpm: data.wpm,

            eyeContact: average(data.eyeSamples),
            posture: average(data.postureSamples),

            confidenceTimeline: data.confidenceTimeline,

            questions: data.questions
        };
    }

    // Public API

    return {

        startInterview,

        startQuestion,

        saveAnswer,

        addPause,

        addEye,

        addPosture,

        getReport
    };

})();

// Global Access

window.Analytics = Analytics;