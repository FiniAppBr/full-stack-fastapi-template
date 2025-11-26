import { useMemo, useContext, useReducer, useCallback, createContext } from 'react';

// ----------------------------------------------------------------------

const AgentFormContext = createContext(null);

// Initial state - matches existing form fields
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

  // Actions - core actions that match backend tool registry
  enabledActions: ['search_knowledge', 'handoff_to_human', 'flag_urgent'],

  // Channels
  enabledChannels: [],

  // Data Collection (Contact Fields)
  // Array of { fieldId, necessity: 'required'|'recommended'|'optional', collectionHint }
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
};

// Action types
const ACTIONS = {
  SET_FIELD: 'SET_FIELD',
  SET_FIELDS: 'SET_FIELDS',
  RESET: 'RESET',
  TOGGLE_IN_ARRAY: 'TOGGLE_IN_ARRAY',
  SET_FIELD_CONFIG: 'SET_FIELD_CONFIG',
  REMOVE_FIELD_CONFIG: 'REMOVE_FIELD_CONFIG',
  MARK_CLEAN: 'MARK_CLEAN',
};

// Reducer
function reducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_FIELD:
      return { ...state, [action.field]: action.value, isDirty: true };

    case ACTIONS.SET_FIELDS:
      return { ...state, ...action.fields, isDirty: true };

    case ACTIONS.RESET:
      return { ...initialState, ...action.data, isDirty: false };

    case ACTIONS.MARK_CLEAN:
      return { ...state, isDirty: false };

    case ACTIONS.TOGGLE_IN_ARRAY: {
      const arr = state[action.field];
      const exists = arr.includes(action.value);
      return {
        ...state,
        [action.field]: exists
          ? arr.filter((item) => item !== action.value)
          : [...arr, action.value],
        isDirty: true,
      };
    }

    case ACTIONS.SET_FIELD_CONFIG: {
      // Add or update a field config
      const { fieldId, necessity, collectionHint } = action.config;
      const existingIdx = state.fieldConfigs.findIndex((c) => c.fieldId === fieldId);
      if (existingIdx >= 0) {
        // Update existing
        const updated = [...state.fieldConfigs];
        updated[existingIdx] = { fieldId, necessity, collectionHint };
        return { ...state, fieldConfigs: updated, isDirty: true };
      }
      // Add new
      return {
        ...state,
        fieldConfigs: [...state.fieldConfigs, { fieldId, necessity, collectionHint }],
        isDirty: true,
      };
    }

    case ACTIONS.REMOVE_FIELD_CONFIG:
      return {
        ...state,
        fieldConfigs: state.fieldConfigs.filter((c) => c.fieldId !== action.fieldId),
        isDirty: true,
      };

    default:
      return state;
  }
}

// ----------------------------------------------------------------------

export function AgentFormProvider({ children, initialData = null }) {
  const [state, dispatch] = useReducer(
    reducer,
    initialData ? { ...initialState, ...initialData } : initialState
  );

  const setField = useCallback((field, value) => {
    dispatch({ type: ACTIONS.SET_FIELD, field, value });
  }, []);

  const setFields = useCallback((fields) => {
    dispatch({ type: ACTIONS.SET_FIELDS, fields });
  }, []);

  const reset = useCallback((data = {}) => {
    dispatch({ type: ACTIONS.RESET, data });
  }, []);

  const toggleInArray = useCallback((field, value) => {
    dispatch({ type: ACTIONS.TOGGLE_IN_ARRAY, field, value });
  }, []);

  const setFieldConfig = useCallback((config) => {
    dispatch({ type: ACTIONS.SET_FIELD_CONFIG, config });
  }, []);

  const removeFieldConfig = useCallback((fieldId) => {
    dispatch({ type: ACTIONS.REMOVE_FIELD_CONFIG, fieldId });
  }, []);

  const markClean = useCallback(() => {
    dispatch({ type: ACTIONS.MARK_CLEAN });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      setField,
      setFields,
      reset,
      toggleInArray,
      setFieldConfig,
      removeFieldConfig,
      markClean,
    }),
    [state, setField, setFields, reset, toggleInArray, setFieldConfig, removeFieldConfig, markClean]
  );

  return <AgentFormContext.Provider value={value}>{children}</AgentFormContext.Provider>;
}

// ----------------------------------------------------------------------

export function useAgentForm() {
  const context = useContext(AgentFormContext);
  if (!context) {
    throw new Error('useAgentForm must be used within AgentFormProvider');
  }
  return context;
}
