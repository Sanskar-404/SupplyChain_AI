import React, { useEffect, useMemo, useState } from 'react';
import './style.css';

import {
  Activity,
  Truck,
  PackageCheck,
  AlertTriangle,
  Leaf,
  RefreshCw,
  LayoutDashboard,
  Thermometer,
  Droplets,
  Wind,
  MessageSquareText,
  Send,
  Star,
  Brain,
  BarChart3
} from 'lucide-react';

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

const API = 'http://127.0.0.1:8000/api';

const initial = {
  product: 'Mango',
  temperature_c: 8,
  humidity_pct: 82,
  co2_ppm: 700,
  days_in_storage: 3,
  initial_shelf_life_days: 12,
  transport_hours: 5
};

const SENTIMENT_COLORS = {
  Positive: '#3b9472',
  Negative: '#d56b5e',
  Neutral: '#d7a84c'
};

// Results from the saved model evaluation
const sentimentModelAccuracy = [
  { model: 'Naive Bayes', accuracy: 78.70 },
  { model: 'Logistic Regression', accuracy: 81.55 },
  { model: 'SVM', accuracy: 85.35 }
];

export default function App() {

  const [page, setPage] = useState('overview');

  const [form, setForm] = useState(initial);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Connecting to API…');
  const [error, setError] = useState('');
  const [lastChecked, setLastChecked] = useState(null);

  // Sentiment analysis states
  const [reviewText, setReviewText] = useState('');
  const [sentimentResult, setSentimentResult] = useState(null);
  const [sentimentBusy, setSentimentBusy] = useState(false);
  const [sentimentError, setSentimentError] = useState('');

  // Store sentiment predictions during the current session
  const [sentimentHistory, setSentimentHistory] = useState([]);

  // =====================================
  // LOAD BACKEND DATA
  // =====================================

  async function load() {
    try {
      const h = await fetch(`${API}/health`);

      if (!h.ok) {
        throw Error('API unavailable');
      }

      setStatus('API connected');

      const r = await fetch(`${API}/history`);

      if (!r.ok) {
        throw Error('History unavailable');
      }

      const j = await r.json();

      setHistory(j.items || []);

    } catch {
      setStatus('API offline — start FastAPI on port 8000');
    }
  }

  useEffect(() => {
    load();
  }, []);

  // =====================================
  // FORM HANDLING
  // =====================================

  function change(e) {
    setForm(p => ({
      ...p,
      [e.target.name]:
        e.target.type === 'number'
          ? Number(e.target.value)
          : e.target.value
    }));
  }

  // =====================================
  // SHIPMENT PREDICTION
  // =====================================

  async function analyse(e) {
    e?.preventDefault();

    setBusy(true);
    setError('');

    try {
      const r = await fetch(`${API}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });

      const j = await r.json();

      if (!r.ok) {
        throw Error(
          Array.isArray(j.detail)
            ? j.detail.map(x => x.msg).join(', ')
            : (j.detail || 'Prediction failed')
        );
      }

      setResult(j);
      setLastChecked(new Date());

      await load();

    } catch (err) {
      setError(
        `${err.message}. Confirm the backend is running at http://127.0.0.1:8000.`
      );
    } finally {
      setBusy(false);
    }
  }

  // =====================================
  // CUSTOMER REVIEW SENTIMENT ANALYSIS
  // =====================================

  async function analyzeReview(e) {
    e.preventDefault();

    if (!reviewText.trim()) {
      setSentimentError('Please enter a customer review.');
      return;
    }

    setSentimentBusy(true);
    setSentimentError('');
    setSentimentResult(null);

    try {
      const response = await fetch(
        `${API}/sentiment/analyze`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            review: reviewText.trim()
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || 'Sentiment analysis failed.'
        );
      }

      setSentimentResult(data);

      // Save the successful prediction in session history
      setSentimentHistory(previous => [
        {
          id: Date.now(),
          review: reviewText.trim(),
          final_sentiment: data.final_sentiment,
          predictions: data.predictions || {},
          analyzed_at: new Date().toLocaleString()
        },
        ...previous
      ]);

    } catch (err) {
      setSentimentError(
        `${err.message}. Check whether the backend is running and the sentiment models are loaded.`
      );
    } finally {
      setSentimentBusy(false);
    }
  }

  // =====================================
  // COLD-CHAIN ALERTS
  // =====================================

  const alerts = useMemo(() => {
    const a = [];

    if (form.temperature_c > 8) {
      a.push({
        level: 'high',
        text: 'Temperature is above the demo monitoring threshold of 8°C.'
      });
    }

    if (form.humidity_pct > 90) {
      a.push({
        level: 'medium',
        text: 'Relative humidity is high (>90%). Check condensation and product-specific guidance.'
      });
    }

    if (form.co2_ppm > 1000) {
      a.push({
        level: 'medium',
        text: 'CO₂ reading is elevated (>1,000 ppm). Verify sensor calibration and ventilation.'
      });
    }

    if (form.transport_hours > 18) {
      a.push({
        level: 'medium',
        text: 'Transport duration exceeds the demo threshold of 18 hours.'
      });
    }

    return a;
  }, [form]);

  // =====================================
  // FORM FIELDS
  // =====================================

  const fields = [
    ['temperature_c', 'Temperature (°C)', -30, 60, .1],
    ['humidity_pct', 'Relative humidity (%)', 0, 100, 1],
    ['co2_ppm', 'CO₂ concentration (ppm)', 0, 100000, 10],
    ['days_in_storage', 'Days in storage', 0, 365, .5],
    ['initial_shelf_life_days', 'Initial shelf life (days)', .1, 365, .5],
    ['transport_hours', 'Transport duration (hours)', 0, 1000, .5]
  ];

  const runButton = (
    <button disabled={busy} type="submit">
      {busy ? 'Analysing…' : 'Run analysis'}
      <Activity size={17} />
    </button>
  );

  // =====================================
  // SHIPMENT INPUT FORM
  // =====================================

  const inputForm = (compact = false) => (
    <form onSubmit={analyse}>

      <label>
        Product / commodity

        <input
          name="product"
          value={form.product}
          onChange={change}
          required
          maxLength="60"
        />
      </label>

      <div className="fields">

        {(compact ? fields.slice(0, 4) : fields).map(
          ([n, l, min, max, step]) => (

            <label key={n}>
              {l}

              <input
                type="number"
                name={n}
                min={min}
                max={max}
                step={step}
                value={form[n]}
                onChange={change}
                required
              />
            </label>

          )
        )}

      </div>

      {runButton}

      {error && <p className="error">{error}</p>}

    </form>
  );

  // =====================================
  // SHIPMENT ASSESSMENT
  // =====================================

  const assessment = () =>
    result ? (
      <>

        <div className="risk">

          <div>
            <span>ESTIMATED SPOILAGE RISK</span>
            <strong>{result.risk_score}%</strong>
          </div>

          <b className={`pill ${result.risk_level.toLowerCase()}`}>
            {result.risk_level} risk
          </b>

        </div>

        <div className="shelf">
          <span>Estimated remaining shelf life</span>

          <strong>
            {result.estimated_remaining_shelf_life_days}
            <small> days</small>
          </strong>
        </div>

        <div className="anomaly">
          <AlertTriangle size={18} />

          {result.cold_chain_anomaly
            ? 'Model flagged an unusual sensor pattern'
            : 'Model did not flag an unusual sensor pattern'}
        </div>

        <h3>Classifier comparison</h3>

        {Object.entries(result.model_probabilities || {}).map(
          ([k, v]) => (

            <div className="prob" key={k}>

              <div>
                <span>{k}</span>
                <b>{v}%</b>
              </div>

              <div className="track">
                <i style={{ width: `${v}%` }} />
              </div>

            </div>

          )
        )}

        <p className="disclaimer">{result.notice}</p>

      </>
    ) : (

      <div className="empty">

        <div><Activity size={30} /></div>

        <b>No analysis yet</b>

        <p>
          Enter shipment readings and run an analysis to see the model output.
        </p>

      </div>

    );

  // =====================================
  // SENTIMENT RESULT
  // =====================================

  const sentimentAssessment = () => {

    if (!sentimentResult) {
      return (

        <div className="empty sentiment-empty">

          <div><Brain size={30} /></div>

          <b>No review analysed yet</b>

          <p>
            Enter a customer review to compare predictions
            from Naive Bayes, Logistic Regression and SVM.
          </p>

        </div>

      );
    }

    const final = sentimentResult.final_sentiment;
    const sentimentClass = final.toLowerCase();

    return (

      <div className="sentiment-output">

        <div className="sentiment-final">

          <div>
            <span>FINAL SENTIMENT</span>

            <strong className={`sentiment-${sentimentClass}`}>
              {final.toUpperCase()}
            </strong>
          </div>

          <span className={`pill ${sentimentClass}`}>
            {final}
          </span>

        </div>

        <div className="sentiment-model-heading">

          <h3>Individual model predictions</h3>

          <span className="tag">
            {sentimentResult.models_loaded} MODELS LOADED
          </span>

        </div>

        {Object.entries(sentimentResult.predictions || {}).map(
          ([model, prediction]) => (

            <div className="sentiment-model" key={model}>

              <div className="sentiment-model-top">

                <div className="model-name">
                  <Brain size={17} />
                  <b>{model}</b>
                </div>

                <span className={`pill ${prediction.sentiment.toLowerCase()}`}>
                  {prediction.sentiment}
                </span>

              </div>

              <div className="sentiment-confidence">

                <div>
                  <span>Confidence</span>

                  <b>
                    {prediction.confidence !== null &&
                    prediction.confidence !== undefined
                      ? `${prediction.confidence}%`
                      : 'Not available'}
                  </b>
                </div>

                {prediction.confidence !== null &&
                 prediction.confidence !== undefined && (

                  <div className="track">
                    <i
                      style={{
                        width: `${prediction.confidence}%`
                      }}
                    />
                  </div>

                )}

              </div>

            </div>

          )
        )}

        <div className="anomaly sentiment-vote">
          <PackageCheck size={18} />

          Final result is determined using majority voting
          across the available model predictions.
        </div>

        <p className="disclaimer">
          {sentimentResult.notice}
        </p>

      </div>

    );
  };

  // =====================================
  // REVIEW ANALYTICS CALCULATIONS
  // =====================================

  const sentimentAnalytics = useMemo(() => {

    const positive = sentimentHistory.filter(
      x => x.final_sentiment === 'Positive'
    ).length;

    const negative = sentimentHistory.filter(
      x => x.final_sentiment === 'Negative'
    ).length;

    const neutral = sentimentHistory.filter(
      x => x.final_sentiment === 'Neutral'
    ).length;

    const total = sentimentHistory.length;

    const distribution = [
      { name: 'Positive', value: positive },
      { name: 'Negative', value: negative },
      { name: 'Neutral', value: neutral }
    ];

    const mostCommon = distribution.reduce(
      (best, current) =>
        current.value > best.value ? current : best,
      { name: 'No reviews', value: 0 }
    );

    const unanimous = sentimentHistory.filter(review => {

      const predictions = Object.values(review.predictions || {})
        .map(x => x.sentiment);

      return predictions.length > 0 &&
        predictions.every(x => x === predictions[0]);

    }).length;

    const agreement = total
      ? Number(((unanimous / total) * 100).toFixed(1))
      : 0;

    return {
      total,
      positive,
      negative,
      neutral,
      distribution,
      mostCommon: mostCommon.value
        ? mostCommon.name
        : 'N/A',
      agreement
    };

  }, [sentimentHistory]);

  // =====================================
  // RETURN UI
  // =====================================

  return (

    <div className="shell">

      {/* SIDEBAR */}

      <aside>

        <div className="brand">

          <div className="brand-icon">
            <Leaf />
          </div>

          <div>
            <b>SupplyChain<span>AI</span></b>
            <small>INTELLIGENCE PLATFORM</small>
          </div>

        </div>

        <button
          className={`nav ${page === 'overview' ? 'active' : ''}`}
          onClick={() => {
            setPage('overview');
            setError('');
          }}
        >
          <LayoutDashboard size={18} />
          Overview
        </button>

        <button
          className={`nav ${page === 'quality' ? 'active' : ''}`}
          onClick={() => {
            setPage('quality');
            setError('');
          }}
        >
          <PackageCheck size={18} />
          Quality prediction
        </button>

        <button
          className={`nav ${page === 'coldchain' ? 'active' : ''}`}
          onClick={() => {
            setPage('coldchain');
            setError('');
          }}
        >
          <Truck size={18} />
          Cold-chain monitor
        </button>

        <button
          className={`nav ${page === 'sentiment' ? 'active' : ''}`}
          onClick={() => {
            setPage('sentiment');
            setSentimentError('');
          }}
        >
          <MessageSquareText size={18} />
          Review analysis
        </button>

        <button
          className={`nav ${page === 'analytics' ? 'active' : ''}`}
          onClick={() => {
            setPage('analytics');
            setSentimentError('');
          }}
        >
          <BarChart3 size={18} />
          Review analytics
        </button>

        <div className="side-note">
          UNIVERSITY PROJECT
          <br />
          <strong>Food quality & logistics risk</strong>
        </div>

      </aside>

      {/* MAIN CONTENT */}

      <main>

        {/* HEADER */}

        <header>

          <div>

            <p className="eyebrow">
              SUPPLY CHAIN INTELLIGENCE / {page.toUpperCase()}
            </p>

            <h1>
              {page === 'overview'
                ? 'Freshness command centre'
                : page === 'quality'
                ? 'Food quality prediction'
                : page === 'coldchain'
                ? 'Cold-chain monitor'
                : page === 'analytics'
                ? 'Customer review analytics'
                : 'Customer review analysis'}
            </h1>

            <p className="muted">

              {page === 'coldchain'
                ? 'Review sensor readings, operating thresholds and model anomaly signals.'
                : page === 'quality'
                ? 'Estimate spoilage risk and remaining shelf life from shipment conditions.'
                : page === 'sentiment'
                ? 'Analyse customer feedback using three machine learning algorithms.'
                : page === 'analytics'
                ? 'Explore sentiment patterns, model performance and customer feedback.'
                : 'Monitor product condition and identify potential cold-chain risk.'}

            </p>

          </div>

          <div className="status">
            <i /> {status}
          </div>

        </header>

        {/* =====================================
            OVERVIEW
        ===================================== */}

        {page === 'overview' && (

          <>

            <section className="metrics">

              <div className="metric">
                <span>RECORDED ANALYSES</span>
                <b>{history.length}</b>
                <small>Available prediction history</small>
              </div>

              <div className="metric">
                <span>ML ALGORITHMS</span>
                <b>3 classifiers</b>
                <small>RF · SVM · Gradient Boosting</small>
              </div>

              <div className="metric">
                <span>MONITORING</span>
                <b>Sensor analysis</b>
                <small>Temperature · humidity · CO₂</small>
              </div>

            </section>

            <div className="grid">

              <section className="panel">

                <div className="panel-head">

                  <div>
                    <p className="eyebrow">QUICK ANALYSIS</p>
                    <h2>Analyse a shipment</h2>
                  </div>

                  <span className="tag">DEMO MODEL</span>

                </div>

                {inputForm(true)}

              </section>

              <section className="panel result">

                <div className="panel-head">

                  <div>
                    <p className="eyebrow">LATEST MODEL OUTPUT</p>
                    <h2>Shipment assessment</h2>
                  </div>

                </div>

                {assessment()}

              </section>

            </div>

          </>

        )}

        {/* =====================================
            QUALITY PREDICTION
        ===================================== */}

        {page === 'quality' && (

          <>

            <div className="grid">

              <section className="panel">

                <div className="panel-head">

                  <div>
                    <p className="eyebrow">QUALITY INPUT</p>
                    <h2>Product condition details</h2>
                  </div>

                  <span className="tag">ML PREDICTION</span>

                </div>

                {inputForm(false)}

              </section>

              <section className="panel result">

                <div className="panel-head">

                  <div>
                    <p className="eyebrow">QUALITY ASSESSMENT</p>
                    <h2>Spoilage & shelf-life result</h2>
                  </div>

                </div>

                {assessment()}

              </section>

            </div>

            <section className="panel" style={{ marginTop: 16 }}>

              <h2>How to interpret</h2>

              <p
                className="muted"
                style={{ lineHeight: 1.8, marginTop: 10 }}
              >
                Risk score is an average of three demonstration
                classifier probabilities. Remaining shelf life is
                a separate regression estimate. These models currently
                use synthetic training data; validate them against
                product-specific observed spoilage records before
                drawing research conclusions.
              </p>

            </section>

          </>

        )}

        {/* =====================================
            COLD CHAIN MONITOR
        ===================================== */}

        {page === 'coldchain' && (

          <>

            <section className="metrics">

              <div className="metric">
                <span>
                  <Thermometer size={13} /> TEMPERATURE
                </span>
                <b>{form.temperature_c} °C</b>
                <small>Current entered reading</small>
              </div>

              <div className="metric">
                <span>
                  <Droplets size={13} /> HUMIDITY
                </span>
                <b>{form.humidity_pct}%</b>
                <small>Relative humidity</small>
              </div>

              <div className="metric">
                <span>
                  <Wind size={13} /> CO₂
                </span>
                <b>{form.co2_ppm} ppm</b>
                <small>Gas concentration</small>
              </div>

            </section>

            <div className="grid">

              <section className="panel">

                <div className="panel-head">

                  <div>
                    <p className="eyebrow">SENSOR INPUT</p>
                    <h2>Cold-chain readings</h2>
                  </div>

                  <span className="tag">MANUAL / SENSOR DATA</span>

                </div>

                <form onSubmit={analyse}>

                  <label>
                    Product / commodity

                    <input
                      name="product"
                      value={form.product}
                      onChange={change}
                      required
                    />
                  </label>

                  <div className="fields">

                    {fields
                      .filter(([n]) =>
                        [
                          'temperature_c',
                          'humidity_pct',
                          'co2_ppm',
                          'days_in_storage',
                          'transport_hours'
                        ].includes(n)
                      )
                      .map(([n, l, min, max, step]) => (

                        <label key={n}>
                          {l}

                          <input
                            type="number"
                            name={n}
                            min={min}
                            max={max}
                            step={step}
                            value={form[n]}
                            onChange={change}
                            required
                          />
                        </label>

                      ))}

                  </div>

                  {runButton}

                  {error && <p className="error">{error}</p>}

                </form>

                <p className="disclaimer">
                  Enter readings from a sensor or sample dataset.
                  This page does not connect to physical IoT hardware automatically.
                </p>

              </section>

              <section className="panel">

                <div className="panel-head">

                  <div>
                    <p className="eyebrow">CONDITION MONITOR</p>
                    <h2>Operating checks</h2>
                  </div>

                  <span className="tag">RULE + ML CHECK</span>

                </div>

                {alerts.length
                  ? alerts.map((a, i) => (

                    <div
                      className="anomaly"
                      key={i}
                      style={{
                        marginBottom: 9,
                        color: a.level === 'high'
                          ? '#a64235'
                          : '#94702c'
                      }}
                    >
                      <AlertTriangle size={17} />
                      {a.text}
                    </div>

                  ))
                  : (

                    <div className="anomaly">
                      <PackageCheck size={17} />
                      No demo threshold alerts for the current readings.
                    </div>

                  )}

                <div className="shelf">
                  <span>Days in storage</span>
                  <strong>
                    {form.days_in_storage} <small>days</small>
                  </strong>
                </div>

                <div className="shelf">
                  <span>Transport duration</span>
                  <strong>
                    {form.transport_hours} <small>hours</small>
                  </strong>
                </div>

                <p className="disclaimer">
                  Thresholds above are illustrative defaults only.
                  Actual acceptable ranges depend on commodity,
                  packaging and applicable standards.
                </p>

              </section>

            </div>

            <section
              className="panel result"
              style={{ marginTop: 16 }}
            >

              <div className="panel-head">

                <div>
                  <p className="eyebrow">MACHINE-LEARNING MONITOR</p>
                  <h2>Cold-chain anomaly assessment</h2>
                </div>

                <span className="tag">
                  {lastChecked
                    ? `Checked ${lastChecked.toLocaleTimeString()}`
                    : 'NOT YET CHECKED'}
                </span>

              </div>

              {result ? (

                <>

                  <div className="risk">

                    <div>
                      <span>MODEL ANOMALY</span>

                      <strong style={{ fontSize: 24 }}>
                        {result.cold_chain_anomaly
                          ? 'ANOMALY FLAGGED'
                          : 'NO ANOMALY FLAGGED'}
                      </strong>
                    </div>

                    <b className={`pill ${result.cold_chain_anomaly ? 'high' : 'low'}`}>
                      {result.cold_chain_anomaly
                        ? 'Review'
                        : 'Normal pattern'}
                    </b>

                  </div>

                  <p className="muted" style={{ marginTop: 14 }}>
                    The Isolation Forest model evaluates the combined
                    sensor and transport features. Its output is a
                    screening signal, not proof of a food safety incident.
                  </p>

                </>

              ) : (

                <p className="muted">
                  Submit the sensor readings above to run the anomaly detector.
                </p>

              )}

            </section>

          </>

        )}

        {/* =====================================
            CUSTOMER REVIEW ANALYSIS
        ===================================== */}

        {page === 'sentiment' && (

          <>

            <section className="sentiment-intro">

              <div className="sentiment-intro-icon">
                <MessageSquareText size={27} />
              </div>

              <div>

                <p className="eyebrow">NATURAL LANGUAGE PROCESSING</p>

                <h2>Understand customer feedback</h2>

                <p className="muted">
                  Analyse food product reviews and classify customer
                  opinions as Positive, Negative or Neutral.
                </p>

              </div>

            </section>

            <div className="grid sentiment-grid">

              <section className="panel">

                <div className="panel-head">

                  <div>
                    <p className="eyebrow">CUSTOMER FEEDBACK</p>
                    <h2>Enter product review</h2>
                  </div>

                  <span className="tag">TEXT ANALYSIS</span>

                </div>

                <form onSubmit={analyzeReview}>

                  <label>
                    Customer review

                    <textarea
                      className="review-textarea"
                      placeholder="Example: The mangoes were fresh, juicy and had excellent quality. The packaging was also very good..."
                      value={reviewText}
                      onChange={e => {
                        setReviewText(e.target.value);
                        setSentimentError('');
                      }}
                      rows={9}
                      maxLength={10000}
                      required
                    />

                  </label>

                  <div className="review-meta">
                    <span>Enter a review in English</span>
                    <span>{reviewText.length}/10000 characters</span>
                  </div>

                  <button
                    type="submit"
                    disabled={sentimentBusy || !reviewText.trim()}
                  >
                    {sentimentBusy
                      ? 'Analysing review…'
                      : 'Analyse customer review'}

                    <Send size={16} />

                  </button>

                  {sentimentError && (
                    <p className="error">{sentimentError}</p>
                  )}

                </form>

                <div className="review-suggestions">

                  <p className="eyebrow">TRY A SAMPLE REVIEW</p>

                  <button
                    type="button"
                    className="sample-review"
                    onClick={() => setReviewText(
                      'The mangoes were fresh, sweet and delicious. Excellent packaging and fast delivery.'
                    )}
                  >
                    <Star size={14} />
                    Positive review
                  </button>

                  <button
                    type="button"
                    className="sample-review"
                    onClick={() => setReviewText(
                      'The product arrived damaged and tasted stale. Very poor quality and disappointing experience.'
                    )}
                  >
                    <AlertTriangle size={14} />
                    Negative review
                  </button>

                  <button
                    type="button"
                    className="sample-review"
                    onClick={() => setReviewText(
                      'The product was delivered on time. The taste and packaging were average.'
                    )}
                  >
                    <MessageSquareText size={14} />
                    Neutral-style review
                  </button>

                </div>

              </section>

              <section className="panel sentiment-result-panel">

                <div className="panel-head">

                  <div>
                    <p className="eyebrow">MODEL OUTPUT</p>
                    <h2>Sentiment assessment</h2>
                  </div>

                  <span className="tag">3 ML MODELS</span>

                </div>

                {sentimentAssessment()}

              </section>

            </div>

            <section className="panel sentiment-info">

              <div className="panel-head">

                <div>
                  <p className="eyebrow">MODEL INFORMATION</p>
                  <h2>Algorithms used</h2>
                </div>

              </div>

              <div className="sentiment-algorithms">

                <div>
                  <Brain size={20} />

                  <b>Multinomial Naive Bayes</b>

                  <p>
                    Uses word-frequency probabilities to classify
                    customer reviews.
                  </p>
                </div>

                <div>
                  <Brain size={20} />

                  <b>Logistic Regression</b>

                  <p>
                    Learns relationships between text features and
                    sentiment categories.
                  </p>
                </div>

                <div>
                  <Brain size={20} />

                  <b>Linear Support Vector Machine</b>

                  <p>
                    Finds decision boundaries to distinguish different
                    sentiment classes.
                  </p>
                </div>

              </div>

              <p className="disclaimer">
                Dataset: Amazon Fine Food Reviews. Sentiment represents
                customer opinion and does not establish actual food
                spoilage or food safety.
              </p>

            </section>

          </>

        )}

        {/* =====================================
            REVIEW ANALYTICS
        ===================================== */}

        {page === 'analytics' && (

          <>

            {/* ANALYTICS METRIC CARDS */}

            <section className="metrics">

              <div className="metric">
                <span>TOTAL REVIEWS ANALYSED</span>
                <b>{sentimentAnalytics.total}</b>
                <small>Reviews analysed in this session</small>
              </div>

              <div className="metric">
                <span>MOST COMMON SENTIMENT</span>
                <b>{sentimentAnalytics.mostCommon}</b>
                <small>Based on analysed reviews</small>
              </div>

              <div className="metric">
                <span>MODEL AGREEMENT</span>
                <b>{sentimentAnalytics.agreement}%</b>
                <small>All three models predicted the same class</small>
              </div>

            </section>

            <div className="grid analytics-grid">

              {/* SENTIMENT DISTRIBUTION */}

              <section className="panel">

                <div className="panel-head">

                  <div>
                    <p className="eyebrow">CUSTOMER FEEDBACK</p>
                    <h2>Sentiment distribution</h2>
                  </div>

                  <span className="tag">LIVE SESSION DATA</span>

                </div>

                {sentimentAnalytics.total > 0 ? (

                  <>

                    <div className="analytics-chart">

                      <ResponsiveContainer width="100%" height={280}>

                        <PieChart>

                          <Pie
                            data={sentimentAnalytics.distribution.filter(
                              x => x.value > 0
                            )}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            innerRadius={55}
                            paddingAngle={4}
                            label={({ name, percent }) =>
                              `${name} ${(percent * 100).toFixed(0)}%`
                            }
                          >

                            {sentimentAnalytics.distribution
                              .filter(x => x.value > 0)
                              .map(entry => (

                                <Cell
                                  key={entry.name}
                                  fill={SENTIMENT_COLORS[entry.name]}
                                />

                              ))}

                          </Pie>

                          <Tooltip />

                        </PieChart>

                      </ResponsiveContainer>

                    </div>

                    <div className="analytics-legend">

                      <div>
                        <i style={{ background: SENTIMENT_COLORS.Positive }} />
                        Positive: {sentimentAnalytics.positive}
                      </div>

                      <div>
                        <i style={{ background: SENTIMENT_COLORS.Negative }} />
                        Negative: {sentimentAnalytics.negative}
                      </div>

                      <div>
                        <i style={{ background: SENTIMENT_COLORS.Neutral }} />
                        Neutral: {sentimentAnalytics.neutral}
                      </div>

                    </div>

                  </>

                ) : (

                  <div className="empty">

                    <div>
                      <MessageSquareText size={30} />
                    </div>

                    <b>No review data available</b>

                    <p>
                      Analyse some customer reviews to generate the chart.
                    </p>

                  </div>

                )}

              </section>

              {/* ALGORITHM ACCURACY */}

              <section className="panel">

                <div className="panel-head">

                  <div>
                    <p className="eyebrow">MODEL EVALUATION</p>
                    <h2>Algorithm accuracy</h2>
                  </div>

                  <span className="tag">TEST DATA</span>

                </div>

                <div className="analytics-chart">

                  <ResponsiveContainer width="100%" height={280}>

                    <BarChart
                      data={sentimentModelAccuracy}
                      layout="vertical"
                      margin={{
                        top: 10,
                        right: 25,
                        left: 20,
                        bottom: 10
                      }}
                    >

                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                      />

                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tickFormatter={value => `${value}%`}
                      />

                      <YAxis
                        type="category"
                        dataKey="model"
                        width={125}
                        tick={{ fontSize: 11 }}
                      />

                      <Tooltip
                        formatter={value => [
                          `${value}%`,
                          'Accuracy'
                        ]}
                      />

                      <Bar
                        dataKey="accuracy"
                        fill="#3b9472"
                        radius={[0, 6, 6, 0]}
                        barSize={28}
                      />

                    </BarChart>

                  </ResponsiveContainer>

                </div>

                <div className="accuracy-note">

                  <b>Best performing model: SVM</b>

                  <p>
                    SVM achieved 85.35% test accuracy, compared with
                    81.55% for Logistic Regression and 78.70% for
                    Naive Bayes.
                  </p>

                </div>

              </section>

            </div>

            {/* SENTIMENT STATISTICS */}

            <section className="panel analytics-stats">

              <div className="panel-head">

                <div>
                  <p className="eyebrow">REVIEW INSIGHTS</p>
                  <h2>Customer feedback statistics</h2>
                </div>

              </div>

              <div className="analytics-stat-grid">

                <div className="analytics-stat positive-stat">

                  <span>POSITIVE REVIEWS</span>

                  <b>{sentimentAnalytics.positive}</b>

                  <small>
                    {sentimentAnalytics.total
                      ? `${(
                          sentimentAnalytics.positive /
                          sentimentAnalytics.total * 100
                        ).toFixed(1)}% of reviews`
                      : 'No data'}
                  </small>

                </div>

                <div className="analytics-stat negative-stat">

                  <span>NEGATIVE REVIEWS</span>

                  <b>{sentimentAnalytics.negative}</b>

                  <small>
                    {sentimentAnalytics.total
                      ? `${(
                          sentimentAnalytics.negative /
                          sentimentAnalytics.total * 100
                        ).toFixed(1)}% of reviews`
                      : 'No data'}
                  </small>

                </div>

                <div className="analytics-stat neutral-stat">

                  <span>NEUTRAL REVIEWS</span>

                  <b>{sentimentAnalytics.neutral}</b>

                  <small>
                    {sentimentAnalytics.total
                      ? `${(
                          sentimentAnalytics.neutral /
                          sentimentAnalytics.total * 100
                        ).toFixed(1)}% of reviews`
                      : 'No data'}
                  </small>

                </div>

              </div>

            </section>

            {/* RECENT REVIEWS */}

            <section className="panel history">

              <div className="panel-head">

                <div>
                  <p className="eyebrow">CUSTOMER FEEDBACK LOG</p>
                  <h2>Recently analysed reviews</h2>
                </div>

                <button
                  className="refresh"
                  onClick={() => setSentimentHistory([])}
                  disabled={!sentimentHistory.length}
                >
                  <RefreshCw size={15} />
                  Clear session
                </button>

              </div>

              {sentimentHistory.length ? (

                <div className="table-wrap">

                  <table>

                    <thead>
                      <tr>
                        <th>REVIEW</th>
                        <th>SENTIMENT</th>
                        <th>ANALYSED AT</th>
                      </tr>
                    </thead>

                    <tbody>

                      {sentimentHistory.slice(0, 10).map(item => (

                        <tr key={item.id}>

                          <td className="analytics-review-cell">
                            {item.review.length > 85
                              ? `${item.review.slice(0, 85)}...`
                              : item.review}
                          </td>

                          <td>
                            <span
                              className={`pill ${item.final_sentiment.toLowerCase()}`}
                            >
                              {item.final_sentiment}
                            </span>
                          </td>

                          <td>{item.analyzed_at}</td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>

              ) : (

                <p className="muted">
                  No reviews have been analysed in this session yet.
                  Go to Review analysis to add some.
                </p>

              )}

            </section>

            <p className="disclaimer">
              Analytics are based on reviews analysed during the current
              browser session. They are cleared when the page is refreshed.
              Model accuracy represents the saved test-set evaluation,
              not live prediction accuracy. Customer sentiment does not
              establish actual food spoilage or food safety.
            </p>

          </>

        )}

        {/* =====================================
            EXISTING SHIPMENT PREDICTION HISTORY
        ===================================== */}

        <section className="panel history">

          <div className="panel-head">

            <div>
              <p className="eyebrow">RECENT ACTIVITY</p>
              <h2>Prediction history</h2>
            </div>

            <button className="refresh" onClick={load}>
              <RefreshCw size={15} />
              Refresh
            </button>

          </div>

          {history.length ? (

            <div className="table-wrap">

              <table>

                <thead>
                  <tr>
                    <th>PRODUCT</th>
                    <th>TEMPERATURE</th>
                    <th>HUMIDITY</th>
                    <th>RISK</th>
                    <th>REMAINING LIFE</th>
                  </tr>
                </thead>

                <tbody>

                  {history.slice(0, 8).map((x, i) => (

                    <tr key={i}>

                      <td>{x.product}</td>
                      <td>{x.temperature_c}°C</td>
                      <td>{x.humidity_pct}%</td>

                      <td>
                        <span className={`pill ${(x.risk_level || 'low').toLowerCase()}`}>
                          {x.risk_level}
                        </span>
                      </td>

                      <td>
                        {x.estimated_remaining_shelf_life_days} days
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          ) : (

            <p className="muted">
              No predictions yet. Run an analysis to create the first record.
            </p>

          )}

        </section>

        {/* FOOTER */}

        <footer>
          SUPPLYCHAIN AI · UNIVERSITY PROJECT

          <span>
            Demonstration predictions are not food-safety advice.
          </span>
        </footer>

      </main>

    </div>

  );

}