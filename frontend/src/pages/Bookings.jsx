// src/pages/Bookings.jsx
import React, { useEffect, useState } from 'react';
import BookingCalendar from '../components/booking/BookingCalendar';
import BookingForm from '../components/booking/BookingForm';
import LiveBayManager from '../components/booking/LiveBayManager';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import { getBookings, getBays } from '../services/db';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';

const Bookings = () => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [bays, setBays] = useState([]);

    const fetchData = async () => {
        setLoading(true);
        // Load bookings and bays in parallel
        const [bookingsData, baysData] = await Promise.all([
            getBookings(), // TODO: Filter by date
            getBays()
        ]);
        setBookings(bookingsData);
        setBays(baysData);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [selectedDate]);

    const handlePrevDay = () => setSelectedDate(curr => subDays(curr, 1));
    const handleNextDay = () => setSelectedDate(curr => addDays(curr, 1));

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                    <Button variant="secondary" onClick={handlePrevDay} style={{ padding: '8px' }}><ChevronLeft size={20} /></Button>
                    <h2 style={{ fontSize: '1.5rem', minWidth: '200px', textAlign: 'center' }}>
                        {format(selectedDate, 'MMMM d, yyyy')}
                    </h2>
                    <Button variant="secondary" onClick={handleNextDay} style={{ padding: '8px' }}><ChevronRight size={20} /></Button>
                </div>
                <Button onClick={() => setIsModalOpen(true)}>
                    <Plus size={20} /> New Booking
                </Button>
            </div>

            {loading ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>Loading calendar...</div>
            ) : (
                <BookingCalendar
                    bookings={bookings}
                    date={selectedDate}
                    onBookingClick={(b) => alert(`Clicked booking: ${b.customerName}`)}
                    bays={bays}
                />
            )}

            <LiveBayManager bookings={bookings} onUpdate={fetchData} />

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Service Booking">
                <BookingForm
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={fetchData}
                    initialDate={selectedDate}
                    bays={bays}
                />
            </Modal>
        </div>
    );
};

export default Bookings;
