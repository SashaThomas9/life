import React, { useState } from 'react';
import { saveTrainingBlock } from '../utils/storage';

const ACTIVITIES = [
  { id: 'running', label: 'Running', emoji: '🏃', unit: 'km' },
  { id: 'cycling', label: 'Cycling', emoji: '🚴', unit: 'km' },
  { id: 'swimming', label: 'Swimming', emoji: '🏊', unit: 'm' },
  { id: 'gym', label: 'Gym', emoji: '🏋️', unit: null },
  { id: 'elliptical', label: 'Elliptical', emoji: '🔄', unit: 'km' },
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

        <div style={{ background: '#f0f4f8', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #cbd5e1' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Weekly Goals (optional)</h3>
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#64748b' }}>Set target goals for Week 1. Leave blank for activities you don't plan to track.</p>
          {ACTIVITIES.map(act => {
            const inc = initialGoals[act.id]?.increment || 0;
            return (
              <div key={act.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ width: '100px', fontSize: '0.85rem', fontWeight: '600' }}>{act.emoji} {act.label}</span>
                <input type="number" placeholder="min" value={initialGoals[act.id]?.duration || ''} onChange={(e) => setInitialGoals(prev => ({ ...prev, [act.id]: { ...prev[act.id], duration: e.target.value ? parseInt(e.target.value) : 0 } }))} style={{ width: '70px', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>min</span>
                {act.unit && (
                  <>
                    <input type="number" step="0.1" placeholder={act.unit} value={initialGoals[act.id]?.distance || ''} onChange={(e) => setInitialGoals(prev => ({ ...prev, [act.id]: { ...prev[act.id], distance: e.target.value ? parseFloat(e.target.value) : 0 } }))} style={{ width: '70px', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{act.unit}</span>
                  </>
                )}
                <input type="number" min="0" max="50" step="1" placeholder="0" value={inc || ''} onChange={(e) => setInitialGoals(prev => ({ ...prev, [act.id]: { ...prev[act.id], increment: e.target.value ? parseInt(e.target.value) : 0 } }))} style={{ width: '50px', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', textAlign: 'center' }} />
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>%/wk</span>
              </div>
            );
          })}
        </div>

        <button type="submit" className="btn-primary" style={{ width: '100%' }}>Create Training Block</button>
      </form>
    </div>
  );
}
