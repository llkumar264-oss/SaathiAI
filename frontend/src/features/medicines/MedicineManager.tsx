import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pill,
  Camera,
  CheckCircle,
  XCircle,
  Clock,
  Info,
  Bell,
  AlertCircle,
  ArrowLeft,
  Check,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface Medicine {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  timing: string;
  purpose: string;
  instructions?: string;
  is_active?: boolean;
}

interface AdherenceStats {
  overall_adherence_percent: number;
  total_scheduled: number;
  total_taken: number;
  total_skipped: number;
  missed_medicines: string[];
}

export const MedicineManager: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { t } = useTranslation();
  const { token } = useAuth();

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [adherence, setAdherence] = useState<AdherenceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [extractedPreview, setExtractedPreview] = useState<Medicine[] | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [showAddManual, setShowAddManual] = useState(false);
  const [manualForm, setManualForm] = useState({
    name: '',
    dosage: '',
    frequency: 'Once daily - Morning',
    timing: '08:30',
    purpose: '',
  });

  const fetchMedicinesData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch medicines
      const res = await fetch('/api/medicines', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMedicines(data);
        // Cache for offline viewing
        localStorage.setItem('saathi_offline_meds', JSON.stringify(data));
      } else {
        // Fallback to offline cache
        const cached = localStorage.getItem('saathi_offline_meds');
        if (cached) setMedicines(JSON.parse(cached));
      }

      // 2. Fetch adherence stats
      const adhRes = await fetch('/api/medicines/adherence', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (adhRes.ok) {
        const adhData = await adhRes.json();
        setAdherence(adhData);
      }
    } catch (err) {
      console.warn('Using offline cached medicines:', err);
      const cached = localStorage.getItem('saathi_offline_meds');
      if (cached) setMedicines(JSON.parse(cached));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicinesData();
  }, [token]);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        new Notification('साथी AI रिमाइंडर सक्रिय', {
          body: 'दवाइयों के समय पर आपको याद दिलाया जाएगा।',
          icon: '/favicon.ico',
        });
      }
    }
  };

  const handlePrescriptionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/medicines/extract-prescription', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error('Prescription upload failed');
      const data = await res.json();
      setExtractedPreview(data.medicines);
    } catch (err) {
      alert('पर्चे की फोटो से दवाइयां पढ़ने में समस्या आई। कृपया साफ़ फोटो अपलोड करें।');
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmExtracted = async () => {
    if (!extractedPreview) return;
    for (const med of extractedPreview) {
      await fetch('/api/medicines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(med),
      });
    }
    setExtractedPreview(null);
    fetchMedicinesData();
  };

  const handleLogDose = async (medicineId: string, status: 'taken' | 'skipped') => {
    try {
      await fetch(`/api/medicines/${medicineId}/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      fetchMedicinesData();
    } catch (err) {
      console.error('Failed to log dose:', err);
    }
  };

  const handleAddManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.name) return;

    await fetch('/api/medicines', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(manualForm),
    });

    setShowAddManual(false);
    setManualForm({
      name: '',
      dosage: '',
      frequency: 'Once daily - Morning',
      timing: '08:30',
      purpose: '',
    });
    fetchMedicinesData();
  };

  return (
    <div className="space-y-6">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="touch-target flex items-center space-x-2 px-4 py-2 bg-white rounded-xl border border-gray-200 text-teal-deep font-bold hover:bg-gray-50 shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>वापस डैशबोर्ड (Back)</span>
        </button>
        <h2 className="text-2xl font-bold text-teal-deep">दवाइयां और दिनचर्या (Medicines)</h2>
        <div className="w-10" />
      </div>

      {/* Reminder Notification Banner (Requirement 6) */}
      <div className="bg-teal-light/50 border border-teal-border rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start space-x-3">
          <Bell className="w-6 h-6 text-teal-deep mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-teal-deep text-base">ब्राउज़र रिमाइंडर व सूचनाएं</h4>
            <p className="text-xs sm:text-sm text-gray-700">
              समय पर दवा की याद दिलाने के लिए ब्राउज़र खुला रखें या ऐप को फ़ोन में इंस्टॉल (PWA) करें।
            </p>
          </div>
        </div>
        {notificationPermission !== 'granted' && (
          <button
            onClick={requestNotificationPermission}
            className="touch-target bg-teal-deep text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-teal-dark flex-shrink-0"
          >
            रिमाइंडर चालू करें
          </button>
        )}
      </div>

      {/* Adherence & Action Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Adherence Card */}
        <div className="bg-white p-5 rounded-2xl shadow-senior border border-teal-deep/10 flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-gray-500">7-दिन की नियमितता (Adherence)</span>
            <div className="text-3xl font-extrabold text-teal-deep mt-1">
              {adherence ? `${adherence.overall_adherence_percent}%` : '100%'}
            </div>
            <span className="text-xs text-green-700 font-bold">
              {adherence?.total_taken || 0} दवाइयां समय पर ली गईं
            </span>
          </div>
          <div className="w-16 h-16 rounded-full border-4 border-teal-deep flex items-center justify-center text-teal-deep font-black text-lg bg-teal-light/30">
            ✓
          </div>
        </div>

        {/* Scan Prescription Photo Button */}
        <label className="touch-target bg-saffron hover:bg-saffron-hover text-white p-5 rounded-2xl shadow-md cursor-pointer flex items-center justify-center space-x-3 transition-colors">
          <Camera className="w-8 h-8" />
          <div className="text-left">
            <div className="font-extrabold text-lg">पर्चा स्कैन करें</div>
            <div className="text-xs text-white/90">फोटो से दवाइयां स्वतः जुड़ेंगी</div>
          </div>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePrescriptionUpload}
            disabled={isUploading}
          />
        </label>

        {/* Add Manually Button */}
        <button
          onClick={() => setShowAddManual(!showAddManual)}
          className="touch-target bg-white border-2 border-teal-deep/30 hover:border-teal-deep text-teal-deep p-5 rounded-2xl shadow-sm flex items-center justify-center space-x-3 transition-colors"
        >
          <Plus className="w-7 h-7 text-saffron" />
          <div className="text-left">
            <div className="font-extrabold text-lg text-teal-deep">नई दवाई लिखें</div>
            <div className="text-xs text-gray-500">नाम व समय खुद दर्ज करें</div>
          </div>
        </button>
      </div>

      {isUploading && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-2xl text-center space-y-2 text-yellow-900 font-bold animate-pulse">
          <p>📷 AI पर्चे को पढ़ रहा है और दवाइयां निकाल रहा है... कृपया 3 सेकंड प्रतीक्षा करें।</p>
        </div>
      )}

      {/* Prescription Preview Modal Before Saving */}
      {extractedPreview && (
        <div className="bg-white border-2 border-saffron rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 text-saffron font-bold text-xl">
            <AlertCircle className="w-7 h-7" />
            <span>पर्चे से निकली दवाइयों की पुष्टि करें (Confirm Prescription)</span>
          </div>
          <p className="text-sm text-gray-700">
            कृपया जाँच लें कि नीचे दी गई दवाएं सही हैं, फिर &quot;हाँ, दिनचर्या में जोड़ें&quot; दबाएं:
          </p>

          <div className="space-y-3">
            {extractedPreview.map((med, idx) => (
              <div key={idx} className="p-4 bg-cream-50 rounded-xl border border-gray-200 space-y-1">
                <div className="flex justify-between font-extrabold text-teal-deep text-lg">
                  <span>{med.name}</span>
                  <span>{med.dosage}</span>
                </div>
                <div className="text-sm text-gray-600 flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-saffron" />
                  <span>{med.frequency} ({med.timing})</span>
                </div>
                <div className="text-xs text-gray-700 bg-white p-2 rounded-lg border border-gray-100">
                  💡 <strong>किसलिए है:</strong> {med.purpose}
                </div>
              </div>
            ))}
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              onClick={handleConfirmExtracted}
              className="flex-1 touch-target bg-teal-deep text-white font-bold py-3.5 rounded-xl shadow-md flex items-center justify-center space-x-2"
            >
              <Check className="w-5 h-5" />
              <span>हाँ, दिनचर्या में जोड़ें</span>
            </button>
            <button
              onClick={() => setExtractedPreview(null)}
              className="touch-target px-6 bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl"
            >
              रद्द करें
            </button>
          </div>
        </div>
      )}

      {/* Manual Add Form */}
      {showAddManual && (
        <form
          onSubmit={handleAddManualSubmit}
          className="bg-white p-6 rounded-3xl border border-teal-deep/20 shadow-senior space-y-4"
        >
          <h3 className="text-xl font-bold text-teal-deep">नई दवाई का विवरण भरें</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">दवाई का नाम:</label>
              <input
                type="text"
                value={manualForm.name}
                onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                placeholder="जैसे: Amlodipine"
                required
                className="w-full p-3 border rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">डोज़ (मात्रा):</label>
              <input
                type="text"
                value={manualForm.dosage}
                onChange={(e) => setManualForm({ ...manualForm, dosage: e.target.value })}
                placeholder="जैसे: 5mg / 1 गोली"
                required
                className="w-full p-3 border rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">लेने का समय:</label>
              <input
                type="time"
                value={manualForm.timing}
                onChange={(e) => setManualForm({ ...manualForm, timing: e.target.value })}
                className="w-full p-3 border rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">यह किसलिए है?</label>
              <input
                type="text"
                value={manualForm.purpose}
                onChange={(e) => setManualForm({ ...manualForm, purpose: e.target.value })}
                placeholder="जैसे: बीपी नियंत्रण"
                className="w-full p-3 border rounded-xl"
              />
            </div>
          </div>
          <div className="flex space-x-2 pt-2">
            <button
              type="submit"
              className="touch-target bg-teal-deep text-white font-bold py-3 px-6 rounded-xl shadow-md"
            >
              सुरक्षित करें
            </button>
            <button
              type="button"
              onClick={() => setShowAddManual(false)}
              className="touch-target bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-xl"
            >
              रद्द करें
            </button>
          </div>
        </form>
      )}

      {/* Today's Medicines List */}
      <div className="space-y-4">
        <h3 className="text-xl font-extrabold text-teal-deep flex items-center space-x-2">
          <Clock className="w-6 h-6 text-saffron" />
          <span>आज की दवाइयां ({medicines.length})</span>
        </h3>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500 font-medium">दवाइयां लोड हो रही हैं...</div>
        ) : medicines.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl text-center border border-dashed border-gray-300 space-y-2">
            <Pill className="w-12 h-12 text-gray-400 mx-auto" />
            <p className="text-lg font-bold text-gray-700">अभी कोई दवाई नहीं जुड़ी है</p>
            <p className="text-sm text-gray-500">ऊपर दिए गए बटन से पर्चा स्कैन करें या नई दवाई लिखें।</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {medicines.map((med) => (
              <div
                key={med.id}
                className="bg-white p-5 rounded-2xl shadow-senior border border-teal-deep/10 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="w-3 h-3 rounded-full bg-saffron flex-shrink-0" />
                    <h4 className="text-xl font-extrabold text-teal-deep">{med.name}</h4>
                    <span className="bg-teal-light text-teal-deep text-xs font-bold px-2.5 py-1 rounded-lg">
                      {med.dosage}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="font-semibold">{med.frequency}</span>
                    <span className="text-gray-400">|</span>
                    <span className="text-saffron font-bold">समय: {med.timing}</span>
                  </div>
                  {med.purpose && (
                    <p className="text-xs text-gray-700 bg-cream-50 p-2 rounded-xl flex items-center space-x-1.5 border border-cream-200">
                      <Info className="w-4 h-4 text-teal-deep flex-shrink-0" />
                      <span>{med.purpose}</span>
                    </p>
                  )}
                </div>

                {/* 1-Tap Take or Skip Buttons */}
                <div className="flex items-center space-x-3 flex-shrink-0">
                  <button
                    onClick={() => handleLogDose(med.id, 'taken')}
                    className="flex-1 md:flex-none touch-target bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-sm flex items-center justify-center space-x-1.5 transition-transform active:scale-95"
                    aria-label={`Mark ${med.name} as taken`}
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>ली (Taken)</span>
                  </button>

                  <button
                    onClick={() => handleLogDose(med.id, 'skipped')}
                    className="flex-1 md:flex-none touch-target bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-1.5 transition-colors"
                    aria-label={`Mark ${med.name} as skipped`}
                  >
                    <XCircle className="w-5 h-5 text-gray-500" />
                    <span>छोड़ी (Skip)</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
