import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import WelcomeScreen from './components/WelcomeScreen';
import OnboardingFlow from './components/OnboardingFlow';
import MatchPage from './pages/MatchPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomeScreen />} />
        <Route path="/onboarding" element={<OnboardingFlow />} />
        <Route path="/match" element={<MatchPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
