import React, { useState } from "react";
import "./HomePage.css";

const HomePage = () => {

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

          <button className="scenario-button">
            <img src="/images/scenarios/customized.jpg" alt="Custom Built" />
            <p>Custom Built</p>
          </button>
        </div>
      </section>

      {/* -- DARK BAR FOR COOKIE CONSENT / NOTICE -- */}
      <section className="dark-bar">
        <p>
          This website uses AI-based training to provide a more realistic speaking experience.  
          By clicking “Accept,” you agree to our <a href="#privacy">Privacy Policy</a> and <a href="#cookies">Cookies Policy</a>.
        </p>
        <div className="dark-bar-buttons">
          <button className="deny-btn">Deny</button>
          <button className="accept-btn">Accept</button>
        </div>
      </section>

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
        <div className="faq-item">
          <p><strong>What is the "Improve Your Performance" Speaking Practice App?</strong></p>
        </div>
        <div className="faq-item">
          <p><strong>How does the app work?</strong></p>
        </div>
        <div className="faq-item">
          <p><strong>Can I upload my own images for a more realistic practice experience?</strong></p>
        </div>
        <div className="faq-item">
          <p><strong>What kind of feedback will I receive?</strong></p>
        </div>
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
              <label>
                <input type="checkbox" /> I agree to the processing of personal data.
              </label>
              <button type="submit">SEND</button>
            </form>
          </div>

          <div className="contact-images">
            <img src="/images/contact_img1.jpg" alt="Contact1" />
            <img src="/images/contact_img2.jpg" alt="Contact2" />
            <img src="/images/contact_img3.jpg" alt="Contact3" />
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
