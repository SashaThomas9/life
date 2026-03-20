import { database, ref, set, get, onValue } from '../config/firebase';

const STORAGE_KEY = 'lifeAppData';
const USER_KEY = 'lifeAppUser';

const getUserStorageKey = () => {
  const user = getCurrentUser();
  return user ? `lifeAppData_${user}` : STORAGE_KEY;
};

// User management
export const getCurrentUser = () => {
  return localStorage.getItem(USER_KEY);
};

export const loginUser = (name) => {
  const sanitized = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
  if (!sanitized) return null;
  localStorage.setItem(USER_KEY, sanitized);
  return sanitized;
};

export const logoutUser = () => {
  localStorage.removeItem(USER_KEY);
};

// Reset all data for the current user
export const resetUserData = async () => {
  const path = getUserPath();
  const storageKey = getUserStorageKey();
  try {
    await set(ref(database, path), defaultState);
    localStorage.setItem(storageKey, JSON.stringify(defaultState));
  } catch (error) {
    console.error('Error resetting data:', error);
  }
};

const getUserPath = () => {
  const user = getCurrentUser();
  return user ? `users/${user}/appData` : 'appData';
};

const defaultState = {
  today: {
    date: new Date().toISOString().split('T')[0],
    checklist: [],
    trainingItems: [],
  },
  daysHistory: {},
  lifeSections: [
    {
      id: 'grocery-default',
      name: 'Grocery List',
      type: 'checklist',
      items: [],
      plans: undefined
    }
  ],
  trainingPlans: [],
  trainingBlocks: [],
  scheduledEvents: {},
};

// Get data from Firebase with fallback to localStorage
export const getStorageData = async () => {
  const path = getUserPath();
  const storageKey = getUserStorageKey();
  try {
    const snapshot = await get(ref(database, path));
    if (snapshot.exists()) {
      return snapshot.val();
    }
  } catch (error) {
    console.error('Error reading from Firebase:', error);
  }
  
  // Fallback to user-specific localStorage
  try {
    const data = localStorage.getItem(storageKey);
    return data ? JSON.parse(data) : defaultState;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return defaultState;
  }
};

