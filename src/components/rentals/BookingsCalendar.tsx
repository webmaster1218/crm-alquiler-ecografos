"use client";

import React, { useState, useEffect } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { es } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./calendar.custom.css";
import { supabase } from "../../lib/supabaseClient";

const locales = {
    'es': es,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

interface CalendarEvent {
    id: number;
    title: string;
    start: Date;
    end: Date;
    resource: any;
    allDay: boolean;
    style?: any;
}

interface BookingsCalendarProps {
  onEditBooking?: (booking: any) => void;
  onCreateBooking?: (start: Date, end: Date) => void;
}

export function BookingsCalendar({ onEditBooking, onCreateBooking }: BookingsCalendarProps) {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [view, setView] = useState<View>('month');
    const [date, setDate] = useState(new Date());

    const fetchBookings = async () => {
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select('*')
                .neq('status', 'cancelled');

            if (error) {
                console.error('Error fetching bookings:', error);
                return;
            }

            if (data) {
                const mappedEvents: CalendarEvent[] = data.map(booking => {
                    let titleParts = [];
                    if (booking.quantity_z6 > 0) titleParts.push(`${booking.quantity_z6}x Z6`);
                    if (booking.quantity_z60 > 0) titleParts.push(`${booking.quantity_z60}x Z60`);
                    if (booking.quantity_m7 > 0) titleParts.push(`${booking.quantity_m7}x M7`);
                    if (booking.quantity_mx3 > 0) titleParts.push(`${booking.quantity_mx3}x MX3`);

                    const isMaintenance = booking.status === 'maintenance';
                    const title = isMaintenance 
                        ? `[MANTENIMIENTO] ${titleParts.join(', ')}`
                        : `${titleParts.join(', ')} - ${booking.client_name}`;

                    // Color Logic based on Logistics Status
                    let bgColor = '#3b82f6'; // Default Blue

                    switch (booking.status) {
                        case 'pending_confirmation':
                            bgColor = '#f59e0b'; // Amber 500 (Yellow/Orange)
                            break;
                        case 'pending_delivery':
                            bgColor = '#6366f1'; // Indigo 500
                            break;
                        case 'delivered':
                            bgColor = '#10b981'; // Emerald 500 (Green)
                            break;
                        case 'pending_pickup':
                            bgColor = '#ef4444'; // Red 500
                            break;
                        case 'completed':
                            bgColor = '#64748b'; // Slate 500 (Gray)
                            break;
                        case 'maintenance':
                            bgColor = '#1e293b'; // Slate 800 (Very Dark / Black)
                            break;
                    }

                    const start = new Date(booking.start_date + 'T00:00:00');
                    const end = new Date(booking.end_date + 'T23:59:59');

                    return {
                        id: booking.id,
                        title: title,
                        start: start,
                        end: end,
                        allDay: true,
                        resource: booking,
                        style: { backgroundColor: bgColor }
                    };
                });
                setEvents(mappedEvents);
            }
        } catch (err) {
            console.error('Error in fetchBookings:', err);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    const eventStyleGetter = (event: CalendarEvent) => {
        return {
            className: 'rbc-event-custom',
            style: {
                backgroundColor: event.style?.backgroundColor
            }
        };
    };

    const onNavigate = (newDate: Date) => {
        setDate(newDate);
    };

    const onView = (newView: View) => {
        setView(newView);
    };

    return (
        <div className="w-full h-[650px] md:h-[755px]">
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                showAllEvents={true}
                selectable={true}
                onSelectSlot={(slotInfo) => onCreateBooking && onCreateBooking(slotInfo.start, slotInfo.end)}
                view={view}
                onView={onView}
                date={date}
                onNavigate={onNavigate}
                onSelectEvent={(event) => onEditBooking && onEditBooking(event.resource)}
                views={['month', 'week', 'agenda']}
                culture="es"
                messages={{
                    next: "Siguiente",
                    previous: "Anterior",
                    today: "Hoy",
                    month: "Mes",
                    week: "Semana",
                    day: "Día",
                    agenda: "Agenda",
                    date: "Fecha",
                    time: "Hora",
                    event: "Evento",
                    noEventsInRange: "No hay reservas en este rango."
                }}
                eventPropGetter={eventStyleGetter}
            />
        </div>
    );
}
