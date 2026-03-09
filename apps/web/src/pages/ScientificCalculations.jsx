import React, { useState, useEffect } from 'react';
import { FlaskConical, Scale, Settings2, RotateCcw } from 'lucide-react';
import ResponsiveSection from '../components/layout/ResponsiveSection';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';

const KW = 1e-14;

const SUBSTANCES = [
  { id: 'hcl', name: 'Hydrochloric Acid (HCl)', type: 'strong_acid', ka: null, mw: 36.46 },
  { id: 'hno3', name: 'Nitric Acid (HNO₃)', type: 'strong_acid', ka: null, mw: 63.01 },
  { id: 'h2so4', name: 'Sulfuric Acid (H₂SO₄)', type: 'sulfuric_acid', ka: null, mw: 98.08 },
  { id: 'naoh', name: 'Sodium Hydroxide (NaOH)', type: 'strong_base', kb: null, mw: 39.997 },
  { id: 'koh', name: 'Potassium Hydroxide (KOH)', type: 'strong_base', kb: null, mw: 56.11 },
  { id: 'acetic', name: 'Acetic Acid (CH₃COOH)', type: 'weak_acid', ka: 1.8e-5, pka: 4.74, mw: 60.05 },
  { id: 'formic', name: 'Formic Acid (HCOOH)', type: 'weak_acid', ka: 1.8e-4, pka: 3.74, mw: 46.03 },
  { id: 'nh3', name: 'Ammonia (NH₃)', type: 'weak_base', kb: 1.8e-5, pkb: 4.74, mw: 17.03 },
  { id: 'pyridine', name: 'Pyridine (C₅H₅N)', type: 'weak_base', kb: 1.7e-9, pkb: 8.77, mw: 79.10 },
  { id: 'na_acetate', name: 'Sodium Acetate (Anhydrous)', type: 'salt_basic', ka: 1.8e-5, conjugate: 'CH₃COO⁻', mw: 82.03 },
  { id: 'na_acetate_tri', name: 'Sodium Acetate (Trihydrate)', type: 'salt_basic', ka: 1.8e-5, conjugate: 'CH₃COO⁻', mw: 136.08 },
  { id: 'nh4cl', name: 'Ammonium Chloride (NH₄Cl)', type: 'salt_acidic', kb: 1.8e-5, conjugate: 'NH₄⁺', mw: 53.49 },
  { id: 'custom_acid', name: 'Custom Weak Acid', type: 'weak_acid', ka: 1e-5, pka: 5.0, mw: 100, isCustom: true },
  { id: 'custom_base', name: 'Custom Weak Base', type: 'weak_base', kb: 1e-5, pkb: 5.0, mw: 100, isCustom: true },
];

