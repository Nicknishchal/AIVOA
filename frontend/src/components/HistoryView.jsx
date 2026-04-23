import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchInteractions, fetchHCPHistory, setFilterHCP, setFormData, setCurrentView } from '../store/interactionSlice';
import { 
  Calendar, 
  User, 
  MessageSquare, 
  Tag, 
  Smile, 
  Clock, 
  FileText,
  Search,
  Filter,
  ChevronRight,
  ArrowLeft,
  Edit
} from 'lucide-react';
import { motion } from 'framer-motion';

const HistoryView = () => {
  const { interactions, hcpHistory, historyLoading, filterHCP } = useSelector((state) => state.interaction);
  const dispatch = useDispatch();
  const [searchTerm, setSearchTerm] = useState('');

  const handleEdit = (item) => {
    // Format date for datetime-local input
    const date = new Date(item.datetime);
    const offset = date.getTimezoneOffset() * 60000;
    const localISODate = new Date(date - offset).toISOString().slice(0, 16);

    dispatch(setFormData({
      interactionId: item.id,
      hcp_name: item.hcp_name,
      interaction_type: item.interaction_type,
      datetime: localISODate,
      notes: item.notes,
      topics: Array.isArray(item.topics) ? item.topics.join(', ') : item.topics,
      sentiment: item.sentiment,
      summary: item.summary,
      materials: item.materials || ''
    }));
    dispatch(setCurrentView('form'));
  };

  useEffect(() => {
    if (filterHCP) {
      dispatch(fetchHCPHistory(filterHCP));
    } else {
      dispatch(fetchInteractions());
    }
  }, [dispatch, filterHCP]);

  const displayData = filterHCP ? hcpHistory : interactions;

  const filteredData = displayData.filter(item => 
    item.hcp_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.topics?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSentimentStyles = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return 'bg-green-100 text-green-700 border-green-200';
      case 'negative': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
             {filterHCP ? (
               <button onClick={() => dispatch(setFilterHCP(null))} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                 <ArrowLeft size={20} />
               </button>
             ) : <Clock size={24} className="text-indigo-600" />}
             {filterHCP ? `History for ${filterHCP}` : 'Interaction History'}
          </h2>
          <p className="text-sm text-slate-500 font-medium ml-1">
            {filterHCP ? 'Viewing all past records for this professional' : 'Reviewing all team interactions'}
          </p>
        </div>

        <div className="relative group min-w-[300px]">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder="Search by HCP, topic or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm shadow-sm"
          />
        </div>
      </div>

      {/* Stats/Quick Filters */}
      {!filterHCP && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Records</p>
             <p className="text-2xl font-black text-slate-800">{interactions.length}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Unique HCPs</p>
             <p className="text-2xl font-black text-slate-800">{[...new Set(interactions.map(i => i.hcp_name))].length}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Latest Update</p>
             <p className="text-sm font-bold text-slate-600">{interactions.length > 0 ? formatDate(interactions[0].datetime) : 'N/A'}</p>
          </div>
        </div>
      )}

      {/* Interactions List */}
      <div className="space-y-4">
        {historyLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-sm font-bold text-slate-500 animate-pulse">Loading interaction logs...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-20 bg-white border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mb-4">
              <MessageSquare size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No interactions found</h3>
            <p className="text-sm text-slate-500 max-w-xs mt-1">
              Try adjusting your search filters or log a new interaction to see it here.
            </p>
          </div>
        ) : (
          filteredData.map((item, idx) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={item.id || idx}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all overflow-hidden group"
            >
              <div className="p-5 md:p-6">
                <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                      <User size={24} />
                    </div>
                    <div>
                      <h4 
                        className="text-lg font-bold text-slate-900 flex items-center gap-2 cursor-pointer hover:text-indigo-600 transition-colors tracking-tight"
                        onClick={() => dispatch(setFilterHCP(item.hcp_name))}
                      >
                        {item.hcp_name || 'Anonymous HCP'}
                        {!filterHCP && <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />}
                      </h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                          <Calendar size={12} />
                          {formatDate(item.datetime)}
                        </span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md">
                          {item.interaction_type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start">
                    <button 
                      onClick={() => handleEdit(item)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      title="Edit Interaction"
                    >
                      <Edit size={16} />
                    </button>
                    <div className={`px-4 py-1.5 rounded-full border text-xs font-black uppercase tracking-widest ${getSentimentStyles(item.sentiment)}`}>
                      {item.sentiment}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Topics */}
                  {item.topics && (
                    <div className="flex flex-wrap gap-2">
                      {(typeof item.topics === 'string' ? item.topics.split(',') : (Array.isArray(item.topics) ? item.topics : [])).map((topic, i) => topic && (
                        <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg border border-slate-200 flex items-center gap-1.5">
                          <Tag size={10} className="text-slate-400" />
                          {topic.trim()}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Materials */}
                  {item.materials && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                      <FileText size={14} className="text-amber-600" />
                      <span className="font-bold text-amber-900 uppercase tracking-tighter text-[10px]">Materials:</span>
                      <span className="text-amber-800 font-medium">{item.materials}</span>
                    </div>
                  )}

                  {/* Notes */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-sm font-medium text-slate-700 leading-relaxed italic">
                      "{item.notes}"
                    </p>
                  </div>

                  {/* Follow-ups */}
                  {(() => {
                    let tasks = [];
                    try {
                      tasks = Array.isArray(item.follow_ups) ? item.follow_ups : JSON.parse(item.follow_ups || '[]');
                    } catch (e) { tasks = []; }
                    
                    if (tasks.length === 0) return null;
                    
                    return (
                      <div className="space-y-3 pt-2">
                         <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                           <Clock size={12} />
                           Scheduled Follow-ups
                         </h5>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                           {tasks.map((task, i) => (
                             <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm group/task hover:border-indigo-200 transition-colors">
                               <span className="text-xs font-bold text-slate-700">{task.action}</span>
                               {task.due_date && (
                                 <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 group-hover/task:text-indigo-600 group-hover/task:bg-indigo-50 transition-colors">
                                   {new Date(task.due_date).toLocaleDateString()}
                                 </span>
                               )}
                             </div>
                           ))}
                         </div>
                      </div>
                    );
                  })()}

                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistoryView;
