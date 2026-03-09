import React, { useState, useEffect } from 'react';
import { FlaskConical, Scale, RotateCcw, Waves, Beaker, Zap, Activity, Info } from 'lucide-react';
import ResponsiveSection from '../components/layout/ResponsiveSection';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';

const KW = 1e-14;

const SUBSTANCES = [
  { id: 'hcl', name: 'Hydrochloric Acid (HCl)', type: 'strong_acid', ka: null, mw: 36.46, density: 1.19, assay: 37 },
  { id: 'hno3', name: 'Nitric Acid (HNO₃)', type: 'strong_acid', ka: null, mw: 63.01, density: 1.42, assay: 70 },
  { id: 'h2so4', name: 'Sulfuric Acid (H₂SO₄)', type: 'sulfuric_acid', ka: null, mw: 98.08, density: 1.84, assay: 98 },
  { id: 'acetic', name: 'Acetic Acid (CH₃COOH)', type: 'weak_acid', ka: 1.8e-5, pka: 4.74, mw: 60.05, density: 1.05, assay: 99.7 },
  { id: 'na_acetate', name: 'Sodium Acetate (Anhydrous)', type: 'salt_basic', ka: 1.8e-5, conjugate: 'CH₃COO⁻', mw: 82.03 },
  { id: 'na_acetate_tri', name: 'Sodium Acetate (Trihydrate)', type: 'salt_basic', ka: 1.8e-5, conjugate: 'CH₃COO⁻', mw: 136.08 },
  { id: 'tris', name: 'Tris Base', type: 'weak_base', kb: 1.2e-6, pkb: 5.92, pka: 8.08, mw: 121.14 },
  { id: 'hepes', name: 'HEPES Buffer', type: 'weak_acid', ka: 3.16e-8, pka: 7.5, mw: 238.3 },
  { id: 'phosphate', name: 'Phosphate (pK2)', type: 'weak_acid', ka: 6.23e-8, pka: 7.21, mw: 141.96 },
];

