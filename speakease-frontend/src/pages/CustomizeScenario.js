import React from 'react';
import './CustomizeScenario.css';
import { Link } from 'react-router-dom';

const CustomizeScenario = () => {
  return (
    <div className="customize-container">
      <h1>Customize your scenario</h1>
      <p>Create a scenario that fits your goals and preferences</p>
      
      <div className="form-container">
        <div className="left-section">
          <div className="input-group">
            <label>Conversation Goal</label>
            <input type="text" placeholder="For example: persuade, present information, ask questions..." />
          </div>
          <div className="input-group">
            <label>Scenario Name</label>
            <input type="text" placeholder="Add your scenario name" />
          </div>
          <div className="input-group">
            <label>Partner's Tone</label>
            <select>
              <option>Friendly</option>
              <option>Professional</option>
              <option>Strict</option>
              <option>Humorous</option>
            </select>
          </div>
          <div className="input-group">
            <label>Duration</label>
            <input type="text" placeholder="How long would you like to practice?" />
          </div>
          <div className="input-group">
            <label>Language</label>
            <select>
              <option>Choose your practice language</option>
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
              <option>German</option>
            </select>
          </div>
        </div>
        
        <div className="right-section">
          <div className="input-group">
            <label>Experience Level</label>
            <select>
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Expert</option>
            </select>
          </div>
          <div className="input-group">
            <label>Use of Complex Vocabulary</label>
            <select>
              <option>Basic</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </div>
          <div className="input-group">
            <label>Group Scenarios</label>
            <select>
              <option>Choose participants number</option>
            </select>
          </div>
          <button className="add-partner">Add partner picture</button>
          <div className="save-settings">
            <input type="checkbox" /> Save the settings for future practice sessions.
          </div>
          <Link to="/VideoTraining" className="scenario-button">
            <button className="start-scenario">Start scenario</button>
            <p className="back-home">Want a built-in scenario? <a href="/">Back to home screen</a></p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CustomizeScenario;
