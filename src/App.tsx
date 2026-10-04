import { Banners, BottomNav, Header } from './components/Chrome';
import { IncomingPopup } from './components/Referrals';
import { useHashRoute } from './lib/hooks';
import { DoctorPage } from './pages/DoctorPage';
import { BloodPage, IcuPage, OxygenPage } from './pages/ResourcePages';
import { WardsPage } from './pages/WardsPage';
import { AppProvider, useApp } from './state/app';

/** Referral alerts for the signed-in doctor, over whatever tab is open. */
function DoctorAlerts() {
  const { isDoctor } = useApp();
  return isDoctor ? <IncomingPopup /> : null;
}

export default function App() {
  const [route, go] = useHashRoute();
  return (
    <AppProvider>
      <Banners />
      <Header />
      <main className="mx-auto max-w-xl px-4 pt-5 pb-28">
        {route === 'ward' && <WardsPage go={go} />}
        {route === 'blood' && <BloodPage />}
        {route === 'icu' && <IcuPage />}
        {route === 'oxygen' && <OxygenPage />}
        {route === 'doctor' && <DoctorPage go={go} />}
      </main>
      <BottomNav route={route} go={go} />
      <DoctorAlerts />
    </AppProvider>
  );
}
