import React, { useState, useEffect } from 'react';
import { getTodayData, saveTodayData, getCurrentTrainingBlock, getEventsForDate } from '../utils/storage';

function Home() {
  const [checklist, setChecklist] = useState([]);
  const [trainingWorkouts, setTrainingWorkouts] = useState([]);
  const [scheduledEvents, setScheduledEvents] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [dayComments, setDayComments] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const todayData = await getTodayData();
      let items = todayData.checklist || [];
      setDayComments(todayData.dayComments || '');

      // Load scheduled events for today
      const today = new Date().toISOString().split('T')[0];
      const events = await getEventsForDate(today);
      setScheduledEvents(events);

      // Load training workouts for today
      const trainingBlock = await getCurrentTrainingBlock();
      if (trainingBlock) {
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        const blockStart = new Date(trainingBlock.startDate + 'T00:00:00');
        
        // Find Saturday on or before block start
        const startDay = blockStart.getDay();
        const daysBack = startDay === 6 ? 0 : startDay + 1;
        const firstSaturday = new Date(blockStart);
        firstSaturday.setDate(firstSaturday.getDate() - daysBack);
        firstSaturday.setHours(0, 0, 0, 0);
        
        // Calculate which week and day we're in
        const daysDiff = Math.floor((todayDate.getTime() - firstSaturday.getTime()) / (24 * 60 * 60 * 1000));
        const currentWeek = Math.max(1, Math.floor(daysDiff / 7) + 1);
        const dayOfWeek = ((daysDiff % 7) + 7) % 7; // Sat=0, Sun=1, ..., Fri=6
        
        // Ensure weeks is an array (Firebase may convert to object)
        let weeks = trainingBlock.weeks;
        if (weeks && !Array.isArray(weeks)) {
          weeks = Object.values(weeks);
        }
        
        if (currentWeek > 0 && weeks && currentWeek <= weeks.length) {
          const week = weeks[currentWeek - 1];
          // Firebase may convert workouts array to object
          let workoutsArr = week?.workouts;
          if (workoutsArr && !Array.isArray(workoutsArr)) {
            workoutsArr = Object.values(workoutsArr);
          }
          if (week && workoutsArr && workoutsArr[dayOfWeek]) {
            let workouts = workoutsArr[dayOfWeek];
            workouts = Array.isArray(workouts) ? workouts : [workouts];
            
            // Add training workouts to checklist if not already there
            workouts.forEach(w => {
              const workoutText = `🏃 ${w?.type}${w?.duration ? ` (${w.duration}min)` : ''}`;
              const exists = items.some(item => item.isTraining && item.trainingId === w?.id);
              if (!exists) {
                items.unshift({
                  id: `train-${w?.id}`,
                  trainingId: w?.id,
                  isTraining: true,
                  text: workoutText,
                  completed: false
                });
              }
            });
            
            setTrainingWorkouts(workouts);
          } else {
            setTrainingWorkouts([]);
          }
        }
      }
      
      setChecklist(items);
    } catch (err) {
      console.error('Error loading data:', err);
    }
    setLoading(false);
  };

  const addItem = async (e) => {
    e.preventDefault();
    if (newItem.trim()) {
      const updated = [...checklist, { id: Date.now(), text: newItem, completed: false, isTraining: false }];
      setChecklist(updated);
      const todayData = await getTodayData();
      const nonTrainingItems = updated.filter(item => !item.isTraining);
      await saveTodayData({ ...todayData, checklist: nonTrainingItems });
      setNewItem('');
    }
  };

  const toggleItem = async (id) => {
    const updated = checklist.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setChecklist(updated);
    const todayData = await getTodayData();
    const nonTrainingItems = updated.filter(item => !item.isTraining);
    await saveTodayData({ ...todayData, checklist: nonTrainingItems });
  };

  const deleteItem = async (id) => {
    const updated = checklist.filter(item => item.id !== id);
    setChecklist(updated);
    const todayData = await getTodayData();
    const nonTrainingItems = updated.filter(item => !item.isTraining);
    await saveTodayData({ ...todayData, checklist: nonTrainingItems });
  };

  const saveComments = async () => {
    const todayData = await getTodayData();
    await saveTodayData({ ...todayData, dayComments: dayComments });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return (
      <div className="page">
        <p style={{ textAlign: 'center', color: '#64748b' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h2>Today's Checklist</h2>
      
      {scheduledEvents.length > 0 && (
        <div className="scheduled-events-section" style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
          <strong>📅 Today's Events</strong>
          <ul className="events-list">
            {scheduledEvents.map(event => (
              <li key={event.id} className="event-item">
                <span>{event.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <form onSubmit={addItem} className="add-item-form">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add a new task..."
          className="input-field"
        />
        <button type="submit" className="btn-primary">Add Task</button>
      </form>

      <div className="checklist">
        {checklist.length === 0 ? (
          <p className="empty-message">No tasks yet. Add one to get started!</p>
        ) : (
          <>
            {checklist.filter(item => item.isTraining).length > 0 && (
              <>
                <h4 style={{ margin: '1rem 0 0.75rem 0', color: '#6366f1', fontWeight: '600' }}>Training</h4>
                {checklist.filter(item => item.isTraining).map(item => (
                  <div key={item.id} className="checklist-item" style={{ background: '#e0e7ff', borderLeft: '4px solid #6366f1', marginBottom: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => toggleItem(item.id)}
                      className="checkbox"
                    />
                    <span className={item.completed ? 'completed' : ''} style={{ color: '#6366f1', fontWeight: '600' }}>{item.text}</span>
                  </div>
                ))}
              </>
            )}
            {checklist.filter(item => !item.isTraining).length > 0 && (
              <>
                {checklist.filter(item => item.isTraining).length > 0 && <h4 style={{ margin: '1.5rem 0 0.75rem 0', color: '#000' }}>Other Tasks</h4>}
                {checklist.filter(item => !item.isTraining).map(item => (
                  <div key={item.id} className="checklist-item" style={{ marginBottom: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => toggleItem(item.id)}
                      className="checkbox"
                    />
                    <span className={item.completed ? 'completed' : ''}>{item.text}</span>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="btn-delete"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      <div className="progress-section">
        <h3>Progress</h3>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: checklist.length > 0
                ? `${(checklist.filter(i => i.completed).length / checklist.length) * 100}%`
                : '0%'
            }}
          />
        </div>
        <p>
          {checklist.filter(i => i.completed).length} / {checklist.length} completed
          {checklist.filter(item => item.isTraining).length > 0 && <span style={{ color: '#6366f1', marginLeft: '1rem' }}>({checklist.filter(i => i.isTraining && i.completed).length} training)</span>}
        </p>
      </div>

      <div className="comments-section">
        <h3>Day Comments</h3>
        {saved && <div className="success-message">✓ Comments saved!</div>}
        <textarea
          value={dayComments}
          onChange={(e) => setDayComments(e.target.value)}
          placeholder="Add your thoughts, reflections, or notes about today..."
          className="textarea-field"
          rows="8"
        />
        <button onClick={saveComments} className="btn-primary" style={{ marginTop: '1rem' }}>Save Comments</button>
      </div>
    </div>
  );
}

export default Home;