// Save data to Firebase and localStorage
export const saveStorageData = async (data) => {
  const path = getUserPath();
  const storageKey = getUserStorageKey();
  try {
    // Save to Firebase
    await set(ref(database, path), data);
  } catch (error) {
    console.error('Error saving to Firebase:', error);
  }
  
  // Also save to user-specific localStorage as backup
  try {
    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

// Listen to real-time changes from Firebase
export const listenToStorageChanges = (callback) => {
  const path = getUserPath();
  try {
    onValue(ref(database, path), (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      }
    });
  } catch (error) {
    console.error('Error listening to Firebase:', error);
  }
};

export const getTodayData = async () => {
  const data = await getStorageData();
  const today = new Date().toISOString().split('T')[0];
  
  if (!data.daysHistory[today]) {
    data.daysHistory[today] = {
      checklist: [],
      workItems: [],
      trainingItems: [],
      dayComments: '',
    };
    await saveStorageData(data);
  }
  
  return data.daysHistory[today];
};

export const saveTodayData = async (todayData) => {
  const data = await getStorageData();
  const today = new Date().toISOString().split('T')[0];
  data.daysHistory[today] = todayData;
  await saveStorageData(data);
};

export const getAllDays = async () => {
  const data = await getStorageData();
  return data.daysHistory;
};

export const getTrainingPlans = async () => {
  const data = await getStorageData();
  return data.trainingPlans || [];
};

export const saveTrainingPlans = async (plans) => {
  const data = await getStorageData();
  data.trainingPlans = plans;
  await saveStorageData(data);
};

export const getLifeSections = async () => {
  try {
    const data = await getStorageData();
    let sections = data?.lifeSections;
    
    // Ensure sections is an array
    if (!Array.isArray(sections)) {
      sections = [
        {
          id: 'grocery-default',
          name: 'Grocery List',
          type: 'checklist',
          items: []
        }
      ];
    }
    
    // Validate and clean up each section
    return sections
      .filter(s => s && typeof s === 'object')
      .map(s => ({
        id: s.id || `section-${Date.now()}`,
        name: s.name || 'Untitled',
        type: s.type || 'checklist',
        items: s.type === 'brainstorm' ? [] : (Array.isArray(s.items) ? s.items : []),
        plans: s.type === 'brainstorm' ? (Array.isArray(s.plans) ? s.plans : []) : undefined
      }));
  } catch (error) {
    console.error('Error getting life sections:', error);
    return [
      {
        id: 'grocery-default',
        name: 'Grocery List',
        type: 'checklist',
        items: []
      }
    ];
  }
};

export const saveLifeSections = async (sections) => {
  try {
    const data = await getStorageData();
    // Validate sections before saving
    const validSections = Array.isArray(sections)
      ? sections.filter(s => s && typeof s === 'object')
      : [];
    data.lifeSections = validSections;
    await saveStorageData(data);
  } catch (error) {
    console.error('Error saving life sections:', error);
  }
};

export const addLifeSection = async (sectionName, sectionType = 'checklist') => {
  try {
    const sections = await getLifeSections();
    const newSection = {
      id: `section-${Date.now()}`,
      name: sectionName || 'Untitled',
      type: sectionType,
      items: sectionType === 'brainstorm' ? [] : [],
      plans: sectionType === 'brainstorm' ? [] : undefined
    };
    sections.push(newSection);
    await saveLifeSections(sections);
    return newSection;
  } catch (error) {
    console.error('Error adding life section:', error);
    throw error;
  }
};

export const deleteLifeSection = async (sectionId) => {
  try {
    const sections = await getLifeSections();
    const filtered = sections.filter(s => s && s.id && s.id !== sectionId);
    await saveLifeSections(filtered);
  } catch (error) {
    console.error('Error deleting life section:', error);
    throw error;
  }
};

export const updateLifeSection = async (sectionId, updatedItems) => {
  try {
    const sections = await getLifeSections();
    const updated = sections.map(s => 
      s && s.id === sectionId ? { ...s, items: Array.isArray(updatedItems) ? updatedItems : [] } : s
    );
    await saveLifeSections(updated);
  } catch (error) {
    console.error('Error updating life section:', error);
    throw error;
  }
};

// Training block functions
export const getTrainingBlocks = async () => {
  const data = await getStorageData();
  let blocks = data.trainingBlocks || [];
  // Firebase may store arrays as objects with numeric keys
  if (blocks && !Array.isArray(blocks)) {
    blocks = Object.values(blocks);
  }
  return blocks;
};

export const saveTrainingBlocks = async (blocks) => {
  const data = await getStorageData();
  data.trainingBlocks = blocks;
  await saveStorageData(data);
};

export const getCurrentTrainingBlock = async () => {
  const blocks = await getTrainingBlocks();
  const today = new Date().toISOString().split('T')[0];
  
  // Find the active block for today
  for (const block of blocks) {
    if (block.startDate <= today && today <= block.endDate) {
      // Firebase may store weeks array as object with numeric keys
      if (block.weeks && !Array.isArray(block.weeks)) {
        block.weeks = Object.values(block.weeks);
      }
      // Also fix workouts arrays inside each week
      if (Array.isArray(block.weeks)) {
        block.weeks.forEach(week => {
          if (week && week.workouts && !Array.isArray(week.workouts)) {
            week.workouts = Object.values(week.workouts);
          }
        });
      }
      return block;
    }
  }
  return null;
};

export const saveTrainingBlock = async (block) => {
  const blocks = await getTrainingBlocks();
  const existingIndex = blocks.findIndex(b => b.id === block.id);
  
  if (existingIndex >= 0) {
    blocks[existingIndex] = block;
  } else {
    blocks.push(block);
  }
  
  await saveTrainingBlocks(blocks);
};

// Weekly totals and goals
export const getWeeklyGoals = async () => {
  const block = await getCurrentTrainingBlock();
  if (block) {
    return block.weeklyGoals || {};
  }
  return {};
};

export const getWeeklyData = async (weekStartDate) => {
  const block = await getCurrentTrainingBlock();
  if (!block) return null;
  
  const week = block.weeks?.find(w => w.startDate === weekStartDate);
  return week || null;
};

// Scheduled events
export const getScheduledEvents = async () => {
  try {
    const data = await getStorageData();
    return data.scheduledEvents || {};
  } catch (error) {
    console.error('Error getting scheduled events:', error);
    return {};
  }
};

export const getEventsForDate = async (dateStr) => {
  try {
    const scheduledEvents = await getScheduledEvents();
    return scheduledEvents[dateStr] || [];
  } catch (error) {
    console.error('Error getting events for date:', error);
    return [];
  }
};

export const addScheduledEvent = async (dateStr, eventText) => {
  try {
    const data = await getStorageData();
    if (!data.scheduledEvents) {
      data.scheduledEvents = {};
    }
    if (!data.scheduledEvents[dateStr]) {
      data.scheduledEvents[dateStr] = [];
    }
    
    const newEvent = {
      id: `event-${Date.now()}`,
      text: eventText,
      createdAt: new Date().toISOString()
    };
    
    data.scheduledEvents[dateStr].push(newEvent);
    await saveStorageData(data);
    return newEvent;
  } catch (error) {
    console.error('Error adding scheduled event:', error);
    return null;
  }
};

export const deleteScheduledEvent = async (dateStr, eventId) => {
  try {
    const data = await getStorageData();
    if (data.scheduledEvents && data.scheduledEvents[dateStr]) {
      data.scheduledEvents[dateStr] = data.scheduledEvents[dateStr].filter(e => e.id !== eventId);
      await saveStorageData(data);
    }
  } catch (error) {
    console.error('Error deleting scheduled event:', error);
  }
};
