// Test script to verify Singapore time formatting
import { formatSingaporeDate } from './date-utils';

// Test with current UTC timestamp
const now = new Date();
const utcISO = now.toISOString(); // This is what backend sends
const formatted = formatSingaporeDate(utcISO);

console.log('Current UTC ISO:', utcISO);
console.log('Formatted Singapore time:', formatted);
console.log('Raw UTC time:', now.toUTCString());
console.log('Singapore time (should be +8 hours):', new Date().toLocaleString('en-SG', {
  timeZone: 'Asia/Singapore',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
}));

// Test with a specific UTC timestamp
const testUTC = '2025-06-27T05:56:00.000Z'; // This would be from your screenshot
const testFormatted = formatSingaporeDate(testUTC);
console.log('Test UTC timestamp:', testUTC);
console.log('Test formatted Singapore time:', testFormatted);
console.log('Should be 13:56 Singapore time if working correctly');