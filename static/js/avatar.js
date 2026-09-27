// ======================================
// AI Interview Copilot V11
// AI Avatar Controller
// File: static/js/avatar.js
// ======================================

const avatarAI = (() => {

    const avatar = document.getElementById("avatar");
    const status = document.getElementById("avatarStatus");

    let blinkInterval = null;

    function setScale(scale) {
        if (avatar) {
            avatar.style.transform = `scale(${scale})`;
        }
    }

    function setGlow(color) {
        if (avatar) {
            avatar.style.boxShadow = `0 0 25px ${color}`;
        }
    }

    function setStatus(text) {
        if (status) {
            status.innerText = text;
        }
    }

    // ==========================
    // Idle
    // ==========================

    function idle() {
        setStatus("Ready for Interview");
        setGlow("rgba(37,99,235,.45)");
        setScale(1);
    }

    // ==========================
    // Speaking
    // ==========================

    function speakStart() {
        setStatus("Speaking...");
        setGlow("rgba(59,130,246,.8)");

        if (avatar) {
            avatar.classList.add("avatar-speaking");
        }
    }

    function speakEnd() {
        if (avatar) {
            avatar.classList.remove("avatar-speaking");
        }
        idle();
    }

    // ==========================
    // Listening
    // ==========================

    function listening() {
        setStatus("Listening...");
        setGlow("rgba(16,185,129,.8)");

        if (avatar) {
            avatar.classList.remove("avatar-speaking");
            avatar.classList.add("avatar-listening");
        }
    }

    // ==========================
    // Thinking
    // ==========================

    function thinking() {
        setStatus("Thinking...");
        setGlow("rgba(245,158,11,.8)");

        if (avatar) {
            avatar.classList.remove("avatar-listening");
            avatar.classList.add("avatar-thinking");
        }
    }

    // ==========================
    // Blink Animation
    // ==========================

    function startBlink() {

        stopBlink();

        blinkInterval = setInterval(() => {

            if (!avatar) return;

            avatar.style.transform = "scaleY(.95)";

            setTimeout(() => {
                avatar.style.transform = "scaleY(1)";
            }, 120);

        }, 4000);

    }

    function stopBlink() {
        if (blinkInterval) {
            clearInterval(blinkInterval);
        }
    }

    // ==========================
    // Reset
    // ==========================

    function reset() {

        if (!avatar) return;

        avatar.classList.remove(
            "avatar-speaking",
            "avatar-listening",
            "avatar-thinking"
        );

        idle();

    }

    // ==========================
    // Init
    // ==========================

    document.addEventListener("DOMContentLoaded", () => {

        idle();
        startBlink();

    });

    return {

        idle,
        speakStart,
        speakEnd,
        listening,
        thinking,
        reset,
        startBlink,
        stopBlink

    };

})();

// Global Access
window.avatarAI = avatarAI;