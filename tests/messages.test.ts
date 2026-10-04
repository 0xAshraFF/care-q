import { describe, expect, it } from 'vitest';
import { bloodMessage, icuMessage, oxygenMessage } from '../src/lib/messages';
import { mergeWards } from '../src/state/app';

describe('blood post', () => {
  it('leads with the group and keeps the phone dialable', () => {
    const text = bloodMessage({
      group: 'O+',
      bags: 2,
      when: 'আজকেই',
      problem: '  ডেঙ্গু ',
      hospital: 'ঢাকা মেডিকেল কলেজ হাসপাতাল',
      ward: '',
      phone: '০১৭১২-৩৪৫৬৭৮',
    });
    expect(text.split('\n')[0]).toBe('জরুরি O+ রক্ত প্রয়োজন');
    expect(text).toContain('পরিমাণ: ২ ব্যাগ');
    expect(text).toContain('রোগীর সমস্যা: ডেঙ্গু');
    expect(text).toContain('যোগাযোগ: 01712345678');
    expect(text).not.toContain('ওয়ার্ড/বেড');
  });
});

describe('icu post', () => {
  it('skips empty optional lines', () => {
    const text = icuMessage({ type: 'সিসিইউ', age: '', problem: '', location: 'ঢাকা মেডিকেল', phone: '01812345678' });
    expect(text.split('\n')[0]).toBe('জরুরি সিসিইউ বেড প্রয়োজন');
    expect(text).not.toContain('বয়স');
    expect(text).toContain('রোগী এখন আছেন: ঢাকা মেডিকেল');
  });
});

describe('oxygen post', () => {
  it('shows age in Bengali digits', () => {
    const text = oxygenMessage({ type: 'অক্সিজেন সিলিন্ডার', age: '70', address: 'মিরপুর ১০', phone: '01912345678' });
    expect(text).toContain('রোগীর বয়স: ৭০ বছর');
  });
});

describe('mergeWards', () => {
  it('overlays status on built-in wards and adds doctor-created ones', () => {
    const wards = mergeWards('dmch', [
      { id: 'dmch-icu', hospitalId: 'dmch', full: true, updatedAt: 1 },
      { id: 'x1', hospitalId: 'dmch', custom: true, nameBn: 'মেডিসিন ইউনিট ৩', full: false, updatedAt: 2 },
      { id: 'stray', hospitalId: 'dmch', full: false },
    ]);
    expect(wards.find((w) => w.id === 'dmch-icu')?.status).toBe('full');
    expect(wards.find((w) => w.id === 'dmch-surgery')?.status).toBe('unknown');
    expect(wards.find((w) => w.id === 'x1')?.status).toBe('open');
    expect(wards.find((w) => w.id === 'stray')).toBeUndefined();
  });
});
