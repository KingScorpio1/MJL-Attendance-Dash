// File: frontend/src/pages/CalendarPage.jsx

import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css'; // Import the calendar's styles
import { classesAPI } from '../services/api';
import Spinner from '../components/Spinner';

const eventStyleGetter = (event) => {
    const style = {
        backgroundColor: event.resource.teacher_color || '#3174ad', // Use teacher's color or a default
        borderRadius: '5px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
    };
    return { style };
};

// Set up the localizer by telling the calendar to use moment.js for dates
const localizer = momentLocalizer(moment);

// Helper function to convert our class data into calendar "events"
const transformClassesToEvents = (classes) => {
  const events = [];
  const dayMap = {
    'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
    'Thursday': 4, 'Friday': 5, 'Saturday': 6
  };

  classes.forEach(cls => {
    // Get the day number (0 for Sunday, 1 for Monday, etc.)
    const dayOfWeek = dayMap[cls.day];
    if (dayOfWeek === undefined) return; // Skip if day is invalid

    // Create a moment object for the next occurrence of that day
    let eventDate = moment().day(dayOfWeek);

    // If the event day is in the past for the current week, move it to next week
    if (eventDate.isBefore(moment(), 'day')) {
      eventDate.add(1, 'week');
    }
    
    // Parse the start and end times
    const [startHour, startMinute] = cls.start_time.split(':').map(Number);
    const [endHour, endMinute] = cls.end_time.split(':').map(Number);

    // Create the final start and end Date objects for the calendar
    const startDate = eventDate.clone().hour(startHour).minute(startMinute).toDate();
    const endDate = eventDate.clone().hour(endHour).minute(endMinute).toDate();

    events.push({
      id: cls.id,
      title: `${cls.name} (${cls.teacher_name || 'Unassigned'})`,
      start: startDate,
      end: endDate,
      resource: cls, // Keep the original class object for future use (e.g., clicking on it)
    });
  });

  return events;
};


export default function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    classesAPI.getAll()
      .then(classesData => {
        const transformedEvents = transformClassesToEvents(classesData);
        setEvents(transformedEvents);
      })
      .catch(err => {
        console.error("Failed to fetch classes for calendar:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return <div className="p-10"><Spinner /></div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Class Schedule</h2>
      <div className="bg-white p-4 rounded-lg shadow" style={{ height: '70vh' }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          defaultView="week" // Start with the "week" view
          views={['month', 'week', 'day']} // Allow users to switch views
          style={{ height: '100%' }}
          eventPropGetter={eventStyleGetter}
        />
      </div>
    </div>
  );
}