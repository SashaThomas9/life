import React, { useState, useEffect } from 'react';
import { getAllDays, getScheduledEvents, addScheduledEvent, deleteScheduledEvent, getTrainingBlocks } from '../utils/storage';

function History() {
  const [allDays, setAllDays] = useState({});
  const [scheduledEvents, setScheduledEvents] = useState({});
  const [trainingDates, setTrainingDates] = useState(new Set());
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [newEventText, setNewEventText] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const days = await getAllDays();
    const events = await getScheduledEvents();
    
    // Build set of dates with training logs
    const blocks = await getTrainingBlocks();
    const tDates = new Set();
    blocks.forEach(block => {
      if (block.dailyLogs) {
        Object.entries(block.dailyLogs).forEach(([dateKey, logs]) => {
          const logArr = Array.isArray(logs) ? logs : (logs?.description ? [logs] : []);
          if (logArr.length > 0) tDates.add(dateKey);
        });
      }
    });
    
    setAllDays(days);
    setScheduledEvents(events);
    setTrainingDates(tDates);
    setLoading(false);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  // Determine what activity strips a day should show
  const getDayIndicators = (dateStr) => {
    const indicators = [];
    const dayData = allDays[dateStr];
    
    if (dayData) {
      // Checklist items completed
      if (dayData.checklist?.some(item => item.completed)) {
        indicators.push('checklist');
      }
      // Day review written
      if (dayData.dayComments?.trim()) {
        indicators.push('review');
      }
      // Work items
      if (dayData.workItems?.length > 0) {
        indicators.push('work');
      }
    }
    
    // Training log
    if (trainingDates.has(dateStr)) {
      indicators.push('training');
    }
    
    // Scheduled events
    if (scheduledEvents[dateStr]?.length > 0) {
      indicators.push('events');
    }
    
    return indicators;
  };

  const INDICATOR_COLORS = {
    training: '#10b981',   // green
    review: '#ec4899',     // pink
    checklist: '#6366f1',  // indigo
    work: '#f59e0b',       // amber
    events: '#8b5cf6',     // purple
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return (
      <div className="calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="calendar-day-header">{day}</div>
        ))}
        {days.map((day, idx) => {
          const dateStr = day ? `${year}-${month}-${String(day).padStart(2, '0')}` : null;
          const indicators = dateStr ? getDayIndicators(dateStr) : [];
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const hasAny = indicators.length > 0;

          return (
            <div
              key={idx}
              className={`cal-cell${day ? '' : ' cal-empty'}${isToday ? ' cal-today' : ''}${isSelected ? ' cal-selected' : ''}${hasAny ? ' cal-has-data' : ''}`}
              onClick={() => day && setSelectedDate(dateStr)}
            >
              {day && (
                <>
                  <span className="cal-num">{day}</span>
                  {indicators.length > 0 && (
                    <div className="cal-strips">
                      {indicators.map(ind => (
                        <div key={ind} className="cal-strip" style={{ background: INDICATOR_COLORS[ind] }} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(todayStr);
  };

  const addEvent = async () => {
    if (selectedDate && newEventText.trim()) {
      await addScheduledEvent(selectedDate, newEventText);
      const events = await getScheduledEvents();
      setScheduledEvents(events);
      setNewEventText('');
    }
  };

  const deleteEvent = async (eventId) => {
    if (selectedDate) {
      await deleteScheduledEvent(selectedDate, eventId);
      const events = await getScheduledEvents();
      setScheduledEvents(events);
    }
  };

  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="page">
        <p style={{ textAlign: 'center', color: '#64748b' }}>Loading...</p>
      </div>
    );
  }

  const selectedIndicators = selectedDate ? getDayIndicators(selectedDate) : [];
  const dayData = selectedDate ? allDays[selectedDate] : null;
  const dayEvents = selectedDate ? scheduledEvents[selectedDate] : null;

  return (
    <div className="page">
      <div className="cal-container">
        <div className="cal-header">
          <button onClick={handlePrevMonth} className="cal-nav-btn">‹</button>
          <div style={{ textAlign: 'center' }}>
            <h2 className="cal-month-title">{monthName}</h2>
            <button onClick={goToToday} className="cal-today-btn">Today</button>
          </div>
          <button onClick={handleNextMonth} className="cal-nav-btn">›</button>
        </div>

        {renderCalendar()}

        <div className="cal-legend">
          {Object.entries(INDICATOR_COLORS).map(([key, color]) => (
            <span key={key} className="cal-legend-item">
              <span className="cal-legend-dot" style={{ background: color }} />
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </span>
          ))}
        </div>
      </div>

      {selectedDate && (
        <div className="cal-detail">
          <div className="cal-detail-header">
            <h3>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </h3>
            {selectedIndicators.length > 0 && (
              <div className="cal-detail-tags">
                {selectedIndicators.map(ind => (
                  <span key={ind} className="cal-tag" style={{ background: INDICATOR_COLORS[ind] }}>
                    {ind.charAt(0).toUpperCase() + ind.slice(1)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {dayData?.dayComments?.trim() && (
            <div className="cal-detail-section" style={{ borderLeftColor: INDICATOR_COLORS.review }}>
              <h4>Day Review</h4>
              <p>{dayData.dayComments}</p>
            </div>
          )}

          {dayData?.checklist?.filter(item => item.completed).length > 0 && (
            <div className="cal-detail-section" style={{ borderLeftColor: INDICATOR_COLORS.checklist }}>
              <h4>Completed Tasks</h4>
              <ul>
                {dayData.checklist.filter(item => item.completed).map(item => (
                  <li key={item.id}>{item.text}</li>
                ))}
              </ul>
            </div>
          )}

          {dayData?.workItems?.length > 0 && (
            <div className="cal-detail-section" style={{ borderLeftColor: INDICATOR_COLORS.work }}>
              <h4>Work</h4>
              <ul>
                {dayData.workItems.filter(item => item.completed).map(item => (
                  <li key={item.id}>{item.text}</li>
                ))}
              </ul>
            </div>
          )}

          {dayData?.mood && (
            <div className="cal-detail-section" style={{ borderLeftColor: '#64748b' }}>
              <h4>Mood</h4>
              <p>{dayData.mood}</p>
            </div>
          )}

          <div className="cal-detail-section" style={{ borderLeftColor: INDICATOR_COLORS.events }}>
            <h4>Events</h4>
            {dayEvents && dayEvents.length > 0 && (
              <ul className="cal-events-list">
                {dayEvents.map(event => (
                  <li key={event.id}>
                    <span>{event.text}</span>
                    <button onClick={() => deleteEvent(event.id)} className="cal-event-delete">✕</button>
                  </li>
                ))}
              </ul>
            )}
            <div className="cal-event-add">
              <input
                type="text"
                placeholder="Add event..."
                value={newEventText}
                onChange={(e) => setNewEventText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addEvent()}
              />
              <button onClick={addEvent}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default History;
