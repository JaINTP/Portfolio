import React, { useState, useEffect } from 'react';
import { Calculator, Beaker, Droplets, Thermometer, FlaskConical, Info } from 'lucide-react';
import ResponsiveSection from '../components/layout/ResponsiveSection';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

const ScientificCalculations = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Dilution State
  const [dilution, setDilution] = useState({ c1: '', v1: '', c2: '', v2: '' });
  const [dilutionResult, setDilutionResult] = useState(null);

  // pH State
  const [phInput, setPhInput] = useState({ value: '', type: 'ph' }); // type: ph, h, poh, oh
  const [phResult, setPhResult] = useState(null);

  // Molarity State
  const [molarity, setMolarity] = useState({ mass: '', molarMass: '', volume: '', molarity: '' });
  const [molarityResult, setMolarityResult] = useState(null);

  // PPB Conversion State (Molarity to ppb)
  const [ppbConv, setPpbConv] = useState({ molarity: '', molarMass: '' });
  const [ppbResult, setPpbResult] = useState(null);

  // Dilution Logic
  useEffect(() => {
    const { c1, v1, c2, v2 } = dilution;
    const vals = [c1, v1, c2, v2].filter(v => v !== '');
    if (vals.length === 3) {
      const nc1 = parseFloat(c1);
      const nv1 = parseFloat(v1);
      const nc2 = parseFloat(c2);
      const nv2 = parseFloat(v2);

      let res = 0;
      let formula = '';
      let calculation = '';

      if (c1 === '') {
        res = (nc2 * nv2) / nv1;
        formula = 'C_1 = \\frac{C_2 \\times V_2}{V_1}';
        calculation = `C_1 = \\frac{${nc2} \\times ${nv2}}{${nv1}} = ${res.toFixed(4)}`;
      } else if (v1 === '') {
        res = (nc2 * nv2) / nc1;
        formula = 'V_1 = \\frac{C_2 \\times V_2}{C_1}';
        calculation = `V_1 = \\frac{${nc2} \\times ${nv2}}{${nc1}} = ${res.toFixed(4)}`;
      } else if (c2 === '') {
        res = (nc1 * nv1) / nv2;
        formula = 'C_2 = \\frac{C_1 \\times V_1}{V_2}';
        calculation = `C_2 = \\frac{${nc1} \\times ${nv1}}{${nv2}} = ${res.toFixed(4)}`;
      } else if (v2 === '') {
        res = (nc1 * nv1) / nc2;
        formula = 'V_2 = \\frac{C_1 \\times V_1}{C_2}';
        calculation = `V_2 = \\frac{${nc1} \\times ${nv1}}{${nc2}} = ${res.toFixed(4)}`;
      }
      setDilutionResult({ res, formula, calculation });
    } else {
      setDilutionResult(null);
    }
  }, [dilution]);

  // pH Logic
  useEffect(() => {
    const val = parseFloat(phInput.value);
    if (isNaN(val)) {
      setPhResult(null);
      return;
    }

    let results = {};
    let steps = [];

    if (phInput.type === 'ph') {
      const h = Math.pow(10, -val);
      const poh = 14 - val;
      const oh = Math.pow(10, -poh);
      results = { ph: val, h, poh, oh };
      steps = [
        `[H^+] = 10^{-pH} = 10^{-${val}} = ${h.toExponential(4)} \\text{ M}`,
        `pOH = 14 - pH = 14 - ${val} = ${poh.toFixed(2)}`,
        `[OH^-] = 10^{-pOH} = 10^{-${poh.toFixed(2)}} = ${oh.toExponential(4)} \\text{ M}`
      ];
    } else if (phInput.type === 'h') {
      const ph = -Math.log10(val);
      const poh = 14 - ph;
      const oh = Math.pow(10, -poh);
      results = { ph, h: val, poh, oh };
      steps = [
        `pH = -\\log_{10}([H^+]) = -\\log_{10}(${val}) = ${ph.toFixed(2)}`,
        `pOH = 14 - pH = 14 - ${ph.toFixed(2)} = ${poh.toFixed(2)}`,
        `[OH^-] = 10^{-pOH} = 10^{-${poh.toFixed(2)}} = ${oh.toExponential(4)} \\text{ M}`
      ];
    } else if (phInput.type === 'poh') {
        const ph = 14 - val;
        const h = Math.pow(10, -ph);
        const oh = Math.pow(10, -val);
        results = { ph, h, poh: val, oh };
        steps = [
            `pH = 14 - pOH = 14 - ${val} = ${ph.toFixed(2)}`,
            `[H^+] = 10^{-pH} = 10^{-${ph.toFixed(2)}} = ${h.toExponential(4)} \\text{ M}`,
            `[OH^-] = 10^{-pOH} = 10^{-${val}} = ${oh.toExponential(4)} \\text{ M}`
        ];
    } else if (phInput.type === 'oh') {
        const poh = -Math.log10(val);
        const ph = 14 - poh;
        const h = Math.pow(10, -ph);
        results = { ph, h, poh, oh: val };
        steps = [
            `pOH = -\\log_{10}([OH^-]) = -\\log_{10}(${val}) = ${poh.toFixed(2)}`,
            `pH = 14 - pOH = 14 - ${poh.toFixed(2)} = ${ph.toFixed(2)}`,
            `[H^+] = 10^{-pH} = 10^{-${ph.toFixed(2)}} = ${h.toExponential(4)} \\text{ M}`
        ];
    }

    setPhResult({ results, steps });
  }, [phInput]);

  // Molarity Logic
  useEffect(() => {
    const { mass, molarMass, volume, molarity: mol } = molarity;
    const vals = [mass, molarMass, volume, mol].filter(v => v !== '');
    if (vals.length === 3) {
      const nMass = parseFloat(mass);
      const nMW = parseFloat(molarMass);
      const nV = parseFloat(volume);
      const nMol = parseFloat(mol);

      let res = 0;
      let formula = '';
      let calculation = '';

      if (mass === '') {
        res = nMol * nV * nMW;
        formula = 'm = M \\times V \\times MW';
        calculation = `m = ${nMol} \\times ${nV} \\times ${nMW} = ${res.toFixed(4)} \\text{ g}`;
      } else if (molarMass === '') {
        res = nMass / (nMol * nV);
        formula = 'MW = \\frac{m}{M \\times V}';
        calculation = `MW = \\frac{${nMass}}{${nMol} \\times ${nV}} = ${res.toFixed(4)} \\text{ g/mol}`;
      } else if (volume === '') {
        res = nMass / (nMol * nMW);
        formula = 'V = \\frac{m}{M \\times MW}';
        calculation = `V = \\frac{${nMass}}{${nMol} \\times ${nMW}} = ${res.toFixed(4)} \\text{ L}`;
      } else if (mol === '') {
        res = nMass / (nMW * nV);
        formula = 'M = \\frac{m}{MW \\times V}';
        calculation = `M = \\frac{${nMass}}{${nMW} \\times ${nV}} = ${res.toFixed(4)} \\text{ M}`;
      }
      setMolarityResult({ res, formula, calculation });
    } else {
      setMolarityResult(null);
    }
  }, [molarity]);

  // PPB Logic
  useEffect(() => {
    const { molarity: m, molarMass: mw } = ppbConv;
    if (m && mw) {
      const nM = parseFloat(m);
      const nMW = parseFloat(mw);
      const resPPM = nM * nMW * 1000;
      const resPPB = resPPM * 1000;
      
      const formula = 'C_{ppb} = M \\times MW \\times 10^6';
      const calculation = `C_{ppb} = ${nM} \\times ${nMW} \\times 10^6 = ${resPPB.toExponential(4)} \\text{ ppb}`;
      
      setPpbResult({ ppm: resPPM, ppb: resPPB, formula, calculation });
    } else {
      setPpbResult(null);
    }
  }, [ppbConv]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black text-white">
      <ResponsiveSection className="pt-32 pb-20">
        <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Brief Description Section */}
            <div className="space-y-4">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium">
                <Beaker className="w-4 h-4" />
                <span>Laboratory Toolbox</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
                Scientific Calculations
              </h1>
              <p className="text-gray-400 text-lg max-w-2xl">
                A suite of essential chemical calculation tools. Use these calculators to perform common laboratory tasks such as dilutions, pH conversions, and molarity determination with high precision and full mathematical breakdowns.
              </p>
            </div>

            {/* Calculation Selection Section */}
            <Tabs defaultValue="dilution" className="w-full">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-white/5 border border-white/10 p-1 mb-8">
                <TabsTrigger value="dilution" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-black">
                    <Droplets className="w-4 h-4 mr-2 hidden sm:inline" />
                    Dilution
                </TabsTrigger>
                <TabsTrigger value="ph" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-black">
                    <Thermometer className="w-4 h-4 mr-2 hidden sm:inline" />
                    pH/pOH
                </TabsTrigger>
                <TabsTrigger value="molarity" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-black">
                    <Calculator className="w-4 h-4 mr-2 hidden sm:inline" />
                    Molarity
                </TabsTrigger>
                <TabsTrigger value="ppb" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-black">
                    <FlaskConical className="w-4 h-4 mr-2 hidden sm:inline" />
                    M to PPB
                </TabsTrigger>
              </TabsList>

              {/* Dilution Tab */}
              <TabsContent value="dilution" className="mt-0 outline-none">
                <Card className="bg-white/5 border-white/10 text-white overflow-hidden">
                  <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                    <CardTitle className="text-xl font-semibold flex items-center">
                      <Droplets className="w-5 h-5 mr-2 text-cyan-400" />
                      Dilution Calculator <span className="ml-2 text-sm font-normal text-gray-400 font-mono italic">(C₁V₁ = C₂V₂)</span>
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Solve for any unknown variable in the dilution equation. Enter three values to compute the fourth.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label htmlFor="c1" className="text-sm font-medium text-gray-300">Initial Concentration (<InlineMath math="C_1" />)</Label>
                        <Input
                          id="c1"
                          type="number"
                          placeholder="Stock concentration"
                          value={dilution.c1}
                          onChange={(e) => setDilution({ ...dilution, c1: e.target.value })}
                          className="bg-black/40 border-white/10 focus:border-cyan-500/50 transition-all h-11"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="v1" className="text-sm font-medium text-gray-300">Initial Volume (<InlineMath math="V_1" />)</Label>
                        <Input
                          id="v1"
                          type="number"
                          placeholder="Volume to use"
                          value={dilution.v1}
                          onChange={(e) => setDilution({ ...dilution, v1: e.target.value })}
                          className="bg-black/40 border-white/10 focus:border-cyan-500/50 transition-all h-11"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="c2" className="text-sm font-medium text-gray-300">Final Concentration (<InlineMath math="C_2" />)</Label>
                        <Input
                          id="c2"
                          type="number"
                          placeholder="Target concentration"
                          value={dilution.c2}
                          onChange={(e) => setDilution({ ...dilution, c2: e.target.value })}
                          className="bg-black/40 border-white/10 focus:border-cyan-500/50 transition-all h-11"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="v2" className="text-sm font-medium text-gray-300">Final Volume (<InlineMath math="V_2" />)</Label>
                        <Input
                          id="v2"
                          type="number"
                          placeholder="Total final volume"
                          value={dilution.v2}
                          onChange={(e) => setDilution({ ...dilution, v2: e.target.value })}
                          className="bg-black/40 border-white/10 focus:border-cyan-500/50 transition-all h-11"
                        />
                      </div>
                    </div>

                    {dilutionResult && (
                      <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="p-6 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 space-y-6">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h3 className="text-cyan-400 font-semibold flex items-center">
                              <Calculator className="w-4 h-4 mr-2" />
                              Result
                            </h3>
                            <div className="px-4 py-2 rounded-lg bg-black/40 border border-white/10">
                                <span className="text-2xl font-bold text-white tracking-tight">
                                    {dilutionResult.res.toFixed(4)}
                                </span>
                                <span className="ml-2 text-xs text-gray-500 uppercase tracking-widest font-medium">units</span>
                            </div>
                          </div>
                          
                          <div className="space-y-4 pt-6 border-t border-white/10">
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold mb-3">Mathematical Breakdown</p>
                              <div className="bg-black/40 p-4 rounded-xl border border-white/5 overflow-x-auto">
                                <BlockMath math={dilutionResult.formula} />
                                <div className="mt-4 pt-4 border-t border-white/5">
                                    <BlockMath math={dilutionResult.calculation} />
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 pt-2">
                              <div className="text-xs text-gray-400 flex items-start space-x-2">
                                <Info className="w-3 h-3 mt-0.5 text-cyan-400/50" />
                                <span><strong className="text-gray-300">C₁, C₂:</strong> Concentrations (any consistent unit like M, %, mg/mL)</span>
                              </div>
                              <div className="text-xs text-gray-400 flex items-start space-x-2">
                                <Info className="w-3 h-3 mt-0.5 text-cyan-400/50" />
                                <span><strong className="text-gray-300">V₁, V₂:</strong> Volumes (any consistent unit like L, mL, µL)</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* pH Tab */}
              <TabsContent value="ph" className="mt-0 outline-none">
                <Card className="bg-white/5 border-white/10 text-white overflow-hidden">
                  <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                    <CardTitle className="text-xl font-semibold flex items-center">
                      <Thermometer className="w-5 h-5 mr-2 text-cyan-400" />
                      pH & Concentration Converter
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Seamlessly convert between pH, pOH, and ion concentrations.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label htmlFor="ph-type" className="text-sm font-medium text-gray-300">Input Type</Label>
                        <select
                          id="ph-type"
                          value={phInput.type}
                          onChange={(e) => setPhInput({ ...phInput, type: e.target.value })}
                          className="w-full h-11 px-3 rounded-md bg-black/40 border border-white/10 text-white focus:border-cyan-500/50 outline-none appearance-none cursor-pointer"
                        >
                          <option value="ph">pH</option>
                          <option value="h">[H⁺] (Molarity)</option>
                          <option value="poh">pOH</option>
                          <option value="oh">[OH⁻] (Molarity)</option>
                        </select>
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="ph-val" className="text-sm font-medium text-gray-300">Enter Value</Label>
                        <Input
                          id="ph-val"
                          type="number"
                          placeholder="e.g. 7.0"
                          value={phInput.value}
                          onChange={(e) => setPhInput({ ...phInput, value: e.target.value })}
                          className="bg-black/40 border-white/10 focus:border-cyan-500/50 h-11"
                        />
                      </div>
                    </div>

                    {phResult && (
                      <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {[
                            { label: 'pH', value: phResult.results.ph.toFixed(2), color: 'text-cyan-400' },
                            { label: '[H⁺]', value: phResult.results.h.toExponential(2), color: 'text-white' },
                            { label: 'pOH', value: phResult.results.poh.toFixed(2), color: 'text-cyan-400' },
                            { label: '[OH⁻]', value: phResult.results.oh.toExponential(2), color: 'text-white' },
                          ].map((item, idx) => (
                            <div key={idx} className="p-4 rounded-xl bg-black/40 border border-white/10 text-center">
                              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">{item.label}</p>
                              <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                            </div>
                          ))}
                        </div>

                        <div className="p-6 rounded-2xl bg-cyan-500/5 border border-cyan-500/20">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold mb-4">Steps & Equations</p>
                          <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-4">
                            {phResult.steps.map((step, i) => (
                              <div key={i} className={i !== 0 ? 'pt-4 border-t border-white/5' : ''}>
                                <BlockMath math={step} />
                              </div>
                            ))}
                          </div>
                          
                          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
                             <div className="flex items-start space-x-2">
                                <Info className="w-3 h-3 mt-0.5 text-cyan-400/50" />
                                <span><strong className="text-gray-300">Relationship:</strong> <InlineMath math="pH + pOH = 14" /> (at 25°C)</span>
                             </div>
                             <div className="flex items-start space-x-2">
                                <Info className="w-3 h-3 mt-0.5 text-cyan-400/50" />
                                <span><strong className="text-gray-300">Autoprotolysis:</strong> <InlineMath math="K_w = [H^+][OH^-] = 10^{-14}" /></span>
                             </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Molarity Tab */}
              <TabsContent value="molarity" className="mt-0 outline-none">
                <Card className="bg-white/5 border-white/10 text-white overflow-hidden">
                  <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                    <CardTitle className="text-xl font-semibold flex items-center">
                      <Calculator className="w-5 h-5 mr-2 text-cyan-400" />
                      Molarity Calculator <span className="ml-2 text-sm font-normal text-gray-400 font-mono italic">(m = M × V × MW)</span>
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Calculate Mass, Volume, Molarity, or Molar Mass.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label htmlFor="m-mass" className="text-sm font-medium text-gray-300">Mass (<InlineMath math="m" />) [g]</Label>
                        <Input
                          id="m-mass"
                          type="number"
                          placeholder="Mass of solute"
                          value={molarity.mass}
                          onChange={(e) => setMolarity({ ...molarity, mass: e.target.value })}
                          className="bg-black/40 border-white/10 focus:border-cyan-500/50 h-11"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="m-mw" className="text-sm font-medium text-gray-300">Molar Mass (<InlineMath math="MW" />) [g/mol]</Label>
                        <Input
                          id="m-mw"
                          type="number"
                          placeholder="Molecular weight"
                          value={molarity.molarMass}
                          onChange={(e) => setMolarity({ ...molarity, molarMass: e.target.value })}
                          className="bg-black/40 border-white/10 focus:border-cyan-500/50 h-11"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="m-v" className="text-sm font-medium text-gray-300">Volume (<InlineMath math="V" />) [L]</Label>
                        <Input
                          id="m-v"
                          type="number"
                          placeholder="Solution volume in Liters"
                          value={molarity.volume}
                          onChange={(e) => setMolarity({ ...molarity, volume: e.target.value })}
                          className="bg-black/40 border-white/10 focus:border-cyan-500/50 h-11"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="m-mol" className="text-sm font-medium text-gray-300">Molarity (<InlineMath math="M" />) [mol/L]</Label>
                        <Input
                          id="m-mol"
                          type="number"
                          placeholder="Molar concentration"
                          value={molarity.molarity}
                          onChange={(e) => setMolarity({ ...molarity, molarity: e.target.value })}
                          className="bg-black/40 border-white/10 focus:border-cyan-500/50 h-11"
                        />
                      </div>
                    </div>

                    {molarityResult && (
                      <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="p-6 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 space-y-6">
                          <div className="flex justify-between items-center">
                            <h3 className="text-cyan-400 font-semibold flex items-center">
                              <Calculator className="w-4 h-4 mr-2" />
                              Calculated Result
                            </h3>
                            <div className="text-2xl font-bold text-white tracking-tight bg-black/40 px-4 py-2 rounded-lg border border-white/10">
                              {molarityResult.res.toFixed(4)}
                            </div>
                          </div>
                          
                          <div className="space-y-4 pt-6 border-t border-white/10">
                            <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-4">
                                <BlockMath math={molarityResult.formula} />
                                <div className="pt-4 border-t border-white/5">
                                    <BlockMath math={molarityResult.calculation} />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs text-gray-500">
                              <div className="flex justify-between"><span className="text-gray-300 font-medium">m:</span> <span>Mass (grams)</span></div>
                              <div className="flex justify-between"><span className="text-gray-300 font-medium">M:</span> <span>Molarity (mol/L)</span></div>
                              <div className="flex justify-between"><span className="text-gray-300 font-medium">V:</span> <span>Volume (Liters)</span></div>
                              <div className="flex justify-between"><span className="text-gray-300 font-medium">MW:</span> <span>Molar Mass (g/mol)</span></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* PPB Tab */}
              <TabsContent value="ppb" className="mt-0 outline-none">
                <Card className="bg-white/5 border-white/10 text-white overflow-hidden">
                  <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                    <CardTitle className="text-xl font-semibold flex items-center">
                      <FlaskConical className="w-5 h-5 mr-2 text-cyan-400" />
                      Molarity to PPM/PPB
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Convert Molar concentration to Parts Per Million (PPM) or Parts Per Billion (PPB).
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label htmlFor="ppb-m" className="text-sm font-medium text-gray-300">Molarity (M)</Label>
                        <Input
                          id="ppb-m"
                          type="number"
                          placeholder="e.g. 0.001"
                          value={ppbConv.molarity}
                          onChange={(e) => setPpbConv({ ...ppbConv, molarity: e.target.value })}
                          className="bg-black/40 border-white/10 focus:border-cyan-500/50 h-11"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="ppb-mw" className="text-sm font-medium text-gray-300">Molar Mass (g/mol)</Label>
                        <Input
                          id="ppb-mw"
                          type="number"
                          placeholder="e.g. 207.2 (for Pb)"
                          value={ppbConv.molarMass}
                          onChange={(e) => setPpbConv({ ...ppbConv, molarMass: e.target.value })}
                          className="bg-black/40 border-white/10 focus:border-cyan-500/50 h-11"
                        />
                      </div>
                    </div>

                    {ppbResult && (
                      <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-6 rounded-2xl bg-black/40 border border-white/10 text-center">
                            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">Result (PPM)</p>
                            <p className="text-3xl font-bold text-white">{ppbResult.ppm.toFixed(2)}</p>
                            <p className="text-[10px] text-gray-500 mt-1">mg/L</p>
                          </div>
                          <div className="p-6 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-center">
                            <p className="text-[10px] uppercase tracking-widest text-cyan-400/70 font-bold mb-2">Result (PPB)</p>
                            <p className="text-3xl font-bold text-cyan-400">{ppbResult.ppb.toLocaleString()}</p>
                            <p className="text-[10px] text-cyan-400/50 mt-1">µg/L</p>
                          </div>
                        </div>

                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold mb-4">Calculation Pathway</p>
                            <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-4 overflow-x-auto">
                                <BlockMath math={ppbResult.formula} />
                                <div className="pt-4 border-t border-white/5">
                                    <BlockMath math={ppbResult.calculation} />
                                </div>
                            </div>
                            <div className="mt-4 text-xs text-gray-500 flex items-start space-x-2">
                                <Info className="w-3 h-3 mt-0.5 text-cyan-400/50" />
                                <span><strong className="text-gray-300">Note:</strong> Assumes density of solvent is <InlineMath math="1.0 \text{ g/mL}" /> (standard for dilute aqueous solutions).</span>
                            </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Laboratory Best Practices / Extra info */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Beaker className="w-32 h-32 text-cyan-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                <FlaskConical className="w-5 h-5 mr-2 text-cyan-400" />
                Laboratory Guidance
              </h2>
              <div className="grid md:grid-cols-3 gap-8 text-sm text-gray-400 relative z-10">
                <div className="space-y-3">
                  <h3 className="text-white font-semibold">Analytical Precision</h3>
                  <p className="leading-relaxed">Always use analytical balances for mass and volumetric glassware for volume. Calibrate pH meters daily with standard buffers (pH 4, 7, and 10).</p>
                </div>
                <div className="space-y-3">
                  <h3 className="text-white font-semibold">Chemical Safety</h3>
                  <p className="leading-relaxed">Add acids to water to prevent exothermic splashing. Always consult the SDS (Safety Data Sheet) before handling new reagents.</p>
                </div>
                <div className="space-y-3">
                  <h3 className="text-white font-semibold">Unit Consistency</h3>
                  <p className="leading-relaxed">Most calculators expect standard SI units: Molarity (M), Liters (L), and Grams (g). Double-check conversions if using mL or mg.</p>
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
