import React, { useState, useEffect } from 'react';
import {
  Play,
  Search,
  Mic,
  MicOff,
  ArrowLeft,
  Music,
  Heart,
  Volume2,
  X,
  Sparkles,
} from 'lucide-react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';

export interface BhajanItem {
  id: string;
  title: string;
  singer: string;
  category: string;
  category_hi: string;
  duration: string;
  thumbnail: string;
  description: string;
}

interface BhajanHubProps {
  onBack: () => void;
}

const CATEGORIES = [
  { key: 'all', label: 'सभी (All)', icon: '🌸' },
  { key: 'hanuman', label: 'हनुमान जी (Hanuman)', icon: '🚩' },
  { key: 'krishna', label: 'कृष्ण भजन (Krishna)', icon: '🦚' },
  { key: 'shiva', label: 'शिव वंदना (Shiva)', icon: '🔱' },
  { key: 'aarti_mantra', label: 'मंत्र व आरती (Aarti)', icon: '🪔' },
  { key: 'ram', label: 'श्री राम (Shri Ram)', icon: '🏹' },
  { key: 'geet', label: 'सदाबहार गीत (Classics)', icon: '📻' },
];

export const DEFAULT_BHAJANS: BhajanItem[] = [
  {
    id: 'AETFvQonfV8',
    title: 'श्री हनुमान चालीसा (Shree Hanuman Chalisa)',
    singer: 'हरिहरन (Hariharan) / गुलशन कुमार',
    category: 'hanuman',
    category_hi: 'हनुमान जी',
    duration: '9:42',
    thumbnail: 'https://img.youtube.com/vi/AETFvQonfV8/hqdefault.jpg',
    description: 'संकट मोचन श्री हनुमान चालीसा - मन को शांति और शक्ति देने वाली पावन स्तुति।',
  },
  {
    id: 'Xqhp3t-Qe3o',
    title: 'गायत्री मंत्र १०८ बार (Gayatri Mantra 108 Times)',
    singer: 'अनुराधा पौडवाल (Anuradha Paudwal)',
    category: 'aarti_mantra',
    category_hi: 'मंत्र व आरती',
    duration: '24:10',
    thumbnail: 'https://img.youtube.com/vi/Xqhp3t-Qe3o/hqdefault.jpg',
    description: 'ॐ भूर्भुवः स्वः तत्सवितुर्वरेण्यं - प्रातःकाल के ध्यान और सकारात्मक ऊर्जा के लिए।',
  },
  {
    id: 'h3fT4vO6Xn0',
    title: 'श्री कृष्ण गोविन्द हरे मुरारी (Shri Krishna Govind)',
    singer: 'सिद्धांत माधव / भक्ति गीत',
    category: 'krishna',
    category_hi: 'कृष्ण भजन',
    duration: '12:15',
    thumbnail: 'https://img.youtube.com/vi/h3fT4vO6Xn0/hqdefault.jpg',
    description: 'हे नाथ नारायण वासुदेवा - भगवान श्री कृष्ण का परम पावन भजन।',
  },
  {
    id: '1_47iukX_e8',
    title: 'शिव तांडव स्तोत्रम् व आरती (Shiv Tandav / Aarti)',
    singer: 'शंकर महादेवन (Shankar Mahadevan)',
    category: 'shiva',
    category_hi: 'शिव वंदना',
    duration: '8:20',
    thumbnail: 'https://img.youtube.com/vi/1_47iukX_e8/hqdefault.jpg',
    description: 'जटाटवीगलज्जलप्रवाहपावितस्थले - भगवान शिव की ओजस्वी एवं मंगलकारी स्तुति।',
  },
  {
    id: '3wDiyl_H85g',
    title: 'राम सिया राम (Ram Siya Ram)',
    singer: 'सचेत टंडन / परंपरा',
    category: 'ram',
    category_hi: 'श्री राम भजन',
    duration: '4:45',
    thumbnail: 'https://img.youtube.com/vi/3wDiyl_H85g/hqdefault.jpg',
    description: 'मंगल भवन अमंगल हारी - मर्यादा पुरुषोत्तम भगवान श्री राम की कृपा।',
  },
  {
    id: 'y8c8Qf3vH34',
    title: 'ॐ जय जगदीश हरे (Om Jai Jagdish Hare - Aarti)',
    singer: 'अनुराधा पौडवाल',
    category: 'aarti_mantra',
    category_hi: 'मंत्र व आरती',
    duration: '6:15',
    thumbnail: 'https://img.youtube.com/vi/y8c8Qf3vH34/hqdefault.jpg',
    description: 'दैनिक संध्या एवं प्रातः आरती - सुख संपत्ति घर आवे, कष्ट मिटे तन का।',
  },
  {
    id: 'N5yL5qjP0J4',
    title: 'लता मंगेशकर सदाबहार भक्ति व पुराने गीत',
    singer: 'लता मंगेशकर (Lata Mangeshkar)',
    category: 'geet',
    category_hi: 'पुराने गीत व सुकून',
    duration: '45:00',
    thumbnail: 'https://img.youtube.com/vi/N5yL5qjP0J4/hqdefault.jpg',
    description: 'इतनी शक्ति हमें देना दाता, ऐ मेरे वतन के लोगों और अनमोल सदाबहार नगमे।',
  },
];

