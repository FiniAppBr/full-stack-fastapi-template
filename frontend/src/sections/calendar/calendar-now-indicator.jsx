import { useEffect, useRef, useCallback } from 'react';

// ----------------------------------------------------------------------

export function useCalendarNowIndicator(calendarRef) {
  const indicatorRef = useRef(null);
  const intervalRef = useRef(null);

  const updateIndicator = useCallback(() => {
    if (!calendarRef?.current) return;

    const calendarApi = calendarRef.current.getApi();
    const calendarEl = calendarApi.el;

    // Find the scrollable time grid container
    const timeGridBody = calendarEl.querySelector('.fc-timegrid-body');
    const slotsContainer = calendarEl.querySelector('.fc-timegrid-slots');

    if (!timeGridBody || !slotsContainer) {
      if (indicatorRef.current) {
        indicatorRef.current.style.display = 'none';
      }
      return;
    }

    // Get time range from calendar config
    const slotMinTime = calendarApi.getOption('slotMinTime') || '00:00:00';
    const slotMaxTime = calendarApi.getOption('slotMaxTime') || '24:00:00';

    const parseTime = (timeStr) => {
      const parts = timeStr.split(':').map(Number);
      return parts[0] * 60 + (parts[1] || 0);
    };

    const startMinutes = parseTime(slotMinTime);
    const endMinutes = parseTime(slotMaxTime);
    const totalMinutes = endMinutes - startMinutes;

    // Current time
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Hide if outside visible range
    if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
      if (indicatorRef.current) {
        indicatorRef.current.style.display = 'none';
      }
      return;
    }

    // Calculate position using the slots container height
    const percentage = (currentMinutes - startMinutes) / totalMinutes;
    const containerHeight = slotsContainer.offsetHeight;
    const topPosition = percentage * containerHeight;

    // Create indicator if needed
    if (!indicatorRef.current) {
      indicatorRef.current = document.createElement('div');
      indicatorRef.current.className = 'fc-now-indicator-full-width';
      indicatorRef.current.innerHTML = '<div class="fc-now-indicator-dot"></div><div class="fc-now-indicator-line"></div>';
    }

    // Append to time grid body (not cols)
    if (indicatorRef.current.parentElement !== timeGridBody) {
      timeGridBody.appendChild(indicatorRef.current);
    }

    indicatorRef.current.style.display = 'flex';
    indicatorRef.current.style.top = `${topPosition}px`;
  }, [calendarRef]);

  useEffect(() => {
    const timer = setTimeout(updateIndicator, 300);
    intervalRef.current = setInterval(updateIndicator, 30000);
    window.addEventListener('resize', updateIndicator);

    return () => {
      clearTimeout(timer);
      clearInterval(intervalRef.current);
      window.removeEventListener('resize', updateIndicator);
      if (indicatorRef.current) {
        indicatorRef.current.remove();
        indicatorRef.current = null;
      }
    };
  }, [updateIndicator]);

  return { updateIndicator };
}
