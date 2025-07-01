/**
 * Centralized date formatting utilities for consistent Singapore timezone display
 */

export const formatSingaporeDate = (dateString: string): string => {
  // Always convert to Singapore timezone to handle both old and new data
  const date = new Date(dateString);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    console.warn('Invalid date string:', dateString);
    return 'Invalid Date';
  }
  
  // Debug logging to understand timezone conversion
  const originalTime = date.toISOString();
  const formatted = date.toLocaleString('en-SG', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false // Use 24-hour format
  });
  
  console.log(`Date conversion: ${dateString} -> ${originalTime} -> ${formatted}`);
  
  return formatted;
};

export const formatSingaporeDateShort = (dateString: string): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    console.warn('Invalid date string:', dateString);
    return 'Invalid Date';
  }
  return date.toLocaleDateString('en-SG', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatSingaporeTime = (dateString: string): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    console.warn('Invalid date string:', dateString);
    return 'Invalid Time';
  }
  return date.toLocaleTimeString('en-SG', {
    timeZone: 'Asia/Singapore',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

export const formatSingaporeDatetime = (dateString: string): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    console.warn('Invalid date string:', dateString);
    return 'Invalid DateTime';
  }
  return date.toLocaleString('en-SG', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};