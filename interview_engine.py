# =========================================
# AI Interview Copilot V11
# File: interview_engine.py
# =========================================

class InterviewEngine:

    def __init__(self, client=None):
        self.client = client

        self.questions = {
            "General Interview": [
                "Tell me about yourself.",
                "What are your strengths?",
                "What is one weakness you are improving?",
                "Describe a challenge you solved.",
                "How do you handle pressure?",
                "Tell me about a team project.",
                "How do you learn new skills?",
                "Why do you want this role?",
                "Where do you see yourself in five years?",
                "Why should we hire you?"
            ],

            "Python Developer": [
                "Tell me about yourself.",
                "What is Python and why is it popular?",
                "Explain the difference between a list and a tuple.",
                "What are Python decorators?",
                "How does exception handling work in Python?",
                "What is Flask?",
                "Explain OOP in Python.",
                "How would you optimize slow Python code?",
                "Tell me about your AI Resume Analyzer project.",
                "Why should we hire you as a Python Developer?"
            ],

            "Web Developer": [
                "Tell me about yourself.",
                "What is HTML?",
                "What is the difference between CSS Grid and Flexbox?",
                "How does JavaScript interact with HTML?",
                "What is the DOM?",
                "What is responsive design?",
                "Explain the difference between GET and POST.",
                "What is Flask and how does it connect with HTML?",
                "Tell me about a web project you built.",
                "Why should we hire you as a Web Developer?"
            ],

            "Data Analyst": [
                "Tell me about yourself.",
                "What is data analysis?",
                "What is the difference between Excel and SQL?",
                "Explain data cleaning.",
                "What are joins in SQL?",
                "How would you visualize sales data?",
                "What is Pandas?",
                "Tell me about a data project you completed.",
                "How do you present insights to stakeholders?",
                "Why should we hire you as a Data Analyst?"
            ],

            "Java Developer": [
                "Tell me about yourself.",
                "What is Java?",
                "What is JVM?",
                "Explain OOP in Java.",
                "Difference between ArrayList and LinkedList.",
                "What is Exception Handling?",
                "What is Multithreading?",
                "What is the Collection Framework?",
                "Describe a Java project you built.",
                "Why should we hire you as a Java Developer?"
            ]
        }

    # =========================================
    # Get Questions
    # =========================================

    def get_questions(self, role):
        return self.questions.get(role, self.questions["General Interview"])

    # =========================================
    # Next Question
    # =========================================

    def next_question(self, role, history):
        question_list = self.get_questions(role)
        index = len(history)

        if index >= len(question_list):
            return None

        return question_list[index]

    # =========================================
    # Total Questions
    # =========================================

    def total_questions(self, role):
        return len(self.get_questions(role))

    # =========================================
    # Interview Finished
    # =========================================

    def is_finished(self, role, history):
        return len(history) >= self.total_questions(role)