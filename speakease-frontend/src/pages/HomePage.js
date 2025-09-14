import { Link, useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import "./HomePage.css";
import { validateToken, getUserInfo } from "../BackEndAPI/DataModelLogicAPI";
import QuickSetupModal from "../Components/QuickSetupModal/QuickSetupModal";

const HomePage = () => {
  const [showDarkBar, setShowDarkBar] = useState(true);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [username, setUsername] = useState(null);
  const [qsOpen, setQsOpen] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState({ id: null, name: "" });

  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const isValid = await validateToken();

      if (isValid) {
        const userInfo = getUserInfo();
        if (userInfo) {
          setUsername(userInfo.username);
        }
        // 🔁 If there is a pending scenario selection from before login - open the modal
        try {
          const pendingRaw = sessionStorage.getItem("pendingScenario");
          if (pendingRaw) {
            const pending = JSON.parse(pendingRaw);
            if (pending?.id && pending?.name) {
              setSelectedScenario({ id: pending.id, name: pending.name });
              setQsOpen(true);
            }
            sessionStorage.removeItem("pendingScenario");
          }
        } catch (_) {
          sessionStorage.removeItem("pendingScenario");
        }
      } else {
        setUsername(null);
      }
    };

    checkAuth();
  }, []);

  // ✅ Handle cookie consent/rejection
  const handleConsentResponse = () => {
    setShowDarkBar(false);
  };

  // ✅ Open/close FAQ questions
  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  // ⚡ Scenario click - if not logged in -> navigate to login and save selection; if logged in -> open modal
  const handleScenarioClick = (scenarioId, scenarioName) => {
    if (!username) {
      sessionStorage.setItem(
        "pendingScenario",
        JSON.stringify({ id: scenarioId, name: scenarioName })
      );
      navigate("/login", {
        state: {
          // A dedicated redirect can be added if there is logic for it in the login
          redirectTo: "/",
        },
      });
      return;
    }
    setSelectedScenario({ id: scenarioId, name: scenarioName });
    setQsOpen(true);
  };

  // Called after "Start" in the modal
  const handleQuickStart = async ({ durationMin, notes }) => {
    const payload = {
      scenarioId:
        selectedScenario.id ||
        (selectedScenario.name || "").toLowerCase().replace(/\s+/g, "_"),
      scenarioName: selectedScenario.name,
      durationMin,
      notes,
    };

    const res = await fetch("/api/scenarios/create-scenario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include", // If you are using session cookies
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || "Server error");
    }

    const saved = await res.json();
    setQsOpen(false);

    navigate("/VideoTraining", {
      state: {
        scenarioName: saved.scenarioName || selectedScenario.name,
        scenarioId: saved.scenarioId || payload.scenarioId,
        durationMin,
        notes,
        userCustomScenarioId: saved._id,
      },
    });
  };

  // FAQ data with questions and answers
  const faqData = [
    {
      question: 'What is the "Improve Your Performance" Speaking Practice App?',
      answer:
        "SpeakEase is an innovative app designed to help you improve your verbal communication skills through realistic practice scenarios.",
    },
    {
      question: "How does the app work?",
      answer:
        "The app provides various speaking scenarios like job interviews, first dates, presentations, and more. You interact with AI conversation partners.",
    },
    {
      question: "Can I upload my own images for a more realistic practice experience?",
      answer:
        "Yes! You can personalize your experience by uploading images of real people or locations.",
    },
    {
      question: "What kind of feedback will I receive?",
      answer:
        "You'll receive comprehensive feedback on clarity, pace, confidence, and vocabulary usage.",
    },
  ];

  return (
    <div className={`homepage`}>
      {/* -- HERO SECTION -- */}
      <section className="hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1>LET'S PREPARE FOR</h1>
        </div>
      </section>

      {/* -- SCENARIOS SECTION -- */}
      <section className="scenarios">
        <div className="scenario-grid">
          <button
            className="scenario-button"
            onClick={() => handleScenarioClick("first_date", "First Date")}
          >
            <img src="/images/scenarios/dating.jpg" alt="First Date" />
            <p>First Date</p>
          </button>

          <button
            className="scenario-button"
            onClick={() => handleScenarioClick("job_interview", "Job Interview")}
          >
            <img src="/images/scenarios/job_interview.jpg" alt="Job Interview" />
            <p>Job Interview</p>
          </button>

          <button
            className="scenario-button"
            onClick={() => handleScenarioClick("presentation", "Presentation")}
          >
            <img src="/images/scenarios/Presentation.jpg" alt="Presentation" />
            <p>Presentation</p>
          </button>

          <button
            className="scenario-button"
            onClick={() =>
              handleScenarioClick("casual_conversation", "Casual Conversation")
            }
          >
            <img
              src="/images/scenarios/casual_conversation.jpg"
              alt="Casual Conversation"
            />
            <p>Casual Conversation</p>
          </button>

          <button
            className="scenario-button"
            onClick={() => handleScenarioClick("negotiation", "Negotiation")}
          >
            <img src="/images/scenarios/Negotiation.jpg" alt="Negotiation" />
            <p>Negotiation</p>
          </button>

          <button
            className="scenario-button"
            onClick={() =>
              handleScenarioClick("debate_or_argument", "Debate or Argument")
            }
          >
            <img src="/images/scenarios/argument.jpg" alt="Debate or Argument" />
            <p>Debate or Argument</p>
          </button>

          <button
            className="scenario-button"
            onClick={() => handleScenarioClick("storytelling", "Storytelling")}
          >
            <img src="/images/scenarios/Story_telling.jpg" alt="Storytelling" />
            <p>Storytelling</p>
          </button>

          <button
            className="scenario-button"
            onClick={() => handleScenarioClick("custom_built", "Custom Built")}
          >
            <img src="/images/scenarios/customized.jpg" alt="Custom Built" />
            <p>Custom Built</p>
          </button>
        </div>
      </section>

      {/* -- DARK BAR FOR COOKIE CONSENT / NOTICE -- */}
      {showDarkBar && (
        <section className="dark-bar">
          <p>
            This website uses AI-based training to provide a more realistic speaking experience.{" "}
            By clicking “Accept,” you ag“ee to o”r <a href="#privacy">Privacy Policy</a> and{" "}
            <a href="#cookies">Cookies Policy</a>.
          </p>
          <div className="dark-bar-buttons">
            <button className="deny-btn" onClick={handleConsentResponse}>
              Deny
            </button>
            <button className="accept-btn" onClick={handleConsentResponse}>
              Accept
            </button>
          </div>
        </section>
      )}

      {/* -- GUIDANCE SECTION -- */}
      <section className="guidance">
        <h2>PERSONALIZED SPEAKING GUIDANCE JUST FOR YOU</h2>
        <div className="trainers">
          <div className="trainer">
            <img src="/images/trainers/Alex_Carter.png" alt="Alex Carter" />
            <p className="trainer-name">Alex Carter</p>
            <span>Public Speaking Specialist</span>
          </div>
          <div className="trainer">
            <img src="/images/trainers/Liam_Reed.png" alt="Liam Reed" />
            <p className="trainer-name">Liam Reed</p>
            <span>Interview Preparation Expert</span>
          </div>
          <div className="trainer">
            <img src="/images/trainers/Sophia_Turner.png" alt="Sophia Turner" />
            <p className="trainer-name">Sophia Turner</p>
            <span>Body Language Coach</span>
          </div>
          <div className="trainer">
            <img src="/images/trainers/Ella_Davis.png" alt="Ella Davis" />
            <p className="trainer-name">Ella Davis</p>
            <span>Confidence Building Coach</span>
          </div>
        </div>
      </section>

      {/* -- CUSTOMER TESTIMONIALS -- */}
      <section className="testimonials">
        <h2>CUSTOMER</h2>
        <div className="testimonial-container">
          <div className="testimonial">
            <p>
              "SpeakEase helped me feel more confident and relaxed on dates. Now, I actually enjoy meeting new people!"
            </p>
            <p className="testimonial-author">- Daniel Martinez</p>
          </div>
          <div className="testimonial">
            <p>"SpeakEase completely transformed my confidence during job interviews!"</p>
            <p className="testimonial-author">- Emily Johnson</p>
          </div>
          <div className="testimonial">
            <p>
              "The AI partner made practicing so natural, and the stress management tips kept me calm in real situations."
            </p>
            <p className="testimonial-author">- Liam Davis</p>
          </div>
        </div>
      </section>

      {/* -- FAQ SECTION -- */}
      <section className="faq">
        <h2>FAQ</h2>
        {faqData.map((item, index) => (
          <div
            className={`faq-item ${expandedFaq === index ? "expanded" : ""}`}
            key={index}
            onClick={() => toggleFaq(index)}
          >
            <div className="faq-question">
              <p>
                <strong>{item.question}</strong>
              </p>
              <span className="faq-icon">{expandedFaq === index ? "−" : "+"}</span>
            </div>

            {expandedFaq === index && (
              <div className="faq-answer">
                <p>{item.answer}</p>
              </div>
            )}
          </div>
        ))}
      </section>

      {/* -- CONTACT US SECTION -- */}
      <section className="contact">
        <div className="contact-content">
          <div className="contact-text">
            <h2>CONTACT US</h2>
            <p>We're here to help you improve your speaking skills.</p>
            <form>
              <input type="text" placeholder="Full Name" />
              <input type="email" placeholder="Email Address" />
              <textarea placeholder="Add a message"></textarea>
              <button type="submit">SEND</button>
            </form>
          </div>

          <div className="contact-images">
            <img src="../../images/contactus/contactus2.png" alt="Contact1" />
            <img src="../../images/contactus/contactus3.png" alt="Contact1" />
            <img src="../../images/contactus/contactus4.png" alt="Contact1" />
            <img src="../../images/contactus/contactus5.png" alt="Contact1" />
            <img src="../../images/contactus/contactus6.png" alt="Contact1" />
            <img src="../../images/contactus/contactus7.png" alt="Contact1" />
          </div>
        </div>
      </section>

      {/* -- FOOTER -- */}
      <footer>
        <div className="footer-content">
          <p className="footer-email">SpeakEase@gmail.com</p>
          <div className="footer-links">
            <a href="#att">Attention</a> | <a href="#Behance">Behance</a> | <a href="#youtube">YouTube</a> |{" "}
            <a href="#Insta">Instagram</a>
          </div>
          <div className="footer-policy">
            <a href="#privacy">Privacy policy</a> | <a href="#cookies">Cookies policy</a>
          </div>
        </div>
      </footer>

      {/* 🔳 Quick Setup Modal */}
      <QuickSetupModal
        isOpen={qsOpen}
        scenarioId={selectedScenario.id}
        scenarioName={selectedScenario.name}
        onClose={() => setQsOpen(false)}
        onStart={handleQuickStart}
      />
    </div>
  );
};

export default HomePage;
