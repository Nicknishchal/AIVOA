import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateFormField, logInteraction, addFollowUp, updateFollowUp, setFormData, addChatMessage } from '../store/interactionSlice';
import {
  Save,
  Plus,
  Calendar,
  User,
  MessageSquare,
  Tag,
  Smile,
  ClipboardList,
  Sparkles,
  Trash2,
  CheckCircle2,
  Package,
  FileText,
  AlertCircle,
  Clock,
  X,
  Search,
  History
} from 'lucide-react';
import { setCurrentView } from '../store/interactionSlice';
import { motion, AnimatePresence } from 'framer-motion';

const InteractionForm = () => {
  const { formData, formLoading } = useSelector((state) => state.interaction);
  const dispatch = useDispatch();
  const [toastConfig, setToastConfig] = useState({ show: false, message: '' });
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    setCharCount(formData.notes.length);
  }, [formData.notes]);

  const handleChange = (e) => {
    dispatch(updateFormField({ field: e.target.name, value: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const isUpdate = !!formData.interactionId;
    const hcpName = formData.hcp_name;

    dispatch(logInteraction(formData)).then((res) => {
      if (!res.error) {
        setToastConfig({
          show: true,
          message: isUpdate ? 'Interaction Updated Successfully' : 'Interaction Logged Successfully'
        });

        setTimeout(() => setToastConfig({ show: false, message: '' }), 3000);
      }
    });
  };

  const removeFollowUp = (index) => {
    const newFollowUps = formData.follow_ups.filter((_, i) => i !== index);
    dispatch(setFormData({ follow_ups: newFollowUps }));
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 }
  };

  const sentimentOptions = [
    { value: 'Positive', color: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
    { value: 'Neutral', color: 'bg-yellow-500', text: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' },
    { value: 'Negative', color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' }
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">
      {/* Toast */}
      <AnimatePresence>
        {toastConfig.show && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-10 left-[32%] -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 bg-slate-900 shadow-2xl rounded-2xl border border-slate-700"
          >
            <CheckCircle2 size={20} className="text-green-500" />
            <span className="text-white font-bold text-sm tracking-wide">
              {toastConfig.message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {/* Row 1: HCP Info & Sentiment */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <motion.div {...fadeInUp} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <User size={16} className="text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">HCP Info</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">HCP Name</label>
                  {formData.hcp_name && (
                    <button type="button" onClick={() => { dispatch(setFilterHCP(formData.hcp_name)); dispatch(setCurrentView('history')); }} className="text-[8px] font-black text-indigo-600 uppercase flex items-center gap-1">
                      <History size={10} /> History
                    </button>
                  )}
                </div>
                <div className="relative group">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" name="hcp_name" value={formData.hcp_name} onChange={handleChange} placeholder="Search..." className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:border-indigo-500 outline-none transition-all" required />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Type</label>
                <select name="interaction_type" value={formData.interaction_type} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:border-indigo-500 outline-none appearance-none cursor-pointer">
                  <option value="In-person">In-person</option>
                  <option value="Virtual">Virtual</option>
                  <option value="Phone Call">Phone</option>
                  <option value="Email">Email</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date</label>
                <input type="datetime-local" name="datetime" value={formData.datetime} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium" />
              </div>
            </div>
          </motion.div>

          <motion.div {...fadeInUp} transition={{ delay: 0.05 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Smile size={16} className="text-orange-600" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Outcome</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {sentimentOptions.map((opt) => (
                  <button
                    key={opt.value} type="button"
                    onClick={() => dispatch(updateFormField({ field: 'sentiment', value: opt.value }))}
                    className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-2xl border-2 transition-all ${formData.sentiment === opt.value ? `${opt.bg} ${opt.border} ${opt.text}` : 'bg-white border-slate-100 text-slate-400'}`}
                  >
                    <div className={`w-2 h-2 rounded-full ${formData.sentiment === opt.value ? opt.color : 'bg-slate-200'}`}></div>
                    <span className="text-[9px] font-black uppercase tracking-tighter">{opt.value}</span>
                  </button>
                ))}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Materials</label>
                <div className="relative">
                  <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" name="materials" value={formData.materials || ''} onChange={handleChange} placeholder="Brochures, samples..." className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:border-indigo-500 outline-none" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Row 2: Discussion Context */}
        <motion.div {...fadeInUp} transition={{ delay: 0.1 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col group/disc min-h-[160px]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <MessageSquare size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Clinical Discussion</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Scientific Exchange Details</p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg focus-within:border-indigo-200 focus-within:bg-white transition-all">
                <Tag size={12} className="text-slate-400" />
                <input type="text" name="topics" value={formData.topics} onChange={handleChange} placeholder="Topics (comma separated)..." className="bg-transparent border-none outline-none text-[10px] font-bold w-40 text-slate-700" />
              </div>
            </div>
          </div>

          <div className="flex-1 relative flex flex-col">
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Record the scientific transition, objections handled, and key insights..."
              className="flex-1 w-full p-5 bg-slate-50/50 border border-slate-100 rounded-2xl focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all text-[13px] font-medium leading-relaxed resize-none overflow-y-auto custom-scrollbar text-slate-700 placeholder:text-slate-300 shadow-inner-sm"
            ></textarea>

            <div className="absolute bottom-4 right-4 flex items-center gap-4">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white/80 backdrop-blur-sm border border-slate-100 rounded-md shadow-sm">
                <div className={`w-1.5 h-1.5 rounded-full ${charCount < 100 ? 'bg-orange-400' : 'bg-green-500'}`}></div>
                <span className="text-[9px] font-black text-slate-500 tabular-nums">{charCount} CHARS</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Row 3: Follow-ups */}
        <motion.div {...fadeInUp} transition={{ delay: 0.15 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 max-h-[160px] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ClipboardList size={16} className="text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Actions</h3>
            </div>
            <button
              type="button"
              onClick={() => dispatch(addFollowUp())}
              className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all"
            >
              <Plus size={12} /> Add
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
            {formData.follow_ups.length === 0 ? (
              <div className="py-2 flex flex-col items-center justify-center opacity-30">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">No actions</p>
              </div>
            ) : (
              (formData.follow_ups || []).map((fu, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-100 p-2 rounded-lg flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Task description..."
                    value={fu.action}
                    onChange={(e) => dispatch(updateFollowUp({ index: idx, field: 'action', value: e.target.value }))}
                    className="flex-1 bg-transparent border-none outline-none text-[11px] font-bold placeholder:text-slate-300"
                  />
                  <input
                    type="date"
                    value={fu.due_date ? fu.due_date.slice(0, 10) : ''}
                    onChange={(e) => dispatch(updateFollowUp({ index: idx, field: 'due_date', value: e.target.value }))}
                    className="bg-transparent text-[9px] font-bold text-slate-500 uppercase focus:outline-none"
                  />
                  <button type="button" onClick={() => removeFollowUp(idx)} className="text-slate-300 hover:text-red-500">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Row 4: Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={formLoading}
            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-900 transition-all"
          >
            {formLoading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : (formData.interactionId ? <Save size={16} /> : <CheckCircle2 size={16} />)}
            {formLoading ? 'Syncing...' : (formData.interactionId ? 'Update Interaction' : 'Log Interaction')}
          </button>

          <button
            type="button"
            className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
          >
            Draft
          </button>
        </div>
      </form>
    </div>
  );
};

export default InteractionForm;

