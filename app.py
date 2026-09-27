import os
import re
import json
import sqlite3
from datetime import datetime

from flask import Flask, render_template, request, jsonify, session, send_file
from dotenv import load_dotenv
from google import genai
from reportlab.platypus import SimpleDocTemplate, Paragraph
from reportlab.lib.styles import getSampleStyleSheet

from interview_engine import InterviewEngine

load_dotenv()

app = Flask(__name__)
app.secret_key = "AI_INTERVIEW_COPILOT_V11"

UPLOAD_FOLDER = "uploads"
REPORT_FOLDER = "reports"
DATABASE_FOLDER = "database"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(REPORT_FOLDER, exist_ok=True)
os.makedirs(DATABASE_FOLDER, exist_ok=True)

DB_PATH = os.path.join(DATABASE_FOLDER, "interviews.db")

# =========================
# Gemini
# =========================

client = None
API_KEY = os.getenv("GEMINI_API_KEY")

if API_KEY:
    try:
        client = genai.Client(api_key=API_KEY)
        print("Gemini Connected")
    except Exception as e:
        print("Gemini Error:", e)

engine = InterviewEngine(client)

# =========================
# Database
# =========================

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("DROP TABLE IF EXISTS interviews")

    cur.execute("""
    CREATE TABLE interviews(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT,
        overall INTEGER,
        technical INTEGER,
        communication INTEGER,
        problem_solving INTEGER,
        confidence INTEGER,
        created_at TEXT
    )
    """)

    conn.commit()
    conn.close()

init_db()

# =========================
# PDF
# =========================

def create_pdf(report):
    filename = f"AI_Report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    pdf_path = os.path.join(REPORT_FOLDER, filename)

    doc = SimpleDocTemplate(pdf_path)
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph("<b>AI Interview Report</b>", styles["Title"]))
    story.append(Paragraph(f"Generated: {datetime.now()}", styles["Normal"]))
    story.append(Paragraph("<br/>", styles["Normal"]))

    story.append(Paragraph(f"Overall: {report.get('overall','AI Pending')}", styles["Heading2"]))

    for key in ["technical","communication","problem_solving","confidence"]:
        story.append(
            Paragraph(
                f"{key.replace('_',' ').title()}: {report.get(key,'-')}",
                styles["Normal"]
            )
        )

    story.append(Paragraph("<br/>", styles["Normal"]))

    story.append(Paragraph("<b>Strengths</b>", styles["Heading2"]))
    for s in report.get("strengths", []):
        story.append(Paragraph(f"• {s}", styles["Normal"]))

    story.append(Paragraph("<br/>", styles["Normal"]))

    story.append(Paragraph("<b>Weaknesses</b>", styles["Heading2"]))
    for s in report.get("weaknesses", []):
        story.append(Paragraph(f"• {s}", styles["Normal"]))

    story.append(Paragraph("<br/>", styles["Normal"]))

    story.append(Paragraph("<b>Improvement Plan</b>", styles["Heading2"]))
    for s in report.get("improvements", []):
        story.append(Paragraph(f"• {s}", styles["Normal"]))

    story.append(Paragraph("<br/>", styles["Normal"]))

    story.append(Paragraph("<b>Transcript</b>", styles["Heading2"]))
    story.append(
        Paragraph(
            report.get("transcript","").replace("\n","<br/>"),
            styles["Normal"]
        )
    )

    doc.build(story)
    return pdf_path

# =========================
# Pages
# =========================

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/interview")
def interview():
    return render_template("interview.html")

@app.route("/result")
def result():
    return render_template("result.html")

@app.route("/health")
def health():
    return jsonify({
        "status":"ok",
        "gemini":client is not None
    })

# =========================
# Upload
# =========================

@app.route("/api/upload", methods=["POST"])
def upload():

    role = request.form.get("role","General Interview")

    session["role"] = role
    session["history"] = []

    first_question = engine.next_question(role, [])

    return jsonify({
        "success":True,
        "question":first_question
    })

# =========================
# Conversation
# =========================

@app.route("/api/conversation", methods=["POST"])
def conversation():

    data = request.get_json(silent=True) or {}

    answer = data.get("answer","").strip()

    role = session.get("role","General Interview")
    history = session.get("history",[])

    history.append({"answer":answer})
    session["history"] = history

    next_q = engine.next_question(role, history)

    if next_q is None:
        return jsonify({
            "finished":True,
            "history_length":len(history)
        })

    return jsonify({
        "finished":False,
        "question":next_q,
        "history_length":len(history)
    })

# =========================
# Finish Interview
# =========================

@app.route("/api/finish", methods=["POST"])
def finish_interview():

    data = request.get_json(silent=True) or {}

    analytics = data.get("analytics",{})
    recording_path = data.get("recording_path","")

    role = session.get("role","General Interview")
    history = session.get("history",[])

    transcript = "\n\n".join(
        [f"Question {i+1}: {h.get('answer','')}" for i,h in enumerate(history)]
    )

    prompt = f"""
Evaluate this interview honestly.

Role: {role}

Transcript:
{transcript}

Analytics:
{json.dumps(analytics, indent=2)}

Return ONLY JSON:

{{
 "overall":0,
 "technical":0,
 "communication":0,
 "problem_solving":0,
 "confidence":0,
 "strengths":[],
 "weaknesses":[],
 "improvements":[],
 "question_scores":[]
}}
"""

    report = None

    if client:
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )

            text = response.text.strip()

            text = re.sub(
                r"^```json\s*|\s*```$",
                "",
                text,
                flags=re.DOTALL
            ).strip()

            match = re.search(r"\{.*\}", text, re.DOTALL)

            if match:
                report = json.loads(match.group(0))

        except Exception as e:
            print("Gemini Error:", e)

    if report is None:
        report = {
            "overall":None,
            "technical":None,
            "communication":None,
            "problem_solving":None,
            "confidence":None,
            "strengths":[
                "Interview completed successfully."
            ],
            "weaknesses":[
                "AI analysis unavailable."
            ],
            "improvements":[
                "Retry later for complete AI evaluation."
            ],
            "question_scores":[]
        }

    report["analytics"] = analytics
    report["transcript"] = transcript
    report["recording_path"] = recording_path

    conn = sqlite3.connect(DB_PATH)

    conn.execute("""
    INSERT INTO interviews(
        role,
        overall,
        technical,
        communication,
        problem_solving,
        confidence,
        created_at
    )
    VALUES(?,?,?,?,?,?,?)
    """,
    (
        role,
        report.get("overall"),
        report.get("technical"),
        report.get("communication"),
        report.get("problem_solving"),
        report.get("confidence"),
        datetime.now().isoformat()
    ))

    conn.commit()
    conn.close()

    pdf_path = create_pdf(report)
    session["latest_pdf"] = pdf_path

    return jsonify(report)

# =========================
# Download PDF
# =========================

@app.route("/download-report")
def download_report():

    pdf_path = session.get("latest_pdf")

    if not pdf_path or not os.path.exists(pdf_path):
        return jsonify({"error":"Report not found"}),404

    return send_file(
        pdf_path,
        as_attachment=True,
        download_name="AI-Interview-Report.pdf"
    )

# =========================
# Run
# =========================

if __name__ == "__main__":
    app.run(debug=True)