export const BhajanHub: React.FC<BhajanHubProps> = ({ onBack }) => {
  const [bhajans, setBhajans] = useState<BhajanItem[]>(DEFAULT_BHAJANS);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeVideo, setActiveVideo] = useState<BhajanItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { isListening, transcript, startListening, stopListening, isSupported } =
    useSpeechRecognition();

  // Fetch curated bhajans on load
  const fetchBhajans = async (cat: string, search: string = '') => {
    setIsLoading(true);
    try {
      let url = '/api/youtube/curated';
      if (search.trim()) {
        url = `/api/youtube/search?q=${encodeURIComponent(search.trim())}`;
      } else if (cat && cat !== 'all') {
        url = `/api/youtube/curated?category=${cat}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setBhajans(data);
      }
    } catch (err) {
      console.error('Failed to fetch bhajans:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBhajans(activeCategory, searchQuery);
  }, [activeCategory]);

  // When speech recognition produces text, update search and trigger
  useEffect(() => {
    if (transcript) {
      setSearchQuery(transcript);
      fetchBhajans(activeCategory, transcript);
    }
  }, [transcript]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBhajans(activeCategory, searchQuery);
  };

  const handleVoiceSearch = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening('hi-IN');
    }
  };

  const handlePlayVideo = (item: BhajanItem) => {
    setActiveVideo(item);
    // Smooth scroll to player on mobile
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header with Back button */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl shadow-sm border border-amber-100 dark:border-slate-800">
        <button
          onClick={onBack}
          className="min-h-[48px] px-4 py-2 rounded-2xl bg-amber-50 hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-amber-900 dark:text-amber-200 font-black text-base flex items-center gap-2 transition"
          aria-label="वापस डैशबोर्ड"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>वापस डैशबोर्ड (Back)</span>
        </button>

        <div className="text-right">
          <span className="text-xs font-black uppercase text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950 px-3 py-1 rounded-full">
            भक्ति एवं सुकून 🌸
          </span>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl">🪔</span>
            <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
              दैनिक भक्ति धारा
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black leading-tight">
            भजन, आरती एवं पावन संगीत
          </h1>
          <p className="text-amber-100 text-base sm:text-lg mt-2 leading-relaxed font-medium">
            एक टैप में हनुमान चालीसा, गायत्री मंत्र, कृष्ण भजन और पुराने मनमोहक गीत सुनें। बोलकर भी कोई भी भजन खोज सकते हैं।
          </p>
        </div>
        <div className="absolute right-4 bottom-2 text-8xl opacity-15 select-none pointer-events-none">
          🕉️
        </div>
      </div>

      {/* Embedded Video Player (When a video is playing) */}
      {activeVideo && (
        <div className="bg-slate-950 text-white rounded-3xl p-4 sm:p-6 shadow-2xl border-2 border-amber-500 overflow-hidden animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
              <div>
                <h2 className="text-lg sm:text-xl font-black text-amber-300">
                  {activeVideo.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  स्वर: {activeVideo.singer} • {activeVideo.category_hi}
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveVideo(null)}
              className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              aria-label="प्लेयर बंद करें"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* YouTube Responsive Iframe Embed */}
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-inner">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${activeVideo.id}?autoplay=1&rel=0&modestbranding=1`}
              title={activeVideo.title}
              className="absolute inset-0 w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          <p className="text-sm text-amber-200/80 mt-3 font-medium text-center">
            {activeVideo.description}
          </p>
        </div>
      )}

      {/* Voice & Text Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl shadow-sm border border-amber-100 dark:border-slate-800 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 sm:gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="कोई भी भजन, आरती या गाना खोजें..."
              className="w-full min-h-[56px] pl-12 pr-4 text-base sm:text-lg border-2 border-slate-200 dark:border-slate-700 rounded-2xl focus:border-amber-500 focus:outline-none dark:bg-slate-800 dark:text-white font-medium transition"
            />
            <Search className="w-6 h-6 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Voice Search Button */}
          {isSupported && (
            <button
              type="button"
              onClick={handleVoiceSearch}
              className={`min-h-[56px] min-w-[56px] px-4 rounded-2xl font-black text-white flex items-center justify-center gap-2 shadow-sm transition transform active:scale-95 ${
                isListening
                  ? 'bg-red-600 animate-pulse'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
              aria-label={isListening ? 'माइक रोकें' : 'बोलकर खोजें'}
              title="बोलकर भजन खोजें"
            >
              {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              <span className="hidden sm:inline text-sm">
                {isListening ? 'सुन रहे हैं...' : 'बोलें'}
              </span>
            </button>
          )}

          {/* Search Button */}
          <button
            type="submit"
            className="min-h-[56px] px-6 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-black text-base shadow-sm transition active:scale-95"
          >
            खोजें
          </button>
        </form>

        {/* Quick Search Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-sm font-bold">
          <span className="text-xs text-slate-500 uppercase tracking-wider flex-shrink-0">
            सुझाव:
          </span>
          {['हनुमान चालीसा', 'गायत्री मंत्र', 'कृष्ण गोविन्द', 'शिव तांडव', 'ओम जय जगदीश', 'लता मंगेशकर गीत'].map((pill) => (
            <button
              key={pill}
              type="button"
              onClick={() => {
                setSearchQuery(pill);
                fetchBhajans(activeCategory, pill);
              }}
              className="px-3.5 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-amber-900 dark:text-amber-300 flex-shrink-0 border border-amber-200 dark:border-slate-700 transition"
            >
              {pill}
            </button>
          ))}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => {
              setActiveCategory(cat.key);
              setSearchQuery('');
            }}
            className={`min-h-[48px] px-4 py-2.5 rounded-2xl font-black text-sm sm:text-base flex items-center gap-2 whitespace-nowrap transition-all shadow-sm ${
              activeCategory === cat.key
                ? 'bg-amber-600 text-white shadow-amber-600/30'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-amber-50 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Videos List Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <span>🎵</span>
          <span>लोकप्रिय भजन एवं संगीत ({bhajans.length})</span>
        </h2>

        {isLoading ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="font-bold text-slate-600 dark:text-slate-400">भजन खोजे जा रहे हैं...</p>
          </div>
        ) : bhajans.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <p className="text-lg font-bold text-slate-700 dark:text-slate-300">
              कोई भजन नहीं मिला। कृपया दूसरा नाम खोजें।
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {bhajans.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border-2 border-slate-100 dark:border-slate-800 hover:border-amber-400 shadow-sm hover:shadow-md transition flex flex-col justify-between group"
              >
                <div>
                  {/* Thumbnail with duration badge and play hover */}
                  <div
                    onClick={() => handlePlayVideo(item)}
                    className="relative w-full aspect-video rounded-2xl overflow-hidden mb-3.5 cursor-pointer bg-slate-100 dark:bg-slate-800 group-hover:brightness-105 transition"
                  >
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <div className="w-14 h-14 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition">
                        <Play className="w-7 h-7 fill-current ml-1" />
                      </div>
                    </div>
                    <span className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-black/75 text-white font-mono text-xs font-bold">
                      {item.duration}
                    </span>
                    <span className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-amber-600/90 text-white text-xs font-bold">
                      {item.category_hi}
                    </span>
                  </div>

                  {/* Title and details */}
                  <h3 className="font-black text-lg sm:text-xl text-slate-900 dark:text-white leading-snug group-hover:text-amber-600 transition line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-400 mt-1">
                    {item.singer}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 line-clamp-2 font-medium">
                    {item.description}
                  </p>
                </div>

                {/* Big Action Button */}
                <button
                  onClick={() => handlePlayVideo(item)}
                  className="mt-4 min-h-[48px] w-full rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-base flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>चलाएं (Play Bhajan)</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
