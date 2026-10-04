import { BedDouble, Download, Droplet, HeartPulse, Stethoscope, WifiOff, Wind } from 'lucide-react';
import { useEffect, useState } from 'react';
import { firebaseConfigured } from '../backend';
import { resetDemo } from '../backend/demo';
import { DEFAULT_HOSPITAL } from '../data/hospitals';
import { useOnline, type Route } from '../lib/hooks';
import { useApp } from '../state/app';

export const APP_NAME = 'CareQ';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function InstallButton() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setEvt(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);
  if (!evt) return null;
  return (
    <button
      type="button"
      className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 text-[15px] font-semibold text-brand-700"
      onClick={async () => {
        await evt.prompt();
        await evt.userChoice;
        setEvt(null);
      }}
    >
      <Download size={17} /> অ্যাপ নিন
    </button>
  );
}

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="16" fill="#226fbc" />
      <path d="M26 14h12v12h12v12H38v12H26V38H14V26h12z" fill="#fff" />
    </svg>
  );
}

export function Header() {
  return (
    <header
      className="sticky z-20 border-b border-line bg-white/95 backdrop-blur"
      style={{ top: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-2.5">
        <Logo />
        <div className="min-w-0 flex-1">
          <p className="text-[19px] leading-tight font-semibold text-ink-900">{APP_NAME}</p>
          <p className="truncate text-[13px] leading-tight text-ink-500">{DEFAULT_HOSPITAL.nameBn}</p>
        </div>
        <InstallButton />
      </div>
    </header>
  );
}

const TABS: { id: Route; label: string; Icon: typeof BedDouble }[] = [
  { id: 'ward', label: 'ওয়ার্ড', Icon: BedDouble },
  { id: 'blood', label: 'রক্ত', Icon: Droplet },
  { id: 'icu', label: 'আইসিইউ', Icon: HeartPulse },
  { id: 'oxygen', label: 'অক্সিজেন', Icon: Wind },
  { id: 'doctor', label: 'ডাক্তার', Icon: Stethoscope },
];

export function BottomNav({ route, go }: { route: Route; go: (r: Route) => void }) {
  const { isDoctor } = useApp();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {TABS.map(({ id, label, Icon }) => {
          const active = id === route;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => go(id)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex h-16 w-full flex-col items-center justify-center gap-0.5 text-[13px] font-medium ${
                  active ? 'text-brand-700' : 'text-ink-500'
                }`}
              >
                <span className={`grid h-8 w-14 place-items-center rounded-full ${active ? 'bg-brand-100' : ''}`}>
                  <Icon size={22} strokeWidth={active ? 2.3 : 1.9} />
                </span>
                {label}
                {id === 'doctor' && isDoctor && (
                  <span className="absolute top-2 right-[calc(50%-1.1rem)] size-2.5 rounded-full border-2 border-white bg-ok-600" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Banners() {
  const online = useOnline();
  return (
    <>
      {!online && (
        <div className="flex items-center justify-center gap-2 bg-ink-700 px-4 py-2 text-[14px] text-white">
          <WifiOff size={16} /> ইন্টারনেট নেই। শেষবার পাওয়া তথ্য দেখাচ্ছে।
        </div>
      )}
      {!firebaseConfigured && (
        <div className="bg-warn-50 px-4 py-2 text-center text-[14px] text-warn-700">
          ডেমো মোড: তথ্য শুধু এই ফোনে থাকছে।{' '}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => {
              resetDemo();
              window.location.reload();
            }}
          >
            আবার শুরু
          </button>
        </div>
      )}
    </>
  );
}
