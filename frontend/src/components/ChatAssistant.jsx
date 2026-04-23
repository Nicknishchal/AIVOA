import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  sendMessage,
  addChatMessage,
  setFormData,
  markMessageSynced,
  fetchInteractions,
  fetchHCPHistory,
  loadInteractionById,
  setCurrentView,
  setSelectedHCP,
  resetSystem,
} from '../store/interactionSlice';
import {
  Send, Bot, User, Sparkles, ArrowRight, Clock,
  ChevronRight, ChevronUp, ChevronDown, Database,
  CheckCircle2, History, Edit3, Lightbulb, PlusCircle,
  Calendar, Smile, Frown, Meh, FileText, MousePointerClick,
  AlertCircle, RefreshCw, ListOrdered, Pencil,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────────────────────
// Sub-components for rich action rendering
// ─────────────────────────────────────────────────────────────

const SentimentIcon = ({ sentiment }) => {
  const s = (sentiment || '').toLowerCase();
  if (s === 'positive') return <Smile size={12} className="text-green-500" />;
  if (s === 'negative') return <Frown size={12} className="text-red-500" />;
  return <Meh size={12} className="text-yellow-500" />;
};

const SentimentBadge = ({ sentiment }) => {
  const s = (sentiment || 'neutral').toLowerCase();
  const cls = s === 'positive'
    ? 'bg-green-50 text-green-700 border-green-200'
    : s === 'negative'
      ? 'bg-red-50 text-red-700 border-red-200'
      : 'bg-amber-50 text-amber-700 border-amber-200';
  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${cls}`}>
      <SentimentIcon sentiment={sentiment} />{sentiment || 'Neutral'}
    </span>
  );
};

/** History list — rendered for show_history action */
const HistoryList = ({ interactions, hcpName, onSelect, isSelectMode }) => {
  if (!interactions || interactions.length === 0) {
    return (
      <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 text-center">
        No interactions found for {hcpName}.
      </div>
    );
  }
  return (
    <div className="mt-3 space-y-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
        <ListOrdered size={10} />
        {isSelectMode ? 'Select to edit:' : `Last ${interactions.length} interactions:`}
      </p>
      {interactions.map((item, idx) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.07 }}
          onClick={() => isSelectMode && onSelect(item)}
          className={`flex items-start gap-3 p-3 rounded-xl border transition-all
            ${isSelectMode
              ? 'cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/60 hover:shadow-md group'
              : 'border-slate-200 bg-white/60'
            }`}
        >
          <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 text-[10px] font-black flex-shrink-0 mt-0.5">
            {idx + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-800">
                {new Date(item.datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100/50 uppercase tracking-tight">
                {item.hcp_name}
              </span>
              <SentimentBadge sentiment={item.sentiment} />
            </div>
            {item.notes && (
              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                {item.notes}
              </p>
            )}
          </div>
          {isSelectMode && (
            <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors flex-shrink-0 mt-1" />
          )}
        </motion.div>
      ))}
    </div>
  );
};

/** Update form preview — rendered for update_form action */
const UpdateFormPreview = ({ updates }) => {
  const fields = Object.entries(updates || {});
  if (fields.length === 0) return null;
  const fieldLabel = {
    hcp_name: 'HCP Name', interaction_type: 'Type', datetime: 'Date/Time',
    notes: 'Notes', topics: 'Topics', sentiment: 'Sentiment',
    summary: 'Summary', materials: 'Materials',
  };
  return (
    <div className="mt-3 p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2 flex items-center gap-1.5">
        <Pencil size={10} /> Form Updated
      </p>
      <div className="space-y-1.5">
        {fields.map(([k, v]) => {
          let val = String(v);
          if (k === 'follow_ups' && Array.isArray(v)) {
            val = v.map(f => `${f.action}${f.due_date ? ` (${new Date(f.due_date).toLocaleDateString()})` : ''}`).join(', ');
          } else if (k === 'topics' && Array.isArray(v)) {
            val = v.join(', ');
          }
          return (
            <div key={k} className="flex items-start gap-2 text-[11px]">
              <span className="text-slate-400 font-bold min-w-[80px] shrink-0">{fieldLabel[k] || k}:</span>
              <span className="font-bold text-slate-800 break-words">{val}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Extracted data card — for new interaction logging */
const ExtractedDataCard = ({ data, isSynced, onSync }) => (
  <motion.div
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: 'auto' }}
    className="mt-4 pt-4 border-t border-indigo-100"
  >
    <div className="bg-white rounded-xl border border-indigo-100 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
          <Database size={10} /> Extracted Schema
        </span>
        <div className="px-1.5 py-0.5 bg-green-50 text-green-600 text-[9px] font-black rounded border border-green-100">SYNC READY</div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        {[
          { label: 'HCP', val: data.hcp_name },
          { label: 'Sentiment', val: data.sentiment },
          { label: 'Date', val: data.datetime ? new Date(data.datetime).toLocaleDateString() : null },
          { label: 'Materials', val: data.materials || 'None' },
        ].map(({ label, val }) => (
          <div key={label} className="bg-slate-50 p-1.5 rounded-lg flex flex-col">
            <span className="text-[9px] text-slate-400 font-bold uppercase">{label}</span>
            <span className="font-bold text-slate-800 truncate">{val || 'N/A'}</span>
          </div>
        ))}
      </div>
      {!isSynced ? (
        <button
          onClick={onSync}
          className="w-full py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-900 transition-all shadow-md shadow-indigo-100 active:scale-95"
        >
          <CheckCircle2 size={12} /> Fill Interaction Form
        </button>
      ) : (
        <div className="w-full py-2 bg-slate-100 text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-slate-200">
          <CheckCircle2 size={12} className="text-green-500" /> Data Synced to Form
        </div>
      )}
    </div>
  </motion.div>
);

/** Clarification banner */
const ClarificationBanner = ({ message }) => (
  <div className="mt-2 flex items-start gap-2 p-2.5 bg-amber-50 rounded-xl border border-amber-200">
    <AlertCircle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
    <p className="text-[11px] text-amber-800 font-medium leading-relaxed">{message}</p>
  </div>
);

// ─────────────────────────────────────────────────────────────
// Single message bubble
// ─────────────────────────────────────────────────────────────
const MessageBubble = ({ msg, idx, onSyncExtracted, onSelectInteraction }) => {
  const isUser = msg.role === 'user';
  const action = msg.action;
  // loaded = fetch finished (success or error). hasList = finished AND has items.
  const historyLoaded = msg.hcp_interactions_loaded === true;
  const hasList = historyLoaded && msg.hcp_interactions?.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
    >
      <div
        className={`max-w-[92%] p-4 rounded-2xl text-[13px] leading-relaxed relative
          ${isUser
            ? 'bg-slate-900 text-white rounded-tr-none shadow-[0_10px_20px_-5px_rgba(0,0,0,0.1)]'
            : 'bg-[#f8fafc] border border-slate-200/60 text-slate-800 rounded-tl-none shadow-sm'
          }`}
      >
        {/* Message text — hide raw JSON for structured actions */}
        {!(action && ['show_history','select_interaction','load_interaction','ask_clarification', 'extract_new_interaction', 'update_form'].includes(action)) && (
          <p className="font-medium whitespace-pre-line">
            {msg.content.split('EXTRACTED_DATA:')[0].trim()}
          </p>
        )}

        {/* show_history → list only */}
        {action === 'show_history' && (
          <>
            <p className="font-semibold text-slate-700">
              {msg.content || `Here are recent interactions${msg.action_data?.hcp_name ? ` with ${msg.action_data.hcp_name}` : ''}.`}
            </p>
            {!historyLoaded && (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                <RefreshCw size={11} className="animate-spin" />Fetching history…
              </div>
            )}
            {historyLoaded && msg.hcp_interactions_error && (
              <div className="mt-2 flex items-center gap-1.5 p-2.5 bg-red-50 rounded-xl border border-red-200 text-[11px] text-red-700">
                <AlertCircle size={12} />Could not load history: {msg.hcp_interactions_error}
              </div>
            )}
            {historyLoaded && !msg.hcp_interactions_error && (
              <HistoryList
                interactions={msg.hcp_interactions}
                hcpName={msg.action_data?.hcp_name}
                isSelectMode={false}
              />
            )}
          </>
        )}

        {/* select_interaction → selectable cards */}
        {action === 'select_interaction' && (
          <>
            <p className="font-semibold text-slate-700">
              {msg.action_data?.message || 'Which interaction would you like to edit?'}
            </p>
            {!historyLoaded && (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                <RefreshCw size={11} className="animate-spin" />Loading interactions…
              </div>
            )}
            {historyLoaded && msg.hcp_interactions_error && (
              <div className="mt-2 flex items-center gap-1.5 p-2.5 bg-red-50 rounded-xl border border-red-200 text-[11px] text-red-700">
                <AlertCircle size={12} />Could not load: {msg.hcp_interactions_error}
              </div>
            )}
            {historyLoaded && !msg.hcp_interactions_error && (
              <HistoryList
                interactions={msg.hcp_interactions}
                hcpName={msg.action_data?.hcp_name}
                isSelectMode
                onSelect={onSelectInteraction}
              />
            )}
          </>
        )}

        {/* load_interaction */}
        {action === 'load_interaction' && (
          <p className="font-semibold text-slate-700">{msg.content}</p>
        )}

        {/* ask_clarification */}
        {action === 'ask_clarification' && (
          <ClarificationBanner message={msg.action_data?.message || msg.content} />
        )}

        {/* update_form */}
        {action === 'update_form' && (
          <>
            <p className="font-medium">{msg.content || 'Form updated.'}</p>
            <UpdateFormPreview updates={msg.action_data?.updates} />
          </>
        )}

        {/* Extracted data card for new loggins */}
        {action === 'extract_new_interaction' && msg.extracted_data && (
          <ExtractedDataCard
            data={msg.extracted_data}
            isSynced={msg.isSynced}
            onSync={() => onSyncExtracted(msg.extracted_data, idx)}
          />
        )}
      </div>

      {/* Timestamp row */}
      <div className={`mt-1.5 flex items-center gap-1.5 px-1 ${isUser ? 'flex-row-reverse' : ''}`}>
        <div className={`w-1 h-1 rounded-full ${isUser ? 'bg-indigo-300' : 'bg-slate-300'}`} />
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
          {isUser ? 'You' : 'Assistant'} • {msg.timestamp || 'Now'}
        </span>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────
// ChatAssistant — Main Component
// ─────────────────────────────────────────────────────────────
const ChatAssistant = () => {
  const [input, setInput] = useState('');
  const [showQuickCommands, setShowQuickCommands] = useState(false);
  const {
    chatHistory, chatLoading, formData,
    selectedHCP, lastShownInteractions,
  } = useSelector(state => state.interaction);
  const dispatch = useDispatch();
  const scrollRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, chatLoading]);

  // ── After agent returns show_history / select_interaction, fetch the actual DB records
  const historyLoading = useSelector(state => state.interaction.historyLoading);

  useEffect(() => {
    const lastMsg = chatHistory[chatHistory.length - 1];
    if (!lastMsg || lastMsg.role !== 'assistant' || historyLoading) return;
    
    const isHistoryAction = lastMsg.action === 'show_history' || lastMsg.action === 'select_interaction';
    if (isHistoryAction && !lastMsg.hcp_interactions_loaded) {
      if (lastMsg.action_data?.hcp_name) {
        dispatch(fetchHCPHistory(lastMsg.action_data.hcp_name));
      } else {
        dispatch(fetchInteractions());
      }
    }
  }, [chatHistory, historyLoading, dispatch]);

  // After agent returns load_interaction, fetch the actual interaction
  const formLoading = useSelector(state => state.interaction.formLoading);
  const selectedInteractionId = useSelector(state => state.interaction.selectedInteractionId);

  useEffect(() => {
    const lastMsg = chatHistory[chatHistory.length - 1];
    if (!lastMsg || lastMsg.role !== 'assistant' || formLoading) return;
    
    if (lastMsg.action === 'load_interaction') {
      const data = lastMsg.action_data || {};
      let targetId = data.interaction_id;
      
      if (!targetId && typeof data.interaction_index === 'number' && lastShownInteractions?.length) {
        targetId = lastShownInteractions[data.interaction_index]?.id;
      }

      if (targetId && targetId !== selectedInteractionId) {
        dispatch(loadInteractionById(targetId));
      }
    }
  }, [chatHistory, dispatch, lastShownInteractions, selectedInteractionId, formLoading]);

  const handleSend = useCallback((text) => {
    const message = (text || input).trim();
    if (!message || chatLoading) return;
    dispatch(addChatMessage({
      role: 'user',
      content: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }));
    dispatch(sendMessage(message));
    setInput('');
    setShowQuickCommands(false);
  }, [input, chatLoading, dispatch]);

  const handleSelectInteraction = useCallback((item) => {
    dispatch(loadInteractionById(item.id));
    dispatch(setCurrentView('form'));
  }, [dispatch]);

  const handleSyncExtracted = useCallback((data, idx) => {
    dispatch(setFormData(data));
    dispatch(markMessageSynced(idx));
  }, [dispatch]);

  const quickCommands = [
    { label: 'Show History', icon: History, message: selectedHCP ? `Show interactions with ${selectedHCP}` : 'Show my recent interactions', color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
    { label: 'Edit Last', icon: Edit3, message: selectedHCP ? `Edit interactions of ${selectedHCP}` : 'Edit the last interaction', color: 'bg-amber-50 text-amber-700 border-amber-100' },
    { label: 'Log New', icon: PlusCircle, message: 'I want to log a new interaction', color: 'bg-rose-50 text-rose-700 border-rose-100' },
  ];

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 bg-white/95 backdrop-blur-sm sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100 ring-4 ring-indigo-50">
              <Sparkles size={18} />
            </div>
            <div>
              <span className="block font-black text-slate-800 leading-none text-sm tracking-tight uppercase">AI Assistant</span>
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Veeva Engine Active</span>
              </div>
            </div>
          </div>
          {selectedHCP && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 rounded-xl border border-indigo-100">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider">{selectedHCP}</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 custom-scrollbar scroll-smooth" ref={scrollRef}>
        {chatHistory.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-[300px] mx-auto space-y-8 py-10">
            <div className="w-24 h-24 rounded-[40px] bg-indigo-50/50 border border-indigo-100/50 flex items-center justify-center text-indigo-500 relative">
              <Bot size={44} />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg border border-slate-100">
                <Sparkles size={16} className="text-indigo-600" />
              </div>
            </div>
            <div>
              <p className="text-slate-900 font-black text-xl italic tracking-tight leading-tight">Ready to synchronize.</p>
              <p className="text-slate-500 text-[13px] mt-3 leading-relaxed font-medium">
                Ask me to show history, edit, or log a new interaction. I'll guide you step by step.
              </p>
            </div>
            {/* Example prompts */}
            <div className="w-full space-y-2">
              {[
                '"Show interactions with Dr Kapil"',
                '"Edit interactions of Dr Sharma"',
                '"Change sentiment to positive"',
              ].map(ex => (
                <button
                  key={ex}
                  onClick={() => handleSend(ex.replace(/"/g, ''))}
                  className="w-full text-left text-[11px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-all font-medium"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {chatHistory.map((msg, idx) => (
            <MessageBubble
              key={idx}
              msg={msg}
              idx={idx}
              onSyncExtracted={handleSyncExtracted}
              onSelectInteraction={handleSelectInteraction}
            />
          ))}
        </AnimatePresence>

        {chatLoading && (
          <div className="flex flex-col items-start gap-2">
            <div className="bg-indigo-50 border border-indigo-100/50 p-4 rounded-2xl rounded-tl-none flex gap-1.5 items-center">
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
              <span className="text-[10px] font-black ml-2 text-indigo-400 uppercase tracking-[.2em]">Thinking</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Commands Toggle */}
      <div className="px-6 py-2 flex justify-end items-center bg-white">
        <button
          onClick={() => setShowQuickCommands(p => !p)}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition-colors py-1 group"
        >
          <span className="text-[10px] font-black uppercase tracking-widest">Quick Actions</span>
          {showQuickCommands
            ? <ChevronDown size={14} />
            : <ChevronUp size={14} className="group-hover:-translate-y-0.5 transition-transform" />}
        </button>
      </div>

      {/* Quick Commands Panel */}
      <AnimatePresence>
        {showQuickCommands && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-slate-50/50 border-t border-slate-100"
          >
            <div className="px-5 py-4">
              <div className="flex flex-wrap gap-2">
                {quickCommands.map(cmd => (
                  <button
                    key={cmd.label}
                    onClick={() => {
                      if (cmd.label === 'Log New') {
                        dispatch(resetSystem());
                      } else {
                        handleSend(cmd.message);
                      }
                    }}
                    disabled={chatLoading}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-bold transition-all hover:shadow-md active:scale-95 disabled:opacity-50 disabled:grayscale ${cmd.color}`}
                  >
                    <cmd.icon size={13} />
                    {cmd.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-100 z-40 mt-auto">
        <div className="relative group">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Type your notes here..."
            className="w-full pl-5 pr-14 py-3 bg-slate-50 border border-slate-200 rounded-3xl shadow-inner-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all resize-none max-h-32 text-[13px] font-medium leading-relaxed"
            rows="1"
          />
          <div className="absolute right-2.5 bottom-2.5 flex items-center gap-3">
            <button
              onClick={() => handleSend()}
              disabled={chatLoading || !input.trim()}
              className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100 hover:bg-slate-900 transition-all active:scale-90 disabled:opacity-50 disabled:active:scale-100"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatAssistant;
