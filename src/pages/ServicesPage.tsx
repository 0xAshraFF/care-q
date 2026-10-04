import { useStoredState } from '../lib/hooks';
import { AmbulancePage, BloodPage, IcuPage, OxygenPage } from './ResourcePages';

type Service = 'blood' | 'icu' | 'oxygen' | 'ambulance';
const SERVICES: { id: Service; label: string }[] = [
  { id: 'blood', label: 'রক্ত' },
  { id: 'icu', label: 'আইসিইউ' },
  { id: 'oxygen', label: 'অক্সিজেন' },
  { id: 'ambulance', label: 'অ্যাম্বুলেন্স' },
];

/** Doctors' "সেবা" tab: the four patient services behind one tab, so the doctor's bar stays short. */
export function ServicesPage() {
  const [service, setService] = useStoredState<Service>('careq-service', 'blood');
  return (
    <>
      <div className="mb-4 grid grid-cols-4 gap-1 rounded-xl bg-brand-100 p-1">
        {SERVICES.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={service === s.id}
            onClick={() => setService(s.id)}
            className={`min-h-11 rounded-lg px-1 text-[15px] font-semibold transition-colors ${
              service === s.id ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {service === 'blood' && <BloodPage />}
      {service === 'icu' && <IcuPage />}
      {service === 'oxygen' && <OxygenPage />}
      {service === 'ambulance' && <AmbulancePage />}
    </>
  );
}
