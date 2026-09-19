import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';

export interface SOSEvent {
  id: string;
  user_id: string;
  timestamp: string;
  latitude?: number;
  longitude?: number;
  maps_url?: string;
  contacts_alerted: string[];
  status: string;
}

interface SOSButtonProps {
  className?: string;
  onActivated?: (event: SOSEvent) => void;
}

export const SOSButton: React.FC<SOSButtonProps> = ({
  className = '',
  onActivated,
}) => {
  const { token } = useAuth();
  const [holding, setHolding] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [activeSOS, setActiveSOS] = useState<SOSEvent | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [locating, setLocating] = useState<boolean>(false);

  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const HOLD_DURATION_MS = 3000; // 3 seconds hold requirement

  const dispatchSOS = useCallback(
    async (lat?: number, lon?: number, accuracy?: number) => {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/family/sos', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            latitude: lat,
            longitude: lon,
            accuracy_meters: accuracy,
            address_hint: 'Browser Geolocation Triggered',
          }),
        });

        if (res.ok) {
          const data: SOSEvent = await res.json();
          setActiveSOS(data);
          setModalOpen(true);
          if (onActivated) onActivated(data);
        }
      } catch (err) {
        console.error('Failed to dispatch SOS alert:', err);
      } finally {
        setLocating(false);
      }
    },
    [token, onActivated]
  );

  const triggerSOS = useCallback(() => {
    setHolding(false);
    setProgress(100);
    setLocating(true);

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          dispatchSOS(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
        },
        (err) => {
          console.warn('Geolocation failed or denied, dispatching SOS without coords:', err);
          dispatchSOS();
        },
        { timeout: 5000, enableHighAccuracy: true }
      );
    } else {
      dispatchSOS();
    }
  }, [dispatchSOS]);

  const startHold = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setHolding(true);
    setProgress(0);
    startTimeRef.current = Date.now();

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(100, Math.round((elapsed / HOLD_DURATION_MS) * 100));
      setProgress(pct);
    }, 50);

    holdTimerRef.current = setTimeout(() => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      triggerSOS();
    }, HOLD_DURATION_MS);
  };

  const cancelHold = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setHolding(false);
    setProgress(0);
  };

  return (
    <>
      <div className={`relative inline-flex items-center justify-center ${className}`}>
        {/* SVG Progress Ring around the SOS Button */}
        {holding && (
          <svg
            className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] -rotate-90 pointer-events-none"
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="44"
              className="text-red-300 dark:text-red-950"
              strokeWidth="8"
              stroke="currentColor"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              className="text-red-600 transition-all duration-75 ease-linear"
              strokeWidth="8"
              strokeDasharray={276}
              strokeDashoffset={276 - (276 * progress) / 100}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>
        )}

        <button
          type="button"
          onMouseDown={startHold}
          onMouseUp={cancelHold}
          onMouseLeave={cancelHold}
          onTouchStart={startHold}
          onTouchEnd={cancelHold}
          onTouchCancel={cancelHold}
          aria-label="SOS Emergency Alert: Press and hold for 3 seconds"
          className={`min-h-[54px] min-w-[140px] px-6 py-3 rounded-2xl font-black text-xl text-white shadow-xl flex items-center justify-center gap-2.5 transition transform active:scale-95 select-none ${
            holding
              ? 'bg-red-700 animate-pulse ring-4 ring-red-400'
              : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          <span className="text-2xl" aria-hidden="true">
            🚨
          </span>
          <span className="tracking-wider">
            {holding ? `${Math.ceil((100 - progress) / 33.3)}s दबाए रखें` : 'SOS आपातकाल'}
          </span>
        </button>
      </div>

      {/* Emergency Active Modal */}
      {modalOpen && activeSOS && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Emergency SOS Activated"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in"
        >
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border-4 border-red-600 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6 text-center">
            <div className="flex flex-col items-center">
              <span className="text-6xl animate-bounce" aria-hidden="true">
                🚨
              </span>
              <h2 className="text-3xl font-black text-red-600 mt-2">
                आपातकालीन अलार्म सक्रिय!
              </h2>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-1">
                Emergency Alert Sent to Family Circle
              </p>
            </div>

            {/* Alerted Contacts */}
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 text-left">
              <p className="text-xs font-bold uppercase text-red-800 dark:text-red-300 mb-2">
                इन परिजनों को अलर्ट भेज दिया गया है:
              </p>
              <ul className="flex flex-col gap-1 text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
                {activeSOS.contacts_alerted.map((c, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span>✓</span> {c}
                  </li>
                ))}
              </ul>
            </div>

            {/* GPS Coordinates & Map Link */}
            {activeSOS.maps_url ? (
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm">
                <p className="font-semibold text-slate-600 dark:text-slate-300">
                  📍 आपकी वर्तमान लोकेशन साझा की गई है:
                </p>
                <a
                  href={activeSOS.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-700 dark:text-teal-400 font-bold underline block mt-1"
                >
                  Google Maps पर स्थान देखें →
                </a>
              </div>
            ) : locating ? (
              <p className="text-sm text-slate-500 animate-pulse">
                लोकेशन खोजी जा रही है...
              </p>
            ) : null}

            {/* Instant Emergency 112 Call Button */}
            <a
              href="tel:112"
              className="w-full min-h-[58px] py-4 bg-red-600 hover:bg-red-700 text-white font-black text-2xl rounded-2xl shadow-xl flex items-center justify-center gap-3 transition transform active:scale-95"
            >
              <span>📞</span>
              <span>112 कॉल करें (Call 112 Now)</span>
            </a>

            {/* Close / Dismiss */}
            <button
              onClick={() => setModalOpen(false)}
              className="text-base text-slate-500 font-bold hover:underline py-2"
            >
              मैं ठीक हूँ, यह विंडो बंद करें (I am safe, close)
            </button>
          </div>
        </div>
      )}
    </>
  );
};
