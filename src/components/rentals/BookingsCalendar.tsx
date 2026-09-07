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

const CustomEventComponent = ({ event }: { event: CalendarEvent }) => {
    const b = event.resource;
    const isMaintenance = b?.status === 'maintenance';

    const equipList: string[] = [];
    if (b?.quantity_z6 > 0) equipList.push(b.quantity_z6 > 1 ? `Z6 ×${b.quantity_z6}` : 'Z6');
    if (b?.quantity_z60 > 0) equipList.push(b.quantity_z60 > 1 ? `Z60 ×${b.quantity_z60}` : 'Z60');
    if (b?.quantity_m7 > 0) equipList.push(b.quantity_m7 > 1 ? `M7 ×${b.quantity_m7}` : 'M7');
    if (b?.quantity_mx3 > 0) equipList.push(b.quantity_mx3 > 1 ? `MX3 ×${b.quantity_mx3}` : 'MX3');

    const equipShort = equipList.length > 0 ? equipList.join(' + ') : 'Ecógrafo';

    if (isMaintenance) {
        return (
            <div className="flex items-center gap-1.5 overflow-hidden text-xs py-0.5" title={event.title}>
                <span className="shrink-0 text-amber-300 text-[10px]">🔧</span>
                <span className="font-bold uppercase tracking-wider text-[9px] bg-amber-500/25 text-amber-200 px-1 py-0.2 rounded">
                    Mant.
                </span>
                <span className="font-semibold truncate text-[11px] opacity-95">
                    {equipShort}
                </span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1.5 overflow-hidden text-xs py-0.5 w-full" title={event.title}>
            <span className="shrink-0 px-1.5 py-0.2 rounded font-black text-[9px] uppercase tracking-wider bg-black/25 text-white border border-white/10 shadow-2xs">
                {equipShort}
            </span>
            {b?.include_printer && (
                <span className="text-[10px] shrink-0" title="Incluye Impresora">🖨️</span>
            )}
            {b?.include_cart && (
                <span className="text-[10px] shrink-0" title="Incluye Carrito">🛒</span>
            )}
            <span className="font-bold truncate text-[11px] tracking-tight opacity-95">
                {b?.client_name || 'Sin nombre'}
            </span>
        </div>
    );
};

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
                    if (booking.quantity_z6 > 0) titleParts.push(booking.quantity_z6 > 1 ? `Mindray Z6 (×${booking.quantity_z6})` : 'Mindray Z6');
                    if (booking.quantity_z60 > 0) titleParts.push(booking.quantity_z60 > 1 ? `Mindray Z60 (×${booking.quantity_z60})` : 'Mindray Z60');
                    if (booking.quantity_m7 > 0) titleParts.push(booking.quantity_m7 > 1 ? `Mindray M7 (×${booking.quantity_m7})` : 'Mindray M7');
                    if (booking.quantity_mx3 > 0) titleParts.push(booking.quantity_mx3 > 1 ? `Mindray MX3 (×${booking.quantity_mx3})` : 'Mindray MX3');
                    if (booking.include_printer) titleParts.push('+ Impresora');
                    if (booking.include_cart) titleParts.push('+ Carrito');

                    const isMaintenance = booking.status === 'maintenance';
                    const equipStr = titleParts.join(' · ') || 'Ecógrafo';
                    const title = isMaintenance 
                        ? `🔧 Mantenimiento — ${equipStr}`
                        : `${equipStr} — ${booking.client_name || 'Cliente'}`;

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

                    // Create start date at 00:00:00 and end date at 23:59:59 using string components to avoid UTC offset issues
                    const [sY, sM, sD] = (booking.start_date || '').split('-').map(Number);
                    const [eY, eM, eD] = (booking.end_date || '').split('-').map(Number);


                    const start = (sY && sM && sD) ? new Date(sY, sM - 1, sD, 0, 0, 0) : new Date();
                    const end = (eY && eM && eD) ? new Date(eY, eM - 1, eD, 23, 59, 59) : start;

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
                components={{
                    event: CustomEventComponent
                }}
                eventPropGetter={eventStyleGetter}
            />
        </div>
    );
}