const ScientificCalculations = () => {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => setIsVisible(true), []);

  const Tutorial = ({ title, steps, formula, explanation }) => (
    <div className="mt-12 pt-10 border-t border-white/5">
      <div className="flex items-center space-x-2 mb-6 text-[10px] font-black uppercase tracking-widest text-cyan-500">
        <Info className="w-3 h-3" />
        <span>{title} Guide</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-4">
          <p className="text-sm text-gray-400 leading-relaxed font-medium">{explanation}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start space-x-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-[10px] font-black text-cyan-500">{i+1}</span>
                <span className="text-[11px] text-gray-500 leading-snug">{step}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-black/40 rounded-3xl p-6 border border-white/5 flex flex-col justify-center items-center text-center">
            <p className="text-[9px] font-black uppercase text-gray-600 mb-4 tracking-widest">Governing Equation</p>
            <div className="text-white/90 scale-110">
                <BlockMath math={formula} />
            </div>
        </div>
      </div>
    </div>
  );

  // --- TAB 1: Equilibrium & Preparation ---
  const [substanceId, setSubstanceId] = useState('acetic');
  const [calcMode, setCalcMode] = useState('find_ph'); 
  const [inputVal, setInputVal] = useState(''); 
  const [targetVolume, setTargetVolume] = useState('1'); 
  const [useDilutionSource, setUseDilutionSource] = useState(false);
  const [stockVal, setStockVal] = useState({ c: '', v: '', totalV: '' });
  const [substanceResult, setSubstanceResult] = useState(null);

  // --- TAB 2: Buffer Solver ---
  const [bufferInput, setBufferInput] = useState({ pka: '4.74', acidConc: '0.1', baseConc: '0.1' });
  const [bufferResult, setBufferResult] = useState(null);

  // --- TAB 3: Beer-Lambert ---
  const [beerInput, setBeerInput] = useState({ abs: '', eps: '', path: '1', conc: '' });
  const [beerResult, setBeerResult] = useState(null);

  // --- TAB 4: Stock Assay ---
  const [assayInput, setAssayInput] = useState({ density: '1.19', percent: '37', mw: '36.46' });
  const [assayResult, setAssayResult] = useState(null);

  const solveQuadratic = (a, b) => {
    if (b === 0) return 0;
    return (-a + Math.sqrt(Math.pow(a, 2) + 4 * b)) / 2;
  };

  const handleReset = () => {
    setInputVal('');
    setStockVal({ c: '', v: '', totalV: '' });
    setSubstanceResult(null);
    setBufferResult(null);
    setBeerResult(null);
    setAssayResult(null);
  };

  // Logic for Equilibrium Solver
  useEffect(() => {
    let c = 0;
    if (useDilutionSource && calcMode === 'find_ph') {
        const { c: sc, v: sv, totalV: stv } = stockVal;
        if (sc && sv && stv) c = (parseFloat(sc) * parseFloat(sv)) / parseFloat(stv);
        else { setSubstanceResult(null); return; }
    } else c = parseFloat(inputVal);

    const sub = SUBSTANCES.find(s => s.id === substanceId);
    if (!sub || (isNaN(c) && calcMode === 'find_ph')) { setSubstanceResult(null); return; }

    let ph, poh, h, oh, m, steps = [];
    if (calcMode === 'find_ph') {
        m = c;
        if (sub.type === 'strong_acid') h = c;
        else if (sub.type === 'sulfuric_acid') h = c + solveQuadratic(c + 0.012, 0.012 * c);
        else if (sub.type === 'strong_base') oh = c;
        else if (sub.type === 'weak_acid') h = solveQuadratic(sub.ka, sub.ka * c);
        else if (sub.type === 'weak_base') oh = solveQuadratic(sub.kb, sub.kb * c);
        else if (sub.type === 'salt_basic') oh = solveQuadratic(KW / sub.ka, (KW / sub.ka) * c);
        else if (sub.type === 'salt_acidic') h = solveQuadratic(KW / sub.kb, (KW / sub.kb) * c);
        
        if (h) { ph = -Math.log10(h); poh = 14 - ph; oh = Math.pow(10, -poh); }
        else { poh = -Math.log10(oh); ph = 14 - poh; h = Math.pow(10, -ph); }
        steps = [`\\text{Mode: CONC } \\rightarrow \\text{ pH}`, `\\text{Determined [H}^+] = ${h.toExponential(3)} \\text{ M}`];
    } else {
        ph = parseFloat(inputVal); if (isNaN(ph)) return;
        poh = 14 - ph; h = Math.pow(10, -ph); oh = Math.pow(10, -poh);
        if (sub.type === 'strong_acid') m = h;
        else if (sub.type === 'weak_acid') m = (Math.pow(h, 2) / sub.ka) + h;
        else if (sub.type === 'weak_base') m = (Math.pow(oh, 2) / sub.kb) + oh;
        else if (sub.type === 'strong_base') m = oh;
        else if (sub.type === 'salt_basic') m = (Math.pow(oh, 2) / (KW / sub.ka)) + oh;
        else if (sub.type === 'salt_acidic') m = (Math.pow(h, 2) / (KW / sub.kb)) + h;
        else if (sub.type === 'sulfuric_acid') m = (Math.pow(h, 2) + 0.012 * h) / (2 * 0.012 + h);
        steps = [`\\text{Mode: pH } \\rightarrow \\text{ CONC}`, `\\text{Required Molarity } = ${m?.toExponential(4)} \\text{ M}`];
    }

    let labPrep = null;
    if (m > 0 && sub.mw > 0) labPrep = { mass: m * parseFloat(targetVolume) * sub.mw, mw: sub.mw, vol: targetVolume, m };
    setSubstanceResult({ ph, poh, h, oh, m, steps, labPrep });
  }, [substanceId, calcMode, inputVal, targetVolume, useDilutionSource, stockVal]);

  // Logic for Buffer Solver
  useEffect(() => {
    const { pka, acidConc, baseConc } = bufferInput;
    const pk = parseFloat(pka), ca = parseFloat(acidConc), cb = parseFloat(baseConc);
    if (isNaN(pk) || isNaN(ca) || isNaN(cb) || ca <= 0 || cb <= 0) { setBufferResult(null); return; }
    const ph = pk + Math.log10(cb / ca);
    setBufferResult({ ph, ratio: cb / ca });
  }, [bufferInput]);

  // Logic for Beer-Lambert
  useEffect(() => {
    const { abs, eps, path, conc } = beerInput;
    const nAbs = parseFloat(abs), nEps = parseFloat(eps), nPath = parseFloat(path), nConc = parseFloat(conc);
    const vals = [nAbs, nEps, nPath, nConc].filter(v => !isNaN(v));
    if (vals.length === 3) {
        let res = 0, label = '';
        if (isNaN(nAbs)) { res = nEps * nPath * nConc; label = 'Absorbance (A)'; }
        else if (isNaN(nEps)) { res = nAbs / (nPath * nConc); label = 'Molar Absorptivity (ε)'; }
        else if (isNaN(nConc)) { res = nAbs / (nEps * nPath); label = 'Concentration (c) [M]'; }
        setBeerResult({ res, label });
    } else setBeerResult(null);
  }, [beerInput]);

  // Logic for Stock Assay
  useEffect(() => {
    const { density, percent, mw } = assayInput;
    const d = parseFloat(density), p = parseFloat(percent), m = parseFloat(mw);
    if (d && p && m) {
        const molarity = (d * p * 10) / m;
        setAssayResult(molarity);
    } else setAssayResult(null);
  }, [assayInput]);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-cyan-500/30">
      <ResponsiveSection className="pt-28 pb-20">
        <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="max-w-6xl mx-auto space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-10">
                <div className="space-y-4">
                    <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded bg-cyan-500/5 border border-cyan-500/10 text-cyan-400 text-[10px] font-bold tracking-widest uppercase">
                        <Zap className="w-3 h-3" />
                        <span>Professional Lab Suite</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter">Lab Calc<span className="text-cyan-500">.</span></h1>
                    <p className="text-gray-500 text-lg max-w-xl font-medium">Precision tools for modern analytical workflows.</p>
                </div>
                <button onClick={handleReset} className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-lg border border-white/10">
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Dashboard</span>
                </button>
            </div>

            <Tabs defaultValue="prep" className="w-full">
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 bg-white/5 border border-white/10 p-1 mb-10 rounded-2xl">
                <TabsTrigger value="prep" className="rounded-xl data-[state=active]:bg-cyan-500 data-[state=active]:text-black font-black text-[10px] uppercase tracking-widest py-3">Preparation</TabsTrigger>
                <TabsTrigger value="buffer" className="rounded-xl data-[state=active]:bg-cyan-500 data-[state=active]:text-black font-black text-[10px] uppercase tracking-widest py-3">Buffer Solver</TabsTrigger>
                <TabsTrigger value="optics" className="rounded-xl data-[state=active]:bg-cyan-500 data-[state=active]:text-black font-black text-[10px] uppercase tracking-widest py-3">Spectroscopy</TabsTrigger>
                <TabsTrigger value="assay" className="rounded-xl data-[state=active]:bg-cyan-500 data-[state=active]:text-black font-black text-[10px] uppercase tracking-widest py-3">Stock Assay</TabsTrigger>
              </TabsList>

              {/* TAB: Preparation & pH */}
              <TabsContent value="prep" className="outline-none space-y-8 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-4 space-y-6">
                            <div className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl space-y-6 shadow-inner">
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black text-gray-500 ml-1">Substance Selection</Label>
                                    <select value={substanceId} onChange={e=>setSubstanceId(e.target.value)} className="w-full h-12 px-4 rounded-2xl bg-black border border-white/10 text-white font-bold focus:border-cyan-500 outline-none appearance-none">
                                        <optgroup label="Common Acids/Bases" className="bg-gray-900">
                                            {SUBSTANCES.filter(s => !s.type.includes('salt')).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </optgroup>
                                        <optgroup label="Salts & Buffers" className="bg-gray-900">
                                            {SUBSTANCES.filter(s => s.type.includes('salt') || s.pka > 0).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </optgroup>
                                    </select>
                                </div>
                                <div className="flex bg-black rounded-xl p-1 border border-white/10">
                                    <button onClick={()=>setCalcMode('find_ph')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${calcMode === 'find_ph' ? 'bg-white/10 text-white' : 'text-gray-600'}`}>Conc → pH</button>
                                    <button onClick={()=>setCalcMode('find_m')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${calcMode === 'find_m' ? 'bg-white/10 text-white' : 'text-gray-600'}`}>pH → Conc</button>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                        <Label className="text-[10px] uppercase font-black text-gray-500">{calcMode === 'find_ph' ? 'Input Concentration' : 'Target pH'}</Label>
                                        {calcMode === 'find_ph' && <button onClick={()=>setUseDilutionSource(!useDilutionSource)} className={`text-[9px] font-black uppercase border px-2 py-0.5 rounded transition-all ${useDilutionSource ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10' : 'border-white/10 text-gray-600'}`}>{useDilutionSource ? 'Dilution On' : 'Direct'}</button>}
                                    </div>
                                    {useDilutionSource && calcMode === 'find_ph' ? (
                                        <div className="grid grid-cols-3 gap-2">
                                            <Input placeholder="Stock M" type="number" value={stockVal.c} onChange={e=>setStockVal({...stockVal, c: e.target.value})} className="h-11 bg-black border-white/10 text-xs font-bold" />
                                            <Input placeholder="Aliq. L" type="number" value={stockVal.v} onChange={e=>setStockVal({...stockVal, v: e.target.value})} className="h-11 bg-black border-white/10 text-xs font-bold" />
                                            <Input placeholder="Total L" type="number" value={stockVal.totalV} onChange={e=>setStockVal({...stockVal, totalV: e.target.value})} className="h-11 bg-black border-white/10 text-xs font-bold" />
                                        </div>
                                    ) : (
                                        <Input type="number" value={inputVal} onChange={e=>setInputVal(e.target.value)} className="h-12 bg-black border-white/10 font-bold text-lg rounded-2xl" placeholder={calcMode === 'find_ph' ? 'Molarity' : 'pH Level'} />
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black text-gray-500 ml-1">Preparation Volume (L)</Label>
                                    <Input type="number" value={targetVolume} onChange={e=>setTargetVolume(e.target.value)} className="h-12 bg-black border-white/10 font-bold rounded-2xl" />
                                </div>
                            </div>
                        </div>
                        <div className="lg:col-span-8 space-y-6">
                            {substanceResult ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-right-4 duration-500">
                                    <Card className="bg-white/[0.03] border-white/5 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
                                        <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-500 font-black mb-2">Analysis Result</p>
                                        <p className="text-7xl font-black tracking-tighter">pH {substanceResult.ph.toFixed(3)}</p>
                                        <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-2 gap-4 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                            <div>[H⁺] <span className="text-white ml-2">{substanceResult.h.toExponential(2)}</span></div>
                                            <div>[OH⁻] <span className="text-white ml-2">{substanceResult.oh.toExponential(2)}</span></div>
                                        </div>
                                    </Card>
                                    <Card className="bg-cyan-500 border-none rounded-3xl p-8 relative overflow-hidden shadow-2xl shadow-cyan-500/20">
                                        <Scale className="absolute right-[-5%] bottom-[-5%] w-48 h-48 text-black/10 rotate-12" />
                                        <p className="text-[10px] uppercase tracking-[0.3em] text-black/60 font-black mb-2">Mass Requirement</p>
                                        <p className="text-7xl font-black tracking-tighter text-black">{substanceResult.labPrep?.mass.toFixed(4) ?? '0.0000'}</p>
                                        <p className="mt-2 text-black/60 font-black uppercase text-[10px] tracking-widest">Grams to weigh out</p>
                                    </Card>
                                    <Card className="md:col-span-2 bg-white/[0.01] border-white/5 rounded-3xl p-8">
                                        <div className="flex items-center space-x-2 mb-6 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                            <Activity className="w-3 h-3" />
                                            <span>Full Mathematical Breakdown</span>
                                        </div>
                                        <div className="space-y-4">
                                            {substanceResult.steps.map((s, i) => <div key={i} className="bg-black/40 p-4 rounded-2xl border border-white/5 font-mono"><BlockMath math={s} /></div>)}
                                            {substanceResult.labPrep && <div className="bg-cyan-500/5 p-4 rounded-2xl border border-cyan-500/10 font-mono"><BlockMath math={`m = ${substanceResult.labPrep.m.toExponential(3)} \\text{ M} \\cdot ${substanceResult.labPrep.vol} \\text{ L} \\cdot ${substanceResult.labPrep.mw} \\text{ g/mol}`} /></div>}
                                        </div>
                                    </Card>
                                </div>
                            ) : (
                                <div className="h-full min-h-[400px] border-2 border-dashed border-white/5 rounded-[40px] flex flex-col items-center justify-center text-gray-700 space-y-4">
                                    <FlaskConical className="w-16 h-12 opacity-10" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Input parameters to begin simulation</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <Tutorial 
                        title="Equilibrium & Prep"
                        explanation="Calculate pH or required mass for strong/weak acids and bases. This tool solves the exact quadratic for weak species, ensuring precision at any concentration."
                        steps={[
                            "Select your substance from the list to load its chemical constants (pKa, MW, etc.).",
                            "Choose Mode: 'Conc → pH' to find acidity, or 'pH → Conc' to find required amount for a target.",
                            "Toggle 'Dilution On' if you are preparing your solution from a liquid stock solution.",
                            "The calculated Mass/Volume requirement helps you prepare the exact amount for your target volume."
                        ]}
                        formula="K_a = \frac{[H^+][A^-]}{[HA]}"
                    />
              </TabsContent>

              {/* TAB: Buffer Solver */}
              <TabsContent value="buffer" className="outline-none animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card className="bg-white/[0.02] border-white/5 rounded-3xl p-10 space-y-8">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-gray-500">Substance pKa</Label>
                                <Input type="number" value={bufferInput.pka} onChange={e=>setBufferInput({...bufferInput, pka: e.target.value})} className="h-14 bg-black border-white/10 font-bold text-2xl rounded-2xl text-cyan-400" />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-gray-500">[Acid] Concentration</Label>
                                    <Input type="number" value={bufferInput.acidConc} onChange={e=>setBufferInput({...bufferInput, acidConc: e.target.value})} className="h-12 bg-black border-white/10 font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-gray-500">[Base] Concentration</Label>
                                    <Input type="number" value={bufferInput.baseConc} onChange={e=>setBufferInput({...bufferInput, baseConc: e.target.value})} className="h-12 bg-black border-white/10 font-bold" />
                                </div>
                            </div>
                        </div>
                        <div className="pt-8 border-t border-white/5 text-gray-500 text-xs leading-relaxed italic">
                            Solving Henderson-Hasselbalch: <InlineMath math="pH = pK_a + \log\frac{[A^-]}{[HA]}" />
                        </div>
                    </Card>
                    {bufferResult && (
                        <Card className="bg-white/[0.03] border-white/5 rounded-3xl p-10 flex flex-col justify-center items-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-10 opacity-5"><Activity className="w-48 h-48" /></div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-500 mb-4">Calculated Buffer pH</p>
                            <p className="text-[120px] font-black leading-none tracking-tighter mb-6">{bufferResult.ph.toFixed(2)}</p>
                            <div className="px-6 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest">
                                Base/Acid Ratio: {bufferResult.ratio.toFixed(3)}
                            </div>
                        </Card>
                    )}
                </div>
                <Tutorial 
                    title="Henderson-Hasselbalch"
                    explanation="A buffer solution resists changes in pH when small amounts of acid or base are added. For maximum efficiency, choose a buffer system whose pKa is close to your target pH."
                    steps={[
                        "Enter the pKa of your buffering agent (e.g., 4.76 for acetate, 7.21 for phosphate).",
                        "Input the final molar concentration of the acid [HA] and its conjugate base [A⁻].",
                        "The resulting pH reflects the equilibrium state of the mixture.",
                        "The Base/Acid ratio indicates the protonation state of your buffer system."
                    ]}
                    formula="pH = pK_a + \log\frac{[A^-]}{[HA]}"
                />
              </TabsContent>

              {/* TAB: Beer-Lambert */}
              <TabsContent value="optics" className="outline-none animate-in fade-in duration-500">
                <Card className="bg-white/[0.02] border-white/5 rounded-[40px] p-10">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                        {['abs', 'eps', 'path', 'conc'].map(f => (
                            <div key={f} className="space-y-3">
                                <Label className="text-[10px] font-black uppercase text-gray-500 ml-1">
                                    {f === 'abs' ? 'Absorbance (A)' : f === 'eps' ? 'Molar Abs (ε)' : f === 'path' ? 'Path Length (b)' : 'Conc (c)'}
                                </Label>
                                <Input 
                                    placeholder={f === 'path' ? '1.0 cm' : 'Leave 1 blank to solve'} 
                                    type="number" 
                                    value={beerInput[f]} 
                                    onChange={e=>setBeerInput({...beerInput, [f]: e.target.value})} 
                                    className="h-14 bg-black border-white/10 font-bold text-lg rounded-2xl focus:ring-cyan-500" 
                                />
                            </div>
                        ))}
                    </div>
                    {beerResult && (
                        <div className="p-10 bg-cyan-500 text-black rounded-[30px] flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-cyan-500/20">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-60">Calculated Parameter</p>
                                <h3 className="text-2xl font-black mb-1">{beerResult.label}</h3>
                                <p className="text-7xl font-black tracking-tighter">{beerResult.res.toExponential(4)}</p>
                            </div>
                            <div className="bg-black/10 p-6 rounded-2xl border border-black/10 font-mono text-sm font-bold">
                                <BlockMath math={`A = \\epsilon \\cdot b \\cdot c`} />
                            </div>
                        </div>
                    )}
                </Card>
                <Tutorial 
                    title="Beer-Lambert"
                    explanation="The Beer-Lambert law relates the attenuation of light to the properties of the material through which the light is traveling. It is fundamental in quantitative spectroscopy."
                    steps={[
                        "Leave exactly one field blank: this is the value the solver will determine for you.",
                        "Absorbance (A) is a unitless measure of how much light is blocked by the sample.",
                        "Molar Absorptivity (ε) is a constant unique to your substance at a specific wavelength.",
                        "Path Length (b) is usually 1.0 cm (the standard width of a UV-Vis cuvette)."
                    ]}
                    formula="A = \epsilon \cdot b \cdot c"
                />
              </TabsContent>

              {/* TAB: Stock Assay */}
              <TabsContent value="assay" className="outline-none animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card className="bg-white/[0.02] border-white/5 rounded-3xl p-10 space-y-8">
                        <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Commercial Stock Parameters</p>
                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-gray-500 uppercase">Density (g/mL)</Label>
                                <Input type="number" value={assayInput.density} onChange={e=>setAssayInput({...assayInput, density: e.target.value})} className="h-12 bg-black border-white/10 font-bold" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-gray-500 uppercase">Assay (wt %)</Label>
                                <Input type="number" value={assayInput.percent} onChange={e=>setAssayInput({...assayInput, percent: e.target.value})} className="h-12 bg-black border-white/10 font-bold" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-gray-500 uppercase">Molecular Weight (g/mol)</Label>
                                <Input type="number" value={assayInput.mw} onChange={e=>setAssayInput({...assayInput, mw: e.target.value})} className="h-12 bg-black border-white/10 font-bold" />
                            </div>
                        </div>
                    </Card>
                    {assayResult && (
                        <Card className="bg-white/[0.03] border-white/5 rounded-3xl p-10 flex flex-col justify-center relative overflow-hidden">
                            <Waves className="absolute right-0 top-0 w-64 h-64 text-cyan-500 opacity-5 -mr-20 -mt-20" />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-500 mb-4">Stock Molarity</p>
                            <p className="text-8xl font-black tracking-tighter mb-4">{assayResult.toFixed(2)}<span className="text-2xl text-gray-600 ml-4 font-bold">M</span></p>
                            <div className="bg-black/40 p-6 rounded-2xl border border-white/5 space-y-4">
                                <BlockMath math={`M = \\frac{\\rho \\cdot P \\cdot 10}{MW}`} />
                                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">where P is weight %</div>
                            </div>
                        </Card>
                    )}
                </div>
                <Tutorial 
                    title="Stock Assay"
                    explanation="Commercial reagents are often sold as concentrated liquid stocks defined by density and weight percentage. This tool converts manufacturer data into Molarity."
                    steps={[
                        "Check the bottle label for Density (ρ) in g/mL and Assay % (P) by weight.",
                        "Enter the Molecular Weight (MW) of the substance in g/mol.",
                        "The calculated Molarity is the 'true' concentration of the concentrated stock.",
                        "Use this stock molarity in the Preparation tab to calculate precise dilutions."
                    ]}
                    formula="M = \frac{\rho \cdot P \cdot 10}{MW}"
                />
              </TabsContent>
            </Tabs>

            {/* Footnote Guidelines */}
            <div className="pt-10 border-t border-white/5 grid md:grid-cols-2 gap-10">
                <div className="flex items-start space-x-4">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10"><Info className="w-5 h-5 text-gray-400" /></div>
                    <div className="space-y-2">
                        <h4 className="text-xs font-black uppercase tracking-widest">Thermodynamic Consistency</h4>
                        <p className="text-xs text-gray-500 leading-relaxed">Calculations are modeled for 25°C using exact quadratic solvers. For high-ionic strength solutions ( {'>'} 0.1M), activity coefficients may slightly alter observed pH.</p>
                    </div>
                </div>
                <div className="flex items-start space-x-4">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10"><Beaker className="w-5 h-5 text-gray-400" /></div>
                    <div className="space-y-2">
                        <h4 className="text-xs font-black uppercase tracking-widest">Laboratory Safety</h4>
                        <p className="text-xs text-gray-500 leading-relaxed">Always verify theoretical results against experimental readings. Consult SDS before handling concentrated stocks calculated in the Assay tab.</p>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </ResponsiveSection>
    </div>
  );
};

export default ScientificCalculations;
