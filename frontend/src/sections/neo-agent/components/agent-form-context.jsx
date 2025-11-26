import { useRef, useMemo, useState, useContext, useCallback, createContext, useSyncExternalStore } from 'react';

// ----------------------------------------------------------------------

// Initial state
const initialState = {
  // Identity
  name: '',
  description: '',
  template: 'custom',
  isActive: true,

  // Personality
  tone: 'friendly',
  formality: 'balanced',
  selectedTraits: [],
  customInstructions: '',
  emojiUsage: 'minimal',
  responseStyle: 'whatsapp',
  language: 'pt',
  maxMessages: 4,
  maxResponseLength: 300,

  // Knowledge
  linkedEntities: [],

  // Guardrails
  avoidTopics: [],
  escalationTriggers: [],
  customGuardrails: '',

  // Actions
  enabledActions: ['search_knowledge', 'handoff_to_human', 'flag_urgent'],

  // Channels
  enabledChannels: [],

  // Data Collection
  fieldConfigs: [],

  // Advanced - Models
  extractionModel: 'google/gemini-2.5-flash-lite',
  generationModel: 'google/gemini-2.5-flash-lite',
  extractionTemp: 0.1,
  generationTemp: 0.7,

  // Advanced - Typing
  typingEnabled: true,
  typingBaseMs: 800,
  typingPerCharMs: 30,
  typingMaxDelayMs: 3000,

  // Meta
  isDirty: false,
};

// ----------------------------------------------------------------------
// Store class for external store pattern (avoids re-renders on every change)
// ----------------------------------------------------------------------

class FormStore {
  constructor(initial) {
    this.state = { ...initialState, ...initial };
    this.listeners = new Set();
    this.saveCallback = null;
    this.saveTimeoutId = null;
  }

  getState = () => this.state;

  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  notify = () => {
    this.listeners.forEach((l) => l());
  };

  setField = (field, value) => {
    if (this.state[field] === value) return;
    this.state = { ...this.state, [field]: value, isDirty: true };
    this.notify();
    this.scheduleSave();
  };

  setFields = (fields) => {
    this.state = { ...this.state, ...fields, isDirty: true };
    this.notify();
    this.scheduleSave();
  };

  reset = (data = {}) => {
    this.state = { ...initialState, ...data, isDirty: false };
    this.notify();
  };

  markClean = () => {
    if (!this.state.isDirty) return;
    this.state = { ...this.state, isDirty: false };
    this.notify();
  };

  toggleInArray = (field, value) => {
    const arr = this.state[field];
    const exists = arr.includes(value);
    this.state = {
      ...this.state,
      [field]: exists ? arr.filter((item) => item !== value) : [...arr, value],
      isDirty: true,
    };
    this.notify();
    this.scheduleSave();
  };

  setFieldConfig = (config) => {
    const { fieldId, necessity, collectionHint } = config;
    const existingIdx = this.state.fieldConfigs.findIndex((c) => c.fieldId === fieldId);
    if (existingIdx >= 0) {
      const updated = [...this.state.fieldConfigs];
      updated[existingIdx] = { fieldId, necessity, collectionHint };
      this.state = { ...this.state, fieldConfigs: updated, isDirty: true };
    } else {
      this.state = {
        ...this.state,
        fieldConfigs: [...this.state.fieldConfigs, { fieldId, necessity, collectionHint }],
        isDirty: true,
      };
    }
    this.notify();
    this.scheduleSave();
  };

  removeFieldConfig = (fieldId) => {
    this.state = {
      ...this.state,
      fieldConfigs: this.state.fieldConfigs.filter((c) => c.fieldId !== fieldId),
      isDirty: true,
    };
    this.notify();
    this.scheduleSave();
  };

  // Autosave with debounce
  setSaveCallback = (cb) => {
    this.saveCallback = cb;
  };

  scheduleSave = () => {
    if (!this.saveCallback) return;
    if (this.saveTimeoutId) clearTimeout(this.saveTimeoutId);
    this.saveTimeoutId = setTimeout(() => {
      if (this.state.isDirty && this.state.name && this.saveCallback) {
        this.saveCallback();
      }
    }, 2000);
  };

  cancelPendingSave = () => {
    if (this.saveTimeoutId) {
      clearTimeout(this.saveTimeoutId);
      this.saveTimeoutId = null;
    }
  };
}

// ----------------------------------------------------------------------

const AgentFormContext = createContext(null);

export function AgentFormProvider({ children, initialData = null }) {
  // Create store once
  const storeRef = useRef(null);
  if (!storeRef.current) {
    storeRef.current = new FormStore(initialData);
  }

  // Reset store if initialData changes (e.g., after fetch)
  const [prevInitialData, setPrevInitialData] = useState(initialData);
  if (initialData !== prevInitialData) {
    setPrevInitialData(initialData);
    if (initialData) {
      storeRef.current.reset(initialData);
    }
  }

  return <AgentFormContext.Provider value={storeRef.current}>{children}</AgentFormContext.Provider>;
}

// ----------------------------------------------------------------------
// Hooks - granular subscriptions
// ----------------------------------------------------------------------

function useStore() {
  const store = useContext(AgentFormContext);
  if (!store) throw new Error('useAgentForm must be used within AgentFormProvider');
  return store;
}

// Subscribe to specific field only - component re-renders only when that field changes
export function useFormField(field) {
  const store = useStore();
  const value = useSyncExternalStore(
    store.subscribe,
    () => store.getState()[field],
    () => store.getState()[field]
  );
  return value;
}

// Subscribe to multiple fields
export function useFormFields(fields) {
  const store = useStore();
  const selector = useCallback(() => {
    const state = store.getState();
    return fields.map((f) => state[f]);
  }, [store, fields]);

  const values = useSyncExternalStore(
    store.subscribe,
    selector,
    selector
  );

  return values;
}

// Get actions only (stable, never re-renders)
export function useFormActions() {
  const store = useStore();
  return useMemo(
    () => ({
      setField: store.setField,
      setFields: store.setFields,
      reset: store.reset,
      toggleInArray: store.toggleInArray,
      setFieldConfig: store.setFieldConfig,
      removeFieldConfig: store.removeFieldConfig,
      markClean: store.markClean,
      setSaveCallback: store.setSaveCallback,
      cancelPendingSave: store.cancelPendingSave,
    }),
    [store]
  );
}

// Get full state (use sparingly - causes re-render on any change)
export function useFormState() {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

// Legacy hook for compatibility - use sparingly
export function useAgentForm() {
  const store = useStore();
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);

  return useMemo(
    () => ({
      ...state,
      setField: store.setField,
      setFields: store.setFields,
      reset: store.reset,
      toggleInArray: store.toggleInArray,
      setFieldConfig: store.setFieldConfig,
      removeFieldConfig: store.removeFieldConfig,
      markClean: store.markClean,
    }),
    [state, store]
  );
}
