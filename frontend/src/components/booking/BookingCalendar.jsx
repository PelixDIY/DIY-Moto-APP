// src/components/booking/BookingCalendar.jsx
import React from 'react';
import { format, startOfDay, addHours, differenceInMinutes, parseISO } from 'date-fns';

const BookingCalendar = ({ bookings, date = new Date(), onBookingClick, bays = [] }) => {
    const START_HOUR = 8; // 8 AM
    const END_HOUR = 20; // 8 PM
    const TOTAL_HOURS = END_HOUR - START_HOUR;

    // Generate time slots for header (every hour)
    const timeSlots = Array.from({ length: TOTAL_HOURS }, (_, i) => addHours(startOfDay(date), START_HOUR + i));

    // Helper to calculate position and width
    const getBookingStyle = (startTime, endTime) => {
        // We assume incoming time is ISO strings or Date objects
        const start = typeof startTime === 'string' ? parseISO(startTime) : startTime;
        const end = typeof endTime === 'string' ? parseISO(endTime) : endTime;

        const dayStart = addHours(startOfDay(date), START_HOUR);

        const startDiffMinutes = differenceInMinutes(start, dayStart);
        const durationMinutes = differenceInMinutes(end, start);

        // Scale: 1 hour = 100px (approx, or use percentage)
        // Actually flex-basis or grid-column is better.
        // Let's use percentage relative to total day hours (in minutes).
        const totalDayMinutes = TOTAL_HOURS * 60;

        const left = (startDiffMinutes / totalDayMinutes) * 100;
        const width = (durationMinutes / totalDayMinutes) * 100;

        return {
            left: `${Math.max(0, left)}%`,
            width: `${width}%`,
            position: 'absolute',
            top: '10%',
            bottom: '10%',
            backgroundColor: 'var(--color-primary)',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '0.75rem',
            padding: '2px 4px',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            cursor: 'pointer',
            zIndex: 10
        };
    };

    return (
        <div style={{ backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            {/* Header - Time Slots */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginLeft: '150px' }}>
                {timeSlots.map((time, i) => (
                    <div key={i} style={{
                        flex: 1,
                        padding: '10px',
                        borderLeft: '1px solid var(--color-bg-tertiary)',
                        textAlign: 'center',
                        fontSize: '0.875rem',
                        color: 'var(--color-text-secondary)'
                    }}>
                        {format(time, 'HH:mm')}
                    </div>
                ))}
            </div>

            {/* Body - Bays */}
            {bays.map(bay => (
                <div key={bay.id} style={{ display: 'flex', borderBottom: '1px solid var(--color-bg-tertiary)', position: 'relative', height: '80px' }}>
                    {/* Bay Label */}
                    <div style={{
                        width: '150px',
                        minWidth: '150px',
                        padding: '10px',
                        borderRight: '1px solid var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        fontWeight: '600',
                        backgroundColor: 'var(--color-bg-tertiary)'
                    }}>
                        {bay.name}
                    </div>

                    {/* Timeline Track */}
                    <div style={{ flex: 1, position: 'relative', background: 'repeating-linear-gradient(90deg, transparent, transparent calc(100%/12 - 1px), var(--color-bg-tertiary) calc(100%/12 - 1px), var(--color-bg-tertiary) calc(100%/12))' }}>
                        {bookings
                            .filter(b => b.bayId === bay.id && b.startTime && new Date(b.startTime.seconds ? b.startTime.seconds * 1000 : b.startTime).getDate() === date.getDate())
                            .map(booking => {
                                // Convert Firestore timestamp to JS Date, handling nulls/dates
                                const start = booking.startTime.seconds ? new Date(booking.startTime.seconds * 1000) : new Date(booking.startTime);
                                // For active sessions, endTime is null. We visualize them as ending "now" or at end of day for the calendar view context.
                                let end;
                                if (booking.endTime) {
                                    end = booking.endTime.seconds ? new Date(booking.endTime.seconds * 1000) : new Date(booking.endTime);
                                } else {
                                    end = new Date(); // Active session visualized up to now
                                    // Ensure end > start to avoid negative width
                                    if (end < start) end = new Date(start.getTime() + 60 * 60 * 1000); // Min 1 hour width visual
                                }

                                return (
                                    <div
                                        key={booking.id}
                                        style={getBookingStyle(start, end)}
                                        onClick={() => onBookingClick(booking)}
                                        title={`${booking.customerName} (${format(start, 'HH:mm')} - ${format(end, 'HH:mm')})`}
                                    >
                                        {booking.customerName}
                                    </div>
                                );
                            })}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default BookingCalendar;
