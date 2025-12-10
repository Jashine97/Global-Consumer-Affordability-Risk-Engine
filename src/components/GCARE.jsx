import React, { useEffect, useMemo, useState } from 'react';
import { 
  Calculator, TrendingUp, AlertCircle, FileText, PieChart, 
  Users, DollarSign, CreditCard, Home, Shield, Save, FolderOpen, Trash2, Edit 
} from 'lucide-react';
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

// ----------------- Utility & Config -----------------

const COUNTRY_PROFILES = {
  ZA: {
    name: 'South Africa',
    currency: 'ZAR',
    dti: { lowMax: 25, mediumMax: 40 },
    expenseRatio: { lowMax: 45, mediumMax: 60 },
    unsecuredExposureRatio: { lowMax: 40, mediumMax: 60 },
  },
  GB: {
    name: 'United Kingdom',
    currency: 'GBP',
    dti: { lowMax: 30, mediumMax: 45 },
    expenseRatio: { lowMax: 50, mediumMax: 65 },
    unsecuredExposureRatio: { lowMax: 35, mediumMax: 55 },
  },
  US: {
    name: 'United States',
    currency: 'USD',
    dti: { lowMax: 30, mediumMax: 45 },
    expenseRatio: { lowMax: 50, mediumMax: 65 },
    unsecuredExposureRatio: { lowMax: 35, mediumMax: 55 },
  },
  EU: {
    name: 'European Union',
    currency: 'EUR',
    dti: { lowMax: 30, mediumMax: 45 },
    expenseRatio: { lowMax: 50, mediumMax: 65 },
    unsecuredExposureRatio: { lowMax: 35, mediumMax: 55 },
  },
  AU: {
    name: 'Australia',
    currency: 'AUD',
    dti: { lowMax: 30, mediumMax: 45 },
    expenseRatio: { lowMax: 50, mediumMax: 65 },
    unsecuredExposureRatio: { lowMax: 35, mediumMax: 55 },
  },
};

const LOCAL_STORAGE_KEY = 'gcare_assessments_v1';

// ----------------- Main Component -----------------

