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
  User as UserIcon
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
import { cn, type Category, type Expense, type Goal } from './lib/utils';

const ICON_MAP: Record<string, any> = {
  Utensils,
  Car,
  Home,
  Gamepad2,
  HeartPulse,
  MoreHorizontal
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeHistoryTab, setActiveHistoryTab] = useState<'expenses' | 'income'>('expenses');
  const [activeChartTab, setActiveChartTab] = useState<'categories' | 'trend'>('categories');
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
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [newExpense, setNewExpense] = useState({ amount: '', description: '', category_id: '', date: format(new Date(), 'yyyy-MM-dd') });
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
    try {
      const headers: Record<string, string> = {};
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        headers['X-User-Id'] = JSON.parse(savedUser).id.toString();
      }

      const res = await fetch('/api/auth/me', { headers });
      if (res.ok) {
        const data = await res.json();
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
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...loginData, username: trimmedUsername })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('user', JSON.stringify(data));
        setUser(data);
      } else {
        const data = await res.json();
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
      setUser(null);
      localStorage.removeItem('user');
    }
  };

  const fetchData = async () => {
    if (!user) return;
    try {
      const headers = getAuthHeaders();
      const [expRes, catRes, goalRes] = await Promise.all([
        fetch('/api/expenses', { headers }),
        fetch('/api/categories', { headers }),
        fetch('/api/goals', { headers })
      ]);
      
      if (expRes.status === 401 || catRes.status === 401 || goalRes.status === 401) {
        setUser(null);
        localStorage.removeItem('user');
        return;
      }

      const [expData, catData, goalData] = await Promise.all([
        expRes.json(),
        catRes.json(),
        goalRes.json()
      ]);
      setExpenses(expData);
      setCategories(catData);
      setGoals(goalData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
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

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const filteredExpenses = expenses.filter(e => {
    const date = parseISO(e.date);
    return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
  });

  const monthlyExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const searchedExpenses = filteredExpenses.filter(e => 
    (e.description || e.category_name).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categoryData = categories.map(cat => ({
    name: cat.name,
    value: filteredExpenses.filter(e => e.category_id === cat.id).reduce((sum, e) => sum + e.amount, 0),
    color: cat.color
  })).filter(d => d.value > 0);

  const trendData = useMemo(() => {
    const data = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const month = d.getMonth();
      const year = d.getFullYear();
      const total = expenses
        .filter(e => {
          const expDate = parseISO(e.date);
          return expDate.getMonth() === month && expDate.getFullYear() === year;
        })
        .reduce((sum, e) => sum + e.amount, 0);
      
      data.push({
        name: format(d, 'MMM', { locale: es }),
        total,
        fullDate: format(d, 'MMMM yyyy', { locale: es })
      });
    }
    return data;
  }, [expenses]);

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
        <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4 transition-colors duration-300">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#141414] w-full max-w-5xl rounded-6xl overflow-hidden flex flex-col md:flex-row shadow-2xl border border-white/5"
          >
            {/* Left Side: Branding */}
            <div className="md:w-[45%] bg-emerald-600 p-12 flex flex-col justify-between relative overflow-hidden dot-pattern">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-16">
                  <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl text-white">
                    <Wallet size={28} />
                  </div>
                  <h2 className="text-2xl font-black text-white font-display">Cartera</h2>
                </div>
                
                <h1 className="text-5xl font-black text-white leading-[1.1] font-display mb-6">
                  Toma el control de tu futuro financiero.
                </h1>
                
                <p className="text-emerald-50 text-lg font-medium leading-relaxed opacity-90">
                  La forma más inteligente y visual de gestionar tus gastos, ahorros y metas personales.
                </p>
              </div>
            </div>

            {/* Right Side: Form */}
            <div className="md:w-[55%] p-12 md:p-16 flex flex-col justify-center">
              <div className="mb-10">
                <h3 className="text-3xl font-black text-white font-display mb-2">Bienvenido</h3>
                <p className="text-stone-500 font-medium">Introduce tus credenciales para continuar</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] ml-1">Usuario</label>
                  <div className="relative group">
                    <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-500 group-focus-within:text-emerald-500 transition-colors" size={20} />
                    <input 
                      type="text"
                      required
                      value={loginData.username}
                      onChange={e => setLoginData({...loginData, username: e.target.value})}
                      placeholder="Tu nombre de usuario"
                      className="w-full bg-stone-900/50 border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-white placeholder:text-stone-600 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] ml-1">Contraseña</label>
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-500 group-focus-within:text-emerald-500 transition-colors" size={20} />
                    <input 
                      type="password"
                      required
                      value={loginData.password}
                      onChange={e => setLoginData({...loginData, password: e.target.value})}
                      placeholder="••••••••"
                      className="w-full bg-stone-900/50 border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-white placeholder:text-stone-600 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all outline-none"
                    />
                  </div>
                </div>

                {authError && (
                  <motion.p 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-red-500 text-xs font-bold text-center bg-red-500/10 py-3 rounded-xl border border-red-500/20"
                  >
                    {authError}
                  </motion.p>
                )}

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-2xl font-black shadow-xl shadow-emerald-900/20 transition-all flex items-center justify-center gap-3 group"
                >
                  Iniciar Sesión
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </form>

              <div className="mt-12 flex items-center justify-end text-xs font-bold">
                <span className="text-stone-700">V2.0.0</span>
              </div>
            </div>
          </motion.div>
          
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="fixed bottom-8 right-8 p-4 bg-[#141414] text-stone-400 rounded-2xl shadow-2xl border border-white/5 transition-all hover:scale-110 active:scale-95"
          >
            {darkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(darkMode && "dark")}>
      <div className="min-h-screen bg-stone-50 dark:bg-[#0a0a0a] text-stone-900 dark:text-stone-100 font-sans pb-20 transition-colors duration-300 relative overflow-hidden">
        {darkMode && <div className="absolute inset-0 dot-pattern-dark pointer-events-none" />}
        
        {/* Header */}
        <header className="bg-[#0a0a0a] border-b border-white/5 sticky top-0 z-20 px-4 py-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-lg shadow-emerald-900/20">
                <Wallet size={20} />
              </div>
              <h1 className="text-xl font-black tracking-tight font-display text-white">Cartera</h1>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="text-stone-500 hover:text-white transition-colors"
                  aria-label="Toggle dark mode"
                >
                  {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <button
                  onClick={handleLogout}
                  className="text-stone-500 hover:text-white transition-colors"
                  aria-label="Cerrar sesión"
                >
                  <LogOut size={20} />
                </button>
              </div>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowExpenseForm(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 transition-all shadow-xl shadow-emerald-900/20 font-bold text-sm"
              >
                <Plus size={18} />
                <span>Nuevo Gasto</span>
              </motion.button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8 space-y-8 relative z-10">
          {/* Search & Filters */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full max-w-md group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-500 group-focus-within:text-emerald-500 transition-colors">
                <div className="relative">
                  <div className="w-4 h-4 border-2 border-current rounded-full" />
                  <div className="w-2 h-0.5 bg-current absolute bottom-0 right-0 rotate-45 translate-x-1 translate-y-1" />
                </div>
              </div>
              <input 
                type="text"
                placeholder="Buscar gastos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#141414] border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-white placeholder:text-stone-600 focus:ring-2 focus:ring-emerald-500/50 transition-all outline-none"
              />
            </div>
            <button className="bg-[#141414] border border-white/5 px-6 py-4 rounded-2xl text-stone-400 hover:text-white transition-all flex items-center gap-3 font-bold text-sm">
              <div className="flex flex-col gap-1">
                <div className="w-4 h-0.5 bg-current" />
                <div className="w-2 h-0.5 bg-current mx-auto" />
                <div className="w-1 h-0.5 bg-current mx-auto" />
              </div>
              Filtros
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'GASTO TOTAL', value: `${totalExpenses.toLocaleString()}€`, sub: 'Desde el inicio', icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/10' },
              { label: 'ESTE MES', value: `${monthlyExpenses.toLocaleString()}€`, sub: format(new Date(), 'MMMM yyyy', { locale: es }), icon: Calendar, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
              { label: 'METAS ACTIVAS', value: goals.length, sub: 'Objetivos de ahorro', icon: Target, color: 'text-blue-500', bg: 'bg-blue-500/10' }
            ].map((card, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-[#141414] p-8 rounded-[2.5rem] border border-white/5 flex flex-col gap-4 group hover:border-white/10 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-xl", card.bg, card.color)}>
                    <card.icon size={18} />
                  </div>
                  <span className="text-[10px] font-black text-stone-500 uppercase tracking-[0.2em]">{card.label}</span>
                </div>
                <div>
                  <div className="text-4xl font-black text-white font-display">{card.value}</div>
                  <div className="text-[10px] font-bold text-stone-600 uppercase tracking-wider mt-1">{card.sub}</div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Charts & Goals */}
            <div className="lg:col-span-2 space-y-8">
              {/* Distribution of Expenses */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#141414] rounded-[3rem] p-10 border border-white/5"
              >
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h3 className="text-2xl font-black text-white font-display">Distribución de Gastos</h3>
                    <p className="text-stone-500 text-sm font-medium">Análisis visual por categorías</p>
                  </div>
                  <div className="flex bg-stone-900/50 p-1.5 rounded-2xl border border-white/5">
                    <button 
                      onClick={() => setActiveChartTab('categories')}
                      className={cn(
                        "px-6 py-2.5 text-xs font-black rounded-xl transition-all uppercase tracking-wider",
                        activeChartTab === 'categories' ? "bg-stone-800 text-white shadow-lg" : "text-stone-500 hover:text-stone-300"
                      )}
                    >
                      Categorías
                    </button>
                    <button 
                      onClick={() => setActiveChartTab('trend')}
                      className={cn(
                        "px-6 py-2.5 text-xs font-black rounded-xl transition-all uppercase tracking-wider",
                        activeChartTab === 'trend' ? "bg-stone-800 text-white shadow-lg" : "text-stone-500 hover:text-stone-300"
                      )}
                    >
                      Tendencia
                    </button>
                  </div>
                </div>

                <div className="h-[350px] flex items-center justify-center">
                  {categoryData.length > 0 ? (
                    activeChartTab === 'categories' ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={110}
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
                              borderRadius: '24px', 
                              border: 'none', 
                              boxShadow: '0 20px 50px rgba(0,0,0,0.3)', 
                              padding: '16px',
                              backgroundColor: '#1c1917',
                              color: '#f5f5f4'
                            }}
                            itemStyle={{ fontSize: '14px', fontWeight: '900' }}
                            formatter={(value: number) => [`${value.toLocaleString()}€`, 'Total']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trendData}>
                          <XAxis dataKey="name" hide />
                          <YAxis hide />
                          <Tooltip 
                            cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 16 }}
                            contentStyle={{ borderRadius: '24px', border: 'none', backgroundColor: '#1c1917', color: '#f5f5f4' }}
                          />
                          <Bar dataKey="total" fill="#10b981" radius={[8, 8, 8, 8]} barSize={32} />
                        </BarChart>
                      </ResponsiveContainer>
                    )
                  ) : (
                    <div className="flex flex-col items-center justify-center text-stone-700 gap-4">
                      <PieChartIcon size={64} strokeWidth={1} className="opacity-20" />
                      <div className="text-center">
                        <p className="text-sm font-black uppercase tracking-widest">Sin datos suficientes</p>
                        <p className="text-xs font-medium text-stone-600 mt-1">Registra gastos para ver el desglose</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Savings Goals */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-2xl font-black text-white font-display">Metas de Ahorro</h3>
                  <button 
                    onClick={() => setShowGoalForm(true)}
                    className="text-emerald-500 hover:text-emerald-400 text-sm font-black flex items-center gap-2 uppercase tracking-widest"
                  >
                    <Plus size={20} /> Nueva Meta
                  </button>
                </div>
                
                {goals.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {goals.map(goal => {
                      const progress = (goal.current_amount / goal.target_amount) * 100;
                      return (
                        <div key={goal.id} className="bg-[#141414] p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-lg font-black text-white font-display">{goal.name}</h4>
                              <p className="text-[10px] text-stone-500 font-black uppercase tracking-widest mt-1">
                                {goal.deadline ? format(parseISO(goal.deadline), 'dd MMM yyyy', { locale: es }) : 'Sin fecha'}
                              </p>
                            </div>
                            <div className="text-2xl font-black text-emerald-500 font-display">{Math.round(progress)}%</div>
                          </div>
                          <div className="h-2 bg-stone-900 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} />
                          </div>
                          <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                            <span className="text-stone-500">{goal.current_amount.toLocaleString()}€</span>
                            <span className="text-white">Objetivo: {goal.target_amount.toLocaleString()}€</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-[#141414] border-2 border-dashed border-emerald-500/20 rounded-[3rem] py-20 flex flex-col items-center justify-center text-stone-600 gap-4">
                    <div className="w-20 h-20 rounded-[2rem] bg-emerald-500/5 flex items-center justify-center text-emerald-500">
                      <Target size={40} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-black text-white uppercase tracking-[0.2em]">Tu primera meta</p>
                      <p className="text-xs font-medium text-stone-600 mt-1">Define un objetivo y empieza a ahorrar hoy</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Budgets by Category */}
              <div className="bg-[#141414] p-10 rounded-[3rem] border border-white/5 flex items-center justify-between group cursor-pointer hover:border-white/10 transition-all">
                <div>
                  <h3 className="text-2xl font-black text-white font-display">Presupuestos por Categoría</h3>
                  <p className="text-stone-500 text-sm font-medium">Controla tus límites mensuales</p>
                </div>
                <div className="p-4 bg-stone-900/50 rounded-2xl text-stone-600 group-hover:text-white transition-colors">
                  <BarChart3 size={24} />
                </div>
              </div>

              {/* Recurring Expenses */}
              <div className="bg-[#141414] p-10 rounded-[3rem] border border-white/5 space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-white font-display">Gastos Recurrentes</h3>
                    <p className="text-stone-500 text-sm font-medium">Suscripciones y pagos fijos</p>
                  </div>
                  <button className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl hover:bg-emerald-500/20 transition-all">
                    <Plus size={24} />
                  </button>
                </div>
                <div className="py-10 text-center text-stone-600 italic text-sm font-medium">
                  No tienes gastos recurrentes configurados
                </div>
              </div>
            </div>

            {/* Right Column: History Sidebar */}
            <div className="space-y-6">
              <div className="bg-[#141414] rounded-[3rem] border border-white/5 flex flex-col min-h-[800px] overflow-hidden">
                {/* Tabs */}
                <div className="grid grid-cols-2 p-2 bg-stone-900/30">
                  <button 
                    onClick={() => setActiveHistoryTab('expenses')}
                    className={cn(
                      "py-4 text-xs font-black uppercase tracking-widest transition-all rounded-2xl",
                      activeHistoryTab === 'expenses' ? "bg-[#1c1c1c] text-white shadow-xl" : "text-stone-600 hover:text-stone-400"
                    )}
                  >
                    Gastos
                  </button>
                  <button 
                    onClick={() => setActiveHistoryTab('income')}
                    className={cn(
                      "py-4 text-xs font-black uppercase tracking-widest transition-all rounded-2xl",
                      activeHistoryTab === 'income' ? "bg-[#1c1c1c] text-white shadow-xl" : "text-stone-600 hover:text-stone-400"
                    )}
                  >
                    Ingresos
                  </button>
                </div>

                <div className="p-8 flex-1 flex flex-col gap-8">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <select 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className="bg-stone-900/50 border border-white/5 rounded-xl px-4 py-2 text-xs font-black text-white appearance-none cursor-pointer"
                      >
                        {Array.from({ length: 12 }).map((_, i) => (
                          <option key={i} value={i}>{format(new Date(2024, i), 'MMMM', { locale: es })}</option>
                        ))}
                      </select>
                      <select 
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="bg-stone-900/50 border border-white/5 rounded-xl px-4 py-2 text-xs font-black text-white appearance-none cursor-pointer"
                      >
                        {[2023, 2024, 2025, 2026].map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                    <button className="p-2 text-stone-600 hover:text-white transition-colors">
                      <TrendingUp size={18} className="rotate-45" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                    {searchedExpenses.length > 0 ? searchedExpenses.map(expense => {
                      const Icon = ICON_MAP[expense.category_icon] || MoreHorizontal;
                      return (
                        <motion.div 
                          layout
                          key={expense.id}
                          className="flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-4">
                            <div 
                              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
                              style={{ backgroundColor: expense.category_color }}
                            >
                              <Icon size={20} />
                            </div>
                            <div>
                              <div className="font-black text-sm text-white">{expense.description || expense.category_name}</div>
                              <div className="text-[10px] text-stone-500 font-black uppercase tracking-widest mt-0.5">{format(parseISO(expense.date), 'dd MMM', { locale: es })}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="font-black text-sm text-white">-{expense.amount.toLocaleString()}€</div>
                            <button 
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="opacity-0 group-hover:opacity-100 p-2 text-stone-600 hover:text-red-500 transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </motion.div>
                      );
                    }) : (
                      <div className="flex-1 flex flex-col items-center justify-center gap-6 py-20">
                        <div className="w-24 h-24 rounded-[2.5rem] bg-stone-900/50 flex items-center justify-center text-stone-800">
                          <Wallet size={48} />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-black text-white uppercase tracking-[0.2em]">Sin Gastos</p>
                          <p className="text-xs font-medium text-stone-600 mt-1">Empieza a registrar tus movimientos</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

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
                className="relative bg-white dark:bg-stone-900 w-full max-w-md rounded-3xl shadow-2xl p-8"
              >
                <h2 className="text-2xl font-bold mb-6 text-stone-900 dark:text-stone-100">Registrar Gasto</h2>
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
                className="relative bg-white dark:bg-stone-900 w-full max-w-md rounded-3xl shadow-2xl p-8"
              >
                <h2 className="text-2xl font-bold mb-6 text-stone-900 dark:text-stone-100">Nueva Meta de Ahorro</h2>
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
      </div>
    </div>
  );
}
