import useSWR from 'swr';
import { useCallback } from 'react';

import axios, { fetcher, endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

/**
 * Hook to fetch contact field definitions (schema)
 */
export function useContactFields() {
  const { data, error, isLoading, mutate } = useSWR(endpoints.contacts.fields, fetcher);

  return {
    fields: data?.data || [],
    totalCount: data?.count || 0,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Hook for contact field CRUD operations
 */
export function useContactFieldActions() {
  const createField = useCallback(async (fieldData) => {
    const response = await axios.post(endpoints.contacts.fields, fieldData);
    return response.data;
  }, []);

  const updateField = useCallback(async (fieldId, fieldData) => {
    const response = await axios.patch(endpoints.contacts.fieldDetails(fieldId), fieldData);
    return response.data;
  }, []);

  const deleteField = useCallback(async (fieldId) => {
    await axios.delete(endpoints.contacts.fieldDetails(fieldId));
  }, []);

  const reorderFields = useCallback(async (fieldIds) => {
    const response = await axios.post(endpoints.contacts.fieldsReorder, fieldIds);
    return response.data;
  }, []);

  return {
    createField,
    updateField,
    deleteField,
    reorderFields,
  };
}

/**
 * Hook to fetch agent field configs
 */
export function useAgentFieldConfigs(agentId) {
  const url = agentId ? endpoints.contacts.agentFields(agentId) : null;

  const { data, error, isLoading, mutate } = useSWR(url, fetcher);

  return {
    configs: data?.data || [],
    totalCount: data?.count || 0,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Hook for agent field config CRUD operations
 */
export function useAgentFieldConfigActions() {
  const createConfig = useCallback(async (configData) => {
    const response = await axios.post(endpoints.contacts.agentFieldConfig, configData);
    return response.data;
  }, []);

  const updateConfig = useCallback(async (configId, configData) => {
    const response = await axios.patch(
      endpoints.contacts.agentFieldConfigDetails(configId),
      configData
    );
    return response.data;
  }, []);

  const deleteConfig = useCallback(async (configId) => {
    await axios.delete(endpoints.contacts.agentFieldConfigDetails(configId));
  }, []);

  return {
    createConfig,
    updateConfig,
    deleteConfig,
  };
}
