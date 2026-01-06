
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DiagnosticStatus, AudioMetrics, MachineStandard, HistoryEntry } from './types';
import { MACHINE_STANDARDS, CALIBRATION_STORAGE_KEY, DEFAULT_CALIBRATION_OFFSET } from './constants';
import { AudioProcessor } from './services/audioService';
import FrequencyVisualizer from './components/FrequencyVisualizer';
import MetricCard from './components/MetricCard';

const HISTORY_STORAGE_KEY = 'acoustic_tool_history_v1';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'machines' | 'history'>('machines');
  const [selectedMachine, setSelectedMachine] = useState<MachineStandard | null>(null);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [hasFinishedTest, setHasFinishedTest] = useState(false);
  const [metrics, setMetrics] = useState<AudioMetrics>({
    db: 0,
    peakFrequency: 0,
    isStable: false,
    status: DiagnosticStatus.IDLE
  });
  const [freqData, setFreqData] = useState<Uint8Array>(new Uint8Array(0));
  const [calibrationOffset, setCalibrationOffset] = useState<number>(() => {
    const saved = localStorage.getItem(CALIBRATION_STORAGE_KEY);
    return saved ? parseFloat(saved) : DEFAULT_CALIBRATION_OFFSET;
  });
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [showSettings, setShowSettings] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const audioProcessorRef = useRef<AudioProcessor | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const metricsRef = useRef<AudioMetrics>(metrics);

  // Keep metricsRef updated for the save logic
  useEffect(() => {
    metricsRef.current = metrics;
  }, [metrics]);

  const saveToHistory = useCallback((machine: MachineStandard, finalMetrics: AudioMetrics) => {
    const newEntry: HistoryEntry = {
      id: crypto.randomUUID(),
      machineId: machine.id,
      machineName: machine.name,
      timestamp: Date.now(),
      status: finalMetrics.status,
      db: finalMetrics.db,
      peakFrequency: finalMetrics.peakFrequency
    };
    const updatedHistory = [newEntry, ...history].slice(0, 50); // Keep last 50
    setHistory(updatedHistory);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
  }, [history]);

  const startMeasurement = async () => {
    if (!selectedMachine) return;
    
    try {
      const processor = new AudioProcessor(calibrationOffset);
      await processor.initialize();
      audioProcessorRef.current = processor;
      setIsMeasuring(true);
      setHasFinishedTest(false);
      setCountdown(10); // 10 second diagnostic window per PRD
    } catch (err) {
      alert("Microphone access is required for acoustic diagnostics.");
    }
  };

  const stopMeasurement = useCallback(() => {
    if (audioProcessorRef.current) {
      audioProcessorRef.current.stop();
      audioProcessorRef.current = null;
    }
    
    // Save current metrics before states change
    if (isMeasuring && selectedMachine) {
      saveToHistory(selectedMachine, metricsRef.current);
    }

    setIsMeasuring(false);
    setCountdown(null);
    setHasFinishedTest(true);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, [isMeasuring, selectedMachine, saveToHistory]);

  const resetToMenu = () => {
    stopMeasurement();
    setSelectedMachine(null);
    setHasFinishedTest(false);
    setMetrics({
      db: 0,
      peakFrequency: 0,
      isStable: false,
      status: DiagnosticStatus.IDLE
    });
  };

  const clearHistory = () => {
    if (confirm("Clear all diagnostic records?")) {
      setHistory([]);
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    }
  };

  useEffect(() => {
    if (isMeasuring && selectedMachine && audioProcessorRef.current) {
      const update = () => {
        if (audioProcessorRef.current) {
          const newMetrics = audioProcessorRef.current.getMetrics(selectedMachine);
          setMetrics(newMetrics);
          setFreqData(audioProcessorRef.current.getFrequencyData());
          animationFrameRef.current = requestAnimationFrame(update);
        }
      };
      update();
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isMeasuring, selectedMachine]);

  useEffect(() => {
    let timer: any;
    if (countdown !== null && countdown > 0) {
      timer = setInterval(() => setCountdown(prev => (prev !== null ? prev - 1 : null)), 1000);
    } else if (countdown === 0) {
      stopMeasurement();
    }
    return () => clearInterval(timer);
  }, [countdown, stopMeasurement]);

  const handleCalibrationChange = (val: string) => {
    const num = parseFloat(val);
    setCalibrationOffset(num);
    localStorage.setItem(CALIBRATION_STORAGE_KEY, val);
    if (audioProcessorRef.current) {
      audioProcessorRef.current.setCalibration(num);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-slate-950 shadow-2xl overflow-hidden relative border-x border-slate-800">
      
      {/* Header */}
      <header className="p-6 bg-slate-900 border-b border-slate-800 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-black tracking-tighter text-blue-400">ACOUSTIC<span className="text-slate-100">DIAG</span></h1>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Industrial Analysis Tool</p>
        </div>
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-slate-400 hover:text-white transition-colors"
        >
          <i className={`fas ${showSettings ? 'fa-times' : 'fa-cog'} text-lg`}></i>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-6 pb-40">
        {showSettings ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-2 mb-4">
              <i className="fas fa-sliders-h text-blue-500"></i>
              <h2 className="text-lg font-bold">Calibration</h2>
            </div>
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
              <label className="block text-sm text-slate-400 mb-4">Sensitivity Offset (dB)</label>
              <input 
                type="range" 
                min="-60" 
                max="60" 
                step="0.5"
                value={calibrationOffset}
                onChange={(e) => handleCalibrationChange(e.target.value)}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between mt-3 font-mono text-sm">
                <span className="text-slate-500">-60</span>
                <span className="text-blue-400 font-bold">{calibrationOffset > 0 ? '+' : ''}{calibrationOffset} dB</span>
                <span className="text-slate-500">+60</span>
              </div>
              <p className="mt-6 text-xs text-slate-500 leading-relaxed italic">
                * Adjust this value if your phone microphone is consistently over-reporting or under-reporting dB against a reference source.
              </p>
            </div>
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold">Device Fidelity</span>
                <span className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-400">CALIBRATED</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold">A-Weighting</span>
                <span className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-400">ACTIVE</span>
              </div>
            </div>
            <button 
              onClick={() => setShowSettings(false)}
              className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-all text-sm uppercase tracking-widest"
            >
              Back to Tool
            </button>
          </div>
        ) : !selectedMachine ? (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Tabs Navigation */}
            <div className="flex p-1 bg-slate-900 rounded-2xl border border-slate-800">
              <button 
                onClick={() => setActiveTab('machines')}
                className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                  activeTab === 'machines' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <i className="fas fa-th-list mr-2"></i> Machines
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                  activeTab === 'history' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <i className="fas fa-history mr-2"></i> Log
              </button>
            </div>

            {activeTab === 'machines' ? (
              <>
                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold text-slate-100">Select Machine</h2>
                  <p className="text-sm text-slate-400 mt-1">Industrial diagnostics sensor suite</p>
                </div>
                <div className="grid gap-3">
                  {MACHINE_STANDARDS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMachine(m)}
                      className="p-5 bg-slate-900 border border-slate-800 rounded-2xl text-left hover:border-blue-500/50 hover:bg-slate-800/80 transition-all group"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-slate-200 group-hover:text-blue-400 transition-colors">{m.name}</h3>
                          <p className="text-xs text-slate-500 font-medium uppercase mt-1">{m.category}</p>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800 px-2 py-1 rounded">{m.maxDb} dB Max</span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="animate-in fade-in duration-300 space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-bold">Diagnostic Records</h2>
                  {history.length > 0 && (
                    <button 
                      onClick={clearHistory}
                      className="text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-widest"
                    >
                      Clear Log
                    </button>
                  )}
                </div>
                {history.length === 0 ? (
                  <div className="py-20 text-center">
                    <i className="fas fa-clipboard-list text-4xl text-slate-800 mb-4"></i>
                    <p className="text-slate-500 font-medium">No diagnostic history available.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map(entry => (
                      <div key={entry.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
                        <div className={`w-2 h-12 rounded-full ${
                          entry.status === DiagnosticStatus.NORMAL ? 'bg-emerald-500' : 'bg-red-500'
                        }`} />
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="text-sm font-bold text-slate-200">{entry.machineName}</h3>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {new Date(entry.timestamp).toLocaleDateString()} {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex gap-3 text-xs">
                            <span className="text-slate-400"><span className="font-mono text-slate-200">{entry.db}</span> dB(A)</span>
                            <span className="text-slate-400"><span className="font-mono text-slate-200">{entry.peakFrequency}</span> Hz</span>
                            <span className={`font-black uppercase tracking-tighter ml-auto ${
                              entry.status === DiagnosticStatus.NORMAL ? 'text-emerald-500' : 'text-red-500'
                            }`}>
                              {entry.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 animate-in zoom-in-95 duration-300">
            {/* Active Machine Header */}
            <div className="flex items-center justify-between">
              <div>
                <button 
                  onClick={resetToMenu}
                  className="text-xs font-bold text-slate-500 hover:text-slate-300 uppercase tracking-widest flex items-center gap-1 mb-1"
                >
                  <i className="fas fa-chevron-left"></i> Change Machine
                </button>
                <h2 className="text-lg font-bold text-slate-100">{selectedMachine.name}</h2>
              </div>
              {countdown !== null && (
                <div className="text-right">
                  <div className="text-2xl font-black text-blue-500 font-mono">{countdown}s</div>
                  <div className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Diagnostic Window</div>
                </div>
              )}
            </div>

            {/* Main Status Indicator */}
            <div className={`p-8 rounded-[2rem] border-4 flex flex-col items-center justify-center transition-all duration-500 min-h-[220px] shadow-2xl ${
              !isMeasuring && !hasFinishedTest ? 'bg-slate-900 border-slate-800' :
              metrics.status === DiagnosticStatus.NORMAL ? 'bg-emerald-950/40 border-emerald-500/50 shadow-emerald-500/10' :
              'bg-red-950/40 border-red-500/50 shadow-red-500/10'
            }`}>
              {!isMeasuring && !hasFinishedTest ? (
                <div className="text-center">
                  <i className="fas fa-wave-square text-4xl text-slate-700 mb-4"></i>
                  <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Ready to Sample</p>
                </div>
              ) : (
                <div className="text-center animate-in fade-in zoom-in-90 duration-500">
                  <div className={`text-6xl font-black tracking-tighter mb-2 ${
                    metrics.status === DiagnosticStatus.NORMAL ? 'text-emerald-400' : 'text-red-500'
                  }`}>
                    {metrics.status}
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <span className={`h-2 w-2 rounded-full ${isMeasuring ? 'animate-pulse' : ''} ${
                      metrics.status === DiagnosticStatus.NORMAL ? 'bg-emerald-400' : 'bg-red-500'
                    }`}></span>
                    <p className="text-slate-300 text-sm font-semibold">
                      {hasFinishedTest && !isMeasuring ? 'Diagnostic Result' : 'Real-Time Acoustic Integrity'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              <MetricCard 
                label="SPL Level" 
                value={(isMeasuring || hasFinishedTest) ? metrics.db : '--'} 
                unit="dB(A)" 
                icon="fas fa-volume-up"
                colorClass={(isMeasuring || hasFinishedTest) && metrics.db > selectedMachine.maxDb ? "text-red-400" : "text-slate-100"}
              />
              <MetricCard 
                label="Peak Frequency" 
                value={(isMeasuring || hasFinishedTest) ? metrics.peakFrequency : '--'} 
                unit="Hz" 
                icon="fas fa-chart-line"
              />
            </div>

            {/* Visualizers */}
            <div className="space-y-4">
              <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Acoustic Purity</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${metrics.isStable ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                    {metrics.isStable ? 'HIGH FIDELITY' : 'LOW SIGNAL'}
                  </span>
                </div>
                <FrequencyVisualizer data={freqData} />
              </div>
            </div>

            {/* Diagnostic Details */}
            <div className="bg-slate-900/50 rounded-2xl p-5 border border-slate-800">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Diagnostic Thresholds</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Max permissible noise</span>
                  <span className="text-slate-200 font-mono">{selectedMachine.maxDb} dB</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Operational Freq. Range</span>
                  <span className="text-slate-200 font-mono">{selectedMachine.peakFreqRange[0]}-{selectedMachine.peakFreqRange[1]} Hz</span>
                </div>
                <div className="pt-2 border-t border-slate-800/50">
                  <p className="text-[10px] text-slate-500 leading-tight">
                    <i className="fas fa-info-circle mr-1"></i>
                    Abnormality is triggered when dB exceeds threshold or unexpected frequency peaks are detected outside operational harmonics.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Action Buttons Footer */}
      {selectedMachine && !showSettings && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent flex flex-col gap-3 max-w-md mx-auto z-20">
          {!isMeasuring ? (
            <>
              <button 
                onClick={startMeasurement}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-900/40 flex items-center justify-center gap-3 transition-all active:scale-95 text-lg"
              >
                <i className="fas fa-play"></i>
                {hasFinishedTest ? 'RESTART TEST' : 'START DIAGNOSTIC'}
              </button>
              <button 
                onClick={resetToMenu}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-4 rounded-2xl border border-slate-700 flex items-center justify-center gap-3 transition-all active:scale-95 text-sm uppercase tracking-widest"
              >
                <i className="fas fa-arrow-left"></i>
                Back to Menu
              </button>
            </>
          ) : (
            <button 
              onClick={stopMeasurement}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-5 rounded-2xl shadow-xl shadow-red-900/40 flex items-center justify-center gap-3 transition-all active:scale-95 text-lg"
            >
              <i className="fas fa-stop"></i>
              STOP SENSING
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
