import { Copy, MessageCircle, Share2 } from 'lucide-react';
import { canNativeShare, copyText, nativeShare, whatsappHref } from '../lib/share';
import { useApp } from '../state/app';

function FacebookMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.62 23.1 24 18.1 24 12.07z" />
    </svg>
  );
}

/** Preview of the generated post plus share actions. `missing` explains what's left to fill. */
export function ShareBar({ text, missing }: { text: string; missing: string | null }) {
  const { toast } = useApp();
  const ready = missing === null;

  const onCopy = async () => {
    toast((await copyText(text)) ? 'কপি হয়েছে' : 'কপি করা গেল না, লেখাটা চেপে ধরে কপি করুন');
  };
  const onShare = async () => {
    if (!(await nativeShare(text))) await onCopy();
  };
  const onFacebook = () => {
    // Facebook doesn't accept pre-filled text from a link; copy it so the user can paste.
    void copyText(text);
    toast('লেখা কপি হয়েছে। Facebook-এ পোস্ট লিখতে গিয়ে পেস্ট করুন।');
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="label">পোস্টটা এমন দেখাবে</h2>
        <pre
          className={`card font-sans text-[16px] leading-relaxed whitespace-pre-wrap ${ready ? 'text-ink-900' : 'text-ink-400'}`}
        >
          {text}
        </pre>
      </div>

      {!ready && <p className="text-[15px] font-medium text-warn-700">{missing}</p>}

      {canNativeShare() && (
        <button type="button" className="btn btn-primary w-full" disabled={!ready} onClick={onShare}>
          <Share2 size={20} /> শেয়ার করুন
        </button>
      )}
      <div className="grid grid-cols-3 gap-2">
        <a
          href={ready ? whatsappHref(text) : undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!ready}
          className={`btn px-2 text-white ${ready ? 'bg-[#1a9e53] active:bg-[#14833f]' : 'pointer-events-none bg-[#1a9e53] opacity-45'}`}
        >
          <MessageCircle size={20} /> WhatsApp
        </a>
        <a
          href={ready ? 'https://www.facebook.com/' : undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!ready}
          onClick={ready ? onFacebook : undefined}
          className={`btn px-2 text-white ${ready ? 'bg-[#1877f2] active:bg-[#1264cf]' : 'pointer-events-none bg-[#1877f2] opacity-45'}`}
        >
          <FacebookMark /> Facebook
        </a>
        <button type="button" className="btn btn-soft px-2" disabled={!ready} onClick={onCopy}>
          <Copy size={20} /> কপি
        </button>
      </div>
    </div>
  );
}
