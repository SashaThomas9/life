import React, { useState, useEffect } from 'react';
import { getCurrentTrainingBlock, saveTrainingBlock, getTrainingBlocks, saveTrainingBlocks } from '../utils/storage';
import TrainingSetup from './TrainingSetup';

export default function Training() {
  const [loading, setLoading] = useState(true);
  const [currentBlock, setCurrentBlock] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [workoutType, setWorkoutType] = useState('');
  const [activityType, setActivityType] = useState('running');
  const [whatIDid, setWhatIDid] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [workoutDuration, setWorkoutDuration] = useState('');
  const [workoutDistance, setWorkoutDistance] = useState('');
  const [blockTitle, setBlockTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingGoals, setEditingGoals] = useState(false);
  const [weeklyGoals, setWeeklyGoals] = useState({});
  const [logActivity, setLogActivity] = useState('running');
  const [logDuration, setLogDuration] = useState('');
  const [logDistance, setLogDistance] = useState('');

  const ACTIVITIES = [
    { id: 'running', label: 'Running', emoji: '🏃', unit: 'km' },
    { id: 'cycling', label: 'Cycling', emoji: '🚴', unit: 'km' },
    { id: 'swimming', label: 'Swimming', emoji: '🏊', unit: 'm' },
    { id: 'gym', label: 'Gym', emoji: '🏋️', unit: null },
    { id: 'elliptical', label: 'Elliptical', emoji: '🔄', unit: 'km' },
    { id: 'other', label: 'Other', emoji: '⚡', unit: 'km' },
  ];

  // Helper: find the Saturday on or before a given date
  const findSaturday = (date) => {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun, 6=Sat
    const diff = day === 6 ? 0 : day + 1;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  useEffect(() => {
    const load = async () => {
      try {
        const block = await getCurrentTrainingBlock();
        if (block && block.weeks) {
          // Auto-navigate to current week
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const firstSat = findSaturday(new Date(block.startDate + 'T00:00:00'));
          const daysDiff = Math.floor((today.getTime() - firstSat.getTime()) / (24 * 60 * 60 * 1000));
          const weekNum = Math.min(Math.max(1, Math.floor(daysDiff / 7) + 1), block.weeks.length);
          setCurrentWeek(weekNum);
        }
        setCurrentBlock(block);
        setBlockTitle(block?.title || block?.trainingType || '');
      } catch (err) {
        console.error('Error:', err);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return <div className="page">Loading...</div>;
  }

  if (!currentBlock) {
    return <TrainingSetup onSetupComplete={() => window.location.reload()} />;
  }

  const handlePrevWeek = () => {
    setCurrentWeek(prev => Math.max(1, prev - 1));
  };

  const handleNextWeek = () => {
    setCurrentWeek(prev => Math.min(currentBlock.weeks.length, prev + 1));
  };

  const handleSaveWorkout = async () => {
    if (!workoutType.trim() || selectedDay === null || !currentBlock) return;

    try {
      const blockCopy = JSON.parse(JSON.stringify(currentBlock));
      const newWorkout = {
        id: Date.now(),
        type: workoutType,
        activity: activityType,
        duration: workoutDuration ? parseInt(workoutDuration) : null,
        distance: workoutDistance ? parseFloat(workoutDistance) : null,
        recurring: isRecurring
      };

      if (isRecurring) {
        // Add to all weeks for this day
        blockCopy.weeks.forEach(week => {
          if (!week.workouts) week.workouts = [];
          if (!week.workouts[selectedDay]) week.workouts[selectedDay] = [];
          if (!Array.isArray(week.workouts[selectedDay])) {
            week.workouts[selectedDay] = [week.workouts[selectedDay]];
          }
          week.workouts[selectedDay].push({ ...newWorkout, id: Date.now() + Math.random() });
        });
      } else {
        // Add to current week only
        const week = blockCopy.weeks[currentWeek - 1];
        if (!week.workouts) week.workouts = [];
        if (!week.workouts[selectedDay]) week.workouts[selectedDay] = [];
        if (!Array.isArray(week.workouts[selectedDay])) {
          week.workouts[selectedDay] = [week.workouts[selectedDay]];
        }
        week.workouts[selectedDay].push(newWorkout);
      }

      await saveTrainingBlock(blockCopy);
      setCurrentBlock(blockCopy);
      setWorkoutType('');
      setActivityType('running');
      setWorkoutDuration('');
      setWorkoutDistance('');
      setIsRecurring(false);
      setShowModal(false);
      setSelectedDay(null);
    } catch (err) {
      console.error('Error saving workout:', err);
    }
  };

  const handleDeleteWorkout = async (dayIdx, workoutId) => {
    if (!currentBlock) return;

    try {
      const blockCopy = JSON.parse(JSON.stringify(currentBlock));
      const week = blockCopy.weeks[currentWeek - 1];
      if (Array.isArray(week.workouts[dayIdx])) {
        week.workouts[dayIdx] = week.workouts[dayIdx].filter(w => w.id !== workoutId);
      }
      await saveTrainingBlock(blockCopy);
      setCurrentBlock(blockCopy);
    } catch (err) {
      console.error('Error deleting workout:', err);
    }
  };

  if (!currentBlock.weeks || currentBlock.weeks.length === 0) {
    const handleDeleteAndRestart = async () => {
      const blocks = await getTrainingBlocks();
      const filtered = blocks.filter(b => b.id !== currentBlock.id);
      await saveTrainingBlocks(filtered);
      window.location.reload();
    };

    return (
      <div className="page">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h3>This training block doesn't have a valid plan</h3>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>It was created with incomplete data. Would you like to start fresh?</p>
          <button onClick={handleDeleteAndRestart} className="btn-primary">Delete & Create New Block</button>
        </div>
      </div>
    );
  }

  const week = currentBlock.weeks[currentWeek - 1];
  
  if (!week) {
    return <div className="page">Week not found</div>;
  }

  // Determine if this is current week and get today's date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstSat = findSaturday(new Date(currentBlock.startDate + 'T00:00:00'));
  
  // Week start = first Saturday + (currentWeek-1) * 7 days
  const weekStart = new Date(firstSat);
  weekStart.setDate(weekStart.getDate() + (currentWeek - 1) * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  const isCurrentWeek = today >= weekStart && today <= weekEnd;
  
  // Find which day index (Sat=0, Sun=1, ..., Fri=6) today is within this week
  let todayIndex = -1;
  if (isCurrentWeek) {
    todayIndex = Math.floor((today.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000));
  }
  
  let todayWorkouts = [];
  if (isCurrentWeek && week.workouts && week.workouts[todayIndex]) {
    const tw = week.workouts[todayIndex];
    todayWorkouts = Array.isArray(tw) ? tw : [tw];
  }

  // Calculate weekly totals per activity from daily logs
  const getWeekTotals = () => {
    const totals = {};
    if (!currentBlock?.dailyLogs) return totals;
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const dateKey = d.toISOString().split('T')[0];
      let logs = currentBlock.dailyLogs[dateKey];
      if (!logs) continue;
      if (!Array.isArray(logs)) {
        logs = logs?.description ? [logs] : [];
      }
      logs.forEach(log => {
        const act = log.activity || 'other';
        if (!totals[act]) totals[act] = { duration: 0, distance: 0, count: 0 };
        totals[act].duration += log.duration || 0;
        totals[act].distance += log.distance || 0;
        totals[act].count += 1;
      });
    }
    return totals;
  };

  // Detect which activities are scheduled this week
  const getScheduledActivities = () => {
    const activities = new Set();
    if (!week?.workouts) return activities;
    const workouts = Array.isArray(week.workouts) ? week.workouts : Object.values(week.workouts);
    workouts.forEach(day => {
      if (!day) return;
      const dayList = Array.isArray(day) ? day : [day];
      dayList.forEach(w => {
        if (w?.activity) activities.add(w.activity);
      });
    });
    return activities;
  };

  const weekTotals = getWeekTotals();
  const scheduledActivities = getScheduledActivities();

  // Compute goals for the current week from initialGoals + per-activity increment + per-week overrides
  const getWeekGoals = () => {
    const initial = currentBlock.initialGoals || currentBlock.weeklyGoals || {};
    const globalIncrement = currentBlock.weeklyIncrement || 0; // legacy fallback
    const weekOverrides = currentBlock.weekGoals?.[currentWeek];
    
    if (weekOverrides) return weekOverrides;
    
    const computed = {};
    Object.entries(initial).forEach(([actId, goal]) => {
      if (!goal || (!goal.duration && !goal.distance)) return;
      // Per-activity increment, falling back to legacy global increment
      const inc = goal.increment || globalIncrement;
      const multiplier = Math.pow(1 + inc / 100, currentWeek - 1);
      computed[actId] = {
        duration: goal.duration ? Math.round(goal.duration * multiplier) : 0,
        distance: goal.distance ? Math.round(goal.distance * multiplier * 10) / 10 : 0,
        increment: inc
      };
    });
    return computed;
  };

  const goals = getWeekGoals();

  // Show totals for any activity that's scheduled, logged, OR has goals
  const activeActivities = ACTIVITIES.filter(a => 
    scheduledActivities.has(a.id) || weekTotals[a.id] || (goals[a.id] && (goals[a.id].duration || goals[a.id].distance))
  );

  const handleSaveLog = async () => {
    if (!whatIDid.trim() && !logDuration && !logDistance) return;
    try {
      const blockCopy = JSON.parse(JSON.stringify(currentBlock));
      const dateKey = today.toISOString().split('T')[0];
      if (!blockCopy.dailyLogs) blockCopy.dailyLogs = {};
      if (!blockCopy.dailyLogs[dateKey]) blockCopy.dailyLogs[dateKey] = [];
      // Support multiple logs per day (array)
      let logs = blockCopy.dailyLogs[dateKey];
      if (!Array.isArray(logs)) {
        logs = logs?.description ? [logs] : [];
      }
      logs.push({
        id: Date.now(),
        activity: logActivity,
        description: whatIDid,
        duration: logDuration ? parseInt(logDuration) : null,
        distance: logDistance ? parseFloat(logDistance) : null,
        date: dateKey
      });
      blockCopy.dailyLogs[dateKey] = logs;
      await saveTrainingBlock(blockCopy);
      setCurrentBlock(blockCopy);
      setWhatIDid('');
      setLogDuration('');
      setLogDistance('');
    } catch (err) {
      console.error('Error saving log:', err);
    }
  };

  const handleSaveGoals = async () => {
    try {
      const blockCopy = JSON.parse(JSON.stringify(currentBlock));
      if (!blockCopy.weekGoals) blockCopy.weekGoals = {};
      blockCopy.weekGoals[currentWeek] = weeklyGoals;
      await saveTrainingBlock(blockCopy);
      setCurrentBlock(blockCopy);
      setEditingGoals(false);
    } catch (err) {
      console.error('Error saving goals:', err);
    }
  };

  const handleSaveTitle = async () => {
    if (!blockTitle.trim() || !currentBlock) return;
    try {
      const blockCopy = JSON.parse(JSON.stringify(currentBlock));
      blockCopy.title = blockTitle;
      await saveTrainingBlock(blockCopy);
      setCurrentBlock(blockCopy);
      setEditingTitle(false);
    } catch (err) {
      console.error('Error saving title:', err);
    }
  };

  return (
    <div className="page">
      <div style={{ background: 'linear-gradient(135deg, #6366f1, #ec4899)', color: 'white', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
        {editingTitle ? (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <input
              type="text"
              value={blockTitle}
              onChange={(e) => setBlockTitle(e.target.value)}
              className="form-control"
              style={{ padding: '0.5rem', color: '#000' }}
              autoFocus
            />
            <button onClick={handleSaveTitle} style={{ background: 'white', color: '#6366f1', padding: '0.5rem 1rem', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Save</button>
            <button onClick={() => { setEditingTitle(false); setBlockTitle(currentBlock?.title || currentBlock?.trainingType || ''); }} style={{ background: 'transparent', color: 'white', padding: '0.5rem 1rem', border: '1px solid white', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Block: {blockTitle}</h2>
              {currentBlock?.raceGoal && <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>{currentBlock.raceGoal}</p>}
            </div>
            <button onClick={() => setEditingTitle(true)} style={{ background: 'transparent', color: 'white', border: '1px solid white', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>Edit</button>
          </div>
        )}
      </div>

      <div style={{ background: '#f0f4ff', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={handlePrevWeek} disabled={currentWeek === 1} style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>← Prev</button>
        <h3 style={{ margin: 0, fontSize: '0.95rem' }}>Week {currentWeek} of {currentBlock.weeks.length}</h3>
        <button onClick={handleNextWeek} disabled={currentWeek >= currentBlock.weeks.length} style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>Next →</button>
      </div>

      {isCurrentWeek && (
        <>
          <div style={{ background: '#fff7ed', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '2px solid #f97316' }}>
            <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>Today's Plan</h3>
            <p style={{ margin: 0, marginBottom: '1rem', color: '#92400e', fontSize: '0.9rem' }}>{today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <div style={{ marginBottom: '1rem' }}>
              {todayWorkouts.length > 0 ? (
                todayWorkouts.map(w => (
                  <div key={w?.id || Math.random()} style={{ background: '#fed7aa', padding: '0.75rem', borderRadius: '6px', marginBottom: '0.5rem', fontWeight: '600', color: '#7c2d12' }}>
                    <p style={{ margin: 0 }}>{ACTIVITIES.find(a => a.id === w?.activity)?.emoji || '⚡'} {w?.type || 'Workout'}</p>
                    {(w?.duration || w?.distance) && <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', fontWeight: '400' }}>{w?.duration && `${w.duration}min`} {w?.distance && `${w.distance}${ACTIVITIES.find(a => a.id === w?.activity)?.unit || 'km'}`}</p>}
                  </div>
                ))
              ) : (
                <p style={{ margin: 0, color: '#92400e', fontStyle: 'italic' }}>Rest day</p>
              )}
            </div>
            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}>Log What I Did</h4>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <select value={logActivity} onChange={(e) => setLogActivity(e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #fed7aa', fontFamily: 'inherit' }}>
                {ACTIVITIES.map(a => <option key={a.id} value={a.id}>{a.emoji} {a.label}</option>)}
              </select>
              <input type="number" placeholder="Min" value={logDuration} onChange={(e) => setLogDuration(e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #fed7aa', flex: '1', minWidth: '80px', maxWidth: '120px' }} />
              <input type="number" placeholder="Dist" step="0.1" value={logDistance} onChange={(e) => setLogDistance(e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #fed7aa', flex: '1', minWidth: '80px', maxWidth: '120px' }} />
            </div>
            <textarea
              value={whatIDid}
              onChange={(e) => setWhatIDid(e.target.value)}
              placeholder="Describe your workout..."
              rows="2"
              className="form-control"
              style={{ width: '100%', padding: '0.75rem', marginBottom: '0.75rem', border: '1px solid #fed7aa', borderRadius: '6px', fontFamily: 'inherit' }}
            />
            <button onClick={handleSaveLog} className="btn-primary">Save Log</button>
            
            {(() => {
              const dateKey = today.toISOString().split('T')[0];
              let existingLogs = currentBlock?.dailyLogs?.[dateKey];
              if (existingLogs && !Array.isArray(existingLogs)) {
                existingLogs = existingLogs?.description ? [existingLogs] : [];
              }
              if (!existingLogs || existingLogs.length === 0) return null;
              return (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #fed7aa' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', fontSize: '0.85rem', color: '#92400e' }}>Today's Logs:</p>
                  {existingLogs.map((log, i) => (
                    <div key={log.id || i} style={{ background: '#fef3c7', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.3rem', fontSize: '0.8rem' }}>
                      <span style={{ fontWeight: '600' }}>{ACTIVITIES.find(a => a.id === log.activity)?.emoji || '⚡'} </span>
                      {log.description && <span>{log.description} </span>}
                      {log.duration && <span style={{ color: '#92400e' }}>• {log.duration}min </span>}
                      {log.distance && <span style={{ color: '#92400e' }}>• {log.distance}{ACTIVITIES.find(a => a.id === log.activity)?.unit || 'km'}</span>}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </>
      )}

      <div style={{ background: '#f0f4f8', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #cbd5e1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0 }}>Week {currentWeek} Totals</h3>
          </div>
          <button onClick={() => { setWeeklyGoals({ ...goals }); setEditingGoals(!editingGoals); }} style={{ background: 'none', border: '1px solid #6366f1', color: '#6366f1', padding: '0.3rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}>
            {editingGoals ? 'Cancel' : 'Edit Goals'}
          </button>
        </div>
        
        {activeActivities.length === 0 ? (
          <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Add workouts to see activity totals</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
            {activeActivities.map(act => {
              const total = weekTotals[act.id] || { duration: 0, distance: 0, count: 0 };
              const goal = goals[act.id] || {};
              const durationPct = goal.duration ? Math.min(100, (total.duration / goal.duration) * 100) : 0;
              const distancePct = goal.distance ? Math.min(100, (total.distance / goal.distance) * 100) : 0;
              
              return (
                <div key={act.id} style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontWeight: '700', fontSize: '1rem' }}>{act.emoji} {act.label}</p>
                  <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#475569' }}>
                    {total.count} session{total.count !== 1 ? 's' : ''}
                    {goal.increment > 0 && <span style={{ fontSize: '0.7rem', color: '#6366f1' }}> (+{goal.increment}%/wk)</span>}
                  </p>
                  {total.duration > 0 && (
                    <div style={{ marginBottom: '0.3rem' }}>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569' }}>
                        {total.duration}min {goal.duration ? `/ ${goal.duration}min` : ''}
                      </p>
                      {goal.duration > 0 && (
                        <div style={{ background: '#e2e8f0', borderRadius: '4px', height: '6px', marginTop: '2px' }}>
                          <div style={{ background: durationPct >= 100 ? '#10b981' : '#6366f1', borderRadius: '4px', height: '6px', width: `${durationPct}%`, transition: 'width 0.3s' }} />
                        </div>
                      )}
                    </div>
                  )}
                  {(total.distance > 0 || act.unit) && (
                    <div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569' }}>
                        {total.distance}{act.unit || 'km'} {goal.distance ? `/ ${goal.distance}${act.unit || 'km'}` : ''}
                      </p>
                      {goal.distance > 0 && (
                        <div style={{ background: '#e2e8f0', borderRadius: '4px', height: '6px', marginTop: '2px' }}>
                          <div style={{ background: distancePct >= 100 ? '#10b981' : '#6366f1', borderRadius: '4px', height: '6px', width: `${distancePct}%`, transition: 'width 0.3s' }} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {editingGoals && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #cbd5e1' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem' }}>Edit Week {currentWeek} Goals</h4>
            <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: '#64748b' }}>Override the auto-calculated goals for this week. Leave blank to use calculated values.</p>
            {ACTIVITIES.map(act => (
              <div key={act.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ width: '90px', fontSize: '0.85rem', fontWeight: '600' }}>{act.emoji} {act.label}</span>
                <input type="number" placeholder="min" value={weeklyGoals[act.id]?.duration || ''} onChange={(e) => setWeeklyGoals(prev => ({ ...prev, [act.id]: { ...prev[act.id], duration: e.target.value ? parseInt(e.target.value) : 0 } }))} style={{ width: '80px', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>min</span>
                {act.unit && (
                  <>
                    <input type="number" step="0.1" placeholder={act.unit} value={weeklyGoals[act.id]?.distance || ''} onChange={(e) => setWeeklyGoals(prev => ({ ...prev, [act.id]: { ...prev[act.id], distance: e.target.value ? parseFloat(e.target.value) : 0 } }))} style={{ width: '80px', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{act.unit}</span>
                  </>
                )}
              </div>
            ))}
            <button onClick={handleSaveGoals} className="btn-primary" style={{ marginTop: '0.5rem' }}>Save Goals</button>
          </div>
        )}
      </div>
      <div className="training-week-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.75rem' }}>
        {['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((dayName, idx) => {
          const dayDate = new Date(weekStart);
          dayDate.setDate(dayDate.getDate() + idx);
          const dateStr = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          let workoutList = [];
          
          try {
            if (week && week.workouts && week.workouts[idx]) {
              const workouts = week.workouts[idx];
              workoutList = Array.isArray(workouts) ? workouts : [workouts];
            }
          } catch (e) {
            console.error('Error getting workouts:', e);
          }

          return (
            <div key={idx} className="training-day-card" style={{ border: '2px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem', background: idx === todayIndex ? '#fffbeb' : '#f8fafc', minHeight: '180px', display: 'flex', flexDirection: 'column' }}>
              <div className="day-header" style={{ marginBottom: '0.5rem', paddingBottom: '0.4rem', borderBottom: `2px solid ${idx === todayIndex ? '#f59e0b' : '#6366f1'}` }}>
                <p style={{ margin: 0, fontWeight: 'bold', color: idx === todayIndex ? '#d97706' : '#6366f1', fontSize: '0.85rem' }}>{dayName}</p>
                <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b' }}>{dateStr}</p>
              </div>
              <div style={{ flex: 1, marginBottom: '0.5rem' }}>
                {workoutList && workoutList.length > 0 ? (
                  workoutList.map(w => (
                    <div key={w?.id || Math.random()} style={{ background: '#e0e7ff', padding: '0.4rem', borderRadius: '4px', marginBottom: '0.2rem', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: '600', color: '#6366f1' }}>{ACTIVITIES.find(a => a.id === w?.activity)?.emoji || '⚡'} {w?.type || 'Workout'}</p>
                        {(w?.duration || w?.distance) && <p style={{ margin: '0.1rem 0 0 0', color: '#64748b', fontSize: '0.7rem' }}>{w?.duration && `${w.duration}min`} {w?.distance && `${w.distance}${ACTIVITIES.find(a => a.id === w?.activity)?.unit || 'km'}`}</p>}
                        {w?.recurring && <p style={{ margin: '0.1rem 0 0 0', color: '#8b5cf6', fontSize: '0.65rem', fontStyle: 'italic' }}>Recurring</p>}
                      </div>
                      <button onClick={() => handleDeleteWorkout(idx, w.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, fontSize: '0.9rem', flexShrink: 0 }}>×</button>
                    </div>
                  ))
                ) : (
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Rest</p>
                )}
              </div>
              <button onClick={() => { setSelectedDay(idx); setShowModal(true); }} style={{ background: '#f0f4ff', border: '1px dashed #6366f1', color: '#6366f1', padding: '0.3rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600' }}>+ Add</button>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', width: '90%', maxWidth: '380px' }}>
            <h3 style={{ margin: 0, marginBottom: '1rem' }}>Add Workout</h3>
            <select value={activityType} onChange={(e) => setActivityType(e.target.value)} className="form-control" style={{ marginBottom: '1rem', padding: '0.5rem' }}>
              {ACTIVITIES.map(a => <option key={a.id} value={a.id}>{a.emoji} {a.label}</option>)}
            </select>
            <input
              type="text"
              placeholder="e.g., Threshold run, Easy swim"
              value={workoutType}
              onChange={(e) => setWorkoutType(e.target.value)}
              className="form-control"
              style={{ marginBottom: '1rem', padding: '0.5rem' }}
              autoFocus
            />
            <input
              type="number"
              placeholder="Duration (min)"
              value={workoutDuration}
              onChange={(e) => setWorkoutDuration(e.target.value)}
              className="form-control"
              style={{ marginBottom: '1rem', padding: '0.5rem' }}
            />
            <input
              type="number"
              placeholder={`Distance (${ACTIVITIES.find(a => a.id === activityType)?.unit || 'km'})`}
              step="0.1"
              value={workoutDistance}
              onChange={(e) => setWorkoutDistance(e.target.value)}
              className="form-control"
              style={{ marginBottom: '1rem', padding: '0.5rem' }}
            />
            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                type="checkbox"
                id="recurring"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="recurring" style={{ cursor: 'pointer', margin: 0, fontWeight: '600' }}>Recurring every {['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'][selectedDay]}</label>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => { setShowModal(false); setWorkoutType(''); setActivityType('running'); setWorkoutDuration(''); setWorkoutDistance(''); setIsRecurring(false); setSelectedDay(null); }} style={{ flex: 1, padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSaveWorkout} className="btn-primary" style={{ flex: 1 }}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
