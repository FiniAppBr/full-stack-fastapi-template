import useSWR from 'swr';
import { useMemo, useCallback } from 'react';

import axios, { fetcher, endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

/**
 * Hook to fetch contacts list with filters
 */
export function useContacts({ search, source, tag, skip = 0, limit = 50 } = {}) {
  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (skip) p.set('skip', skip);
    if (limit) p.set('limit', limit);
    if (search) p.set('search', search);
    if (source) p.set('source', source);
    if (tag) p.set('tag', tag);
    return p.toString();
  }, [search, source, tag, skip, limit]);

  const url = `${endpoints.contacts.list}?${params}`;

  const { data, error, isLoading, mutate } = useSWR(url, fetcher);

  return {
    contacts: data?.data || [],
    totalCount: data?.count || 0,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Hook to fetch contact stats
 */
export function useContactStats() {
  const { data, error, isLoading, mutate } = useSWR(endpoints.contacts.stats, fetcher);

  return {
    stats: data || { total: 0, by_source: {}, by_stage: {} },
    isLoading,
    error,
    mutate,
  };
}

/**
 * Hook to fetch a single contact
 */
export function useContact(contactId) {
  const url = contactId ? endpoints.contacts.details(contactId) : null;

  const { data, error, isLoading, mutate } = useSWR(url, fetcher);

  return {
    contact: data,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Hook to fetch contact data with schema
 */
export function useContactData(contactId) {
  const url = contactId ? endpoints.contacts.contactData(contactId) : null;

  const { data, error, isLoading, mutate } = useSWR(url, fetcher);

  return {
    contactData: data,
    fields: data?.fields || [],
    rawData: data?.raw_data || {},
    isLoading,
    error,
    mutate,
  };
}

/**
 * Hook for contact CRUD operations
 */
export function useContactActions() {
  const createContact = useCallback(async (contactData) => {
    const response = await axios.post(endpoints.contacts.create, contactData);
    return response.data;
  }, []);

  const updateContact = useCallback(async (contactId, contactData) => {
    const response = await axios.patch(endpoints.contacts.update(contactId), contactData);
    return response.data;
  }, []);

  const deleteContact = useCallback(async (contactId) => {
    await axios.delete(endpoints.contacts.delete(contactId));
  }, []);

  const updateDataField = useCallback(async (contactId, fieldKey, value) => {
    const response = await axios.patch(
      endpoints.contacts.contactDataField(contactId, fieldKey),
      null,
      { params: { value } }
    );
    return response.data;
  }, []);

  return {
    createContact,
    updateContact,
    deleteContact,
    updateDataField,
  };
}
