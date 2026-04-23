import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─────────────────────────────────────────────
// Thunks
// ─────────────────────────────────────────────

/** Save (POST) or update (PUT) an interaction */
export const logInteraction = createAsyncThunk(
  'interaction/log',
  async (data) => {
    if (data.interactionId) {
      const response = await axios.put(`${API_URL}/interaction/${data.interactionId}`, data);
      return response.data;
    } else {
      const response = await axios.post(`${API_URL}/log-interaction`, data);
      return response.data;
    }
  }
);

/** Send a chat message with full conversation context */
export const sendMessage = createAsyncThunk(
  'interaction/sendMessage',
  async (message, { getState }) => {
    const { chatHistory, selectedHCP, selectedInteractionId, lastShownInteractions } = getState().interaction;
    // Limit to last 6 messages to avoid token bloat
    const history = chatHistory.slice(-7, -1).map(m => ({ role: m.role, content: m.content }));

    const conversation_context = {
      last_shown_interactions: lastShownInteractions?.length ? lastShownInteractions : undefined,
      selected_hcp: selectedHCP || undefined,
      selected_interaction_id: selectedInteractionId || undefined,
    };

    const response = await axios.post(`${API_URL}/chat`, {
      message,
      history,
      conversation_context,
    });
    return response.data;
  }
);

/** Fetch all interactions */
export const fetchInteractions = createAsyncThunk(
  'interaction/fetchAll',
  async () => {
    const response = await axios.get(`${API_URL}/interactions`);
    return response.data;
  }
);

/** Fetch interactions for a specific HCP */
export const fetchHCPHistory = createAsyncThunk(
  'interaction/fetchHistory',
  async (hcpName) => {
    const response = await axios.get(`${API_URL}/hcp-history/${encodeURIComponent(hcpName)}`);
    return response.data;
  }
);

/** Load a single interaction by ID into the form */
export const loadInteractionById = createAsyncThunk(
  'interaction/loadById',
  async (interactionId) => {
    const response = await axios.get(`${API_URL}/interaction/${interactionId}`);
    return response.data;
  }
);

// ─────────────────────────────────────────────
// Helper: blank form
// ─────────────────────────────────────────────
const blankForm = () => ({
  interactionId: null,
  hcp_name: '',
  interaction_type: 'In-person',
  datetime: (() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now - offset).toISOString().slice(0, 16);
  })(),
  notes: '',
  topics: '',
  sentiment: 'Neutral',
  summary: '',
  materials: '',
  follow_ups: [],
});

