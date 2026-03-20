import React, { useState, useEffect } from 'react';
import { getTodayData, saveTodayData } from '../utils/storage';

function Work() {
  const [workItems, setWorkItems] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const todayData = await getTodayData();
    setWorkItems(todayData.workItems || []);
    setLoading(false);
  };

  const addItem = async (e) => {
    e.preventDefault();
    if (newItem.trim()) {
      const updated = [...workItems, { id: Date.now(), text: newItem, completed: false }];
      setWorkItems(updated);
      const todayData = await getTodayData();
      await saveTodayData({ ...todayData, workItems: updated });
      setNewItem('');
    }
  };

  const toggleItem = async (id) => {
    const updated = workItems.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setWorkItems(updated);
    const todayData = await getTodayData();
    await saveTodayData({ ...todayData, workItems: updated });
  };

  const deleteItem = async (id) => {
    const updated = workItems.filter(item => item.id !== id);
    setWorkItems(updated);
    const todayData = await getTodayData();
    await saveTodayData({ ...todayData, workItems: updated });
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
      <h2>Work Checklist</h2>

      <form onSubmit={addItem} className="add-item-form">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add a work task..."
          className="input-field"
        />
        <button type="submit" className="btn-primary">Add Task</button>
      </form>

      <div className="checklist">
        {workItems.length === 0 ? (
          <p className="empty-message">No work tasks yet. Add one to get started!</p>
        ) : (
          workItems.map(item => (
            <div key={item.id} className="checklist-item">
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
          ))
        )}
      </div>
    </div>
  );
}

export default Work;
