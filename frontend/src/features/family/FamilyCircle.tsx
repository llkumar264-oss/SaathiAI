import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { SOSButton } from './SOSButton';

export interface TrustedContact {
  id: string;
  name: string;
  relationship: string;
  phone_number: string;
  is_primary: boolean;
  notify_on_scam: boolean;
  notify_on_vitals: boolean;
  notify_on_sos: boolean;
}

export interface CaregiverDashboardView {
  senior_name: string;
  today_date: string;
  adherence_rate_7d: number;
  today_doses_summary: Array<{
    name: string;
    time: string;
    dosage?: string;
    purpose?: string;
  }>;
  latest_vitals?: {
    systolic?: number;
    diastolic?: number;
    blood_sugar?: number;
    pulse?: number;
    tier?: string;
    urgent?: boolean;
    advisory?: string;
  };
  recent_scam_alerts: Array<{
    timestamp: string;
    risk_score: number;
    tier: string;
    snippet: string;
  }>;
  last_sos?: {
    id: string;
    timestamp: string;
    maps_url?: string;
    contacts_alerted: string[];
  };
}

interface FamilyCircleProps {
  onBack?: () => void;
  initialContacts?: TrustedContact[];
}

export const FamilyCircle: React.FC<FamilyCircleProps> = ({
  onBack,
  initialContacts,
}) => {
  const { token } = useAuth();
  const { highContrast } = useAccessibility();

  const [activeTab, setActiveTab] = useState<'contacts' | 'caregiver'>('contacts');
  const [contacts, setContacts] = useState<TrustedContact[]>(initialContacts || []);
  const [caregiverData, setCaregiverData] = useState<CaregiverDashboardView | null>(null);
  const [loading, setLoading] = useState<boolean>(!initialContacts);

  // Add Contact Modal State
  const [addModalOpen, setAddModalOpen] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newRel, setNewRel] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [isPrimary, setIsPrimary] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/family/contacts', { headers });
      if (res.ok) {
        const data: TrustedContact[] = await res.json();
        setContacts(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchCaregiverView = useCallback(async () => {
    try {
      setLoading(true);
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/family/caregiver-view', { headers });
      if (res.ok) {
        const data: CaregiverDashboardView = await res.json();
        setCaregiverData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!initialContacts) {
      fetchContacts();
    }
  }, [initialContacts, fetchContacts]);

  useEffect(() => {
    if (activeTab === 'caregiver') {
      fetchCaregiverView();
    }
  }, [activeTab, fetchCaregiverView]);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    try {
      setSubmitting(true);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/family/contacts', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: newName.trim(),
          relationship: newRel.trim() || 'Family',
          phone_number: newPhone.trim(),
          is_primary: isPrimary,
          notify_on_scam: true,
          notify_on_vitals: true,
          notify_on_sos: true,
        }),
      });

      if (res.ok) {
        const created: TrustedContact = await res.json();
        setContacts((prev) => [...prev, created]);
        setNewName('');
        setNewRel('');
        setNewPhone('');
        setIsPrimary(false);
        setAddModalOpen(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/family/contacts/${contactId}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        setContacts((prev) => prev.filter((c) => c.id !== contactId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      className={`w-full max-w-5xl mx-auto p-4 sm:p-6 flex flex-col gap-6 ${
        highContrast ? 'text-white' : 'text-slate-900 dark:text-slate-100'
      }`}
    >
      {/* Top Header + SOS Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-teal-100 dark:border-slate-800 pb-4">
        <div>
          {onBack && (
            <button
              onClick={onBack}
              className="text-base text-teal-700 dark:text-teal-400 font-bold mb-1 flex items-center gap-1 hover:underline"
            >
              ← वापस डैशबोर्ड (Back)
            </button>
          )}
          <h1 className="text-3xl sm:text-4xl font-black">
            परिवार सुरक्षा घेरा (Family Circle & SOS)
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
            आपातकालीन संपर्क, देखभाल डैशबोर्ड और 3-सेकंड SOS सुरक्षा प्रणाली
          </p>
        </div>

        {/* The 3-Second SOS Emergency Button */}
        <SOSButton />
      </div>

      {/* Tabs: Contacts vs Caregiver View */}
      <div className="flex gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('contacts')}
          className={`min-h-[46px] px-5 py-2.5 rounded-2xl font-black text-base sm:text-lg transition ${
            activeTab === 'contacts'
              ? 'bg-teal-700 text-white shadow'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          👨‍👩‍👦 विश्वस्त संपर्क (Trusted Contacts)
        </button>
        <button
          onClick={() => setActiveTab('caregiver')}
          className={`min-h-[46px] px-5 py-2.5 rounded-2xl font-black text-base sm:text-lg transition ${
            activeTab === 'caregiver'
              ? 'bg-teal-700 text-white shadow'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          📊 केयरगिवर डैशबोर्ड (Caregiver View)
        </button>
      </div>

      {/* TAB 1: CONTACTS */}
      {activeTab === 'contacts' && (
        <section aria-label="Trusted Contacts List" className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-black">
              पंजीकृत परिजन एवं चिकित्सक ({contacts.length})
            </h2>
            <button
              onClick={() => setAddModalOpen(true)}
              className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-2xl shadow transition"
            >
              + नया संपर्क जोड़ें (Add Contact)
            </button>
          </div>

          {loading ? (
            <p className="text-slate-500">संपर्क लोड हो रहे हैं...</p>
          ) : contacts.length === 0 ? (
            <p className="text-slate-500">कोई संपर्क नहीं मिला। ऊपर से नया संपर्क जोड़ें।</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className={`p-6 rounded-3xl border-2 shadow-sm flex flex-col justify-between ${
                    contact.is_primary
                      ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                      : 'bg-white dark:bg-slate-800 border-teal-100 dark:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black px-3 py-1 bg-teal-100 dark:bg-teal-950 text-teal-900 dark:text-teal-200 rounded-full">
                        {contact.relationship}
                      </span>
                      {contact.is_primary && (
                        <span className="text-xs font-black px-3 py-1 bg-amber-200 text-amber-900 rounded-full">
                          ★ मुख्य आपातकालीन संपर्क
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-bold mt-3 text-slate-900 dark:text-white">
                      {contact.name}
                    </h3>
                    <p className="text-base text-slate-600 dark:text-slate-300 font-semibold mt-1">
                      {contact.phone_number}
                    </p>

                    {/* Permissions list */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {contact.notify_on_sos && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200">
                          🚨 SOS
                        </span>
                      )}
                      {contact.notify_on_vitals && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                          💓 वाइटल्स
                        </span>
                      )}
                      {contact.notify_on_scam && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                          🛡️ स्कैम अलर्ट
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-5 border-t border-slate-100 dark:border-slate-700/60 mt-4">
                    <a
                      href={`tel:${contact.phone_number}`}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow flex items-center gap-1.5"
                    >
                      <span>📞</span>
                      <span>कॉल करें</span>
                    </a>
                    <button
                      onClick={() => handleDeleteContact(contact.id)}
                      className="text-xs text-rose-600 dark:text-rose-400 font-bold hover:underline"
                    >
                      हटाएं (Remove)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: CAREGIVER DASHBOARD VIEW */}
      {activeTab === 'caregiver' && (
        <section aria-label="Caregiver Overview" className="flex flex-col gap-6">
          <div className="p-6 rounded-3xl bg-teal-50 dark:bg-slate-900 border-2 border-teal-200 dark:border-teal-900">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              {caregiverData?.senior_name || 'वरिष्ठ नागरिक'} का दैनिक स्वास्थ्य सारांश
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              दिनांक: {caregiverData?.today_date || 'आज'} • केवल अधिकृत परिजनों के लिए
            </p>
          </div>

          {loading ? (
            <p className="text-slate-500">केयरगिवर रिपोर्ट लोड हो रही है...</p>
          ) : caregiverData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Medicine Adherence Card */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border-2 border-teal-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-bold">दवा अनुपालन (7-Day Adherence)</h3>
                    <span className="text-2xl font-black text-teal-700 dark:text-teal-400">
                      {caregiverData.adherence_rate_7d}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-3.5 rounded-full overflow-hidden mb-4">
                    <div
                      className="bg-teal-600 h-full rounded-full transition-all"
                      style={{ width: `${caregiverData.adherence_rate_7d}%` }}
                    ></div>
                  </div>

                  <p className="text-sm font-bold text-slate-500 mb-2">आज की दवाएं:</p>
                  <div className="flex flex-col gap-2">
                    {caregiverData.today_doses_summary.map((d, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-sm"
                      >
                        <span className="font-bold">{d.name}</span>
                        <span className="text-xs text-slate-500">{d.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Latest Vitals Card */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border-2 border-teal-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">नवीनतम वाइटल्स (Latest Vitals)</h3>
                    {caregiverData.latest_vitals?.tier && (
                      <span className="text-xs font-black px-3 py-1 bg-teal-100 text-teal-900 rounded-full">
                        {caregiverData.latest_vitals.tier}
                      </span>
                    )}
                  </div>

                  {caregiverData.latest_vitals ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-baseline justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900">
                        <span className="text-sm font-semibold text-slate-500">रक्तचाप (BP)</span>
                        <span className="text-xl font-black">
                          {caregiverData.latest_vitals.systolic}/
                          {caregiverData.latest_vitals.diastolic} mmHg
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900">
                        <span className="text-sm font-semibold text-slate-500">ब्लड शुगर</span>
                        <span className="text-xl font-black text-teal-700 dark:text-teal-300">
                          {caregiverData.latest_vitals.blood_sugar || '--'} mg/dL
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900">
                        <span className="text-sm font-semibold text-slate-500">नब्ज़ (Pulse)</span>
                        <span className="text-xl font-black">
                          {caregiverData.latest_vitals.pulse || '--'} bpm
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">कोई हालिया वाइटल दर्ज नहीं है।</p>
                  )}
                </div>
              </div>

              {/* Recent Scam Alerts */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border-2 border-teal-100 dark:border-slate-700 shadow-sm md:col-span-2">
                <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <span>🛡️</span> सक्रिय फ्रॉड चेतावनी (Scam Alerts in Past 7 Days)
                </h3>
                {caregiverData.recent_scam_alerts.length === 0 ? (
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 font-bold">
                    ✓ कोई धोखाधड़ी या संदिग्ध संदेश नहीं मिला है।
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {caregiverData.recent_scam_alerts.map((s, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 flex items-center justify-between text-sm"
                      >
                        <div>
                          <span className="text-xs font-black text-amber-800 uppercase">
                            जोखिम स्कोर: {s.risk_score}/100
                          </span>
                          <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1">
                            {s.snippet}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </section>
      )}

      {/* Add Contact Modal */}
      {addModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-teal-200 flex flex-col gap-4">
            <h3 className="text-2xl font-black">नया आपातकालीन संपर्क जोड़ें</h3>
            <form onSubmit={handleAddContact} className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-bold mb-1">पूरा नाम</label>
                <input
                  type="text"
                  placeholder="उदा. राहुल शर्मा"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full min-h-[48px] p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">रिश्ता (Relationship)</label>
                <input
                  type="text"
                  placeholder="उदा. बेटा, बेटी, डॉक्टर, पड़ोसी"
                  value={newRel}
                  onChange={(e) => setNewRel(e.target.value)}
                  className="w-full min-h-[48px] p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">मोबाइल नंबर</label>
                <input
                  type="tel"
                  placeholder="उदा. +91 9876543210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full min-h-[48px] p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="primary-chk"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="w-5 h-5 rounded text-teal-600"
                />
                <label htmlFor="primary-chk" className="text-sm font-bold">
                  मुख्य आपातकालीन संपर्क बनाएं
                </label>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="flex-1 py-3 border border-slate-300 rounded-xl font-bold"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow"
                >
                  सहेजें (Save)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
