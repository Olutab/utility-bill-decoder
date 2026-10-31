import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as pdfjs from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function BillDecoder() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const extracted = {
    kwh: Number(searchParams.get('kwh')) || 0,
    demand: Number(searchParams.get('demand')) || 0,
    total: Number(searchParams.get('total')) || 0,
    days: Number(searchParams.get('days')) || 30
  };

  const hasResults = extracted.total > 0;
  // total=0 in the URL means "we ran, and found nothing" — different from "never ran"
  const nothingFound = searchParams.get('total') === '0';

  const loadExample = () => {
    setSearchParams({ kwh: '4200', demand: '38', total: '1180.40', days: '31' });
    setStatus('done');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus('processing');
    setError('');

    try {
      let text = '';
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument(arrayBuffer).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((item) => item.str).join(' ');
        }
      } else {
        const result = await Tesseract.recognize(file, 'eng');
        text = result.data.text;
      }
      parseBillText(text);
    } catch (err) {
      setError('Could not read the file. Please try a clearer PDF or photo.');
      setStatus('error');
    }
  };

  const parseBillText = (text) => {
    const kwhMatch = text.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:kWh|KWH)/i);
    const demandMatch = text.match(/(?:Demand|Peak|kW|KW)\s*[:\-]?\s*(\d{1,3}(?:,\d{3})*|\d+)/i);
    const totalMatch = text.match(/(?:Total|Amount Due|Balance)\s*[:\-]?\s*\$?(\d{1,3}(?:,\d{3})*\.\d{2})/i);
    const daysMatch = text.match(/(?:Days|Period)\s*[:\-]?\s*(\d{2})/i);

    const kwh = kwhMatch ? Number(kwhMatch[1].replace(/,/g, '')) : 0;
    const demand = demandMatch ? Number(demandMatch[1].replace(/,/g, '')) : 0;
    const total = totalMatch ? Number(totalMatch[1].replace(/,/g, '')) : 0;
    const days = daysMatch ? Number(daysMatch[1]) : 30;

    setSearchParams({ kwh: String(kwh), demand: String(demand), total: String(total), days: String(days) });
    setStatus('done');
  };

  const effectiveRate = extracted.kwh > 0 ? (extracted.total / extracted.kwh) * 100 : 0;
  const loadFactor = extracted.demand > 0 ? (extracted.kwh / (extracted.demand * extracted.days * 24)) : 0;

  return (
    <div style={styles.container}>
      <h1 style={styles.h1}>The Commercial Bill Decoder</h1>
      <p style={styles.intro}>
        Drop your PDF or a photo of your bill. We extract the numbers locally in your browser—nothing is uploaded to a server.
      </p>

      {!hasResults && (
        <div style={styles.uploadArea}>
          <input
            type="file"
            accept=".pdf,image/*"
            onChange={handleFileUpload}
            style={styles.fileInput}
          />
          {status === 'processing' && <p style={styles.processing}>Reading meter data and line items...</p>}
          {status === 'error' && <p style={styles.error}>{error}</p>}

          {nothingFound && status !== 'processing' && (
            <p style={styles.notFound}>
              We read the file but found no bill numbers in it. The decoder looks for lines containing
              "kWh", "Demand" or "kW", and a "Total" with a dollar amount. Try a clearer photo or the
              original PDF — or load the example below.
            </p>
          )}

          <p style={styles.exampleHint}>
            No bill handy?{' '}
            <button onClick={loadExample} style={styles.exampleBtn}>Load example data</button>
          </p>
        </div>
      )}

      {hasResults && (
        <div style={styles.results}>
          <h2 style={styles.h2}>Your Two-Minute Read</h2>

          <div style={styles.metricCard}>
            <h3 style={styles.metricTitle}>Effective Rate</h3>
            <p style={styles.metricValue}>{effectiveRate.toFixed(2)}¢ / kWh</p>
            <p style={styles.metricContext}>
              This is your blended all-in cost. Compare this against your state's commercial average to see if your rate design is competitive.
            </p>
          </div>

          <div style={styles.metricCard}>
            <h3 style={styles.metricTitle}>Load Factor</h3>
            <p style={styles.metricValue}>{(loadFactor * 100).toFixed(1)}%</p>
            <p style={styles.metricContext}>
              {loadFactor < 0.3
                ? "Your load factor is low. You are concentrating your usage into short spikes, which triggers high demand charges."
                : "Your usage is relatively steady across the month."}
            </p>
          </div>

          <div style={styles.actionBox}>
            <h3 style={styles.actionTitle}>Your One Action This Week</h3>
            {extracted.demand > 50 ? (
              <p style={styles.actionText}>
                <strong>Shave the Peak:</strong> Your demand is over 50kW. Identify one high-draw process (like HVAC startup or heavy machinery) and stagger it so it doesn't run at the exact same time as your other equipment.
              </p>
            ) : (
              <p style={styles.actionText}>
                <strong>Shift the Load:</strong> Your demand is low, but check your TOU windows. Move non-essential tasks to off-peak hours to lower your effective rate.
              </p>
            )}
          </div>

          <p style={styles.disclaimer}>
            <strong>Method & Limits:</strong> Calculations use heuristic text extraction and assume standard 30-day billing. Actual tariff rules (like ratchets or power factor penalties) require reading your specific rate schedule.
          </p>

          <button onClick={() => setSearchParams({})} style={styles.resetBtn}>
            Reset & Clear Data
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '40px 20px',
    fontFamily: "'Newsreader', serif",
    color: '#10243A'
  },
  h1: {
    fontFamily: "'Archivo', sans-serif",
    fontSize: '2.5rem',
    fontWeight: 700,
    marginTop: 0,
    color: '#10243A'
  },
  h2: {
    fontFamily: "'Archivo', sans-serif",
    fontSize: '1.8rem',
    fontWeight: 700,
    marginTop: '32px',
    color: '#10243A'
  },
  intro: {
    fontSize: '1.25rem',
    color: '#0B5FA5',
    marginBottom: '32px'
  },
  uploadArea: {
    background: '#EEF2F6',
    border: '2px dashed #0B5FA5',
    padding: '40px',
    textAlign: 'center',
    borderRadius: '4px'
  },
  fileInput: {
    fontSize: '1rem',
    padding: '12px',
    cursor: 'pointer'
  },
  processing: {
    marginTop: '16px',
    color: '#0B5FA5',
    fontFamily: "'Archivo', sans-serif"
  },
  error: {
    marginTop: '16px',
    color: '#8A4B00',
    fontFamily: "'Archivo', sans-serif"
  },
  notFound: {
    marginTop: '16px',
    background: '#FFF8F0',
    border: '2px solid #8A4B00',
    color: '#8A4B00',
    padding: '16px',
    borderRadius: '4px',
    fontFamily: "'Archivo', sans-serif",
    fontSize: '0.95rem'
  },
  exampleHint: {
    marginTop: '20px',
    fontSize: '0.95rem',
    color: '#555'
  },
  exampleBtn: {
    background: '#0B5FA5',
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 18px',
    fontSize: '0.95rem',
    fontFamily: "'Archivo', sans-serif",
    fontWeight: 600,
    cursor: 'pointer',
    borderRadius: '4px',
    marginLeft: '8px'
  },
  results: {
    marginTop: '32px'
  },
  metricCard: {
    background: '#FFFFFF',
    border: '2px solid #d1d9e6',
    padding: '24px',
    marginBottom: '24px',
    borderRadius: '4px'
  },
  metricTitle: {
    fontFamily: "'Archivo', sans-serif",
    fontSize: '1.2rem',
    fontWeight: 600,
    margin: '0 0 8px 0',
    color: '#10243A'
  },
  metricValue: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#0B5FA5',
    fontFamily: "'Archivo', sans-serif",
    margin: '0 0 12px 0'
  },
  metricContext: {
    fontSize: '1rem',
    color: '#555',
    margin: 0
  },
  actionBox: {
    background: '#FFF8F0',
    border: '2px solid #8A4B00',
    padding: '24px',
    borderRadius: '4px',
    marginBottom: '24px'
  },
  actionTitle: {
    fontFamily: "'Archivo', sans-serif",
    fontSize: '1.2rem',
    fontWeight: 600,
    color: '#8A4B00',
    margin: '0 0 12px 0'
  },
  actionText: {
    fontSize: '1.1rem',
    margin: 0
  },
  disclaimer: {
    fontSize: '0.9rem',
    color: '#666',
    borderTop: '1px solid #d1d9e6',
    paddingTop: '16px',
    marginTop: '32px'
  },
  resetBtn: {
    background: '#10243A',
    color: '#EEF2F6',
    border: 'none',
    padding: '12px 24px',
    fontSize: '1rem',
    fontFamily: "'Archivo', sans-serif",
    fontWeight: 600,
    cursor: 'pointer',
    borderRadius: '4px',
    marginTop: '16px'
  }
};