const ScientificCalculations = () => {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => setIsVisible(true), []);

  const [substanceId, setSubstanceId] = useState('acetic');
  const [calcMode, setCalcMode] = useState('find_ph'); 
  const [inputVal, setInputVal] = useState(''); 
  const [targetVolume, setTargetVolume] = useState('1'); 
  const [useDilutionSource, setUseDilutionSource] = useState(false);
  const [stockVal, setStockVal] = useState({ c: '', v: '', totalV: '' });
  const [customPka, setCustomPka] = useState('5.0');
  const [customMw, setCustomMw] = useState('100');
  
  const [substanceResult, setSubstanceResult] = useState(null);
  const [dilution, setDilution] = useState({ c1: '', v1: '', c2: '', v2: '' });
  const [dilutionResult, setDilutionResult] = useState(null);

  const solveQuadratic = (a, b) => {
    if (b === 0) return 0;
    return (-a + Math.sqrt(Math.pow(a, 2) + 4 * b)) / 2;
  };

  const handleReset = () => {
    setInputVal('');
    setStockVal({ c: '', v: '', totalV: '' });
    setSubstanceResult(null);
  };

  useEffect(() => {
    let c = 0;
    if (useDilutionSource && calcMode === 'find_ph') {
        const { c: sc, v: sv, totalV: stv } = stockVal;
        if (sc && sv && stv) c = (parseFloat(sc) * parseFloat(sv)) / parseFloat(stv);
        else { setSubstanceResult(null); return; }
    } else {
        c = parseFloat(inputVal);
    }

    const subBase = SUBSTANCES.find(s => s.id === substanceId);
    if (!subBase) return;

    const sub = { ...subBase };
    if (sub.isCustom) {
        const pka = parseFloat(customPka);
        sub.ka = Math.pow(10, -pka);
        sub.kb = KW / sub.ka;
        sub.mw = parseFloat(customMw);
    }

    if ((isNaN(c) && calcMode === 'find_ph') || (isNaN(parseFloat(inputVal)) && calcMode === 'find_m')) {
        setSubstanceResult(null);
        return;
    }

    let ph, poh, h, oh, m, steps = [], error = null;

    if (calcMode === 'find_ph') {
        m = c;
        if (sub.type === 'strong_acid') {
            h = c; ph = -Math.log10(h);
            steps = [`[H^+] = C_{acid} = ${h.toExponential(4)} \\text{ M}`, `pH = -\\log_{10}(${h.toExponential(4)}) = ${ph.toFixed(2)}`];
        } else if (sub.type === 'sulfuric_acid') {
            const ka2 = 0.012;
            const x = solveQuadratic(c + ka2, ka2 * c);
            h = c + x; ph = -Math.log10(h);
            steps = [`H_2SO_4 \\text{ dissociation (including } K_{a2}=0.012\\text{)}`, `[H^+] = C + x = ${h.toExponential(4)} \\text{ M}`, `pH = ${ph.toFixed(2)}`];
        } else if (sub.type === 'strong_base') {
            oh = c; poh = -Math.log10(oh); ph = 14 - poh;
            steps = [`[OH^-] = C_{base} = ${oh.toExponential(4)} \\text{ M}`, `pH = 14 - pOH = ${ph.toFixed(2)}`];
        } else if (sub.type === 'weak_acid') {
            h = solveQuadratic(sub.ka, sub.ka * c); ph = -Math.log10(h);
            steps = [`\\text{Weak Acid Equilibrium (Quadratic)}`, `[H^+] = ${h.toExponential(4)} \\text{ M}`, `pH = ${ph.toFixed(2)}`];
        } else if (sub.type === 'weak_base') {
            const kbValue = sub.kb || (KW / sub.ka);
            oh = solveQuadratic(kbValue, kbValue * c); poh = -Math.log10(oh); ph = 14 - poh;
            steps = [`\\text{Weak Base Equilibrium (Quadratic)}`, `[OH^-] = ${oh.toExponential(4)} \\text{ M}`, `pH = ${ph.toFixed(2)}`];
        } else if (sub.type === 'salt_basic') {
            const kh = KW / sub.ka; oh = solveQuadratic(kh, kh * c); poh = -Math.log10(oh); ph = 14 - poh;
            steps = [`\\text{Salt Hydrolysis: } K_h = K_w / K_a = ${kh.toExponential(2)}`, `[OH^-] = ${oh.toExponential(4)} \\text{ M}`, `pH = ${ph.toFixed(2)}`];
        } else if (sub.type === 'salt_acidic') {
            const khValue = KW / (sub.kb || (KW / sub.ka)); h = solveQuadratic(khValue, khValue * c); ph = -Math.log10(h);
            steps = [`\\text{Salt Hydrolysis: } K_h = K_w / K_b = ${khValue.toExponential(2)}`, `[H^+] = ${h.toExponential(4)} \\text{ M}`, `pH = ${ph.toFixed(2)}`];
        }
        poh = 14 - ph; h = Math.pow(10, -ph); oh = Math.pow(10, -poh);
    } else {
        ph = parseFloat(inputVal); poh = 14 - ph; h = Math.pow(10, -ph); oh = Math.pow(10, -poh);
        if (sub.type === 'strong_acid') m = h;
        else if (sub.type === 'weak_acid') m = (Math.pow(h, 2) / sub.ka) + h;
        else if (sub.type === 'weak_base') { const kbValue = sub.kb || (KW / sub.ka); m = (Math.pow(oh, 2) / kbValue) + oh; }
        else if (sub.type === 'strong_base') m = oh;
        else if (sub.type === 'salt_basic') { const kh = KW / sub.ka; m = (Math.pow(oh, 2) / kh) + oh; }
        else if (sub.type === 'salt_acidic') { const khValue = KW / (sub.kb || (KW / sub.ka)); m = (Math.pow(h, 2) / khValue) + h; }
        else if (sub.type === 'sulfuric_acid') { const ka2 = 0.012; m = (Math.pow(h, 2) + ka2 * h) / (2 * ka2 + h); }
        steps = [`\\text{Targeting pH } ${ph} \\implies [H^+] = ${h.toExponential(2)}`, `\\text{Calculated Molarity } = ${m?.toExponential(4)} \\text{ M}`];
    }

    let labPrep = null;
    const vol = parseFloat(targetVolume);
    if (m > 0 && vol > 0 && sub.mw > 0) {
        labPrep = { mass: m * vol * sub.mw, mw: sub.mw, vol, m };
    }

    setSubstanceResult({ ph, poh, h, oh, m, steps, error, labPrep });
  }, [substanceId, calcMode, inputVal, targetVolume, useDilutionSource, stockVal, customPka, customMw]);

  useEffect(() => {
    const { c1, v1, c2, v2 } = dilution;
    const vals = [c1, v1, c2, v2].filter(v => v !== '');
    if (vals.length === 3) {
      const n = [parseFloat(c1), parseFloat(v1), parseFloat(c2), parseFloat(v2)];
      let res = 0, calculation = '';
      if (c1 === '') { res = (n[2] * n[3]) / n[1]; calculation = `C_1 = (C_2 V_2) / V_1 = ${res.toFixed(4)}`; }
      else if (v1 === '') { res = (n[2] * n[3]) / n[0]; calculation = `V_1 = (C_2 V_2) / C_1 = ${res.toFixed(4)}`; }
      else if (c2 === '') { res = (n[0] * n[1]) / n[3]; calculation = `C_2 = (C_1 V_1) / V_2 = ${res.toFixed(4)}`; }
      else if (v2 === '') { res = (n[0] * n[1]) / n[2]; calculation = `V_2 = (C_1 V_1) / C_2 = ${res.toFixed(4)}`; }
      setDilutionResult({ res, calculation });
    } else setDilutionResult(null);
  }, [dilution]);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-cyan-500/30">
      <ResponsiveSection className="pt-28 pb-20">
        <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="max-w-5xl mx-auto space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-10">
                <div className="space-y-4">
                    <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded bg-white/5 border border-white/10 text-gray-400 text-[10px] font-bold tracking-widest uppercase">
                        <Settings2 className="w-3 h-3" />
                        <span>v2.0 Analytical Solver</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter">Lab Calc<span className="text-cyan-500">.</span></h1>
                    <p className="text-gray-500 text-lg max-w-xl font-medium">Exact equilibrium models for acids, bases, and salts. Integrated weighing & dilution workflows.</p>
                </div>
                <button onClick={handleReset} className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-lg border border-white/10">
                    <RotateCcw className="w-3 h-3" />
                    <span>Clear All</span>
                </button>
            </div>

            <Tabs defaultValue="ph" className="w-full">
              <TabsList className="flex space-x-8 bg-transparent border-b border-white/5 w-full justify-start rounded-none h-auto p-0 mb-10">
                {['ph', 'dilution'].map(t => (
                    <TabsTrigger key={t} value={t} className="rounded-none border-b-2 border-transparent data-[state=active]:border-cyan-500 data-[state=active]:bg-transparent data-[state=active]:text-cyan-400 bg-transparent text-gray-500 font-bold text-xs uppercase tracking-widest pb-4 px-0 transition-all">
                        {t === 'ph' ? 'Preparation & pH' : 'C1V1 Dilution'}
                    </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="ph" className="mt-0 outline-none space-y-8 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1 space-y-6">
                            <div className="space-y-4 bg-white/[0.02] border border-white/5 p-6 rounded-2xl">
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black text-gray-500 tracking-widest">Substance</Label>
                                    <select
                                        value={substanceId}
                                        onChange={(e) => setSubstanceId(e.target.value)}
                                        className="w-full h-11 px-4 rounded-xl bg-black border border-white/10 text-white font-bold focus:border-cyan-500/50 outline-none appearance-none"
                                    >
                                        <optgroup label="Acids & Bases" className="bg-gray-900">
                                            {SUBSTANCES.filter(s => !s.type.includes('salt')).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </optgroup>
                                        <optgroup label="Salts" className="bg-gray-900">
                                            {SUBSTANCES.filter(s => s.type.includes('salt')).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </optgroup>
                                    </select>
                                </div>

                                {SUBSTANCES.find(s => s.id === substanceId)?.isCustom && (
                                    <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-black text-gray-500">pKa</Label>
                                            <Input type="number" value={customPka} onChange={e => setCustomPka(e.target.value)} className="bg-black border-white/10 h-10" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-black text-gray-500">MW</Label>
                                            <Input type="number" value={customMw} onChange={e => setCustomMw(e.target.value)} className="bg-black border-white/10 h-10" />
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-white/5 space-y-4">
                                    <div className="flex bg-black rounded-lg p-1 border border-white/10">
                                        <button onClick={() => setCalcMode('find_ph')} className={`flex-1 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${calcMode === 'find_ph' ? 'bg-white/10 text-white' : 'text-gray-600 hover:text-gray-400'}`}>CONC → pH</button>
                                        <button onClick={() => setCalcMode('find_m')} className={`flex-1 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${calcMode === 'find_m' ? 'bg-white/10 text-white' : 'text-gray-600 hover:text-gray-400'}`}>pH → MOL</button>
                                    </div>

                                    {calcMode === 'find_ph' && (
                                        <div className="flex items-center justify-between px-1">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase">Use Stock Dilution?</span>
                                            <button onClick={() => setUseDilutionSource(!useDilutionSource)} className={`w-10 h-5 rounded-full transition-all relative ${useDilutionSource ? 'bg-cyan-500' : 'bg-white/10'}`}>
                                                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${useDilutionSource ? 'left-6' : 'left-1'}`} />
                                            </button>
                                        </div>
                                    )}

                                    {useDilutionSource && calcMode === 'find_ph' ? (
                                        <div className="space-y-3 animate-in fade-in duration-300">
                                            <Input placeholder="Stock Conc (M)" type="number" value={stockVal.c} onChange={e=>setStockVal({...stockVal, c: e.target.value})} className="bg-black border-white/10 h-11" />
                                            <Input placeholder="Aliquot Vol (L)" type="number" value={stockVal.v} onChange={e=>setStockVal({...stockVal, v: e.target.value})} className="bg-black border-white/10 h-11" />
                                            <Input placeholder="Final Total Vol (L)" type="number" value={stockVal.totalV} onChange={e=>setStockVal({...stockVal, totalV: e.target.value})} className="bg-black border-white/10 h-11" />
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-black text-gray-500">{calcMode === 'find_ph' ? 'Molarity (M)' : 'Target pH'}</Label>
                                            <Input type="number" placeholder={calcMode === 'find_ph' ? 'e.g. 0.1' : 'e.g. 2.37'} value={inputVal} onChange={e => setInputVal(e.target.value)} className="bg-black border-white/10 h-11 text-lg font-bold" />
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-black text-gray-500">Preparation Volume (L)</Label>
                                        <Input type="number" value={targetVolume} onChange={e => setTargetVolume(e.target.value)} className="bg-black border-white/10 h-11" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-2 space-y-6">
                            {substanceResult ? (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-white/[0.03] border border-white/10 p-8 rounded-3xl relative overflow-hidden shadow-2xl">
                                            <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-500 font-black mb-2">Resulting pH</p>
                                            <p className="text-7xl font-black tracking-tighter text-white">{substanceResult.ph.toFixed(3)}</p>
                                            <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-2 gap-4 text-[10px] font-black uppercase text-gray-500">
                                                <div>[H⁺]: <span className="text-white">{substanceResult.h.toExponential(2)}</span></div>
                                                <div>[OH⁻]: <span className="text-white">{substanceResult.oh.toExponential(2)}</span></div>
                                            </div>
                                        </div>

                                        <div className="bg-cyan-500 border border-cyan-400 p-8 rounded-3xl relative overflow-hidden shadow-2xl shadow-cyan-500/20">
                                            <Scale className="absolute right-[-10%] top-[-10%] w-40 h-40 text-black/10 rotate-12" />
                                            <p className="text-[10px] uppercase tracking-[0.3em] text-black/60 font-black mb-2">Required Mass</p>
                                            <p className="text-7xl font-black tracking-tighter text-black">
                                                {substanceResult.labPrep?.mass.toFixed(4) ?? '0.0000'}
                                            </p>
                                            <p className="mt-2 text-black/60 font-black uppercase text-[10px] tracking-widest ml-1">Grams to weigh</p>
                                        </div>
                                    </div>

                                    <div className="bg-white/[0.02] border border-white/5 p-8 rounded-3xl space-y-8 font-mono">
                                        <div>
                                            <div className="flex items-center space-x-2 mb-6">
                                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                                                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Derivation</h3>
                                            </div>
                                            <div className="space-y-6">
                                                {substanceResult.steps.map((s, i) => <div key={i} className="bg-black/40 p-4 rounded-xl border border-white/5"><BlockMath key={i} math={s} /></div>)}
                                                {substanceResult.labPrep && (
                                                    <div className="bg-cyan-500/5 p-4 rounded-xl border border-cyan-500/10">
                                                        <BlockMath math={`m = M \\cdot V \\cdot MW = ${substanceResult.labPrep.m.toExponential(2)} \\cdot ${substanceResult.labPrep.vol} \\cdot ${substanceResult.labPrep.mw} = ${substanceResult.labPrep.mass.toFixed(4)} \\text{ g}`} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full min-h-[400px] border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-gray-600 space-y-4">
                                    <FlaskConical className="w-12 h-12 opacity-20" />
                                    <p className="text-xs font-black uppercase tracking-widest">Waiting for input parameters...</p>
                                </div>
                            )}
                        </div>
                    </div>
              </TabsContent>

              <TabsContent value="dilution" className="mt-0 outline-none animate-in fade-in duration-500">
                <Card className="bg-white/[0.02] border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                  <CardContent className="p-10 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 font-mono">
                      {['c1', 'v1', 'c2', 'v2'].map((key) => (
                        <div key={key} className="space-y-3">
                          <Label className="text-[10px] uppercase font-black text-gray-500 ml-1">{key}</Label>
                          <Input type="number" placeholder={`Enter ${key}`} value={dilution[key]} onChange={(e) => setDilution({ ...dilution, [key]: e.target.value })} className="bg-black border-white/10 h-12 font-bold text-lg rounded-xl" />
                        </div>
                      ))}
                    </div>
                    {dilutionResult && (
                      <div className="p-10 rounded-3xl bg-cyan-500/10 border border-cyan-500/20">
                        <p className="text-[10px] uppercase font-black text-cyan-400 mb-2">Result</p>
                        <p className="text-7xl font-black text-white mb-8 tracking-tighter">{dilutionResult.res.toFixed(4)}</p>
                        <div className="p-6 bg-black/40 rounded-2xl border border-white/5"><BlockMath math={dilutionResult.calculation} /></div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </ResponsiveSection>
    </div>
  );
};

export default ScientificCalculations;
