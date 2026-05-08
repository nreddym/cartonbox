import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Carton Box Manufacturing System</h1>
        </header>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </div>
    </Router>
  );
}

function Home() {
  return (
    <div style={{ padding: '20px' }}>
      <h2>Welcome to Carton Box Manufacturing System</h2>
      <p>System is ready for development.</p>
    </div>
  );
}

export default App;
