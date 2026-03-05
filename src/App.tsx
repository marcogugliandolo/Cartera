import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  TrendingDown, 
  TrendingUp, 
  Wallet, 
  Target, 
  PieChart as PieChartIcon, 
  Calendar,
  ChevronRight,
  Utensils,
  Car,
  Home,
  Gamepad2,
  HeartPulse,
  MoreHorizontal,
  Loader2,
  BarChart3,
  Moon,
  Sun,
  LogOut,
  Lock,
  User as UserIcon,
  Search,
  Download,
  Filter,
  Sparkles,
  MessageSquare,
  X,
  Camera,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import Markdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";
import { cn, type Category, type Expense, type Goal, type RecurringExpense, type Income } from './lib/utils';

const ICON_MAP: Record<string, any> = {
  Utensils,
  Car,
  Home,
  Gamepad2,
  HeartPulse,
  MoreHorizontal,
  Search,
  Download,
  Filter,
  Sparkles,
  MessageSquare,
  X,
  Camera,
  RefreshCw,
  ArrowRight
};

export default function App() {
  const [user, setUser] = useState<{ id: number, username: string } | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authLoading, setAuthLoading] = useState(true);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeChartTab, setActiveChartTab] = useState<'categories' | 'trend'>('categories');
  const [activeListTab, setActiveListTab] = useState<'expenses' | 'incomes'>('expenses');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [showAIAnalyst, setShowAIAnalyst] = useState(false);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [newRecurring, setNewRecurring] = useState({ amount: '', description: '', category_id: '', frequency: 'monthly' as const, next_date: format(new Date(), 'yyyy-MM-dd') });
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [scanningReceipt, setScanningReceipt] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Form states
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [newExpense, setNewExpense] = useState({ amount: '', description: '', category_id: '', date: format(new Date(), 'yyyy-MM-dd') });
  const [newIncome, setNewIncome] = useState({ amount: '', description: '', date: format(new Date(), 'yyyy-MM-dd') });
  const [newGoal, setNewGoal] = useState({ name: '', target_amount: '', deadline: '' });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      fetchData();
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const getAuthHeaders = () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (user) {
      headers['X-User-Id'] = user.id.toString();
    }
    return headers;
  };

  const checkAuth = async () => {
    console.log("Checking auth session...");
    try {
      const headers: Record<string, string> = {};
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        headers['X-User-Id'] = JSON.parse(savedUser).id.toString();
      }

      const res = await fetch('/api/auth/me', { headers });
      console.log("Auth check response status:", res.status);
      if (res.ok) {
        const data = await res.json();
        console.log("Auth check successful, user:", data);
        setUser(data);
      } else if (!savedUser) {
        setUser(null);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const trimmedUsername = loginData.username.trim();
    console.log("Attempting login for:", trimmedUsername);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...loginData, username: trimmedUsername })
      });
      console.log("Login response status:", res.status);
      if (res.ok) {
        const data = await res.json();
        console.log("Login successful, user data:", data);
        localStorage.setItem('user', JSON.stringify(data));
        setUser(data);
      } else {
        const data = await res.json();
        console.log("Login failed, error:", data.error);
        setAuthError(data.error || 'Error al iniciar sesión');
      }
    } catch (error) {
      console.error("Login request error:", error);
      setAuthError('Error de conexión');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        headers: getAuthHeaders()
      });
      setUser(null);
      localStorage.removeItem('user');
      setExpenses([]);
      setCategories([]);
      setGoals([]);
    } catch (error) {
      console.error("Logout failed:", error);
      // Still clear local state
      setUser(null);
      localStorage.removeItem('user');
    }
  };

  const fetchData = async () => {
    if (!user) return;
    try {
      const headers = getAuthHeaders();
      const [expRes, catRes, goalRes, recRes, incRes] = await Promise.all([
        fetch('/api/expenses', { headers }),
        fetch('/api/categories', { headers }),
        fetch('/api/goals', { headers }),
        fetch('/api/recurring', { headers }),
        fetch('/api/incomes', { headers })
      ]);
      
      if (expRes.status === 401 || catRes.status === 401 || goalRes.status === 401 || incRes.status === 401) {
        setUser(null);
        localStorage.removeItem('user');
        return;
      }

      const [expData, catData, goalData, recData, incData] = await Promise.all([
        expRes.json(),
        catRes.json(),
        goalRes.json(),
        recRes.json(),
        incRes.json()
      ]);
      setExpenses(expData);
      setCategories(catData);
      setGoals(goalData);
      setRecurringExpenses(recData);
      setIncomes(incData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  const handleUpdateBudget = async (categoryId: number, budget: number) => {
    try {
      const res = await fetch(`/api/categories/${categoryId}/budget`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ budget })
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/recurring', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newRecurring)
      });
      if (res.ok) {
        fetchData();
        setShowRecurringForm(false);
        setNewRecurring({ amount: '', description: '', category_id: '', frequency: 'monthly', next_date: format(new Date(), 'yyyy-MM-dd') });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRecurring = async (id: number) => {
    try {
      const res = await fetch(`/api/recurring/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/data/export', { headers: getAuthHeaders() });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'finanzas.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAISend = async (text: string) => {
    if (!text.trim()) return;
    const newMessages = [...aiMessages, { role: 'user' as const, text }];
    setAiMessages(newMessages);
    setAiLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [{ text: `Eres un analista financiero personal experto. Aquí están mis datos actuales:
              Ingresos: ${JSON.stringify(incomes.map(i => ({ amount: i.amount, desc: i.description, date: i.date })))}
              Gastos: ${JSON.stringify(expenses.map(e => ({ amount: e.amount, desc: e.description, cat: e.category_name, date: e.date })))}
              Categorías y Presupuestos: ${JSON.stringify(categories.map(c => ({ name: c.name, budget: c.budget })))}
              Metas: ${JSON.stringify(goals.map(g => ({ name: g.name, target: g.target_amount, current: g.current_amount })))}
              
              Responde de forma concisa y útil en español. Usuario pregunta: ${text}` }]
          }
        ]
      });
      const response = await model;
      setAiMessages([...newMessages, { role: 'model', text: response.text || 'No pude procesar tu solicitud.' }]);
    } catch (err) {
      console.error(err);
      setAiMessages([...newMessages, { role: 'model', text: 'Hubo un error al conectar con la IA.' }]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanningReceipt(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [
            {
              parts: [
                { inlineData: { data: base64Data, mimeType: file.type } },
                { text: "Analiza este ticket y devuelve un JSON con: amount (número), description (texto corto), date (YYYY-MM-DD), category_name (una de: Comida, Transporte, Vivienda, Entretenimiento, Salud, Otros). Solo el JSON." }
              ]
            }
          ],
          config: { responseMimeType: "application/json" }
        });

        const result = JSON.parse(response.text || '{}');
        const category = categories.find(c => c.name.toLowerCase() === (result.category_name || '').toLowerCase()) || categories.find(c => c.name === 'Otros');
        
        setNewExpense({
          amount: result.amount?.toString() || '',
          description: result.description || 'Gasto escaneado',
          date: result.date || format(new Date(), 'yyyy-MM-dd'),
          category_id: category?.id.toString() || ''
        });
        setShowExpenseForm(true);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
    } finally {
      setScanningReceipt(false);
    }
  };
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.amount || !newExpense.category_id || !user) return;

    try {
      await fetch('/api/expenses', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...newExpense,
          amount: parseFloat(newExpense.amount),
          category_id: parseInt(newExpense.category_id)
        })
      });
      setNewExpense({ amount: '', description: '', category_id: '', date: format(new Date(), 'yyyy-MM-dd') });
      setShowExpenseForm(false);
      fetchData();
    } catch (error) {
      console.error("Error adding expense:", error);
    }
  };

  const handleAddIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncome.amount || !user) return;

    try {
      await fetch('/api/incomes', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...newIncome,
          amount: parseFloat(newIncome.amount)
        })
      });
      setNewIncome({ amount: '', description: '', date: format(new Date(), 'yyyy-MM-dd') });
      setShowIncomeForm(false);
      fetchData();
    } catch (error) {
      console.error("Error adding income:", error);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!user) return;
    try {
      await fetch(`/api/expenses/${id}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      fetchData();
    } catch (error) {
      console.error("Error deleting expense:", error);
    }
  };

  const handleDeleteIncome = async (id: number) => {
    if (!user) return;
    try {
      await fetch(`/api/incomes/${id}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      fetchData();
    } catch (error) {
      console.error("Error deleting income:", error);
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.name || !newGoal.target_amount || !user) return;

    try {
      await fetch('/api/goals', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...newGoal,
          target_amount: parseFloat(newGoal.target_amount)
        })
      });
      setNewGoal({ name: '', target_amount: '', deadline: '' });
      setShowGoalForm(false);
      fetchData();
    } catch (error) {
      console.error("Error adding goal:", error);
    }
  };

  const handleUpdateGoalProgress = async (id: number, current: number, increment: number) => {
    if (!user) return;
    try {
      await fetch(`/api/goals/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ current_amount: current + increment })
      });
      fetchData();
    } catch (error) {
      console.error("Error updating goal:", error);
    }
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const matchesSearch = e.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           e.category_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const expenseDate = parseISO(e.date);
      const matchesMonth = selectedMonth === -1 || (expenseDate.getMonth() === selectedMonth && expenseDate.getFullYear() === selectedYear);
      
      const matchesRange = (!dateRange.start || expenseDate >= parseISO(dateRange.start)) &&
                          (!dateRange.end || expenseDate <= parseISO(dateRange.end));

      return matchesSearch && matchesMonth && matchesRange;
    });
  }, [expenses, searchTerm, selectedMonth, selectedYear, dateRange]);

  const filteredIncomes = useMemo(() => {
    return incomes.filter(i => {
      const matchesSearch = i.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const incomeDate = parseISO(i.date);
      const matchesMonth = selectedMonth === -1 || (incomeDate.getMonth() === selectedMonth && incomeDate.getFullYear() === selectedYear);
      return matchesSearch && matchesMonth;
    });
  }, [incomes, searchTerm, selectedMonth, selectedYear]);

  const filteredGoals = useMemo(() => {
    return goals.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [goals, searchTerm]);

  const filteredRecurring = useMemo(() => {
    return recurringExpenses.filter(r => 
      r.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [recurringExpenses, searchTerm]);

  const monthlyStats = useMemo(() => {
    const currentMonthExpenses = expenses.filter(e => {
      const matchesSearch = e.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           e.category_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const d = parseISO(e.date);
      const matchesMonth = d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      return matchesSearch && matchesMonth;
    });

    const currentMonthIncomes = incomes.filter(i => {
      const matchesSearch = i.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const d = parseISO(i.date);
      const matchesMonth = d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      return matchesSearch && matchesMonth;
    });

    const recurringTotal = filteredRecurring.reduce((sum, r) => sum + r.amount, 0);
    const totalExpenses = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0) + recurringTotal;
    const totalIncome = currentMonthIncomes.reduce((sum, i) => sum + i.amount, 0);
    
    const byCategory = currentMonthExpenses.reduce((acc, e) => {
      acc[e.category_name] = (acc[e.category_name] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);

    filteredRecurring.forEach(r => {
      byCategory[r.category_name] = (byCategory[r.category_name] || 0) + r.amount;
    });

    const chartData = Object.entries(byCategory).map(([name, value]) => ({
      name,
      value,
      color: categories.find(c => c.name === name)?.color || '#6b7280'
    }));

    return { totalExpenses, totalIncome, chartData };
  }, [expenses, incomes, filteredRecurring, selectedMonth, selectedYear, categories, searchTerm]);

  const totalExpenses = useMemo(() => {
    return expenses
      .filter(e => e.description?.toLowerCase().includes(searchTerm.toLowerCase()) || e.category_name?.toLowerCase().includes(searchTerm.toLowerCase()))
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, searchTerm]);

  const totalIncome = useMemo(() => {
    return incomes
      .filter(i => i.description?.toLowerCase().includes(searchTerm.toLowerCase()))
      .reduce((sum, i) => sum + i.amount, 0);
  }, [incomes, searchTerm]);

  const monthlyExpenses = monthlyStats.totalExpenses;
  const monthlyIncome = monthlyStats.totalIncome;
  const categoryData = monthlyStats.chartData;

  const trendData = useMemo(() => {
    const data = [];
    const recurringTotal = filteredRecurring.reduce((sum, r) => sum + r.amount, 0);
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const month = d.getMonth();
      const year = d.getFullYear();
      
      const expenseTotal = expenses
        .filter(e => {
          const matchesSearch = e.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                               e.category_name?.toLowerCase().includes(searchTerm.toLowerCase());
          const expDate = parseISO(e.date);
          return matchesSearch && expDate.getMonth() === month && expDate.getFullYear() === year;
        })
        .reduce((sum, e) => sum + e.amount, 0) + recurringTotal;

      const incomeTotal = incomes
        .filter(i => {
          const matchesSearch = i.description?.toLowerCase().includes(searchTerm.toLowerCase());
          const incDate = parseISO(i.date);
          return matchesSearch && incDate.getMonth() === month && incDate.getFullYear() === year;
        })
        .reduce((sum, i) => sum + i.amount, 0);
      
      data.push({
        name: format(d, 'MMM', { locale: es }),
        gastos: expenseTotal,
        ingresos: incomeTotal,
        fullDate: format(d, 'MMMM yyyy', { locale: es })
      });
    }
    return data;
  }, [expenses, incomes, filteredRecurring, searchTerm]);

  if (authLoading || (user && loading)) {
    return (
      <div className="flex items-center justify-center h-screen bg-stone-50 dark:bg-stone-950">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className={cn(darkMode && "dark")}>
        <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center p-4 transition-colors duration-300 overflow-hidden relative">
          {/* Decorative Background Blobs */}
          <div className="absolute top-0 -left-4 w-72 h-72 bg-emerald-300 dark:bg-emerald-900/30 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-teal-300 dark:bg-teal-900/30 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-emerald-200 dark:bg-emerald-800/20 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 bg-white/80 dark:bg-stone-900/80 backdrop-blur-2xl rounded-[3rem] border border-white/20 dark:border-stone-800/50 shadow-2xl overflow-hidden"
          >
            {/* Left Side - Branding/Visual */}
            <div className="hidden lg:flex flex-col justify-between p-12 bg-emerald-600 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-teal-700 opacity-90"></div>
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl text-white">
                    <Wallet size={32} />
                  </div>
                  <span className="text-3xl font-black text-white tracking-tight">Ahorra</span>
                </div>
                <h2 className="text-5xl font-black text-white leading-tight mb-6">
                  Toma el control <br /> 
                  <span className="text-emerald-200">de tu futuro</span> <br />
                  financiero.
                </h2>
                <p className="text-emerald-50/80 text-lg max-w-sm">
                  La forma más inteligente y visual de gestionar tus gastos, ahorros y metas personales.
                </p>
              </div>

              <div className="relative z-10 flex items-center gap-6">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map(i => (
                    <img 
                      key={i}
                      src={`https://picsum.photos/seed/user${i}/100/100`} 
                      className="w-10 h-10 rounded-full border-2 border-emerald-500"
                      referrerPolicy="no-referrer"
                      alt="User"
                    />
                  ))}
                </div>
                <p className="text-emerald-50/60 text-sm font-medium">
                  Únete a +10,000 usuarios <br /> ahorrando inteligentemente.
                </p>
              </div>
            </div>

            {/* Right Side - Form */}
            <div className="p-8 lg:p-16 flex flex-col justify-center">
              <div className="lg:hidden flex items-center gap-3 mb-10">
                <div className="p-2.5 bg-emerald-600 rounded-xl text-white">
                  <Wallet size={24} />
                </div>
                <span className="text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">Ahorra</span>
              </div>

              <div className="mb-10">
                <h3 className="text-3xl font-black text-stone-900 dark:text-stone-100 mb-2">Bienvenido</h3>
                <p className="text-stone-500 dark:text-stone-400">Introduce tus credenciales para continuar</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-[0.2em] ml-1">Usuario</label>
                  <div className="relative group">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                    <input 
                      type="text"
                      required
                      value={loginData.username}
                      onChange={e => setLoginData({...loginData, username: e.target.value})}
                      placeholder="Tu nombre de usuario"
                      className="w-full bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 rounded-2xl py-4 pl-12 pr-4 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-stone-800 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-[0.2em] ml-1">Contraseña</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                    <input 
                      type="password"
                      required
                      value={loginData.password}
                      onChange={e => setLoginData({...loginData, password: e.target.value})}
                      placeholder="••••••••"
                      className="w-full bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 rounded-2xl py-4 pl-12 pr-4 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-stone-800 transition-all outline-none"
                    />
                  </div>
                </div>

                {authError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-xs font-bold"
                  >
                    <div className="p-1 bg-red-100 dark:bg-red-900/50 rounded-full">
                      <X size={12} />
                    </div>
                    {authError}
                  </motion.div>
                )}

                <button 
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-[1.25rem] font-black shadow-xl shadow-emerald-200 dark:shadow-emerald-900/20 transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2 group"
                >
                  Iniciar Sesión
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </form>

              <div className="mt-10 pt-10 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                <p className="text-stone-400 dark:text-stone-500 text-xs font-medium">¿No tienes cuenta? <span className="text-emerald-600 dark:text-emerald-400 font-bold cursor-pointer hover:underline">Regístrate</span></p>
                <p className="text-stone-400 dark:text-stone-500 text-[10px] font-bold uppercase tracking-widest">v2.0.0</p>
              </div>
            </div>
          </motion.div>
          
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="fixed bottom-8 left-8 p-4 bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl text-stone-500 dark:text-stone-400 rounded-2xl shadow-xl border border-white/20 dark:border-stone-800/50 transition-all hover:scale-110 active:scale-95 z-20"
          >
            {darkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>

          {/* AI Analyst Chat */}
          <div className="fixed bottom-6 right-24 z-40">
            <button
              onClick={() => setShowAIAnalyst(!showAIAnalyst)}
              className="p-4 bg-emerald-600 text-white rounded-2xl shadow-xl hover:scale-105 transition-all flex items-center gap-2 font-bold"
            >
              <Sparkles size={24} />
              <span className="hidden sm:inline">Analista IA</span>
            </button>

            <AnimatePresence>
              {showAIAnalyst && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.9 }}
                  className="absolute bottom-20 right-0 w-[90vw] max-w-md glass rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-stone-800/50 flex flex-col h-[550px] overflow-hidden"
                >
                  <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
                        <Sparkles size={20} />
                      </div>
                      <div>
                        <span className="font-black text-sm tracking-tight">Analista Financiero</span>
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-pulse"></div>
                          <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest">En línea</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setShowAIAnalyst(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X size={20} /></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {aiMessages.length === 0 && (
                      <div className="text-center py-12">
                        <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/30 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
                          <MessageSquare className="text-emerald-600" size={40} />
                        </div>
                        <h4 className="text-stone-900 dark:text-stone-100 font-bold mb-2">¿En qué puedo ayudarte?</h4>
                        <p className="text-stone-500 dark:text-stone-400 text-xs max-w-[200px] mx-auto leading-relaxed">Analizaré tus gastos y te daré consejos personalizados para ahorrar.</p>
                      </div>
                    )}
                    {aiMessages.map((m, i) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        key={i} 
                        className={cn("flex", m.role === 'user' ? "justify-end" : "justify-start")}
                      >
                        <div className={cn(
                          "max-w-[85%] p-4 rounded-[1.5rem] text-sm shadow-sm",
                          m.role === 'user' 
                            ? "bg-emerald-600 text-white rounded-tr-none" 
                            : "bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-tl-none border border-stone-100 dark:border-stone-700"
                        )}>
                          <div className="markdown-body">
                            <Markdown>{m.text}</Markdown>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {aiLoading && (
                      <div className="flex justify-start">
                        <div className="bg-white dark:bg-stone-800 p-4 rounded-[1.5rem] rounded-tl-none border border-stone-100 dark:border-stone-700 shadow-sm">
                          <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
 
                  <div className="p-4 bg-stone-50/50 dark:bg-stone-900/50 border-t border-stone-100 dark:border-stone-800">
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        const input = e.currentTarget.elements.namedItem('message') as HTMLInputElement;
                        if (!input.value.trim()) return;
                        handleAISend(input.value);
                        input.value = '';
                      }}
                      className="flex gap-2"
                    >
                      <input 
                        name="message"
                        autoComplete="off"
                        placeholder="Pregunta sobre tus finanzas..."
                        className="flex-1 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl px-5 py-3 text-sm text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
                      />
                      <button type="submit" className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 hover:bg-emerald-700 transition-all active:scale-95">
                        <ArrowRight size={20} />
                      </button>
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(darkMode && "dark")}>
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans pb-20 transition-colors duration-500 relative overflow-hidden">
        {/* Decorative Background Blobs */}
        <div className="fixed top-0 -left-20 w-[500px] h-[500px] bg-emerald-100/50 dark:bg-emerald-900/10 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-[120px] opacity-50 animate-blob pointer-events-none"></div>
        <div className="fixed -bottom-20 -right-20 w-[600px] h-[600px] bg-teal-100/50 dark:bg-teal-900/10 rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-[120px] opacity-50 animate-blob animation-delay-2000 pointer-events-none"></div>

        {/* Header */}
        <header className="glass sticky top-0 z-50 px-4 py-4 sm:px-6">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20">
                <Wallet size={24} />
              </div>
              <h1 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-stone-900 to-stone-600 dark:from-stone-100 dark:to-stone-400">Ahorra</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2.5 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-2xl transition-all active:scale-90"
                aria-label="Toggle dark mode"
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button
                onClick={handleLogout}
                className="p-2.5 text-stone-500 dark:text-stone-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 rounded-2xl transition-all active:scale-90"
                aria-label="Cerrar sesión"
              >
                <LogOut size={20} />
              </button>
              <button 
                onClick={() => setShowExpenseForm(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 active:scale-95 font-bold text-sm"
              >
                <Plus size={20} />
                <span className="hidden sm:inline">Nuevo Gasto</span>
              </button>
            </div>
          </div>
        </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Bento Grid Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Main Summary Card */}
          <div className="md:col-span-2 bento-card p-8 flex flex-col justify-between bg-gradient-to-br from-emerald-600 to-emerald-700 text-white border-none shadow-xl shadow-emerald-200 dark:shadow-emerald-900/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-10 -mr-8 -mt-8">
              <Wallet size={160} />
            </div>
            <div>
              <p className="text-emerald-100/80 font-bold uppercase tracking-widest text-xs mb-2">Balance Mensual</p>
              <h2 className="text-5xl font-black tracking-tighter">
                {(monthlyIncome - monthlyExpenses).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
              </h2>
              <div className="flex gap-4 mt-4">
                <div className="flex items-center gap-1.5 text-emerald-100/90">
                  <TrendingUp size={14} className="text-emerald-300" />
                  <span className="text-xs font-bold">+{monthlyIncome.toLocaleString()}€</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-100/90">
                  <TrendingDown size={14} className="text-red-300" />
                  <span className="text-xs font-bold">-{monthlyExpenses.toLocaleString()}€</span>
                </div>
              </div>
            </div>
            <div className="mt-8 flex items-center gap-4">
              <div className="flex-1 bg-white/20 rounded-2xl p-4 backdrop-blur-md">
                <p className="text-emerald-100/80 text-[10px] font-bold uppercase tracking-widest mb-1">Balance Total</p>
                <p className="text-xl font-bold">{(totalIncome - totalExpenses).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowIncomeForm(true)}
                  className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg hover:scale-105 transition-all border border-emerald-400/30"
                  title="Añadir Ingreso"
                >
                  <TrendingUp size={24} />
                </button>
                <button 
                  onClick={() => setShowExpenseForm(true)}
                  className="p-4 bg-white text-emerald-600 rounded-2xl shadow-lg hover:scale-105 transition-all"
                  title="Añadir Gasto"
                >
                  <Plus size={24} />
                </button>
              </div>
            </div>
          </div>

          {/* Budget Progress Bento */}
          <div className="md:col-span-2 bento-card p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                <Target className="text-emerald-600" size={20} />
                Presupuestos
              </h3>
              <button className="text-xs font-bold text-emerald-600 hover:underline">Ver todos</button>
            </div>
            <div className="space-y-4">
              {categories.slice(0, 3).map(cat => {
                const spent = expenses
                  .filter(e => e.category_id === cat.id && parseISO(e.date).getMonth() === selectedMonth)
                  .reduce((sum, e) => sum + e.amount, 0);
                const progress = cat.budget ? (spent / cat.budget) * 100 : 0;
                return (
                  <div key={cat.id} className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-stone-500 dark:text-stone-400">{cat.name}</span>
                      <span className={cn(progress > 90 ? "text-red-500" : "text-stone-900 dark:text-stone-100")}>
                        {spent.toFixed(0)}€ / {cat.budget}€
                      </span>
                    </div>
                    <div className="h-2.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(progress, 100)}%` }}
                        className={cn(
                          "h-full rounded-full transition-all",
                          progress > 100 ? "bg-red-500" : progress > 80 ? "bg-amber-500" : "bg-emerald-500"
                        )}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart Bento */}
          <div className="md:col-span-3 bento-card p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setActiveChartTab('categories')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                    activeChartTab === 'categories' ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20" : "text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                  )}
                >
                  Categorías
                </button>
                <button 
                  onClick={() => setActiveChartTab('trend')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                    activeChartTab === 'trend' ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20" : "text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                  )}
                >
                  Tendencia
                </button>
              </div>
              <div className="flex items-center gap-2 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="bg-transparent border-none text-xs font-bold focus:ring-0 cursor-pointer"
                >
                  {Array.from({ length: 12 }).map((_, i) => (
                    <option key={i} value={i}>{format(new Date(2024, i, 1), 'MMMM', { locale: es })}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {activeChartTab === 'categories' ? (
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontWeight: 'bold' }}
                    />
                  </PieChart>
                ) : (
                  <BarChart data={trendData}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#94a3b8' }} />
                    <Tooltip 
                      cursor={{ fill: '#f1f5f9', radius: 8 }}
                      contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="total" fill="#10b981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Stats Bento */}
          <div className="md:col-span-1 bento-card p-8 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-3xl border border-blue-100 dark:border-blue-900/50">
                <p className="text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-1">Suscripciones</p>
                <p className="text-2xl font-black">{filteredRecurring.reduce((sum, r) => sum + r.amount, 0).toFixed(2)}€</p>
                <p className="text-[10px] text-blue-500/70 font-medium mt-1">Gasto fijo mensual</p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-3xl border border-purple-100 dark:border-purple-900/50">
                <p className="text-purple-600 dark:text-purple-400 text-[10px] font-bold uppercase tracking-widest mb-1">Metas Activas</p>
                <p className="text-2xl font-black">{filteredGoals.length}</p>
                <p className="text-[10px] text-purple-500/70 font-medium mt-1">Proyectos de ahorro</p>
              </div>
            </div>
            <button 
              onClick={() => handleExport()}
              className="w-full mt-6 py-4 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-2xl text-stone-600 dark:text-stone-400 font-bold text-xs transition-all flex items-center justify-center gap-2"
            >
              <Download size={16} />
              Exportar Datos
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar gastos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all text-stone-900 dark:text-stone-100 shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "p-4 rounded-2xl border transition-all flex items-center gap-2 text-sm font-bold",
                showFilters 
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400" 
                  : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400"
              )}
            >
              <Filter size={18} />
              Filtros
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-stone-900 p-5 rounded-3xl border border-stone-200/60 dark:border-stone-800 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl">
                <TrendingUp size={18} />
              </div>
              <span className="text-stone-500 dark:text-stone-400 text-xs font-bold uppercase tracking-wider">Gasto Total</span>
            </div>
            <div className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">{totalExpenses.toLocaleString()}€</div>
            <div className="text-stone-400 dark:text-stone-500 text-[10px] mt-1 font-medium">Desde el inicio</div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white dark:bg-stone-900 p-5 rounded-3xl border border-stone-200/60 dark:border-stone-800 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <Calendar size={18} />
              </div>
              <span className="text-stone-500 dark:text-stone-400 text-xs font-bold uppercase tracking-wider">Este Mes</span>
            </div>
            <div className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">{monthlyExpenses.toLocaleString()}€</div>
            <div className="text-stone-400 dark:text-stone-500 text-[10px] mt-1 font-medium capitalize">
              {format(new Date(selectedYear, selectedMonth), 'MMMM yyyy', { locale: es })}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-stone-900 p-5 rounded-3xl border border-stone-200/60 dark:border-stone-800 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-xl">
                <Target size={18} />
              </div>
              <span className="text-stone-500 dark:text-stone-400 text-xs font-bold uppercase tracking-wider">Metas Activas</span>
            </div>
            <div className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">{filteredGoals.length}</div>
            <div className="text-stone-400 dark:text-stone-500 text-[10px] mt-1 font-medium">Objetivos de ahorro</div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-8">
            {/* Charts & Visualization */}
            <div className="bg-white dark:bg-stone-900 p-8 rounded-[2rem] border border-stone-200/60 dark:border-stone-800 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
                    {activeChartTab === 'categories' ? 'Distribución de Gastos' : 'Tendencia de Gastos'}
                  </h3>
                  <p className="text-stone-400 dark:text-stone-500 text-sm">
                    {activeChartTab === 'categories' ? 'Análisis visual por categorías' : 'Gastos totales últimos 12 meses'}
                  </p>
                </div>
                <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-xl self-start">
                  <button 
                    onClick={() => setActiveChartTab('categories')}
                    className={cn(
                      "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                      activeChartTab === 'categories' ? "bg-white dark:bg-stone-700 shadow-sm text-stone-900 dark:text-stone-100" : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                    )}
                  >
                    Categorías
                  </button>
                  <button 
                    onClick={() => setActiveChartTab('trend')}
                    className={cn(
                      "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                      activeChartTab === 'trend' ? "bg-white dark:bg-stone-700 shadow-sm text-stone-900 dark:text-stone-100" : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                    )}
                  >
                    Tendencia
                  </button>
                </div>
              </div>
              
              <div className="h-72">
                {activeChartTab === 'categories' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center h-full">
                    <div className="h-full">
                      {categoryData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categoryData}
                              cx="50%"
                              cy="50%"
                              innerRadius={70}
                              outerRadius={90}
                              paddingAngle={8}
                              dataKey="value"
                              stroke="none"
                            >
                              {categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ 
                                borderRadius: '16px', 
                                border: 'none', 
                                boxShadow: '0 10px 25px rgba(0,0,0,0.05)', 
                                padding: '12px',
                                backgroundColor: darkMode ? '#1c1917' : '#ffffff',
                                color: darkMode ? '#f5f5f4' : '#1c1917'
                              }}
                              itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                              formatter={(value: number) => [`${value.toLocaleString()}€`, 'Total']}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-stone-300 dark:text-stone-700 gap-2">
                          <PieChartIcon size={48} strokeWidth={1} />
                          <span className="text-sm italic">Sin datos suficientes</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-3 max-h-full overflow-y-auto pr-2 custom-scrollbar">
                      {categoryData.length > 0 ? categoryData.map((cat, i) => (
                        <div key={i} className="flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                            <span className="text-sm font-medium text-stone-600 dark:text-stone-400 group-hover:text-stone-900 dark:group-hover:text-stone-100 transition-colors">{cat.name}</span>
                          </div>
                          <div className="text-sm font-bold text-stone-900 dark:text-stone-100">{cat.value.toLocaleString()}€</div>
                        </div>
                      )) : (
                        <div className="text-stone-400 dark:text-stone-500 text-xs text-center">Registra gastos para ver el desglose</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trendData}>
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fontWeight: 'bold', fill: darkMode ? '#78716c' : '#a8a29e' }}
                          dy={10}
                        />
                        <YAxis hide />
                        <Tooltip 
                          cursor={{ fill: darkMode ? '#292524' : '#f5f5f4', radius: 12 }}
                          contentStyle={{ 
                            borderRadius: '16px', 
                            border: 'none', 
                            boxShadow: '0 10px 25px rgba(0,0,0,0.05)', 
                            padding: '12px',
                            backgroundColor: darkMode ? '#1c1917' : '#ffffff',
                            color: darkMode ? '#f5f5f4' : '#1c1917'
                          }}
                          itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                          labelStyle={{ fontSize: '10px', fontWeight: 'bold', color: darkMode ? '#78716c' : '#a8a29e', marginBottom: '4px' }}
                          labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
                          formatter={(value: number) => [`${value.toLocaleString()}€`, '']}
                        />
                        <Legend 
                          verticalAlign="top" 
                          align="right" 
                          iconType="circle" 
                          wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: '20px' }}
                        />
                        <Bar 
                          dataKey="ingresos" 
                          fill="#10b981" 
                          radius={[6, 6, 6, 6]} 
                          barSize={12}
                          name="Ingresos"
                        />
                        <Bar 
                          dataKey="gastos" 
                          fill="#ef4444" 
                          radius={[6, 6, 6, 6]} 
                          barSize={12}
                          name="Gastos"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Savings Goals - Refined Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Metas de Ahorro</h3>
                <button 
                  onClick={() => setShowGoalForm(true)}
                  className="text-emerald-600 hover:text-emerald-700 text-sm font-bold flex items-center gap-1.5"
                >
                  <Plus size={18} /> Nueva Meta
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goals.length > 0 ? filteredGoals.map(goal => {
                  const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
                  return (
                    <motion.div 
                      layout
                      key={goal.id} 
                      className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200/60 dark:border-stone-800 shadow-sm space-y-4"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-stone-800 dark:text-stone-200">{goal.name}</h4>
                          <p className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-widest mt-0.5">
                            {goal.deadline ? format(parseISO(goal.deadline), 'dd MMM yyyy', { locale: es }) : 'Sin fecha'}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-emerald-600 dark:text-emerald-500">{Math.round(progress)}%</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="h-2.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-emerald-500 rounded-full"
                          />
                        </div>
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-stone-400 dark:text-stone-500">{goal.current_amount.toLocaleString()}€</span>
                          <span className="text-stone-800 dark:text-stone-200">Objetivo: {goal.target_amount.toLocaleString()}€</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button 
                          onClick={() => handleUpdateGoalProgress(goal.id, goal.current_amount, 50)}
                          className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all"
                        >
                          +50€
                        </button>
                        <button 
                          onClick={() => handleUpdateGoalProgress(goal.id, goal.current_amount, 100)}
                          className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all"
                        >
                          +100€
                        </button>
                      </div>
                    </motion.div>
                  );
                }) : (
                  <div className="col-span-2 bg-stone-50/50 dark:bg-stone-900/50 border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-[2.5rem] py-16 flex flex-col items-center justify-center text-stone-400 dark:text-stone-600 gap-4 group hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors cursor-pointer" onClick={() => setShowGoalForm(true)}>
                    <div className="w-16 h-16 bg-white dark:bg-stone-800 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <Target size={32} strokeWidth={1.5} className="text-emerald-500" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-black text-stone-500 dark:text-stone-400 uppercase tracking-widest">Tu primera meta</p>
                      <p className="text-[10px] font-medium text-stone-400 dark:text-stone-600 mt-1">Define un objetivo y empieza a ahorrar hoy</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Budgets & Recurring */}
            <div className="bg-white dark:bg-stone-900 p-8 rounded-[2rem] border border-stone-200/60 dark:border-stone-800 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Presupuestos por Categoría</h3>
                  <p className="text-stone-400 dark:text-stone-500 text-sm">Controla tus límites mensuales</p>
                </div>
                <div className="p-2 bg-stone-50 dark:bg-stone-800 rounded-xl text-stone-400">
                  <BarChart3 size={20} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {categories.map(cat => {
                  const spent = expenses
                    .filter(e => e.category_id === cat.id && parseISO(e.date).getMonth() === selectedMonth)
                    .reduce((sum, e) => sum + e.amount, 0);
                  const percentage = cat.budget > 0 ? Math.min((spent / cat.budget) * 100, 100) : 0;
                  const isOver = cat.budget > 0 && spent > cat.budget;

                  return (
                    <div key={cat.id} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="text-sm font-bold text-stone-700 dark:text-stone-300">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-stone-900 dark:text-stone-100">{spent.toLocaleString()}€</span>
                          <span className="text-stone-400 text-[10px]">/</span>
                          <input 
                            type="number"
                            defaultValue={cat.budget}
                            onBlur={(e) => handleUpdateBudget(cat.id, parseFloat(e.target.value) || 0)}
                            className="w-16 bg-transparent border-none p-0 text-[10px] font-black text-stone-400 focus:text-emerald-600 focus:ring-0 transition-colors"
                          />
                        </div>
                      </div>
                      <div className="h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          className={cn(
                            "h-full rounded-full transition-all duration-1000",
                            isOver ? "bg-red-500" : "bg-emerald-500"
                          )}
                        />
                      </div>
                      {isOver && (
                        <p className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                          <TrendingUp size={10} />
                          ¡Presupuesto excedido!
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white dark:bg-stone-900 p-8 rounded-[2rem] border border-stone-200/60 dark:border-stone-800 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Gastos Recurrentes</h3>
                  <p className="text-stone-400 dark:text-stone-500 text-sm">Suscripciones y pagos fijos</p>
                </div>
                <button 
                  onClick={() => setShowRecurringForm(true)}
                  className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 transition-all"
                >
                  <Plus size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {recurringExpenses.length > 0 ? recurringExpenses.map(rec => {
                  const Icon = ICON_MAP[rec.category_icon] || MoreHorizontal;
                  return (
                    <div key={rec.id} className="flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-100 dark:border-stone-800">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-xl text-white" style={{ backgroundColor: rec.category_color }}>
                          <Icon size={18} />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-stone-900 dark:text-stone-100">{rec.description}</div>
                          <div className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-widest">
                            {rec.frequency === 'monthly' ? 'Mensual' : 'Semanal'} • Próximo: {format(parseISO(rec.next_date), 'dd MMM', { locale: es })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="font-black text-stone-900 dark:text-stone-100">{rec.amount.toLocaleString()}€</div>
                        <button 
                          onClick={() => handleDeleteRecurring(rec.id)}
                          className="text-stone-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-center py-8 text-stone-400 italic text-sm">No tienes gastos recurrentes configurados</div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Area */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-stone-900 p-6 rounded-[2rem] border border-stone-200/60 dark:border-stone-800 shadow-sm flex flex-col h-full max-h-[800px]">
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
                    <button 
                      onClick={() => setActiveListTab('expenses')}
                      className={cn(
                        "px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all",
                        activeListTab === 'expenses' ? "bg-white dark:bg-stone-700 shadow-sm text-stone-900 dark:text-stone-100" : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                      )}
                    >
                      Gastos
                    </button>
                    <button 
                      onClick={() => setActiveListTab('incomes')}
                      className={cn(
                        "px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all",
                        activeListTab === 'incomes' ? "bg-white dark:bg-stone-700 shadow-sm text-stone-900 dark:text-stone-100" : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                      )}
                    >
                      Ingresos
                    </button>
                  </div>
                  <div className="p-1.5 bg-stone-50 dark:bg-stone-800 rounded-lg text-stone-400 dark:text-stone-500">
                    {activeListTab === 'expenses' ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <select 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="flex-1 bg-stone-50 dark:bg-stone-800 border-none rounded-xl px-3 py-2 text-xs font-bold text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all appearance-none"
                  >
                    {Array.from({ length: 12 }).map((_, i) => (
                      <option key={i} value={i}>
                        {format(new Date(2024, i), 'MMMM', { locale: es })}
                      </option>
                    ))}
                  </select>
                  <select 
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="bg-stone-50 dark:bg-stone-800 border-none rounded-xl px-3 py-2 text-xs font-bold text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all appearance-none"
                  >
                    {Array.from({ length: 5 }).map((_, i) => {
                      const year = new Date().getFullYear() - 2 + i;
                      return <option key={year} value={year}>{year}</option>;
                    })}
                  </select>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-1 custom-scrollbar">
                {activeListTab === 'expenses' ? (
                  filteredExpenses.length > 0 ? filteredExpenses.map(expense => {
                    const Icon = ICON_MAP[expense.category_icon] || MoreHorizontal;
                    return (
                      <motion.div 
                        layout
                        key={expense.id}
                        className="flex items-center justify-between p-3 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-2xl transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="p-2.5 rounded-xl text-white shadow-sm"
                            style={{ backgroundColor: expense.category_color }}
                          >
                            <Icon size={16} />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs truncate text-stone-800 dark:text-stone-200">{expense.description || expense.category_name}</div>
                            <div className="text-[10px] text-stone-400 dark:text-stone-500 font-medium">{format(parseISO(expense.date), 'dd MMM', { locale: es })}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="font-black text-xs text-red-500 dark:text-red-400">-{expense.amount.toLocaleString()}€</div>
                          <button 
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-stone-300 dark:text-stone-600 hover:text-red-500 dark:hover:text-red-400 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  }) : (
                    <div className="flex flex-col items-center justify-center py-24 text-stone-300 dark:text-stone-700 gap-4">
                      <div className="w-20 h-20 bg-stone-50 dark:bg-stone-800/50 rounded-[2rem] flex items-center justify-center shadow-inner">
                        <Wallet size={40} strokeWidth={1} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest">Sin gastos</p>
                        <p className="text-[10px] font-medium text-stone-300 dark:text-stone-600 mt-1">Empieza a registrar tus movimientos</p>
                      </div>
                    </div>
                  )
                ) : (
                  filteredIncomes.length > 0 ? filteredIncomes.map(income => (
                    <motion.div 
                      layout
                      key={income.id}
                      className="flex items-center justify-between p-3 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-2xl transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500 text-white shadow-sm">
                          <TrendingUp size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs truncate text-stone-800 dark:text-stone-200">{income.description || 'Ingreso'}</div>
                          <div className="text-[10px] text-stone-400 dark:text-stone-500 font-medium">{format(parseISO(income.date), 'dd MMM', { locale: es })}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="font-black text-xs text-emerald-600 dark:text-emerald-500">+{income.amount.toLocaleString()}€</div>
                        <button 
                          onClick={() => handleDeleteIncome(income.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-stone-300 dark:text-stone-600 hover:text-red-500 dark:hover:text-red-400 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  )) : (
                    <div className="flex flex-col items-center justify-center py-24 text-stone-300 dark:text-stone-700 gap-4">
                      <div className="w-20 h-20 bg-stone-50 dark:bg-stone-800/50 rounded-[2rem] flex items-center justify-center shadow-inner">
                        <TrendingUp size={40} strokeWidth={1} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest">Sin ingresos</p>
                        <p className="text-[10px] font-medium text-stone-300 dark:text-stone-600 mt-1">Registra tus entradas de dinero</p>
                      </div>
                    </div>
                  )
                )}
              </div>
              
              {filteredExpenses.length > 0 && (
                <button className="w-full mt-4 py-3 text-stone-400 dark:text-stone-500 text-[10px] font-black uppercase tracking-widest hover:text-stone-900 dark:hover:text-stone-100 transition-colors border-t border-stone-50 dark:border-stone-800 pt-4">
                  Ver Historial Completo
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Income Modal */}
      <AnimatePresence>
        {showIncomeForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIncomeForm(false)}
              className="absolute inset-0 bg-stone-900/40 dark:bg-stone-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative glass-darker w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-white/20 dark:border-stone-800/50"
            >
              <div className="mb-8">
                <h2 className="text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">Registrar Ingreso</h2>
                <p className="text-stone-400 dark:text-stone-500 text-xs font-medium">Añade una nueva entrada de dinero</p>
              </div>
              <form onSubmit={handleAddIncome} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Monto (€)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={newIncome.amount}
                    onChange={e => setNewIncome({...newIncome, amount: e.target.value})}
                    placeholder="0.00"
                    className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-xl p-4 text-lg font-bold text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Descripción</label>
                  <input 
                    type="text" 
                    value={newIncome.description}
                    onChange={e => setNewIncome({...newIncome, description: e.target.value})}
                    placeholder="Ej. Salario, Venta, Regalo..."
                    className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-xl p-4 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Fecha</label>
                  <input 
                    type="date" 
                    required
                    value={newIncome.date}
                    onChange={e => setNewIncome({...newIncome, date: e.target.value})}
                    className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-xl p-4 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowIncomeForm(false)}
                    className="flex-1 py-4 rounded-xl font-bold text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 transition-all active:scale-95"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Expense Modal */}
      <AnimatePresence>
        {showExpenseForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExpenseForm(false)}
              className="absolute inset-0 bg-stone-900/40 dark:bg-stone-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative glass-darker w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-white/20 dark:border-stone-800/50"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">Registrar Gasto</h2>
                  <p className="text-stone-400 dark:text-stone-500 text-xs font-medium">Añade un nuevo movimiento</p>
                </div>
                <div className="relative">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleScanReceipt}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <button 
                    type="button"
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-sm",
                      scanningReceipt 
                        ? "bg-emerald-600 text-white" 
                        : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100"
                    )}
                  >
                    {scanningReceipt ? <Loader2 className="animate-spin" size={16} /> : <Camera size={16} />}
                    {scanningReceipt ? 'Escaneando...' : 'Escanear'}
                  </button>
                </div>
              </div>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Monto (€)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={newExpense.amount}
                    onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
                    placeholder="0.00"
                    className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-xl p-4 text-lg font-bold text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Descripción</label>
                  <input 
                    type="text" 
                    value={newExpense.description}
                    onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                    placeholder="Ej. Almuerzo, Gasolina..."
                    className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-xl p-4 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Categoría</label>
                  <select 
                    required
                    value={newExpense.category_id}
                    onChange={e => setNewExpense({...newExpense, category_id: e.target.value})}
                    className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-xl p-4 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all appearance-none"
                  >
                    <option value="">Selecciona una categoría</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Fecha</label>
                  <input 
                    type="date" 
                    required
                    value={newExpense.date}
                    onChange={e => setNewExpense({...newExpense, date: e.target.value})}
                    className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-xl p-4 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowExpenseForm(false)}
                    className="flex-1 py-4 rounded-xl font-bold text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 transition-all active:scale-95"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Goal Modal */}
      <AnimatePresence>
        {showGoalForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGoalForm(false)}
              className="absolute inset-0 bg-stone-900/40 dark:bg-stone-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative glass-darker w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-white/20 dark:border-stone-800/50"
            >
              <div className="mb-8">
                <h2 className="text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">Nueva Meta</h2>
                <p className="text-stone-400 dark:text-stone-500 text-xs font-medium">Visualiza tu próximo gran objetivo</p>
              </div>
              <form onSubmit={handleAddGoal} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Nombre de la Meta</label>
                  <input 
                    type="text" 
                    required
                    value={newGoal.name}
                    onChange={e => setNewGoal({...newGoal, name: e.target.value})}
                    placeholder="Ej. Viaje a Japón, Fondo de Emergencia..."
                    className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-xl p-4 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Monto Objetivo (€)</label>
                  <input 
                    type="number" 
                    required
                    value={newGoal.target_amount}
                    onChange={e => setNewGoal({...newGoal, target_amount: e.target.value})}
                    placeholder="0.00"
                    className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-xl p-4 text-lg font-bold text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Fecha Límite (Opcional)</label>
                  <input 
                    type="date" 
                    value={newGoal.deadline}
                    onChange={e => setNewGoal({...newGoal, deadline: e.target.value})}
                    className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-xl p-4 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowGoalForm(false)}
                    className="flex-1 py-4 rounded-xl font-bold text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 transition-all active:scale-95"
                  >
                    Crear Meta
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Recurring Expense Modal */}
      <AnimatePresence>
        {showRecurringForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRecurringForm(false)}
              className="absolute inset-0 bg-stone-900/40 dark:bg-stone-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative glass-darker w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-white/20 dark:border-stone-800/50"
            >
              <div className="mb-8">
                <h2 className="text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">Gasto Recurrente</h2>
                <p className="text-stone-400 dark:text-stone-500 text-xs font-medium">Automatiza el seguimiento de tus suscripciones</p>
              </div>
              <form onSubmit={handleAddRecurring} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Monto (€)</label>
                  <input 
                    type="number" 
                    required
                    value={newRecurring.amount}
                    onChange={e => setNewRecurring({...newRecurring, amount: e.target.value})}
                    placeholder="0.00"
                    className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-xl p-4 text-2xl font-black text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Descripción</label>
                  <input 
                    type="text" 
                    required
                    value={newRecurring.description}
                    onChange={e => setNewRecurring({...newRecurring, description: e.target.value})}
                    placeholder="Ej. Netflix, Gimnasio..."
                    className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-xl p-4 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Frecuencia</label>
                    <select 
                      value={newRecurring.frequency}
                      onChange={e => setNewRecurring({...newRecurring, frequency: e.target.value as any})}
                      className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-xl p-4 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                    >
                      <option value="monthly">Mensual</option>
                      <option value="weekly">Semanal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Categoría</label>
                    <select 
                      required
                      value={newRecurring.category_id}
                      onChange={e => setNewRecurring({...newRecurring, category_id: e.target.value})}
                      className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-xl p-4 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                    >
                      <option value="">Seleccionar</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Próxima Fecha</label>
                  <input 
                    type="date" 
                    required
                    value={newRecurring.next_date}
                    onChange={e => setNewRecurring({...newRecurring, next_date: e.target.value})}
                    className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-xl p-4 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowRecurringForm(false)}
                    className="flex-1 py-4 rounded-xl font-bold text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 transition-all active:scale-95"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