// ─────────────────────────────────────────────
// Slice
// ─────────────────────────────────────────────
const interactionSlice = createSlice({
  name: 'interaction',
  initialState: {
    formData: blankForm(),
    interactions: [],
    hcpHistory: [],
    chatHistory: [],
    chatLoading: false,
    formLoading: false,
    historyLoading: false,
    error: null,
    currentView: 'form',      // 'form' | 'history'
    filterHCP: null,

    // ── Conversational CRM state ──────────────
    selectedHCP: null,                // HCP currently in context
    selectedInteractionId: null,      // Interaction loaded into form
    lastShownInteractions: [],        // List shown in the last show_history / select_interaction response
  },

  reducers: {
    updateFormField: (state, action) => {
      const { field, value } = action.payload;
      state.formData[field] = value;
    },
    setFormData: (state, action) => {
      state.formData = { ...state.formData, ...action.payload };
    },
    /** Merge only provided keys into formData (for update_form) */
    updatePartialForm: (state, action) => {
      const updates = action.payload;
      Object.keys(updates).forEach(key => {
        if (key in state.formData || ['hcp_name','interaction_type','datetime','notes','topics','sentiment','summary','materials'].includes(key)) {
          state.formData[key] = updates[key];
        }
      });
    },
    addFollowUp: (state) => {
      state.formData.follow_ups.push({ action: '', due_date: null });
    },
    updateFollowUp: (state, action) => {
      const { index, field, value } = action.payload;
      state.formData.follow_ups[index][field] = value;
    },
    addChatMessage: (state, action) => {
      state.chatHistory.push(action.payload);
    },
    setCurrentView: (state, action) => {
      state.currentView = action.payload;
    },
    setFilterHCP: (state, action) => {
      state.filterHCP = action.payload;
    },
    markMessageSynced: (state, action) => {
      const index = action.payload;
      if (state.chatHistory[index]) {
        state.chatHistory[index].isSynced = true;
      }
    },
    // Conversational CRM
    setSelectedHCP: (state, action) => {
      state.selectedHCP = action.payload;
    },
    setSelectedInteractionId: (state, action) => {
      state.selectedInteractionId = action.payload;
    },
    setLastShownInteractions: (state, action) => {
      state.lastShownInteractions = action.payload;
    },
    resetConversationContext: (state) => {
      state.selectedHCP = null;
      state.selectedInteractionId = null;
      state.lastShownInteractions = [];
    },
    /** Reset EVERYTHING (form, chat, context) */
    resetSystem: (state) => {
      state.formData = blankForm();
      state.chatHistory = [];
      state.selectedHCP = null;
      state.selectedInteractionId = null;
      state.lastShownInteractions = [];
      state.currentView = 'form';
    }
  },

  extraReducers: (builder) => {
    builder
      // ── sendMessage ─────────────────────────────
      .addCase(sendMessage.pending, (state) => {
        state.chatLoading = true;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.chatLoading = false;
        const payload = action.payload;
        const action_type = payload?.action;
        const action_data = payload?.action_data || {};
        const responseText = payload?.response || '';

        // Push assistant message with full metadata for rendering
        state.chatHistory.push({
          role: 'assistant',
          content: responseText,
          action: action_type,
          action_data: action_data,
          extracted_data: payload?.extracted_data || null,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });

        // ── Handle action side-effects ───────────
        if (action_type === 'show_history' || action_type === 'select_interaction') {
          const hcpName = action_data.hcp_name;
          if (hcpName) state.selectedHCP = hcpName;
          // lastShownInteractions will be populated after fetchHCPHistory resolves
        }

        if (action_type === 'update_form' && action_data.updates) {
          const updates = action_data.updates;
          Object.keys(updates).forEach(key => {
            if (key === 'topics') {
              // Append to existing topics if not already present
              const existing = state.formData.topics || '';
              const newTopics = updates[key];
              const existingArr = existing.split(',').map(t => t.trim()).filter(Boolean);
              const incomingArr = (typeof newTopics === 'string' ? newTopics.split(',') : (Array.isArray(newTopics) ? newTopics : [])).map(t => t.trim()).filter(Boolean);
              
              const combined = Array.from(new Set([...existingArr, ...incomingArr])).join(', ');
              state.formData.topics = combined;
            } else if (key === 'follow_ups') {
               // Ensure follow_ups are objects
               const incoming = Array.isArray(updates[key]) ? updates[key] : [updates[key]];
               state.formData.follow_ups = incoming.map(f => 
                 typeof f === 'string' ? { action: f, due_date: null } : f
               );
            } else {
              state.formData[key] = updates[key];
            }
          });
        }

        // Logging extraction
        if (action_type === 'extract_new_interaction' && payload?.extracted_data) {
          const extracted = payload.extracted_data;
          const safeFollowUps = Array.isArray(extracted.follow_ups)
            ? extracted.follow_ups
            : (typeof extracted.follow_ups === 'string' ? [extracted.follow_ups] : []);

          state.formData = {
            ...state.formData,
            ...extracted,
            follow_ups: safeFollowUps.map(f =>
              typeof f === 'string' ? { action: f, due_date: null } : f
            ),
          };
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.chatLoading = false;
        state.error = action.error.message;
      })

      // ── logInteraction ──────────────────────────
      .addCase(logInteraction.pending, (state) => {
        state.formLoading = true;
      })
      .addCase(logInteraction.fulfilled, (state, action) => {
        state.formLoading = false;
        const hcpName = state.formData.hcp_name;
        const isUpdate = !!state.formData.interactionId;

        state.chatHistory.push({
          role: 'assistant',
          content: isUpdate
            ? `✅ Update successful. The interaction with ${hcpName} has been saved.`
            : `✅ Logged! Your interaction with ${hcpName} is now in the system.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });

        state.formData = blankForm();
        state.selectedInteractionId = null;
      })
      .addCase(logInteraction.rejected, (state, action) => {
        state.formLoading = false;
        state.error = action.error.message;
      })

      // ── fetchInteractions ───────────────────────
      .addCase(fetchInteractions.pending, (state) => { state.historyLoading = true; })
      .addCase(fetchInteractions.fulfilled, (state, action) => {
        state.historyLoading = false;
        const interactions = Array.isArray(action.payload) ? action.payload : [];
        state.interactions = interactions;

        // Patch chat message if this was triggered from chat
        for (let i = state.chatHistory.length - 1; i >= 0; i--) {
          const msg = state.chatHistory[i];
          if (msg.role === 'assistant' && (msg.action === 'show_history' || msg.action === 'select_interaction')) {
            if (!msg.hcp_interactions_loaded) {
              const limit = msg.action_data?.limit || 3;
              state.chatHistory[i] = {
                ...msg,
                hcp_interactions: interactions.slice(0, limit), 
                hcp_interactions_loaded: true,
              };
            }
            break;
          }
        }
      })
      .addCase(fetchInteractions.rejected, (state, action) => {
        state.historyLoading = false;
        state.error = action.error.message;

        // Mark loaded with error so spinner stops
        for (let i = state.chatHistory.length - 1; i >= 0; i--) {
          const msg = state.chatHistory[i];
          if (msg.role === 'assistant' && (msg.action === 'show_history' || msg.action === 'select_interaction')) {
            if (!msg.hcp_interactions_loaded) {
              state.chatHistory[i] = {
                ...msg,
                hcp_interactions: [],
                hcp_interactions_loaded: true,
                hcp_interactions_error: action.error.message,
              };
            }
            break;
          }
        }
      })

      // ── fetchHCPHistory ─────────────────────────
      .addCase(fetchHCPHistory.pending, (state) => { state.historyLoading = true; })
      .addCase(fetchHCPHistory.fulfilled, (state, action) => {
        state.historyLoading = false;
        const history = Array.isArray(action.payload) ? action.payload : [];
        state.hcpHistory = history;

        // Cache last 3 for conversational context
        const slim = history.slice(0, 3).map(i => ({
          id: i.id,
          hcp_name: i.hcp_name,
          datetime: i.datetime,
          sentiment: i.sentiment,
          notes: i.notes?.slice(0, 120),
        }));
        state.lastShownInteractions = slim;

        // Patch the last assistant message that triggered this with the data.
        // ALWAYS set hcp_interactions (even []) so the component stops showing spinner.
        for (let i = state.chatHistory.length - 1; i >= 0; i--) {
          const msg = state.chatHistory[i];
          if (msg.role === 'assistant' && (msg.action === 'show_history' || msg.action === 'select_interaction')) {
            const limit = msg.action_data?.limit || 3;
            state.chatHistory[i] = {
              ...msg,
              hcp_interactions: history.slice(0, limit), // use AI requested limit
              hcp_interactions_loaded: true,                // flag to stop spinner
            };
            break;
          }
        }
      })
      .addCase(fetchHCPHistory.rejected, (state, action) => {
        state.historyLoading = false;
        state.error = action.error.message;

        // Mark loaded with error so spinner stops
        for (let i = state.chatHistory.length - 1; i >= 0; i--) {
          const msg = state.chatHistory[i];
          if (msg.role === 'assistant' && (msg.action === 'show_history' || msg.action === 'select_interaction')) {
            state.chatHistory[i] = {
              ...msg,
              hcp_interactions: [],
              hcp_interactions_loaded: true,
              hcp_interactions_error: action.error.message,
            };
            break;
          }
        }
      })

      // ── loadInteractionById ─────────────────────
      .addCase(loadInteractionById.pending, (state) => { state.formLoading = true; })
      .addCase(loadInteractionById.fulfilled, (state, action) => {
        state.formLoading = false;
        const item = action.payload;
        const date = new Date(item.datetime);
        const offset = date.getTimezoneOffset() * 60000;
        const localISO = new Date(date - offset).toISOString().slice(0, 16);

        state.formData = {
          interactionId: item.id,
          hcp_name: item.hcp_name || '',
          interaction_type: item.interaction_type || 'In-person',
          datetime: localISO,
          notes: item.notes || '',
          topics: Array.isArray(item.topics) ? item.topics.join(', ') : (item.topics || ''),
          sentiment: item.sentiment || 'Neutral',
          summary: item.summary || '',
          materials: item.materials || '',
          follow_ups: Array.isArray(item.follow_ups)
            ? item.follow_ups.map(f => ({ action: f.action, due_date: f.due_date || null }))
            : [],
        };

        state.selectedInteractionId = item.id;

        state.chatHistory.push({
          role: 'assistant',
          content: `📋 Loaded interaction with ${item.hcp_name} (${new Date(item.datetime).toLocaleDateString()}). Scroll to form to review and edit.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      })
      .addCase(loadInteractionById.rejected, (state, action) => {
        state.formLoading = false;
        state.error = action.error.message;
      });
  },
});

export const {
  updateFormField,
  setFormData,
  updatePartialForm,
  addFollowUp,
  updateFollowUp,
  addChatMessage,
  setCurrentView,
  setFilterHCP,
  markMessageSynced,
  setSelectedHCP,
  setSelectedInteractionId,
  setLastShownInteractions,
  resetConversationContext,
  resetSystem,
} = interactionSlice.actions;

export default interactionSlice.reducer;
