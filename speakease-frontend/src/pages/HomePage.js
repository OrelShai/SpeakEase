import React, { useState } from "react";
import { Link } from 'react-router-dom';
import "./HomePage.css";

const HomePage = () => {
  // State to track whether the dark bar should be visible
  const [showDarkBar, setShowDarkBar] = useState(true);
  
  // Add state to track which FAQ item is expanded (null means none are expanded)
  const [expandedFaq, setExpandedFaq] = useState(null);

  // Handler function for both Accept and Deny buttons
  const handleConsentResponse = () => {
    setShowDarkBar(false);
  };
  
  // Toggle FAQ item expansion
  const toggleFaq = (index) => {
    if (expandedFaq === index) {
      // If currently expanded, close it
      setExpandedFaq(null);
    } else {
      // Otherwise, expand it
      setExpandedFaq(index);
    }
  };

  // FAQ data with questions and answers
  const faqData = [
    {
      question: "What is the \"Improve Your Performance\" Speaking Practice App?",
      answer: "SpeakEase is an innovative app designed to help you improve your verbal communication skills through realistic practice scenarios. It uses AI technology to simulate real conversations in various situations, allowing you to practice and receive feedback in a safe, judgment-free environment."
    },
    {
      question: "How does the app work?",
      answer: "The app provides various speaking scenarios like job interviews, first dates, presentations, and more. You interact with AI conversation partners that respond naturally to your speech. After each practice session, you receive detailed feedback on your pacing, clarity, confidence, and vocabulary usage, along with tips for improvement."
    },
    {
      question: "Can I upload my own images for a more realistic practice experience?",
      answer: "Yes! You can personalize your experience by uploading images of real people you'll be speaking with (with their consent) or locations where you'll be presenting. This helps create a more immersive and relevant practice environment tailored to your specific needs."
    },
    {
      question: "What kind of feedback will I receive?",
      answer: "You'll receive comprehensive feedback across multiple dimensions: speech clarity, pace, vocabulary usage, confidence indicators, filler word usage (like 'um' and 'uh'), and scenario-specific tips. The app also tracks your progress over time, showing improvement in your speaking patterns and confidence levels."
    }
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
          <button className="scenario-button">
            <img src="/images/scenarios/dating.jpg" alt="First Date" />
            <p>First Date</p>
          </button>

          <button className="scenario-button">
            <img src="/images/scenarios/job_interview.jpg" alt="Job Interview" />
            <p>Job Interview</p>
          </button>

          <button className="scenario-button">
            <img src="/images/scenarios/casual_conversation.jpg" alt="Casual Conversation" />
            <p>Casual Conversation</p>
          </button>

          <button className="scenario-button">
            <img src="/images/scenarios/presentation.jpg" alt="Presentation" />
            <p>Presentation</p>
          </button>

          <button className="scenario-button">
            <img src="/images/scenarios/negotiation.jpg" alt="Negotiation" />
            <p>Negotiation</p>
          </button>

          <button className="scenario-button">
            <img src="/images/scenarios/argument.jpg" alt="Debate or Argument" />
            <p>Debate or Argument</p>
          </button>

          <button className="scenario-button">
            <img src="/images/scenarios/story_telling.jpg" alt="Storytelling" />
            <p>Storytelling</p>
          </button>

          <Link to="/customizescenario" className="scenario-button">
            <img src="/images/scenarios/customized.jpg" alt="Custom Built" />
            <p>Custom Built</p>
          </Link>
        </div>
      </section>

      {/* -- DARK BAR FOR COOKIE CONSENT / NOTICE -- */}
      {showDarkBar && (
        <section className="dark-bar">
          <p>
            This website uses AI-based training to provide a more realistic speaking experience.  
            By clicking “Accept,” you ag“ee to o”r <a href="#privacy">Privacy Policy</a> and <a href="#cookies">Cookies Policy</a>.
          </p>
          <div className="dark-bar-buttons">
            <button className="deny-btn" onClick={handleConsentResponse}>Deny</button>
            <button className="accept-btn" onClick={handleConsentResponse}>Accept</button>
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
            <p>"SpeakEase helped me feel more confident and relaxed on dates. Now, I actually enjoy meeting new people!"</p>
            <p className="testimonial-author">- Daniel Martinez</p>
          </div>
          <div className="testimonial">
            <p>"SpeakEase completely transformed my confidence during job interviews!"</p>
            <p className="testimonial-author">- Emily Johnson</p>
          </div>
          <div className="testimonial">
            <p>"The AI partner made practicing so natural, and the stress management tips kept me calm in real situations."</p>
            <p className="testimonial-author">- Liam Davis</p>
          </div>
        </div>
      </section>

      {/* -- FAQ SECTION -- */}
      <section className="faq">
        <h2>FAQ</h2>
        {faqData.map((item, index) => (
          <div 
            className={`faq-item ${expandedFaq === index ? 'expanded' : ''}`} 
            key={index}
            onClick={() => toggleFaq(index)}
          >
            <div className="faq-question">
              <p><strong>{item.question}</strong></p>
              <span className="faq-icon">{expandedFaq === index ? '−' : '+'}</span>
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
            <a href="#att">Attention</a> | <a href="#Behance">Behance</a> | <a href="#youtube">YouTube</a> | <a href="#Insta">Instagram</a>
          </div>
          <div className="footer-policy">
            <a href="#privacy">Privacy policy</a> | <a href="#cookies">Cookies policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
