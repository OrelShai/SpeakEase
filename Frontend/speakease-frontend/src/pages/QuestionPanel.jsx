// src/pages/QuestionPanel.jsx
import React from "react";
import "./QuestionPanel.css";


/**
 * Small sticky question panel shown on the right side of the meeting screen.
 * Pass the question text via the `question` prop.
 */
export default function QuestionPanel({
  question = "Tell me about yourself briefly (up to one minute).",
}) {
  return (
    <aside
      className="question-sticky" // makes the panel stick to the top on scroll
      dir="ltr"
      style={{
        background: "#fff",
        padding: "16px",
        borderRadius: "16px",
        boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
        maxWidth: 360,
        lineHeight: 1.6,
      }}
    >
      <h3 style={{ margin: 0, marginBottom: 8 }}>Follow-up Question</h3>
      <div style={{ whiteSpace: "pre-wrap" }}>{question}</div>
    </aside>
  );
}
