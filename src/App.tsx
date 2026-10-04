import { useEffect, useRef } from 'react';
import { Banners, BottomNav, Header } from './components/Chrome';
import { IncomingPopup } from './components/Referrals';
import { useHashRoute, type Route } from './lib/hooks';
import { DoctorPage } from './pages/DoctorPage';
import { AmbulancePage, BloodPage, IcuPage, OxygenPage } from './pages/ResourcePages';
import { ServicesPage } from './pages/ServicesPage';
import { WardsPage } from './pages/WardsPage';
import { WelcomePage } from './pages/WelcomePage';
import { AppProvider, useApp } from './state/app';

// Doctors: wards are home, the four services sit behind one tab. Patients: the services themselves.
const DOCTOR: Route[] = ['ward', 'help', 'doctor'];
const PATIENT: Route[] = ['blood', 'icu', 'oxygen', 'ambulance'];
const PENDING: Route[] = ['blood', 'icu', 'oxygen', 'ambulance', 'doctor'];

function Shell() {
  const { authReady, user, profile, isDoctor, isSuperAdmin, adminChecked, mode } = useApp();
  const [route, go] = useHashRoute();

  // Tabs follow who is using the app. No tabs while signing in, signing up or loading.
  let tabs: Route[] = [];
  if (user) {
    const loading = profile === undefined || !adminChecked;
    if (!loading && (isDoctor || isSuperAdmin)) tabs = DOCTOR;
    else if (!loading && profile) tabs = PENDING;
  } else if (mode === 'patient') {
    tabs = PATIENT;
  }
  const home: Route = tabs === DOCTOR ? 'ward' : tabs === PENDING ? 'doctor' : 'blood';
  const active: Route = tabs.length === 0 ? 'doctor' : tabs.includes(route) ? route : home;

  // When the role changes (signed up, approved, logged out), land on that role's home tab.
  const lastTabs = useRef(tabs);
  useEffect(() => {
    if (lastTabs.current !== tabs && tabs.length > 0) go(home);
    lastTabs.current = tabs;
  });

  if (authReady && !user && mode === null) {
    return (
      <>
        <Banners />
        <WelcomePage />
      </>
    );
  }

  return (
    <>
      <Banners />
      <Header />
      <main className={`mx-auto max-w-xl px-4 pt-5 ${tabs.length ? 'pb-28' : 'pb-10'}`}>
        {active === 'ward' && <WardsPage />}
        {active === 'help' && <ServicesPage />}
        {active === 'blood' && <BloodPage />}
        {active === 'icu' && <IcuPage />}
        {active === 'oxygen' && <OxygenPage />}
        {active === 'ambulance' && <AmbulancePage />}
        {active === 'doctor' && <DoctorPage />}
      </main>
      {tabs.length > 0 && <BottomNav tabs={tabs} route={active} go={go} />}
      {isDoctor && <IncomingPopup />}
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
