import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// تم إزالة Select/Alert لأنهما لم يُستخدما في الكود الأصلي وتسببا في أخطاء
import { Users, TrendingUp, DollarSign, CheckCircle, XCircle, Clock, Trash2, LineChart, Lock } from 'lucide-react';

// 1. تعريف كائن window.storage ليفهمه TypeScript
declare global {
  interface Window {
    storage: {
      list: (prefix: string, boolean: boolean) => Promise<{ keys: string[] }>;
      get: (key: string, boolean: boolean) => Promise<{ value: string } | null>;
      set: (key: string, value: string, boolean: boolean) => Promise<void>;
      delete: (key: string, boolean: boolean) => Promise<void>;
    };
  }
}

// 2. تعريف شكل بيانات المستخدم والاستثمار
interface User {
  id: string;
  name: string;
  email: string;
  [key: string]: any;
}

interface Investment {
  id: string;
  userId: string;
  amount: number;
  status: 'active' | 'pending' | 'completed' | 'cancelled';
  date: string;
  multiplier?: number;
  actualReturn?: number;
  tradeType?: string;
  completedAt?: string;
  startDate?: string;
}

export default function Admin() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // تحديد نوع المصفوفات لحل أخطاء TS2345 و TS2339
  const [users, setUsers] = useState<User[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  
  const [btcPrice, setBtcPrice] = useState(45000);
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  
  // استخدام المتغيرات مباشرة في الدوال
  const multiplier = '1.6'; 
  const tradeType = 'single';

  // شارت البتكوين المباشر
  useEffect(() => {
    const fetchRealBTCPrice = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
        const data = await response.json();
        const realPrice = data.bitcoin.usd;
        setBtcPrice(realPrice);
        setPriceHistory(prev => [...prev.slice(-59), realPrice]);
      } catch (error) {
        console.error('خطأ في جلب سعر BTC:', error);
      }
    };

    if (isAuthenticated) {
      fetchRealBTCPrice();
      const interval = setInterval(fetchRealBTCPrice, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      if (!window.storage) {
        console.warn("Storage API not found on window object");
        return;
      }

      const usersResult = await window.storage.list('user:', true);
      const investmentsResult = await window.storage.list('investment:', true);
      
      if (usersResult?.keys) {
        const loadedUsers: User[] = [];
        for (const key of usersResult.keys) {
          try {
            const userData = await window.storage.get(key, true);
            if (userData) loadedUsers.push(JSON.parse(userData.value));
          } catch (e) {}
        }
        setUsers(loadedUsers);
      }

      if (investmentsResult?.keys) {
        const loadedInvestments: Investment[] = [];
        for (const key of investmentsResult.keys) {
          try {
            const invData = await window.storage.get(key, true);
            if (invData) loadedInvestments.push(JSON.parse(invData.value));
          } catch (e) {}
        }
        setInvestments(loadedInvestments);
      }
    } catch (error) {
      console.error('خطأ في تحميل البيانات:', error);
    }
  };

  const updateInvestmentStatus = async (investmentId: string, newStatus: Investment['status'], mult: string) => {
    try {
      if (!window.storage) return;
      const investment = investments.find(inv => inv.id === investmentId);
      if (!investment) return;

      const finalReturn = investment.amount * parseFloat(mult);
      const updatedInvestment: Investment = {
        ...investment,
        status: newStatus,
        actualReturn: finalReturn,
        multiplier: parseFloat(mult),
        tradeType: tradeType,
        completedAt: new Date().toISOString()
      };

      await window.storage.set(`investment:${investmentId}`, JSON.stringify(updatedInvestment), true);
      setInvestments(prev => prev.map(inv => inv.id === investmentId ? updatedInvestment : inv));
      alert('تم تحديث الاستثمار بنجاح!');
    } catch (error) {
      console.error('خطأ في تحديث الاستثمار:', error);
      alert('حدث خطأ في التحديث');
    }
  };

  const deleteInvestment = async (investmentId: string) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('هل أنت متأكد من حذف هذا الاستثمار؟')) return;
    
    try {
      if (!window.storage) return;
      await window.storage.delete(`investment:${investmentId}`, true);
      setInvestments(prev => prev.filter(inv => inv.id !== investmentId));
      alert('تم الحذف بنجاح');
    } catch (error) {
      console.error('خطأ في الحذف:', error);
    }
  };

  const approveInvestment = async (investmentId: string) => {
    try {
      if (!window.storage) return;
      const investment = investments.find(inv => inv.id === investmentId);
      if (!investment) return;

      const updatedInvestment: Investment = {
        ...investment,
        status: 'active',
        startDate: new Date().toISOString()
      };

      await window.storage.set(`investment:${investmentId}`, JSON.stringify(updatedInvestment), true);
      setInvestments(prev => prev.map(inv => inv.id === investmentId ? updatedInvestment : inv));
      alert('تمت الموافقة على الاستثمار');
    } catch (error) {
      console.error('خطأ في الموافقة:', error);
    }
  };

  const totalInvested = investments.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const activeInvestments = investments.filter(inv => inv.status === 'active').length;
  const pendingInvestments = investments.filter(inv => inv.status === 'pending').length;

  // صفحة تسجيل الدخول للأدمن
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-black to-purple-900">
        <Card className="w-96 shadow-2xl">
          <CardHeader className="text-center bg-gradient-to-r from-purple-600 to-black text-white rounded-t-lg">
            <Lock className="w-16 h-16 mx-auto mb-4" />
            <CardTitle className="text-3xl">دخول الأدمن</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <Label>كلمة المرور</Label>
                <Input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  className="mt-2"
                  // 3. تم إضافة نوع الحدث هنا لحل مشكلة TS7006
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter') {
                      if (password === 'admin123') {
                        setIsAuthenticated(true);
                      } else {
                        alert('كلمة مرور خاطئة!');
                      }
                    }
                  }}
                />
              </div>
              <Button 
                onClick={() => {
                  if (password === 'admin123') {
                    setIsAuthenticated(true);
                  } else {
                    alert('كلمة مرور خاطئة!');
                  }
                }}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-6"
              >
                دخول
              </Button>
              <p className="text-sm text-center text-gray-500">
                كلمة المرور الافتراضية: admin123
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // لوحة التحكم الرئيسية
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-purple-900 mb-2">لوحة تحكم الأدمن 👑</h1>
            <p className="text-gray-600">إدارة كاملة للمنصة والمستثمرين</p>
          </div>
          <Button 
            onClick={() => setIsAuthenticated(false)}
            variant="destructive"
          >
            تسجيل الخروج
          </Button>
        </div>

        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-purple-500 to-purple-700 text-white hover:shadow-xl transition">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Users className="w-12 h-12" />
                <div>
                  <p className="text-sm opacity-90">إجمالي المستخدمين</p>
                  <p className="text-3xl font-bold">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-700 text-white hover:shadow-xl transition">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <DollarSign className="w-12 h-12" />
                <div>
                  <p className="text-sm opacity-90">إجمالي الاستثمارات</p>
                  <p className="text-3xl font-bold">${totalInvested.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-700 text-white hover:shadow-xl transition">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <TrendingUp className="w-12 h-12" />
                <div>
                  <p className="text-sm opacity-90">استثمارات نشطة</p>
                  <p className="text-3xl font-bold">{activeInvestments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-700 text-white hover:shadow-xl transition">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Clock className="w-12 h-12" />
                <div>
                  <p className="text-sm opacity-90">قيد المراجعة</p>
                  <p className="text-3xl font-bold">{pendingInvestments}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bitcoin Price Chart */}
        <Card className="mb-8 bg-black text-white shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="w-6 h-6 text-orange-500" />
              سعر البتكوين المباشر (CoinGecko API)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-6">
              <p className="text-6xl font-bold text-orange-500 mb-2">${btcPrice.toLocaleString()}</p>
              <p className="text-gray-400">يتم التحديث كل 30 ثانية</p>
            </div>
            {priceHistory.length > 0 && (
              <div className="h-40 flex items-end gap-1 bg-gray-900 p-4 rounded-lg">
                {priceHistory.map((price, idx) => {
                  const maxPrice = Math.max(...priceHistory);
                  const minPrice = Math.min(...priceHistory);
                  const range = maxPrice - minPrice || 1;
                  const height = ((price - minPrice) / range) * 100;
                  return (
                    <div
                      key={idx}
                      className="flex-1 bg-gradient-to-t from-orange-600 to-orange-400 rounded-t transition-all"
                      style={{ height: `${Math.max(height, 5)}%` }}
                      title={`$${price.toLocaleString()}`}
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="investments" className="w-full">
          <TabsList className="bg-purple-100 mb-6">
            <TabsTrigger value="investments" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              إدارة الاستثمارات ({investments.length})
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              المستخدمين ({users.length})
            </TabsTrigger>
          </TabsList>

          {/* إدارة الاستثمارات */}
          <TabsContent value="investments">
            <div className="space-y-4">
              {investments.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-gray-500 text-xl">لا توجد استثمارات بعد</p>
                  </CardContent>
                </Card>
              ) : (
                investments.map((investment) => (
                  <Card key={investment.id} className="border-2 hover:border-purple-400 transition shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-4">
                            <Badge className={
                              investment.status === 'active' ? 'bg-blue-500' :
                              investment.status === 'completed' ? 'bg-green-500' :
                              investment.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                            }>
                              {investment.status === 'active' ? '🔵 نشط' :
                               investment.status === 'completed' ? '✅ مكتمل' :
                               investment.status === 'pending' ? '⏳ قيد المراجعة' : '❌ ملغي'}
                            </Badge>
                            <span className="text-sm text-gray-500">ID: {investment.id.slice(0, 8)}</span>
                          </div>

                          <div className="space-y-2">
                            <h3 className="text-xl font-bold">
                                {users.find(u => u.id === investment.userId)?.name || 'مستخدم غير معروف'}
                            </h3>
                            <p className="text-gray-600">
                                المبلغ المستثمر: <span className="text-green-600 font-bold">${investment.amount}</span>
                            </p>
                            <p className="text-xs text-gray-400">
                                {new Date(investment.date).toLocaleString('ar-EG')}
                            </p>
                          </div>
                        </div>

                        {/* أزرار التحكم */}
                        <div className="flex flex-col gap-2">
                            {investment.status === 'pending' && (
                                <Button 
                                    onClick={() => approveInvestment(investment.id)}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                    <CheckCircle className="w-4 h-4 ml-2" /> موافقة
                                </Button>
                            )}

                            {investment.status === 'active' && (
                                <div className="flex gap-2">
                                    <Button 
                                        onClick={() => updateInvestmentStatus(investment.id, 'completed', multiplier)}
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        <TrendingUp className="w-4 h-4 ml-2" /> ربح
                                    </Button>
                                    <Button 
                                        onClick={() => updateInvestmentStatus(investment.id, 'cancelled', '0')}
                                        variant="destructive"
                                    >
                                        <XCircle className="w-4 h-4 ml-2" /> خسارة
                                    </Button>
                                </div>
                            )}

                            <Button 
                                onClick={() => deleteInvestment(investment.id)}
                                variant="outline"
                                className="text-red-600 hover:bg-red-50 border-red-200"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* إدارة المستخدمين */}
          <TabsContent value="users">
            <Card>
                <CardHeader>
                    <CardTitle>قائمة المستخدمين المسجلين</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {users.length === 0 ? (
                            <p className="text-center text-gray-500">لا يوجد مستخدمين</p>
                        ) : (
                            users.map((user, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
                                            {user.name ? user.name[0].toUpperCase() : 'U'}
                                        </div>
                                        <div>
                                            <p className="font-bold">{user.name}</p>
                                            <p className="text-sm text-gray-500">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-mono bg-gray-200 px-2 py-1 rounded">
                                            {user.id ? user.id.slice(0,8) : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
