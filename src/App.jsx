import React from "react";
import LandingPage from './components/pages/LandingPage';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminPage from './components/pages/AdminPage';

import Navbar from "./components/Navbar/Navbar";

const App = () => {
  return (
    <Router>
    <main className="overflow-x-hidden bg-white text-dark">
      <div className="min-h-screen bg-white">
        <Navbar/>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
    </div>
      </main>
    </Router>
  );
};

export default App;
