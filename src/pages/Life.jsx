import React, { useState, useEffect } from 'react';
import { getLifeSections, saveLifeSections, addLifeSection, deleteLifeSection } from '../utils/storage';

function Life() {
  const [sections, setSections] = useState([]);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionType, setNewSectionType] = useState('checklist');
  const [loading, setLoading] = useState(true);
  const [openSectionId, setOpenSectionId] = useState(null);
  const [newItems, setNewItems] = useState({});
  const [activePlanId, setActivePlanId] = useState(null);

  useEffect(() => {
    loadSections();
  }, []);

  const loadSections = async () => {
    setLoading(true);
    try {
      console.log('Loading sections...');
      const savedSections = await getLifeSections();
      console.log('Loaded sections:', savedSections);
      if (!Array.isArray(savedSections)) {
        throw new Error('Sections data is not an array');
      }
      
      const validSections = savedSections
        .filter(s => s && typeof s === 'object')
        .map(s => ({
          id: s.id || `section-${Date.now()}`,
          name: s.name || 'Untitled',
          type: s.type || 'checklist',
          items: s.type === 'brainstorm' ? [] : (Array.isArray(s.items) ? s.items : []),
          plans: s.type === 'brainstorm' ? (Array.isArray(s.plans) ? s.plans : []) : undefined
        }));
      
      console.log('Valid sections:', validSections);
      setSections(validSections);
      
      const itemsState = {};
      validSections.forEach(section => {
        if (section && section.id) {
          itemsState[section.id] = '';
        }
      });
      setNewItems(itemsState);
    } catch (error) {
      console.error('Error loading sections:', error);
      setSections([]);
      setNewItems({});
    }
    setLoading(false);
  };

  const createSection = async () => {
    console.log('Creating section with name:', newSectionName, 'type:', newSectionType);
    if (!newSectionName.trim()) {
      console.log('Name is empty');
      alert('Please enter a section name');
      return;
    }
    
    try {
      // Create and save the section
      const newSection = await addLifeSection(newSectionName, newSectionType);
      console.log('Section created:', newSection);
      
      // Format the section for state
      const formattedSection = {
        id: newSection.id,
        name: newSection.name,
        type: newSection.type,
        items: newSection.type === 'brainstorm' ? [] : (Array.isArray(newSection.items) ? newSection.items : []),
        plans: newSection.type === 'brainstorm' ? (Array.isArray(newSection.plans) ? newSection.plans : []) : undefined
      };
      
      // Directly add to sections state
      console.log('Adding section to state:', formattedSection);
      setSections(prev => [...prev, formattedSection]);
      
      // Clear form
      setNewSectionName('');
      setNewSectionType('checklist');
      
      // Open the section
      console.log('Opening section:', newSection.id);
      setOpenSectionId(newSection.id);
      
    } catch (error) {
      console.error('Error creating section:', error);
      alert('Error creating section: ' + error.message);
    }
  };

  const removeSection = async (sectionId) => {
    if (window.confirm('Delete this section and all its items?')) {
      try {
        await deleteLifeSection(sectionId);
        setOpenSectionId(null);
        await loadSections();
      } catch (error) {
        console.error('Error deleting section:', error);
      }
    }
  };

  const getCurrentSection = () => {
    return sections.find(s => s?.id === openSectionId);
  };

  const openSection = (sectionId) => {
    const section = sections.find(s => s?.id === sectionId);
    if (section && section.type === 'brainstorm' && section.plans && section.plans.length > 0) {
      setActivePlanId(section.plans[0].id);
    }
    setOpenSectionId(sectionId);
  };

  // Checklist functions
  const addItemToSection = async (e, sectionId) => {
    e.preventDefault();
    const itemText = newItems[sectionId]?.trim();
    if (!itemText || !sectionId) return;

    try {
      const updated = sections.map(section => {
        if (section && section.id === sectionId) {
          const currentItems = Array.isArray(section.items) ? section.items : [];
          return {
            ...section,
            items: [...currentItems, { id: Date.now(), text: itemText, completed: false }]
          };
        }
        return section;
      });
      setSections(updated);
      await saveLifeSections(updated);
      setNewItems({ ...newItems, [sectionId]: '' });
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const toggleItem = async (sectionId, itemId) => {
    try {
      const updated = sections.map(section => {
        if (section && section.id === sectionId && Array.isArray(section.items)) {
          return {
            ...section,
            items: section.items.map(item =>
              item && item.id === itemId ? { ...item, completed: !item.completed } : item
            ).filter(Boolean)
          };
        }
        return section;
      });
      setSections(updated);
      await saveLifeSections(updated);
    } catch (error) {
      console.error('Error toggling item:', error);
    }
  };

  const deleteItem = async (sectionId, itemId) => {
    try {
      const updated = sections.map(section => {
        if (section && section.id === sectionId && Array.isArray(section.items)) {
          return {
            ...section,
            items: section.items.filter(item => item && item.id !== itemId)
          };
        }
        return section;
      });
      setSections(updated);
      await saveLifeSections(updated);
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  // Brainstorm functions
  const addPlan = async (sectionId) => {
    try {
      const updated = sections.map(section => {
        if (section && section.id === sectionId && section.type === 'brainstorm') {
          const planNumber = (section.plans?.length || 0) + 1;
          const newPlan = {
            id: `plan-${Date.now()}`,
            name: `Plan ${planNumber}`,
            schedule: '',
            todos: []
          };
          return {
            ...section,
            plans: [...(section.plans || []), newPlan]
          };
        }
        return section;
      });
      setSections(updated);
      await saveLifeSections(updated);
    } catch (error) {
      console.error('Error adding plan:', error);
    }
  };

  const updatePlanSchedule = async (sectionId, planId, schedule) => {
    try {
      const updated = sections.map(section => {
        if (section && section.id === sectionId && section.type === 'brainstorm') {
          return {
            ...section,
            plans: section.plans.map(p =>
              p.id === planId ? { ...p, schedule } : p
            )
          };
        }
        return section;
      });
      setSections(updated);
      await saveLifeSections(updated);
    } catch (error) {
      console.error('Error updating plan:', error);
    }
  };

  const addPlanTodo = async (sectionId, planId, todoText) => {
    try {
      const updated = sections.map(section => {
        if (section && section.id === sectionId && section.type === 'brainstorm') {
          return {
            ...section,
            plans: section.plans.map(p => {
              if (p.id === planId) {
                return {
                  ...p,
                  todos: [...(p.todos || []), { id: Date.now(), text: todoText, completed: false }]
                };
              }
              return p;
            })
          };
        }
        return section;
      });
      setSections(updated);
      await saveLifeSections(updated);
    } catch (error) {
      console.error('Error adding todo:', error);
    }
  };

  const togglePlanTodo = async (sectionId, planId, todoId) => {
    try {
      const updated = sections.map(section => {
        if (section && section.id === sectionId && section.type === 'brainstorm') {
          return {
            ...section,
            plans: section.plans.map(p => {
              if (p.id === planId) {
                return {
                  ...p,
                  todos: p.todos.map(t =>
                    t.id === todoId ? { ...t, completed: !t.completed } : t
                  )
                };
              }
              return p;
            })
          };
        }
        return section;
      });
      setSections(updated);
      await saveLifeSections(updated);
    } catch (error) {
      console.error('Error toggling todo:', error);
    }
  };

  const deletePlanTodo = async (sectionId, planId, todoId) => {
    try {
      const updated = sections.map(section => {
        if (section && section.id === sectionId && section.type === 'brainstorm') {
          return {
            ...section,
            plans: section.plans.map(p => {
              if (p.id === planId) {
                return {
                  ...p,
                  todos: p.todos.filter(t => t.id !== todoId)
                };
              }
              return p;
            })
          };
        }
        return section;
      });
      setSections(updated);
      await saveLifeSections(updated);
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <p style={{ textAlign: 'center', color: '#64748b' }}>Loading...</p>
      </div>
    );
  }

  const currentSection = getCurrentSection();
  const currentPlan = currentSection?.type === 'brainstorm' && currentSection.plans?.find(p => p.id === activePlanId);

  if (openSectionId && currentSection) {
    if (currentSection.type === 'checklist') {
      return (
        <div className="section-full-view">
          <div className="section-view-header">
            <button className="btn-back" onClick={() => setOpenSectionId(null)}>← Back</button>
            <h2>{currentSection.name}</h2>
            <button onClick={() => removeSection(currentSection.id)} className="btn-delete">Delete</button>
          </div>

          <div className="section-view-content">
            <form onSubmit={(e) => addItemToSection(e, currentSection.id)} className="add-item-form">
              <input
                type="text"
                value={newItems[currentSection.id] || ''}
                onChange={(e) => setNewItems({ ...newItems, [currentSection.id]: e.target.value })}
                placeholder={`Add item to ${currentSection.name}...`}
                className="input-field"
              />
              <button type="submit" className="btn-primary">Add Item</button>
            </form>

            <div className="checklist-large">
              {currentSection.items?.length === 0 ? (
                <p className="empty-message">No items yet</p>
              ) : (
                currentSection.items?.map(item => (
                  item && (
                    <div key={item.id} className="checklist-item-large">
                      <input
                        type="checkbox"
                        checked={item.completed || false}
                        onChange={() => toggleItem(currentSection.id, item.id)}
                        className="checkbox"
                      />
                      <span className={item.completed ? 'completed' : ''}>{item.text}</span>
                      <button
                        onClick={() => deleteItem(currentSection.id, item.id)}
                        className="btn-delete"
                      >
                        Delete
                      </button>
                    </div>
                  )
                ))
              )}
            </div>
          </div>
        </div>
      );
    } else if (currentSection.type === 'brainstorm') {
      return (
        <div className="section-full-view brainstorm-view">
          <div className="section-view-header">
            <button className="btn-back" onClick={() => setOpenSectionId(null)}>← Back</button>
            <h2>{currentSection.name}</h2>
            <button onClick={() => removeSection(currentSection.id)} className="btn-delete">Delete</button>
          </div>

          <div className="brainstorm-container">
            <div className="plans-sidebar">
              <h3>Plans</h3>
              <div className="plans-list">
                {currentSection.plans?.map(plan => (
                  <button
                    key={plan.id}
                    className={`plan-button ${activePlanId === plan.id ? 'active' : ''}`}
                    onClick={() => setActivePlanId(plan.id)}
                  >
                    {plan.name}
                  </button>
                ))}
              </div>
              <button onClick={() => addPlan(currentSection.id)} className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                + Add Plan
              </button>
            </div>

            <div className="plan-content">
              {currentPlan ? (
                <>
                  <div className="plan-section">
                    <h3>Schedule/Timeline</h3>
                    <textarea
                      value={currentPlan.schedule || ''}
                      onChange={(e) => updatePlanSchedule(currentSection.id, currentPlan.id, e.target.value)}
                      placeholder="Note your schedule, itinerary, or plans in order..."
                      className="plan-textarea"
                    />
                  </div>

                  <div className="plan-section">
                    <h3>To Do</h3>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const input = e.target.querySelector('.plan-todo-input');
                      if (input.value.trim()) {
                        addPlanTodo(currentSection.id, currentPlan.id, input.value);
                        input.value = '';
                      }
                    }} className="plan-todo-form">
                      <input
                        type="text"
                        className="plan-todo-input"
                        placeholder="Add a task to complete..."
                      />
                      <button type="submit" className="btn-primary">Add</button>
                    </form>

                    <div className="plan-todos">
                      {currentPlan.todos?.length === 0 ? (
                        <p className="empty-message">No todos yet</p>
                      ) : (
                        currentPlan.todos?.map(todo => (
                          todo && (
                            <div key={todo.id} className="plan-todo-item">
                              <input
                                type="checkbox"
                                checked={todo.completed || false}
                                onChange={() => togglePlanTodo(currentSection.id, currentPlan.id, todo.id)}
                                className="checkbox"
                              />
                              <span className={todo.completed ? 'completed' : ''}>{todo.text}</span>
                              <button
                                onClick={() => deletePlanTodo(currentSection.id, currentPlan.id, todo.id)}
                                className="btn-delete"
                              >
                                ×
                              </button>
                            </div>
                          )
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <p className="empty-message">Create a plan to get started</p>
              )}
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="page">
      <h2>Life Sections</h2>

      <div style={{ marginBottom: '2rem', display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
        <input
          type="text"
          value={newSectionName}
          onChange={(e) => {
            console.log('Input changed to:', e.target.value);
            setNewSectionName(e.target.value);
          }}
          placeholder="Section name (e.g., Grocery List, Travel Plan)..."
          className="input-field"
        />
        <select
          value={newSectionType}
          onChange={(e) => {
            console.log('Select changed to:', e.target.value);
            setNewSectionType(e.target.value);
          }}
          className="section-type-select"
        >
          <option value="checklist">Checklist</option>
          <option value="brainstorm">Brainstorm</option>
        </select>
        <button 
          onClick={createSection}
          type="button"
          className="btn-primary" 
          style={{ flex: '0 0 auto', whiteSpace: 'nowrap' }}
        >
          Create Section
        </button>
      </div>

      {sections.length === 0 ? (
        <p className="empty-message">No sections yet. Create one to get started!</p>
      ) : (
        <div className="sections-grid">
          {sections.filter(Boolean).map(section => {
            if (!section || !section.id) return null;
            const itemsCount = section.type === 'checklist'
              ? section.items?.length || 0
              : section.plans?.length || 0;
            
            return (
              <div
                key={section.id}
                className="section-card"
                onClick={() => openSection(section.id)}
              >
                <div className="section-card-badge">{section.type}</div>
                <h3>{section.name}</h3>
                <p className="section-card-subtitle">
                  {section.type === 'checklist'
                    ? `${itemsCount} items`
                    : `${itemsCount} plans`}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Life;