const GCARE = () => {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({
    name: '',
    country: 'ZA',
    currency: COUNTRY_PROFILES['ZA'].currency,
    maritalStatus: 'single',
    dependants: 0,
    creditScore: '',
  });

  const [income, setIncome] = useState({
    salary: 0,
    bonuses: 0,
    other: 0
  });

  const [expenses, setExpenses] = useState({
    housing: 0,
    utilities: 0,
    food: 0,
    transport: 0,
    insurance: 0,
    education: 0,
    healthcare: 0,
    discretionary: 0
  });

  const [debts, setDebts] = useState([]);
  const [scenario, setScenario] = useState('current');

  // Scenario configuration
  const [scenarioConfig, setScenarioConfig] = useState({
    restructureTermExtensionFactor: 1.5,
    restructureRateReductionFactor: 0.85, // 15% reduction
    restructureMinRate: 5,
    consolidationTerm: 60,
    consolidationRateDiscountFactor: 0.75,
    consolidationOriginationFee: 0,
    consolidationMonthlyAdminFee: 0,
  });

  // "Big memory" – multiple assessments stored in localStorage
  const [assessments, setAssessments] = useState([]);
  const [currentAssessmentId, setCurrentAssessmentId] = useState(null);
  const [assessmentName, setAssessmentName] = useState('');

  // Load assessments from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setAssessments(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load assessments', e);
    }
  }, []);

  const persistAssessments = (next) => {
    setAssessments(next);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.error('Failed to save assessments', e);
    }
  };

  const addDebt = () => {
    setDebts([...debts, {
      id: Date.now(),
      provider: '',
      type: 'personal',
      balance: 0,
      instalment: 0,
      rate: 0,
      status: 'current',
      term: 12
    }]);
  };

  const updateDebt = (id, field, value) => {
    setDebts(debts.map(d => d.id === id ? {...d, [field]: value} : d));
  };

  const removeDebt = (id) => {
    setDebts(debts.filter(d => d.id !== id));
  };

  // ----------------- Core calculation engine -----------------

  const calculateMetrics = () => {
    const totalIncome = income.salary + income.bonuses + income.other;
    const totalExpenses = Object.values(expenses).reduce((a, b) => a + b, 0);
    const totalDebtPayments = debts.reduce((sum, d) => sum + (Number(d.instalment) || 0), 0);

    const expenseRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;
    const debtServiceRatio = totalIncome > 0 ? (totalDebtPayments / totalIncome) * 100 : 0;
    const totalOutgoings = totalExpenses + totalDebtPayments;
    const surplus = totalIncome - totalOutgoings;

    const arrearsCount = debts.filter(d => d.status === 'arrears' || d.status === 'default').length;

    const unsecuredTypes = ['personal', 'card', 'micro', 'store'];
    const securedTypes = ['home', 'vehicle'];

    const unsecuredDebts = debts.filter(d => unsecuredTypes.includes(d.type));
    const securedDebts = debts.filter(d => securedTypes.includes(d.type));

    const unsecuredCount = unsecuredDebts.length;
    const securedCount = securedDebts.length;

    const totalBalance = debts.reduce((sum, d) => sum + (Number(d.balance) || 0), 0);
    const unsecuredExposure = unsecuredDebts.reduce((sum, d) => sum + (Number(d.balance) || 0), 0);
    const securedExposure = securedDebts.reduce((sum, d) => sum + (Number(d.balance) || 0), 0);

    const unsecuredExposureRatio = totalBalance > 0 ? (unsecuredExposure / totalBalance) * 100 : 0;

    const unsecuredRatioCount = debts.length > 0 ? (unsecuredCount / debts.length) * 100 : 0;

    const weightedAvgRate = totalBalance > 0
      ? debts.reduce((sum, d) => sum + ((Number(d.balance) || 0) * ((Number(d.rate) || 0) / 100)), 0) / totalBalance * 100
      : (debts.length > 0 ? debts.reduce((sum, d) => sum + (Number(d.rate) || 0), 0) / debts.length : 0);

    // Essential vs discretionary expenses
    const essentialKeys = ['housing', 'utilities', 'food', 'transport', 'insurance', 'education', 'healthcare'];
    const discretionaryKeys = ['discretionary'];

    const essentialExpenses = essentialKeys.reduce((sum, key) => sum + (Number(expenses[key]) || 0), 0);
    const discretionaryExpenses = discretionaryKeys.reduce((sum, key) => sum + (Number(expenses[key]) || 0), 0);

    const essentialExpenseRatio = totalIncome > 0 ? (essentialExpenses / totalIncome) * 100 : 0;
    const discretionaryExpenseRatio = totalIncome > 0 ? (discretionaryExpenses / totalIncome) * 100 : 0;

    // Risk thresholds from country profile
    const countryProfile = COUNTRY_PROFILES[profile.country] || COUNTRY_PROFILES['ZA'];

    const getRiskLevel = () => {
      let riskScore = 0;

      if (debtServiceRatio > countryProfile.dti.mediumMax) riskScore += 3;
      else if (debtServiceRatio > countryProfile.dti.lowMax) riskScore += 2;
      else if (debtServiceRatio > 0) riskScore += 1;

      if (expenseRatio > countryProfile.expenseRatio.mediumMax) riskScore += 2;
      else if (expenseRatio > countryProfile.expenseRatio.lowMax) riskScore += 1;

      if (arrearsCount > 2) riskScore += 3;
      else if (arrearsCount > 0) riskScore += 2;

      if (unsecuredExposureRatio > countryProfile.unsecuredExposureRatio.mediumMax) riskScore += 2;
      else if (unsecuredExposureRatio > countryProfile.unsecuredExposureRatio.lowMax) riskScore += 1;

      if (debts.length > 8) riskScore += 2;
      else if (debts.length > 5) riskScore += 1;

      // Optional: simple credit score impact
      if (profile.creditScore) {
        const cs = Number(profile.creditScore);
        if (!isNaN(cs)) {
          if (cs < 550) riskScore += 2;
          else if (cs < 650) riskScore += 1;
          else if (cs > 750) riskScore -= 1;
        }
      }

      if (riskScore >= 7) return 'HIGH';
      if (riskScore >= 4) return 'MEDIUM';
      return 'LOW';
    };

    // Stress testing: income -20%, rates +2%
    const stressedIncome = totalIncome * 0.8;
    const stressedDebtPayments = debts.reduce((sum, d) => {
      const balance = Number(d.balance) || 0;
      const term = Number(d.term) || 12;
      const rate = ((Number(d.rate) || 0) + 2) / 100 / 12;
      if (rate === 0 || term <= 0) {
        return sum + (Number(d.instalment) || 0);
      }
      const pmt = balance * (rate * Math.pow(1 + rate, term)) / (Math.pow(1 + rate, term) - 1);
      return sum + pmt;
    }, 0);

    const stressedExpenseRatio = stressedIncome > 0 ? (totalExpenses / stressedIncome) * 100 : 0;
    const stressedDebtServiceRatio = stressedIncome > 0 ? (stressedDebtPayments / stressedIncome) * 100 : 0;
    const stressedSurplus = stressedIncome - totalExpenses - stressedDebtPayments;

    return {
      totalIncome,
      totalExpenses,
      totalDebtPayments,
      expenseRatio,
      debtServiceRatio,
      totalOutgoings,
      surplus,
      arrearsCount,
      unsecuredRatioCount,
      unsecuredExposureRatio,
      unsecuredCount,
      securedCount,
      totalBalance,
      unsecuredExposure,
      securedExposure,
      weightedAvgRate,
      essentialExpenses,
      discretionaryExpenses,
      essentialExpenseRatio,
      discretionaryExpenseRatio,
      riskLevel: getRiskLevel(),
      accountCount: debts.length,
      stressed: {
        income: stressedIncome,
        debtPayments: stressedDebtPayments,
        expenseRatio: stressedExpenseRatio,
        debtServiceRatio: stressedDebtServiceRatio,
        surplus: stressedSurplus,
      }
    };
  };

  const metrics = useMemo(() => calculateMetrics(), [income, expenses, debts, profile.country, profile.creditScore, scenarioConfig]);

  // ----------------- Scenario simulation -----------------

  const simulateRestructuring = () => {
    const factor = scenarioConfig.restructureTermExtensionFactor;
    const rateFactor = scenarioConfig.restructureRateReductionFactor;
    const minRate = scenarioConfig.restructureMinRate;

    const restructuredDebts = debts.map(d => {
      const balance = Number(d.balance) || 0;
      const originalTerm = Number(d.term) || 12;
      const newTerm = Math.round(originalTerm * factor);
      const originalRate = Number(d.rate) || 0;
      const newRatePercent = Math.max(originalRate * rateFactor, minRate);
      const monthlyRate = newRatePercent / 100 / 12;

      let newInstalment;
      if (monthlyRate === 0 || newTerm <= 0) {
        newInstalment = balance / (newTerm || 1);
      } else {
        newInstalment = balance * (monthlyRate * Math.pow(1 + monthlyRate, newTerm)) / (Math.pow(1 + monthlyRate, newTerm) - 1);
      }

      const totalPaid = newInstalment * newTerm;
      const totalInterest = totalPaid - balance;

      return {
        ...d,
        newTerm,
        newRatePercent,
        newInstalment,
        totalPaid,
        totalInterest,
      };
    });

    const newMonthlyTotal = restructuredDebts.reduce((sum, d) => sum + d.newInstalment, 0);
    const newSurplus = metrics.totalIncome - metrics.totalExpenses - newMonthlyTotal;

    const totalInterestRestructured = restructuredDebts.reduce((sum, d) => sum + d.totalInterest, 0);

    // Approximate current total interest using current term and rate
    const currentTotalInterest = debts.reduce((sum, d) => {
      const balance = Number(d.balance) || 0;
      const term = Number(d.term) || 12;
      const ratePercent = Number(d.rate) || 0;
      const monthlyRate = ratePercent / 100 / 12;
      if (monthlyRate === 0 || term <= 0) return sum;
      const instalment = balance * (monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);
      const totalPaid = instalment * term;
      const interest = totalPaid - balance;
      return sum + interest;
    }, 0);

    return {
      monthlyPayment: newMonthlyTotal,
      surplus: newSurplus,
      savingsPerMonth: metrics.totalDebtPayments - newMonthlyTotal,
      totalInterestRestructured,
      currentTotalInterest,
      interestSavingsTotal: currentTotalInterest - totalInterestRestructured,
    };
  };

  const simulateConsolidation = () => {
    const totalBalance = debts.reduce((sum, d) => sum + (Number(d.balance) || 0), 0);
    const avgRate = metrics.weightedAvgRate || 10;
    const consolidationRate = avgRate * scenarioConfig.consolidationRateDiscountFactor;
    const term = scenarioConfig.consolidationTerm;

    const monthlyRate = consolidationRate / 100 / 12;
    let monthlyPayment = 0;
    if (monthlyRate === 0 || term <= 0) {
      monthlyPayment = totalBalance / (term || 1);
    } else {
      monthlyPayment = totalBalance * (monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);
    }

    const monthlyPaymentWithFees = monthlyPayment + scenarioConfig.consolidationMonthlyAdminFee;
    const newSurplus = metrics.totalIncome - metrics.totalExpenses - monthlyPaymentWithFees;
    const totalPaid = monthlyPaymentWithFees * term + scenarioConfig.consolidationOriginationFee;
    const totalInterestAndFees = totalPaid - totalBalance;

    const currentTotalInterest = debts.reduce((sum, d) => {
      const balance = Number(d.balance) || 0;
      const term = Number(d.term) || 12;
      const ratePercent = Number(d.rate) || 0;
      const r = ratePercent / 100 / 12;
      if (r === 0 || term <= 0) return sum;
      const pmt = balance * (r * Math.pow(1 + r, term)) / (Math.pow(1 + r, term) - 1);
      const totalP = pmt * term;
      return sum + (totalP - balance);
    }, 0);

    return {
      totalBalance,
      monthlyPayment,
      monthlyPaymentWithFees,
      surplus: newSurplus,
      savingsPerMonth: metrics.totalDebtPayments - monthlyPaymentWithFees,
      rate: consolidationRate,
      term,
      totalInterestAndFees,
      currentTotalInterest,
      interestSavingsTotal: currentTotalInterest - totalInterestAndFees,
    };
  };

  const generateRecommendations = () => {
    const recs = [];

    if (metrics.debtServiceRatio > 40) {
      recs.push({
        type: 'warning',
        text: 'Your debt-to-income ratio exceeds common international prudential thresholds (around 40%). Consider restructuring or consolidation to reduce monthly obligations.',
      });
    }

    if (metrics.expenseRatio > 50) {
      recs.push({
        type: 'info',
        text: 'Essential expenses consume over 50% of income. Review discretionary categories to create additional resilience and room for savings.',
      });
    }

    if (metrics.unsecuredExposureRatio > 60) {
      recs.push({
        type: 'warning',
        text: 'A high proportion of your total debt exposure is unsecured credit. This is usually more expensive and riskier than secured lending.',
      });
    }

    if (metrics.arrearsCount > 0) {
      recs.push({
        type: 'alert',
        text: `${metrics.arrearsCount} account(s) are in arrears or default. Engage with credit providers early to agree realistic repayment arrangements and avoid further deterioration.`,
      });
    }

    if (metrics.surplus > 0 && metrics.riskLevel === 'LOW') {
      recs.push({
        type: 'success',
        text: 'Your current profile shows a healthy surplus and low risk. Prioritise building emergency reserves equal to 3–6 months of essential expenses and avoid unnecessary new credit.',
      });
    }

    if (debts.length > 6) {
      recs.push({
        type: 'info',
        text: 'You hold multiple credit facilities. Consolidating or closing unused limits may simplify administration and reduce the risk of missed payments.',
      });
    }

    if (metrics.stressed.surplus < 0) {
      recs.push({
        type: 'warning',
        text: 'Under a moderate stress test (income -20% and interest rates +2%), your position turns negative. This indicates vulnerability to economic shocks.',
      });
    }

    return recs;
  };

  // ----------------- Assessment persistence (save/load/delete) -----------------

  const resetCurrent = () => {
    setProfile({
      name: '',
      country: 'ZA',
      currency: COUNTRY_PROFILES['ZA'].currency,
      maritalStatus: 'single',
      dependants: 0,
      creditScore: '',
    });
    setIncome({ salary: 0, bonuses: 0, other: 0 });
    setExpenses({
      housing: 0,
      utilities: 0,
      food: 0,
      transport: 0,
      insurance: 0,
      education: 0,
      healthcare: 0,
      discretionary: 0,
    });
    setDebts([]);
    setScenario('current');
    setScenarioConfig({
      restructureTermExtensionFactor: 1.5,
      restructureRateReductionFactor: 0.85,
      restructureMinRate: 5,
      consolidationTerm: 60,
      consolidationRateDiscountFactor: 0.75,
      consolidationOriginationFee: 0,
      consolidationMonthlyAdminFee: 0,
    });
    setCurrentAssessmentId(null);
    setAssessmentName('');
  };

  const saveAssessment = () => {
    const now = new Date().toISOString();
    const payload = {
      id: currentAssessmentId || Date.now().toString(),
      name: assessmentName || profile.name || `Assessment ${new Date().toLocaleString()}`,
      profile,
      income,
      expenses,
      debts,
      scenarioConfig,
      createdAt: currentAssessmentId 
        ? (assessments.find(a => a.id === currentAssessmentId)?.createdAt || now) 
        : now,
      updatedAt: now,
    };

    let next;
    if (currentAssessmentId) {
      next = assessments.map(a => (a.id === currentAssessmentId ? payload : a));
    } else {
      next = [...assessments, payload];
      setCurrentAssessmentId(payload.id);
    }
    setAssessmentName(payload.name);
    persistAssessments(next);
  };

  const loadAssessment = (id) => {
    const found = assessments.find(a => a.id === id);
    if (!found) return;
    setProfile(found.profile);
    setIncome(found.income);
    setExpenses(found.expenses);
    setDebts(found.debts);
    setScenarioConfig(found.scenarioConfig || scenarioConfig);
    setCurrentAssessmentId(found.id);
    setAssessmentName(found.name);
    setStep(1);
  };

  const deleteAssessment = (id) => {
    const next = assessments.filter(a => a.id !== id);
    persistAssessments(next);
    if (currentAssessmentId === id) {
      resetCurrent();
    }
  };

  // ----------------- Derived chart data -----------------

  const expenseChartData = useMemo(() => {
    const entries = [
      { key: 'housing', label: 'Housing' },
      { key: 'utilities', label: 'Utilities' },
      { key: 'food', label: 'Food' },
      { key: 'transport', label: 'Transport' },
      { key: 'insurance', label: 'Insurance' },
      { key: 'education', label: 'Education' },
      { key: 'healthcare', label: 'Healthcare' },
      { key: 'discretionary', label: 'Discretionary' },
    ];
    return entries
      .map(e => ({ name: e.label, value: Number(expenses[e.key]) || 0 }))
      .filter(e => e.value > 0);
  }, [expenses]);

  const scenarioComparisonData = useMemo(() => {
    const base = {
      name: 'Current',
      payment: metrics.totalDebtPayments,
      surplus: metrics.surplus,
    };

    let restructure = null;
    let consolidate = null;
    if (debts.length > 0) {
      const r = simulateRestructuring();
      const c = simulateConsolidation();
      restructure = {
        name: 'Restructure',
        payment: r.monthlyPayment,
        surplus: r.surplus,
      };
      consolidate = {
        name: 'Consolidate',
        payment: c.monthlyPaymentWithFees,
        surplus: c.surplus,
      };
    }

    return [base, restructure, consolidate].filter(Boolean);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics.totalDebtPayments, metrics.surplus, debts, scenarioConfig, income, expenses]);

  const COLORS = ['#FF6B35', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#EC4899', '#14B8A6', '#A855F7'];

  // ----------------- UI -----------------

  const recommendations = generateRecommendations();

  return (
    <div style={{ 
      fontFamily: "'Space Grotesk', 'Inter', sans-serif",
      background: 'linear-gradient(135deg, #FFF5E6 0%, #FFE5CC 50%, #FFD9B3 100%)',
      minHeight: '100vh',
      padding: '20px'
    }}>
      {/* Header with Assessment controls */}
      <div style={{
        background: 'linear-gradient(135deg, #FF8C42 0%, #FF6B35 100%)',
        padding: '30px',
        borderRadius: '20px',
        marginBottom: '20px',
        boxShadow: '0 10px 40px rgba(255, 107, 53, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)',
          borderRadius: '50%',
          transform: 'translate(30%, -30%)'
        }}/>

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
              <Shield size={40} color="white" />
              <h1 style={{ 
                margin: 0, 
                color: 'white',
                fontSize: '2.5em',
                fontWeight: '800',
                letterSpacing: '-1px'
              }}>
                G-CARE
              </h1>
            </div>
            <p style={{ 
              margin: '10px 0 5px 0', 
              color: 'rgba(255,255,255,0.95)',
              fontSize: '1.1em',
              fontWeight: '500'
            }}>
              Global Consumer Affordability & Risk Engine
            </p>
            <p style={{ 
              margin: 0, 
              color: 'rgba(255,255,255,0.8)',
              fontSize: '0.85em',
              fontStyle: 'italic'
            }}>
              Created by Josue Nganmoue | International Standards Inspired
            </p>
          </div>

          {/* Assessment memory controls */}
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '15px 20px',
            minWidth: '260px',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderOpen size={18} />
              <span style={{ fontWeight: 600, fontSize: '0.9em' }}>
                Assessment Memory
              </span>
            </div>
            <input
              type="text"
              placeholder="Assessment name"
              value={assessmentName}
              onChange={(e) => setAssessmentName(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.85em',
                outline: 'none'
              }}
            />
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={saveAssessment}
                style={{
                  flex: 1,
                  minWidth: '90px',
                  padding: '8px 10px',
                  background: 'white',
                  color: '#FF6B35',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.8em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Save size={14} />
                Save
              </button>
              <button
                onClick={resetCurrent}
                style={{
                  flex: 1,
                  minWidth: '90px',
                  padding: '8px 10px',
                  background: 'transparent',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.6)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.8em'
                }}
              >
                New
              </button>
            </div>
            {assessments.length > 0 && (
              <div style={{ maxHeight: '120px', overflowY: 'auto', marginTop: '5px' }}>
                {assessments.map(a => (
                  <div
                    key={a.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '6px',
                      padding: '4px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.12)'
                    }}
                  >
                    <button
                      onClick={() => loadAssessment(a.id)}
                      style={{
                        flex: 1,
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        color: 'white',
                        fontSize: '0.8em',
                        cursor: 'pointer',
                        padding: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {a.name}
                    </button>
                    <button
                      onClick={() => deleteAssessment(a.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#FCA5A5',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '30px',
        gap: '10px',
        flexWrap: 'wrap'
      }}>
        {[
          { num: 1, icon: Users, label: 'Profile' },
          { num: 2, icon: DollarSign, label: 'Income' },
          { num: 3, icon: Home, label: 'Expenses' },
          { num: 4, icon: CreditCard, label: 'Debts' },
          { num: 5, icon: TrendingUp, label: 'Analysis' }
        ].map(({ num, icon: Icon, label }) => (
          <button
            key={num}
            onClick={() => setStep(num)}
            style={{
              flex: 1,
              minWidth: '120px',
              padding: '15px',
              background: step === num ? 'linear-gradient(135deg, #FF8C42 0%, #FF6B35 100%)' : 'white',
              color: step === num ? 'white' : '#FF6B35',
              border: step === num ? 'none' : '2px solid #FFD9B3',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '600',
              fontSize: '0.9em',
              transition: 'all 0.3s ease',
              boxShadow: step === num ? '0 5px 20px rgba(255, 107, 53, 0.4)' : '0 2px 8px rgba(0,0,0,0.05)'
            }}
          >
            <Icon size={24} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
        marginBottom: '20px'
      }}>
        {/* Step 1: Profile */}
        {step === 1 && (
          <div>
            <h2 style={{ color: '#FF6B35', marginBottom: '25px', fontSize: '1.8em', fontWeight: '700' }}>
              Client Profile
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '600' }}>
                  Client Name
                </label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({...profile, name: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #FFD9B3',
                    borderRadius: '8px',
                    fontSize: '1em',
                    outline: 'none',
                    transition: 'border 0.3s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#FF8C42'}
                  onBlur={(e) => e.target.style.borderColor = '#FFD9B3'}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '600' }}>
                  Country
                </label>
                <select
                  value={profile.country}
                  onChange={(e) => {
                    const country = e.target.value;
                    const cfg = COUNTRY_PROFILES[country] || COUNTRY_PROFILES['ZA'];
                    setProfile({...profile, country, currency: cfg.currency});
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #FFD9B3',
                    borderRadius: '8px',
                    fontSize: '1em',
                    outline: 'none'
                  }}
                >
                  <option value="ZA">South Africa (ZAR)</option>
                  <option value="GB">United Kingdom (GBP)</option>
                  <option value="US">United States (USD)</option>
                  <option value="EU">European Union (EUR)</option>
                  <option value="AU">Australia (AUD)</option>
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '600' }}>
                  Marital Status
                </label>
                <select
                  value={profile.maritalStatus}
                  onChange={(e) => setProfile({...profile, maritalStatus: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #FFD9B3',
                    borderRadius: '8px',
                    fontSize: '1em',
                    outline: 'none'
                  }}
                >
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="divorced">Divorced</option>
                  <option value="widowed">Widowed</option>
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '600' }}>
                  Dependants
                </label>
                <input
                  type="number"
                  value={profile.dependants}
                  onChange={(e) => setProfile({...profile, dependants: parseInt(e.target.value) || 0})}
                  min="0"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #FFD9B3',
                    borderRadius: '8px',
                    fontSize: '1em',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '600' }}>
                  Credit Score (optional)
                </label>
                <input
                  type="number"
                  value={profile.creditScore}
                  onChange={(e) => setProfile({...profile, creditScore: e.target.value})}
                  min="0"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #FFD9B3',
                    borderRadius: '8px',
                    fontSize: '1em',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Income */}
        {step === 2 && (
          <div>
            <h2 style={{ color: '#FF6B35', marginBottom: '25px', fontSize: '1.8em', fontWeight: '700' }}>
              Income Streams
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '600' }}>
                  Monthly Salary
                </label>
                <input
                  type="number"
                  value={income.salary}
                  onChange={(e) => setIncome({...income, salary: parseFloat(e.target.value) || 0})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #FFD9B3',
                    borderRadius: '8px',
                    fontSize: '1em',
                    outline: 'none'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '600' }}>
                  Monthly Bonuses / Commission
                </label>
                <input
                  type="number"
                  value={income.bonuses}
                  onChange={(e) => setIncome({...income, bonuses: parseFloat(e.target.value) || 0})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #FFD9B3',
                    borderRadius: '8px',
                    fontSize: '1em',
                    outline: 'none'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '600' }}>
                  Other Income (Rental, Investment, etc.)
                </label>
                <input
                  type="number"
                  value={income.other}
                  onChange={(e) => setIncome({...income, other: parseFloat(e.target.value) || 0})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #FFD9B3',
                    borderRadius: '8px',
                    fontSize: '1em',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
            
            <div style={{
              marginTop: '30px',
              padding: '20px',
              background: 'linear-gradient(135deg, #FFF5E6 0%, #FFE5CC 100%)',
              borderRadius: '12px',
              borderLeft: '4px solid #FF8C42'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#FF6B35', fontSize: '1.3em' }}>
                Total Monthly Income
              </h3>
              <p style={{ margin: 0, fontSize: '2em', fontWeight: '700', color: '#FF6B35' }}>
                {profile.currency} {metrics.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Expenses */}
        {step === 3 && (
          <div>
            <h2 style={{ color: '#FF6B35', marginBottom: '25px', fontSize: '1.8em', fontWeight: '700' }}>
              Monthly Living Expenses
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              {Object.entries({
                housing: 'Housing / Rent',
                utilities: 'Utilities (Water, Electric, Gas)',
                food: 'Groceries & Food',
                transport: 'Transport / Fuel',
                insurance: 'Insurance Premiums',
                education: 'Education / Childcare',
                healthcare: 'Healthcare / Medical',
                discretionary: 'Discretionary (Entertainment, etc.)'
              }).map(([key, label]) => (
                <div key={key}>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: '600' }}>
                    {label}
                  </label>
                  <input
                    type="number"
                    value={expenses[key]}
                    onChange={(e) => setExpenses({...expenses, [key]: parseFloat(e.target.value) || 0})}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #FFD9B3',
                      borderRadius: '8px',
                      fontSize: '1em',
                      outline: 'none'
                    }}
                  />
                </div>
              ))}
            </div>
            
            <div style={{
              marginTop: '30px',
              padding: '20px',
              background: 'linear-gradient(135deg, #FFF5E6 0%, #FFE5CC 100%)',
              borderRadius: '12px',
              borderLeft: '4px solid #FF8C42'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#FF6B35', fontSize: '1.3em' }}>
                Total Monthly Expenses
              </h3>
              <p style={{ margin: 0, fontSize: '2em', fontWeight: '700', color: '#FF6B35' }}>
                {profile.currency} {metrics.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p style={{ margin: '10px 0 0 0', color: '#666', fontWeight: '600' }}>
                Expense Ratio: {metrics.expenseRatio.toFixed(1)}% of income
              </p>
              <p style={{ margin: '4px 0 0 0', color: '#666', fontWeight: '500', fontSize: '0.9em' }}>
                Essential: {metrics.essentialExpenseRatio.toFixed(1)}% | Discretionary: {metrics.discretionaryExpenseRatio.toFixed(1)}%
              </p>
            </div>

            {expenseChartData.length > 0 && (
              <div style={{ marginTop: '30px', height: '260px' }}>
                <h3 style={{ color: '#FF6B35', marginBottom: '10px', fontSize: '1.2em', fontWeight: '700' }}>
                  Expense Breakdown
                </h3>
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={expenseChartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {expenseChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} />
                      ))}
                    </Pie>
                    <ReTooltip />
                    <Legend />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Debts */}
        {step === 4 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h2 style={{ color: '#FF6B35', margin: 0, fontSize: '1.8em', fontWeight: '700' }}>
                Credit Obligations
              </h2>
              <button
                onClick={addDebt}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #FF8C42 0%, #FF6B35 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1em',
                  boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)'
                }}
              >
                + Add Debt
              </button>
            </div>
            
            {debts.length === 0 ? (
              <div style={{
                padding: '60px 20px',
                textAlign: 'center',
                background: '#FFF5E6',
                borderRadius: '12px',
                border: '2px dashed #FFD9B3'
              }}>
                <CreditCard size={48} color="#FF8C42" style={{ marginBottom: '15px' }} />
                <p style={{ color: '#666', fontSize: '1.1em' }}>No credit obligations added yet</p>
                <p style={{ color: '#999', fontSize: '0.9em' }}>Click "Add Debt" to begin</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {debts.map((debt) => (
                  <div
                    key={debt.id}
                    style={{
                      padding: '20px',
                      border: '2px solid #FFD9B3',
                      borderRadius: '12px',
                      background: 'white'
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '600', fontSize: '0.9em' }}>
                          Provider
                        </label>
                        <input
                          type="text"
                          value={debt.provider}
                          onChange={(e) => updateDebt(debt.id, 'provider', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #FFD9B3',
                            borderRadius: '6px',
                            fontSize: '0.95em',
                            outline: 'none'
                          }}
                        />
                      </div>
                      
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '600', fontSize: '0.9em' }}>
                          Type
                        </label>
                        <select
                          value={debt.type}
                          onChange={(e) => updateDebt(debt.id, 'type', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #FFD9B3',
                            borderRadius: '6px',
                            fontSize: '0.95em',
                            outline: 'none'
                          }}
                        >
                          <option value="home">Home Loan</option>
                          <option value="vehicle">Vehicle Finance</option>
                          <option value="personal">Personal Loan</option>
                          <option value="card">Credit Card</option>
                          <option value="micro">Micro Loan</option>
                          <option value="store">Store Credit</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '600', fontSize: '0.9em' }}>
                          Outstanding Balance
                        </label>
                        <input
                          type="number"
                          value={debt.balance}
                          onChange={(e) => updateDebt(debt.id, 'balance', parseFloat(e.target.value) || 0)}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #FFD9B3',
                            borderRadius: '6px',
                            fontSize: '0.95em',
                            outline: 'none'
                          }}
                        />
                      </div>
                      
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '600', fontSize: '0.9em' }}>
                          Monthly Instalment
                        </label>
                        <input
                          type="number"
                          value={debt.instalment}
                          onChange={(e) => updateDebt(debt.id, 'instalment', parseFloat(e.target.value) || 0)}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #FFD9B3',
                            borderRadius: '6px',
                            fontSize: '0.95em',
                            outline: 'none'
                          }}
                        />
                      </div>
                      
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '600', fontSize: '0.9em' }}>
                          Interest Rate (%)
                        </label>
                        <input
                          type="number"
                          value={debt.rate}
                          onChange={(e) => updateDebt(debt.id, 'rate', parseFloat(e.target.value) || 0)}
                          step="0.1"
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #FFD9B3',
                            borderRadius: '6px',
                            fontSize: '0.95em',
                            outline: 'none'
                          }}
                        />
                      </div>
                      
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '600', fontSize: '0.9em' }}>
                          Term (months)
                        </label>
                        <input
                          type="number"
                          value={debt.term}
                          onChange={(e) => updateDebt(debt.id, 'term', parseInt(e.target.value) || 0)}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #FFD9B3',
                            borderRadius: '6px',
                            fontSize: '0.95em',
                            outline: 'none'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '600', fontSize: '0.9em' }}>
                          Status
                        </label>
                        <select
                          value={debt.status}
                          onChange={(e) => updateDebt(debt.id, 'status', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #FFD9B3',
                            borderRadius: '6px',
                            fontSize: '0.95em',
                            outline: 'none'
                          }}
                        >
                          <option value="current">Current</option>
                          <option value="arrears">In Arrears</option>
                          <option value="default">Default</option>
                          <option value="legal">Legal Action</option>
                          <option value="written-off">Written Off</option>
                        </select>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => removeDebt(debt.id)}
                      style={{
                        marginTop: '15px',
                        padding: '8px 16px',
                        background: 'transparent',
                        color: '#FF6B35',
                        border: '1px solid #FF6B35',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.9em'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div style={{
              marginTop: '30px',
              padding: '20px',
              background: 'linear-gradient(135deg, #FFF5E6 0%, #FFE5CC 100%)',
              borderRadius: '12px',
              borderLeft: '4px solid #FF8C42'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#FF6B35', fontSize: '1.3em' }}>
                Debt Overview
              </h3>
              <p style={{ margin: 0, fontSize: '1em', fontWeight: '600', color: '#4B5563' }}>
                Total Monthly Repayments: <span style={{ color: '#FF6B35' }}>{profile.currency} {metrics.totalDebtPayments.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </p>
              <p style={{ margin: '4px 0 0 0', color: '#4B5563', fontWeight: '600', fontSize: '0.95em' }}>
                Debt Service Ratio: {metrics.debtServiceRatio.toFixed(1)}% of income
              </p>
              <p style={{ margin: '4px 0 0 0', color: '#4B5563', fontWeight: '500', fontSize: '0.9em' }}>
                Total Outstanding Balance: {profile.currency} {metrics.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p style={{ margin: '4px 0 0 0', color: '#4B5563', fontWeight: '500', fontSize: '0.9em' }}>
                Secured vs Unsecured (by exposure): {profile.currency} {metrics.securedExposure.toLocaleString('en-US', { minimumFractionDigits: 0 })} secured | {profile.currency} {metrics.unsecuredExposure.toLocaleString('en-US', { minimumFractionDigits: 0 })} unsecured
              </p>
            </div>
          </div>
        )}

        {/* Step 5: Analysis */}
        {step === 5 && (
          <div>
            <h2 style={{ color: '#FF6B35', marginBottom: '25px', fontSize: '1.8em', fontWeight: '700' }}>
              Financial Analysis & Risk Assessment
            </h2>
            
            {/* Key Metrics Dashboard */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div style={{
                padding: '20px',
                background: 'white',
                border: '2px solid #FFD9B3',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <DollarSign size={32} color="#FF8C42" style={{ marginBottom: '10px' }} />
                <h3 style={{ margin: '0 0 5px 0', color: '#666', fontSize: '0.9em', fontWeight: '600' }}>Monthly Surplus/Deficit</h3>
                <p style={{ 
                  margin: 0, 
                  fontSize: '1.8em', 
                  fontWeight: '700', 
                  color: metrics.surplus >= 0 ? '#10B981' : '#EF4444' 
                }}>
                  {profile.currency} {metrics.surplus.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              
              <div style={{
                padding: '20px',
                background: 'white',
                border: '2px solid #FFD9B3',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <TrendingUp size={32} color="#FF8C42" style={{ marginBottom: '10px' }} />
                <h3 style={{ margin: '0 0 5px 0', color: '#666', fontSize: '0.9em', fontWeight: '600' }}>Debt-to-Income Ratio</h3>
                <p style={{ 
                  margin: 0, 
                  fontSize: '1.8em', 
                  fontWeight: '700', 
                  color: metrics.debtServiceRatio > 40 ? '#EF4444' : metrics.debtServiceRatio > 25 ? '#F59E0B' : '#10B981'
                }}>
                  {metrics.debtServiceRatio.toFixed(1)}%
                </p>
              </div>
              
              <div style={{
                padding: '20px',
                background: 'white',
                border: '2px solid #FFD9B3',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <Shield size={32} color="#FF8C42" style={{ marginBottom: '10px' }} />
                <h3 style={{ margin: '0 0 5px 0', color: '#666', fontSize: '0.9em', fontWeight: '600' }}>Risk Level</h3>
                <p style={{ 
                  margin: 0, 
                  fontSize: '1.8em', 
                  fontWeight: '700',
                  color: metrics.riskLevel === 'HIGH' ? '#EF4444' : metrics.riskLevel === 'MEDIUM' ? '#F59E0B' : '#10B981'
                }}>
                  {metrics.riskLevel}
                </p>
              </div>
              
              <div style={{
                padding: '20px',
                background: 'white',
                border: '2px solid #FFD9B3',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <AlertCircle size={32} color="#FF8C42" style={{ marginBottom: '10px' }} />
                <h3 style={{ margin: '0 0 5px 0', color: '#666', fontSize: '0.9em', fontWeight: '600' }}>Accounts in Arrears</h3>
                <p style={{ 
                  margin: 0, 
                  fontSize: '1.8em', 
                  fontWeight: '700',
                  color: metrics.arrearsCount > 0 ? '#EF4444' : '#10B981'
                }}>
                  {metrics.arrearsCount}
                </p>
              </div>
            </div>

            {/* Stress Test Summary */}
            <div style={{
              marginBottom: '30px',
              padding: '20px',
              background: '#EFF6FF',
              borderRadius: '12px',
              borderLeft: '4px solid #3B82F6'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#1D4ED8', fontSize: '1.2em', fontWeight: '700' }}>
                Stress Test (Income -20% & Rates +2%)
              </h3>
              <p style={{ margin: '0 0 8px 0', color: '#1F2937', fontSize: '0.95em' }}>
                Stressed Debt-to-Income: <strong>{metrics.stressed.debtServiceRatio.toFixed(1)}%</strong>
              </p>
              <p style={{ margin: '0 0 8px 0', color: '#1F2937', fontSize: '0.95em' }}>
                Stressed Surplus/Deficit: <strong style={{ color: metrics.stressed.surplus >= 0 ? '#10B981' : '#EF4444' }}>
                  {profile.currency} {metrics.stressed.surplus.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </p>
              <p style={{ margin: 0, color: '#4B5563', fontSize: '0.85em', fontStyle: 'italic' }}>
                This scenario illustrates how sensitive the profile may be to income shocks and interest rate changes.
              </p>
            </div>
            
            {/* Recommendations */}
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ color: '#FF6B35', marginBottom: '15px', fontSize: '1.5em', fontWeight: '700' }}>
                Recommendations
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '15px 20px',
                      background: rec.type === 'alert' ? '#FEE2E2' : rec.type === 'warning' ? '#FEF3C7' : rec.type === 'success' ? '#D1FAE5' : '#DBEAFE',
                      border: `2px solid ${rec.type === 'alert' ? '#EF4444' : rec.type === 'warning' ? '#F59E0B' : rec.type === 'success' ? '#10B981' : '#3B82F6'}`,
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px'
                    }}
                  >
                    <AlertCircle 
                      size={24} 
                      color={rec.type === 'alert' ? '#EF4444' : rec.type === 'warning' ? '#F59E0B' : rec.type === 'success' ? '#10B981' : '#3B82F6'}
                      style={{ flexShrink: 0, marginTop: '2px' }}
                    />
                    <p style={{ margin: 0, color: '#1F2937', fontSize: '0.95em', lineHeight: '1.5' }}>
                      {rec.text}
                    </p>
                  </div>
                ))}
                {recommendations.length === 0 && (
                  <p style={{ margin: 0, color: '#6B7280', fontSize: '0.9em' }}>
                    Complete income, expenses and debt details to generate tailored recommendations.
                  </p>
                )}
              </div>
            </div>
            
            {/* Scenario Config & Comparison */}
            <div>
              <h3 style={{ color: '#FF6B35', marginBottom: '15px', fontSize: '1.5em', fontWeight: '700' }}>
                Scenario Analysis
              </h3>

              {/* Scenario configuration */}
              <div style={{
                marginBottom: '20px',
                padding: '15px 20px',
                background: '#FFF7ED',
                borderRadius: '12px',
                border: '1px solid #FED7AA'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#9A3412', fontSize: '1em', fontWeight: '700' }}>
                  Scenario Parameters
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8em', fontWeight: 600, color: '#7C2D12', marginBottom: '4px' }}>
                      Restructure: Term Extension Factor
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={scenarioConfig.restructureTermExtensionFactor}
                      onChange={(e) => setScenarioConfig({
                        ...scenarioConfig,
                        restructureTermExtensionFactor: parseFloat(e.target.value) || 1.5,
                      })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #FED7AA', fontSize: '0.85em' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8em', fontWeight: 600, color: '#7C2D12', marginBottom: '4px' }}>
                      Restructure: Rate Reduction Factor
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      value={scenarioConfig.restructureRateReductionFactor}
                      onChange={(e) => setScenarioConfig({
                        ...scenarioConfig,
                        restructureRateReductionFactor: parseFloat(e.target.value) || 0.85,
                      })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #FED7AA', fontSize: '0.85em' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8em', fontWeight: 600, color: '#7C2D12', marginBottom: '4px' }}>
                      Restructure: Minimum Rate (%)
                    </label>
                    <input
                      type="number"
                      value={scenarioConfig.restructureMinRate}
                      onChange={(e) => setScenarioConfig({
                        ...scenarioConfig,
                        restructureMinRate: parseFloat(e.target.value) || 5,
                      })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #FED7AA', fontSize: '0.85em' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8em', fontWeight: 600, color: '#7C2D12', marginBottom: '4px' }}>
                      Consolidation: Term (months)
                    </label>
                    <input
                      type="number"
                      value={scenarioConfig.consolidationTerm}
                      onChange={(e) => setScenarioConfig({
                        ...scenarioConfig,
                        consolidationTerm: parseInt(e.target.value) || 60,
                      })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #FED7AA', fontSize: '0.85em' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8em', fontWeight: 600, color: '#7C2D12', marginBottom: '4px' }}>
                      Consolidation: Rate Discount Factor
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      value={scenarioConfig.consolidationRateDiscountFactor}
                      onChange={(e) => setScenarioConfig({
                        ...scenarioConfig,
                        consolidationRateDiscountFactor: parseFloat(e.target.value) || 0.75,
                      })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #FED7AA', fontSize: '0.85em' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8em', fontWeight: 600, color: '#7C2D12', marginBottom: '4px' }}>
                      Consolidation: Origination Fee
                    </label>
                    <input
                      type="number"
                      value={scenarioConfig.consolidationOriginationFee}
                      onChange={(e) => setScenarioConfig({
                        ...scenarioConfig,
                        consolidationOriginationFee: parseFloat(e.target.value) || 0,
                      })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #FED7AA', fontSize: '0.85em' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8em', fontWeight: 600, color: '#7C2D12', marginBottom: '4px' }}>
                      Consolidation: Monthly Admin Fee
                    </label>
                    <input
                      type="number"
                      value={scenarioConfig.consolidationMonthlyAdminFee}
                      onChange={(e) => setScenarioConfig({
                        ...scenarioConfig,
                        consolidationMonthlyAdminFee: parseFloat(e.target.value) || 0,
                      })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #FED7AA', fontSize: '0.85em' }}
                    />
                  </div>
                </div>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  {['current', 'restructure', 'consolidate'].map(sc => (
                    <button
                      key={sc}
                      onClick={() => setScenario(sc)}
                      style={{
                        padding: '12px 24px',
                        background: scenario === sc ? 'linear-gradient(135deg, #FF8C42 0%, #FF6B35 100%)' : 'white',
                        color: scenario === sc ? 'white' : '#FF6B35',
                        border: scenario === sc ? 'none' : '2px solid #FFD9B3',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.95em',
                        transition: 'all 0.3s'
                      }}
                    >
                      {sc === 'current' ? 'Current Status' : sc === 'restructure' ? 'Restructuring' : 'Consolidation'}
                    </button>
                  ))}
                </div>
                
                {scenario === 'current' && (
                  <div style={{
                    padding: '25px',
                    background: 'linear-gradient(135deg, #FFF5E6 0%, #FFE5CC 100%)',
                    borderRadius: '12px',
                    border: '2px solid #FFD9B3'
                  }}>
                    <h4 style={{ margin: '0 0 20px 0', color: '#FF6B35', fontSize: '1.3em' }}>Current Financial Position</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                      <div>
                        <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '0.9em', fontWeight: '600' }}>Total Income</p>
                        <p style={{ margin: 0, fontSize: '1.5em', fontWeight: '700', color: '#10B981' }}>
                          {profile.currency} {metrics.totalIncome.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '0.9em', fontWeight: '600' }}>Total Expenses</p>
                        <p style={{ margin: 0, fontSize: '1.5em', fontWeight: '700', color: '#F59E0B' }}>
                          {profile.currency} {metrics.totalExpenses.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '0.9em', fontWeight: '600' }}>Total Debt Payments</p>
                        <p style={{ margin: 0, fontSize: '1.5em', fontWeight: '700', color: '#EF4444' }}>
                          {profile.currency} {metrics.totalDebtPayments.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '0.9em', fontWeight: '600' }}>Net Position</p>
                        <p style={{ 
                          margin: 0, 
                          fontSize: '1.5em', 
                          fontWeight: '700',
                          color: metrics.surplus >= 0 ? '#10B981' : '#EF4444'
                        }}>
                          {profile.currency} {metrics.surplus.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {scenario === 'restructure' && debts.length > 0 && (() => {
                  const restructure = simulateRestructuring();
                  return (
                    <div style={{
                      padding: '25px',
                      background: 'linear-gradient(135deg, #FFF5E6 0%, #FFE5CC 100%)',
                      borderRadius: '12px',
                      border: '2px solid #FFD9B3'
                    }}>
                      <h4 style={{ margin: '0 0 20px 0', color: '#FF6B35', fontSize: '1.3em' }}>Debt Restructuring Scenario</h4>
                      <p style={{ margin: '0 0 20px 0', color: '#666', fontSize: '0.95em', lineHeight: '1.6' }}>
                        Extended terms and reduced interest rates within configurable limits. This scenario focuses on lowering monthly instalments while acknowledging a longer repayment horizon.
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                        <div>
                          <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '0.9em', fontWeight: '600' }}>New Monthly Payment</p>
                          <p style={{ margin: 0, fontSize: '1.5em', fontWeight: '700', color: '#10B981' }}>
                            {profile.currency} {restructure.monthlyPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                        <div>
                          <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '0.9em', fontWeight: '600' }}>Monthly Savings</p>
                          <p style={{ margin: 0, fontSize: '1.5em', fontWeight: '700', color: '#10B981' }}>
                            {profile.currency} {restructure.savingsPerMonth.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                        <div>
                          <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '0.9em', fontWeight: '600' }}>New Surplus</p>
                          <p style={{ 
                            margin: 0, 
                            fontSize: '1.5em', 
                            fontWeight: '700',
                            color: restructure.surplus >= 0 ? '#10B981' : '#EF4444'
                          }}>
                            {profile.currency} {restructure.surplus.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                        <div>
                          <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '0.9em', fontWeight: '600' }}>Total Interest vs Current</p>
                          <p style={{ margin: 0, fontSize: '0.9em', fontWeight: '600', color: '#374151' }}>
                            Current Approx Interest: {profile.currency} {restructure.currentTotalInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            <br />
                            Restructured Interest: {profile.currency} {restructure.totalInterestRestructured.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            <br />
                            Total Saving/(Cost): {profile.currency} {restructure.interestSavingsTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                
                {scenario === 'consolidate' && debts.length > 0 && (() => {
                  const consolidate = simulateConsolidation();
                  return (
                    <div style={{
                      padding: '25px',
                      background: 'linear-gradient(135deg, #FFF5E6 0%, #FFE5CC 100%)',
                      borderRadius: '12px',
                      border: '2px solid #FFD9B3'
                    }}>
                      <h4 style={{ margin: '0 0 20px 0', color: '#FF6B35', fontSize: '1.3em' }}>Debt Consolidation Scenario</h4>
                      <p style={{ margin: '0 0 20px 0', color: '#666', fontSize: '0.95em', lineHeight: '1.6' }}>
                        Combine all eligible debts into a single facility at approximately {consolidate.rate.toFixed(1)}% over {consolidate.term} months. Includes configured origination and monthly administration fees where applicable.
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                        <div>
                          <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '0.9em', fontWeight: '600' }}>Total to Consolidate</p>
                          <p style={{ margin: 0, fontSize: '1.5em', fontWeight: '700', color: '#3B82F6' }}>
                            {profile.currency} {consolidate.totalBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                        <div>
                          <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '0.9em', fontWeight: '600' }}>New Monthly Payment (incl. fees)</p>
                          <p style={{ margin: 0, fontSize: '1.5em', fontWeight: '700', color: '#10B981' }}>
                            {profile.currency} {consolidate.monthlyPaymentWithFees.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                        <div>
                          <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '0.9em', fontWeight: '600' }}>Monthly Savings</p>
                          <p style={{ margin: 0, fontSize: '1.5em', fontWeight: '700', color: '#10B981' }}>
                            {profile.currency} {consolidate.savingsPerMonth.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                        <div>
                          <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '0.9em', fontWeight: '600' }}>Total Interest & Fees vs Current</p>
                          <p style={{ margin: 0, fontSize: '0.9em', fontWeight: '600', color: '#374151' }}>
                            Current Approx Interest: {profile.currency} {consolidate.currentTotalInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            <br />
                            Consolidation Interest+Fees: {profile.currency} {consolidate.totalInterestAndFees.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            <br />
                            Total Saving/(Cost): {profile.currency} {consolidate.interestSavingsTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Scenario comparison chart */}
              {scenarioComparisonData.length > 0 && (
                <div style={{ marginTop: '30px', height: '260px' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#FF6B35', fontSize: '1.2em', fontWeight: '700' }}>Monthly Payment & Surplus Comparison</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={scenarioComparisonData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ReTooltip />
                      <Legend />
                      <Bar dataKey="payment" name="Monthly Payment" />
                      <Bar dataKey="surplus" name="Monthly Surplus" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Disclaimer */}
            <div style={{
              marginTop: '30px',
              padding: '15px 20px',
              background: '#F9FAFB',
              borderRadius: '10px',
              border: '1px dashed #D1D5DB'
            }}>
              <p style={{ margin: 0, fontSize: '0.8em', color: '#6B7280', lineHeight: 1.5 }}>
                This engine provides indicative affordability and risk analytics only. It does not constitute financial advice or a binding credit decision. 
                Financial institutions must apply their own credit policies, regulatory requirements, and professional judgement before approving or declining credit.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '15px' }}>
        <button
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          style={{
            padding: '15px 30px',
            background: step === 1 ? '#E5E7EB' : 'white',
            color: step === 1 ? '#9CA3AF' : '#FF6B35',
            border: '2px solid #FFD9B3',
            borderRadius: '10px',
            cursor: step === 1 ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            fontSize: '1em',
            transition: 'all 0.3s'
          }}
        >
          ← Previous
        </button>
        
        <button
          onClick={() => setStep(Math.min(5, step + 1))}
          disabled={step === 5}
          style={{
            padding: '15px 30px',
            background: step === 5 ? '#E5E7EB' : 'linear-gradient(135deg, #FF8C42 0%, #FF6B35 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: step === 5 ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            fontSize: '1em',
            boxShadow: step === 5 ? 'none' : '0 5px 20px rgba(255, 107, 53, 0.4)',
            transition: 'all 0.3s'
          }}
        >
          Next →
        </button>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '30px',
        padding: '20px',
        textAlign: 'center',
        color: '#666',
        fontSize: '0.85em',
        borderTop: '2px solid #FFD9B3'
      }}>
        <p style={{ margin: '0 0 5px 0', fontWeight: '600' }}>
          G-CARE v1.1 | Inspired by Basel III, IFRS 9 and international credit practices
        </p>
        <p style={{ margin: 0, fontStyle: 'italic' }}>
          Created by Josue Nganmoue | © {new Date().getFullYear()} All Rights Reserved
        </p>
      </div>
    </div>
  );
};

export default GCARE;
