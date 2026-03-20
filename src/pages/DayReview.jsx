import React, { useState, useEffect } from 'react';
import { getTodayData, saveTodayData } from '../utils/storage';

function DayReview() {
  const [review, setReview] = useState('');
  const [mood, setMood] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const todayData = getTodayData();
    setReview(todayData.dayReview || '');
    setMood(todayData.mood || '');
  }, []);

  const handleSave = () => {
    const todayData = getTodayData();
    saveTodayData({
      ...todayData,
      dayReview: review,
      mood: mood
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="page">
      <h2>Day Review</h2>
      <p className="subtitle">Reflect on your day and how you felt</p>

      {saved && <div className="success-message">✓ Review saved!</div>}

      <div className="form-group">
        <label htmlFor="mood">How did you feel today?</label>
        <select
          id="mood"
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          className="select-field"
        >
          <option value="">Select mood...</option>
          <option value="amazing">Amazing 🤩</option>
          <option value="good">Good 😊</option>
          <option value="okay">Okay 😐</option>
          <option value="sad">Sad 😞</option>
          <option value="stressed">Stressed 😰</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="review">What happened today? How are you feeling?</label>
        <textarea
          id="review"
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="Write about your day, what went well, what could improve, and how you're feeling overall..."
          className="textarea-field"
          rows="10"
        />
      </div>

      <button onClick={handleSave} className="btn-primary">Save Review</button>
    </div>
  );
}

export default DayReview;
