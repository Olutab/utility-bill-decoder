import BillDecoder from './BillDecoder.jsx';
import './App.css';

function App() {
  return (
    <div className="app">
      <nav className="tool-nav">
        <a href="../index.html" className="nav-link">← Back to Home</a>
        <span className="tool-title">Bill Decoder Tool</span>
      </nav>
      <BillDecoder />
    </div>
  );
}

export default App;