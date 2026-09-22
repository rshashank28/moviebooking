import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  X, 
  Send, 
  Film, 
  Calendar, 
  MapPin, 
  Star, 
  Bot, 
  User, 
  ChevronRight,
  Zap,
  ArrowRight
} from 'lucide-react';
import { useCityStore } from '../../store/useCityStore';

export default function AIAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const { currentCity } = useCityStore();
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      id: 'init-1',
      sender: 'ai',
      text: `Hello! I'm your **ShowPulse AI Concierge**. I can find the best movies, live concerts, standup comedy shows, and book tickets for you in **${currentCity}**. What are you in the mood for today?`,
      suggestedActions: [
        `Trending movies in ${currentCity}`,
        `Find IMAX shows this weekend`,
        `Live concerts under ₹1000`,
        `Standup comedy shows`
      ]
    }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (userText) => {
    const textToSend = userText || query;
    if (!textToSend.trim() || loading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          city: currentCity
        })
      });

      const json = await res.json();
      if (json.success && json.data) {
        const aiMessage = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: json.data.responseText,
          cards: json.data.cards,
          suggestedActions: json.data.suggestedActions || []
        };
        setMessages((prev) => [...prev, aiMessage]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-err-${Date.now()}`,
            sender: 'ai',
            text: "I couldn't find an exact match, but let me know what genre or event type you'd like to discover next!"
          }
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: "Oops, my concierge server is momentarily unavailable. Please try again in a few seconds!"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 group flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-brand-500 via-purple-600 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 text-white rounded-full shadow-2xl shadow-brand-500/40 hover:shadow-brand-500/60 transition-all duration-300 transform hover:scale-105"
          aria-label="Open AI Assistant"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
          </div>
          <span className="font-semibold text-sm tracking-wide">ShowPulse AI</span>
        </button>
      )}

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-md bg-dark-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col h-[580px] max-h-[85vh] overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-gradient-to-r from-brand-600/30 via-purple-900/40 to-dark-900">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-500 to-purple-500 flex items-center justify-center shadow-md shadow-brand-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                  ShowPulse AI Concierge
                  <span className="text-[10px] uppercase font-bold bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded-full border border-brand-500/30">
                    Grounded
                  </span>
                </h3>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-brand-400" /> Searching in {currentCity}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm scrollbar-thin scrollbar-thumb-white/10">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'ai' && (
                  <div className="w-7 h-7 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-brand-400" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    m.sender === 'user'
                      ? 'bg-brand-600 text-white rounded-br-none'
                      : 'bg-white/5 border border-white/10 text-gray-200 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-line leading-relaxed text-xs sm:text-sm">
                    {m.text}
                  </p>

                  {/* Recommendation Cards */}
                  {m.cards && (
                    <div className="mt-3 space-y-2">
                      {/* Movie Cards */}
                      {m.cards.movies?.map((movie) => (
                        <Link
                          key={movie._id}
                          to={`/movies/${movie._id}`}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center gap-3 p-2 rounded-xl bg-dark-800/80 hover:bg-dark-700 border border-white/5 hover:border-brand-500/40 transition-all group/card"
                        >
                          <img
                            src={movie.poster}
                            alt={movie.title}
                            className="w-10 h-14 object-cover rounded-lg shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-white text-xs truncate group-hover/card:text-brand-400">
                              {movie.title}
                            </h4>
                            <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                              <span className="flex items-center text-amber-400">
                                <Star className="w-3 h-3 fill-current mr-0.5" />
                                {movie.rating || 8.5}
                              </span>
                              <span>•</span>
                              <span>{movie.genres?.[0]}</span>
                            </div>
                            <span className="text-[10px] text-brand-400 font-medium flex items-center gap-1 mt-1">
                              Book Tickets <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </Link>
                      ))}

                      {/* Event Cards */}
                      {m.cards.events?.map((evt) => (
                        <Link
                          key={evt._id}
                          to={`/events/${evt._id}`}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center gap-3 p-2 rounded-xl bg-dark-800/80 hover:bg-dark-700 border border-white/5 hover:border-brand-500/40 transition-all group/card"
                        >
                          <img
                            src={evt.poster}
                            alt={evt.title}
                            className="w-10 h-14 object-cover rounded-lg shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-white text-xs truncate group-hover/card:text-brand-400">
                              {evt.title}
                            </h4>
                            <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                              <span className="text-purple-400 font-medium">{evt.category}</span>
                              <span>•</span>
                              <span>{evt.venueName}</span>
                            </div>
                            <span className="text-[10px] text-purple-400 font-medium flex items-center gap-1 mt-1">
                              Get Passes <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Suggestion Chips */}
                  {m.suggestedActions && m.suggestedActions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {m.suggestedActions.map((chip, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(chip)}
                          className="text-[11px] bg-white/10 hover:bg-brand-500/20 hover:border-brand-500/40 border border-white/10 text-gray-300 hover:text-white px-2.5 py-1 rounded-full transition-all text-left flex items-center gap-1"
                        >
                          <Zap className="w-3 h-3 text-brand-400" />
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {m.sender === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-gray-300" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 items-center">
                <div className="w-7 h-7 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-brand-400" />
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 flex items-center gap-1.5 text-xs text-gray-400">
                  <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce delay-100" />
                  <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce delay-200" />
                  <span className="ml-1 text-gray-300">Scanning real-time catalog...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 border-t border-white/10 bg-dark-950 flex items-center gap-2"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything: e.g. Action movies in IMAX under ₹300..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              disabled={!query.trim() || loading}
              className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
