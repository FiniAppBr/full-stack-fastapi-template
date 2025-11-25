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

  // Actions
  enabledActions: ['send_message', 'handoff_human'],

  // Channels
  enabledChannels: [],

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
};

// Reducer
function reducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_FIELD:
      return { ...state, [action.field]: action.value };

    case ACTIONS.SET_FIELDS:
      return { ...state, ...action.fields };

    case ACTIONS.RESET:
      return { ...initialState, ...action.data };

    case ACTIONS.TOGGLE_IN_ARRAY: {
      const arr = state[action.field];
      const exists = arr.includes(action.value);
      return {
        ...state,
        [action.field]: exists
          ? arr.filter((item) => item !== action.value)
          : [...arr, action.value],
      };
    }

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

  const value = useMemo(
    () => ({
      ...state,
      setField,
      setFields,
      reset,
      toggleInArray,
    }),
    [state, setField, setFields, reset, toggleInArray]
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
