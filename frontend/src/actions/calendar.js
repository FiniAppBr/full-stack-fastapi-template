import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

const BOOKINGS_ENDPOINT = endpoints.scheduling.bookings;

const swrOptions = {
  revalidateIfStale: true,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
};

// Color mapping for booking statuses
const STATUS_COLORS = {
  pending: '#FFC107',    // warning/yellow
  confirmed: '#2196F3',  // info/blue
  completed: '#4CAF50',  // success/green
  cancelled: '#9E9E9E',  // grey
  no_show: '#F44336',    // error/red
};

// ----------------------------------------------------------------------

export function useGetEvents() {
  const { data, isLoading, error, isValidating } = useSWR(BOOKINGS_ENDPOINT, fetcher, swrOptions);

  const memoizedValue = useMemo(() => {
    // API returns { data: [...], count: N } - extract the array
    const bookings = data?.data || data || [];

    // Transform bookings to FullCalendar event format
    const events = (Array.isArray(bookings) ? bookings : []).map((booking) => {
      const startDateTime = `${booking.booking_date}T${booking.start_time}`;
      const endDateTime = booking.end_time
        ? `${booking.booking_date}T${booking.end_time}`
        : null;

      return {
        id: booking.id.toString(),
        title: `${booking.customer_name}${booking.reference_code ? ` (${booking.reference_code})` : ''}`,
        start: startDateTime,
        end: endDateTime,
        color: STATUS_COLORS[booking.status] || STATUS_COLORS.pending,
        textColor: '#ffffff',
        allDay: false,
        // Custom data for our booking details
        extendedProps: {
          booking_id: booking.id,
          reference_code: booking.reference_code,
          customer_name: booking.customer_name,
          customer_phone: booking.customer_phone,
          customer_email: booking.customer_email,
          contact_id: booking.contact_id,
          status: booking.status,
          notes: booking.notes,
          source: booking.source,
          provider_id: booking.provider_id,
          service_id: booking.service_id,
        },
      };
    });

    return {
      events: events || [],
      eventsLoading: isLoading,
      eventsError: error,
      eventsValidating: isValidating,
      eventsEmpty: !isLoading && !bookings.length,
    };
  }, [data, error, isLoading, isValidating]);

  return memoizedValue;
}

// ----------------------------------------------------------------------

export async function createEvent(eventData) {
  // Transform FullCalendar event to booking format
  const startDate = new Date(eventData.start);
  const endDate = eventData.end ? new Date(eventData.end) : null;

  const bookingData = {
    customer_name: eventData.title || 'Novo Agendamento',
    booking_date: startDate.toISOString().split('T')[0],
    start_time: startDate.toTimeString().slice(0, 5),
    end_time: endDate ? endDate.toTimeString().slice(0, 5) : null,
    notes: eventData.description || '',
    status: 'pending',
    customer_phone: eventData.customer_phone || null,
    customer_email: eventData.customer_email || null,
    contact_id: eventData.contact_id || null,
    service_id: eventData.service_id || null,
  };

  const response = await axios.post(BOOKINGS_ENDPOINT, bookingData);

  // Revalidate the cache
  mutate(BOOKINGS_ENDPOINT);

  return response.data;
}

// ----------------------------------------------------------------------

export async function updateEvent(eventData) {
  // If we have the booking ID in extendedProps, use it
  const bookingId = eventData.extendedProps?.booking_id || eventData.id;

  const startDate = new Date(eventData.start);
  const endDate = eventData.end ? new Date(eventData.end) : null;

  const updateData = {
    booking_date: startDate.toISOString().split('T')[0],
    start_time: startDate.toTimeString().slice(0, 5),
  };

  if (endDate) {
    updateData.end_time = endDate.toTimeString().slice(0, 5);
  }

  // If title changed and it's not the auto-generated one
  if (eventData.title && !eventData.title.includes('(')) {
    updateData.customer_name = eventData.title;
  }

  await axios.patch(endpoints.scheduling.bookingDetails(bookingId), updateData);

  // Revalidate the cache
  mutate(BOOKINGS_ENDPOINT);
}

// ----------------------------------------------------------------------

export async function deleteEvent(eventId) {
  await axios.delete(endpoints.scheduling.bookingDetails(eventId));

  // Revalidate the cache
  mutate(BOOKINGS_ENDPOINT);
}

// ----------------------------------------------------------------------

// Additional booking-specific functions

export async function confirmBooking(bookingId) {
  await axios.post(endpoints.scheduling.bookingConfirm(bookingId));
  mutate(BOOKINGS_ENDPOINT);
}

export async function cancelBooking(bookingId, reason) {
  await axios.post(endpoints.scheduling.bookingCancel(bookingId), null, {
    params: { reason },
  });
  mutate(BOOKINGS_ENDPOINT);
}

export async function updateBookingStatus(bookingId, status) {
  await axios.patch(endpoints.scheduling.bookingDetails(bookingId), { status });
  mutate(BOOKINGS_ENDPOINT);
}
