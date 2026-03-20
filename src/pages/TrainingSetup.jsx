import React, { useState } from 'react';
import { saveTrainingBlock } from '../utils/storage';

const ACTIVITIES = [
  { id: 'running', label: 'Running', emoji: '🏃', unit: 'km' },
  { id: 'cycling', label: 'Cycling', emoji: '🚴', unit: 'km' },
  { id: 'swimming', label: 'Swimming', emoji: '🏊', unit: 'm' },
  { id: 'gym', label: 'Gym', emoji: '🏋️', unit: null },
  { id: 'elliptical', label: 'Elliptical', emoji: '🔄', unit: 'km' },
  { id: 'pilates', label: 'Pilates', emoji: '🧘', unit: null },
  { id: 'other', label: 'Other', emoji: '⚡', unit: 'km' },
];

export default function TrainingSetup({ onSetupComplete }) {
  const [formData, setFormData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    duration: 12,
    trainingType: 'running',
    raceGoal: ''
  });
  const [initialGoals, setInitialGoals] = useState({});
  const [addedActivities, setAddedActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState('');

  const calculateEndDate = () => {
    const start = new Date(formData.startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + formData.duration * 7 - 1);
    return end.toISOString().split('T')[0];
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const weeks = Array.from({ length: formData.duration }, (_, i) => ({
      weekNumber: i + 1,
      workouts: Array(7).fill(null)
    }));

    const block = {
      id: Date.now().toString(),
      startDate: formData.startDate,
      endDate: calculateEndDate(),
      trainingType: formData.trainingType,
      raceGoal: formData.raceGoal || '',
      weeks,
      dailyLogs: {},
      initialGoals,
      weekGoals: {},
      createdAt: new Date().toISOString()
    };

    await saveTrainingBlock(block);
    onSetupComplete();
  };

  return (
    <div className="page">
      <div style={{ background: 'linear-gradient(135deg, #6366f1, #ec4899)', color: 'white', padding: '2rem', borderRadius: '12px', marginBottom: '2rem', textAlign: 'center' }}>
        <h2 style={{ margin: 0 }}>Create Training Block</h2>
        <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>Set up your training plan</p>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: '500px', margin: '0 auto' }}>
        <div className="form-group">
          <label>Training Type</label>
          <select name="trainingType" value={formData.trainingType} onChange={handleChange} className="form-control">
            <option value="running">Running</option>
            <option value="cycling">Cycling</option>
            <option value="triathlon">Triathlon</option>
            <option value="swimming">Swimming</option>
            <option value="gym">Gym</option>
          </select>
        </div>

        <div className="form-group">
          <label>Race Goal (optional)</label>
          <input type="text" name="raceGoal" placeholder="e.g., Half Marathon" value={formData.raceGoal} onChange={handleChange} className="form-control" />
        </div>

        <div className="form-group">
          <label>Start Date</label>
          <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="form-control" required />
        </div>

        <div className="form-group">
          <label>Duration: {formData.duration} weeks</label>
          <input type="range" name="duration" min="4" max="24" value={formData.duration} onChange={handleChange} className="form-control" />
        </div>

        <div className="form-group">
          <label style={{ color: '#64748b', fontSize: '0.875rem' }}>End Date: {calculateEndDate()}</label>
        </div>

        <div style={{ background: '#f0f4f8', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #cbd5e1' }}>
          <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem' }}>Weekly Goals (optional)</h3>
          <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.8rem', color: '#64748b' }}>Add activities and set Week 1 targets. Goals auto-increase by %/wk each week.</p>
          
          {/* Add activity selector */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <select
              value={selectedActivity}
              onChange={(e) => setSelectedActivity(e.target.value)}
              style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="">Select activity...</option>
              {ACTIVITIES.filter(a => !addedActivities.includes(a.id)).map(a => (
                <option key={a.id} value={a.id}>{a.emoji} {a.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                if (selectedActivity) {
                  setAddedActivities(prev => [...prev, selectedActivity]);
                  setSelectedActivity('');
                }
              }}
              disabled={!selectedActivity}
              style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: selectedActivity ? '#6366f1' : '#cbd5e1', color: 'white', fontWeight: '600', cursor: selectedActivity ? 'pointer' : 'default', fontSize: '0.85rem' }}
            >+ Add</button>
          </div>

          {addedActivities.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                    <th style={{ padding: '0.4rem 0.5rem', color: '#475569', fontWeight: '600' }}>Activity</th>
                    <th style={{ padding: '0.4rem 0.5rem', color: '#475569', fontWeight: '600' }}>Duration</th>
                    <th style={{ padding: '0.4rem 0.5rem', color: '#475569', fontWeight: '600' }}>Distance</th>
                    <th style={{ padding: '0.4rem 0.5rem', color: '#475569', fontWeight: '600', whiteSpace: 'nowrap' }}>+%/wk</th>
                    <th style={{ padding: '0.4rem 0.3rem' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {addedActivities.map(actId => {
                    const act = ACTIVITIES.find(a => a.id === actId);
                    if (!act) return null;
                    const inc = initialGoals[act.id]?.increment || 0;
                    return (
                      <tr key={act.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.5rem', fontWeight: '600', whiteSpace: 'nowrap' }}>{act.emoji} {act.label}</td>
                        <td style={{ padding: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <input type="number" placeholder="0" value={initialGoals[act.id]?.duration || ''} onChange={(e) => setInitialGoals(prev => ({ ...prev, [act.id]: { ...prev[act.id], duration: e.target.value ? parseInt(e.target.value) : 0 } }))} style={{ width: '55px', padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', textAlign: 'center' }} />
                            <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>min</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          {act.unit ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <input type="number" step="0.1" placeholder="0" value={initialGoals[act.id]?.distance || ''} onChange={(e) => setInitialGoals(prev => ({ ...prev, [act.id]: { ...prev[act.id], distance: e.target.value ? parseFloat(e.target.value) : 0 } }))} style={{ width: '55px', padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', textAlign: 'center' }} />
                              <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>{act.unit}</span>
                            </div>
                          ) : (
                            <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <input type="number" min="0" max="50" step="1" placeholder="0" value={inc || ''} onChange={(e) => setInitialGoals(prev => ({ ...prev, [act.id]: { ...prev[act.id], increment: e.target.value ? parseInt(e.target.value) : 0 } }))} style={{ width: '45px', padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', textAlign: 'center' }} />
                            <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>%</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                          <button type="button" onClick={() => {
                            setAddedActivities(prev => prev.filter(id => id !== act.id));
                            setInitialGoals(prev => { const copy = { ...prev }; delete copy[act.id]; return copy; });
                          }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', padding: 0 }}>×</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <button type="submit" className="btn-primary" style={{ width: '100%' }}>Create Training Block</button>
      </form>
    </div>
  );
}
