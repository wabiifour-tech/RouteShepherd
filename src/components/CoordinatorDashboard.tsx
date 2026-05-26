'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Bus, MapPin, Clock, Users, BarChart3, Bell, Send, Loader2, AlertTriangle, CheckCircle, Route as RouteIcon, Activity, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';
import type { Bus as BusType, Route as RouteType, PickupPoint, DemandForecast, NotificationItem } from '@/lib/store';

const statusColors: Record<string, string> = {
  available: 'bg-green-500',
  'in-transit': 'bg-blue-500',
  loading: 'bg-yellow-500',
  maintenance: 'bg-red-500',
};

const statusTextColors: Record<string, string> = {
  available: 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
  'in-transit': 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
  loading: 'text-yellow-700 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30',
  maintenance: 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
};

export default function CoordinatorDashboard() {
  const [buses, setBuses] = useState<BusType[]>([]);
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [demandForecasts, setDemandForecasts] = useState<DemandForecast[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Dispatch form state
  const [dispatchBusId, setDispatchBusId] = useState('');
  const [dispatchRouteId, setDispatchRouteId] = useState('');
  const [dispatching, setDispatching] = useState(false);

  // Alert form state
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('info');
  const [alertTarget, setAlertTarget] = useState('all');
  const [sendingAlert, setSendingAlert] = useState(false);

  // Selected forecast pickup point
  const [forecastPickupPoint, setForecastPickupPoint] = useState('all');

  const loadData = useCallback(async () => {
    try {
      const [busesRes, routesRes, ppRes, forecastsRes, notifsRes] = await Promise.all([
        fetch('/api/buses'),
        fetch('/api/routes'),
        fetch('/api/pickup-points'),
        fetch('/api/demand-forecasts'),
        fetch('/api/notifications'),
      ]);
      setBuses(await busesRes.json());
      setRoutes(await routesRes.json());
      const ppData = await ppRes.json();
      setPickupPoints(ppData.filter((pp: PickupPoint) => pp.name !== 'Redemption City'));
      setDemandForecasts(await forecastsRes.json());
      setNotifications(await notifsRes.json());
    } catch (e) {
      console.error('Failed to load dashboard data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Auto-refresh every 5 seconds
    return () => clearInterval(interval);
  }, [loadData]);

  // Stats
  const totalBuses = buses.length;
  const availableBuses = buses.filter((b) => b.status === 'available').length;
  const inTransitBuses = buses.filter((b) => b.status === 'in-transit').length;
  const loadingBuses = buses.filter((b) => b.status === 'loading').length;
  const maintenanceBuses = buses.filter((b) => b.status === 'maintenance').length;
  const totalCapacity = buses.reduce((sum, b) => sum + b.capacity, 0);
  const totalLoad = buses.reduce((sum, b) => sum + b.currentLoad, 0);

  // Demand forecast chart data
  const forecastChartData = (() => {
    const filteredForecasts = forecastPickupPoint === 'all'
      ? demandForecasts
      : demandForecasts.filter((f) => f.pickupPointId === forecastPickupPoint);

    const byTimeSlot: Record<string, { slot: string; total: number; avgConfidence: number; count: number }> = {};
    for (const f of filteredForecasts) {
      if (!byTimeSlot[f.timeSlot]) {
        byTimeSlot[f.timeSlot] = { slot: f.timeSlot, total: 0, avgConfidence: 0, count: 0 };
      }
      byTimeSlot[f.timeSlot].total += f.predictedDemand;
      byTimeSlot[f.timeSlot].avgConfidence += f.confidence || 0;
      byTimeSlot[f.timeSlot].count += 1;
    }

    return Object.values(byTimeSlot).map((v) => ({
      name: v.slot,
      demand: v.total,
      confidence: Math.round((v.avgConfidence / v.count) * 100),
    }));
  })();

  // Available buses for dispatch
  const availableForDispatch = buses.filter((b) => b.status === 'available');

  // Dispatch handler
  const handleDispatch = async () => {
    if (!dispatchBusId || !dispatchRouteId) {
      toast.error('Please select both a bus and a route');
      return;
    }
    setDispatching(true);
    try {
      const res = await fetch('/api/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ busId: dispatchBusId, routeId: dispatchRouteId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Dispatch failed');
      }
      toast.success('Bus dispatched successfully!');
      setDispatchBusId('');
      setDispatchRouteId('');
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Dispatch failed');
    } finally {
      setDispatching(false);
    }
  };

  // Alert handler
  const handleSendAlert = async () => {
    if (!alertTitle || !alertMessage) {
      toast.error('Please fill in title and message');
      return;
    }
    setSendingAlert(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: alertTitle,
          message: alertMessage,
          type: alertType,
          target: alertTarget,
        }),
      });
      if (!res.ok) throw new Error('Failed to send alert');
      toast.success('Alert sent successfully!');
      setAlertTitle('');
      setAlertMessage('');
      loadData();
    } catch {
      toast.error('Failed to send alert');
    } finally {
      setSendingAlert(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1B5E20]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              Coordinator <span className="text-[#1B5E20]">Dashboard</span>
            </h1>
            <p className="text-muted-foreground">Real-time fleet management & dispatch</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="mr-1 h-3 w-3" />
            Refresh
          </Button>
        </motion.div>

        {/* Stats Overview */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Total Buses', value: totalBuses, icon: <Bus className="h-4 w-4" />, color: 'bg-[#1B5E20] text-white' },
            { label: 'Available', value: availableBuses, icon: <CheckCircle className="h-4 w-4" />, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
            { label: 'In Transit', value: inTransitBuses, icon: <Activity className="h-4 w-4" />, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
            { label: 'Loading', value: loadingBuses, icon: <Clock className="h-4 w-4" />, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
            { label: 'Maintenance', value: maintenanceBuses, icon: <AlertTriangle className="h-4 w-4" />, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
            { label: 'Fleet Load', value: `${Math.round((totalLoad / totalCapacity) * 100)}%`, icon: <Users className="h-4 w-4" />, color: 'bg-[#F9A825]/20 text-[#F9A825]' },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="shadow-md">
                <CardContent className="p-4">
                  <div className={`mb-2 inline-flex rounded-lg p-2 ${stat.color}`}>
                    {stat.icon}
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Tabs defaultValue="demand" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="demand" className="text-xs sm:text-sm">Demand</TabsTrigger>
            <TabsTrigger value="fleet" className="text-xs sm:text-sm">Fleet</TabsTrigger>
            <TabsTrigger value="dispatch" className="text-xs sm:text-sm">Dispatch</TabsTrigger>
            <TabsTrigger value="routes" className="text-xs sm:text-sm">Routes</TabsTrigger>
            <TabsTrigger value="alerts" className="text-xs sm:text-sm">Alerts</TabsTrigger>
          </TabsList>

          {/* DEMAND FORECAST TAB */}
          <TabsContent value="demand">
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-[#1B5E20]" />
                    AI Demand Forecast
                  </CardTitle>
                  <Select value={forecastPickupPoint} onValueChange={setForecastPickupPoint}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by point" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      <SelectItem value="all">All Pickup Points</SelectItem>
                      {pickupPoints.map((pp) => (
                        <SelectItem key={pp.id} value={pp.id}>{pp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={forecastChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                      <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--popover)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="demand" name="Predicted Demand" radius={[4, 4, 0, 0]}>
                        {forecastChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.confidence > 80 ? '#1B5E20' : entry.confidence > 60 ? '#F9A825' : '#ef4444'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded bg-[#1B5E20]" /> High Confidence (&gt;80%)
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded bg-[#F9A825]" /> Medium Confidence (60-80%)
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded bg-red-500" /> Low Confidence (&lt;60%)
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FLEET STATUS TAB */}
          <TabsContent value="fleet">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bus className="h-5 w-5 text-[#1B5E20]" />
                  Fleet Status Grid
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {buses.map((bus) => (
                    <motion.div
                      key={bus.id}
                      whileHover={{ scale: 1.03 }}
                      className="cursor-pointer rounded-lg border p-3 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className={`h-3 w-3 rounded-full ${statusColors[bus.status]}`} />
                        <Badge variant="outline" className={`text-[10px] ${statusTextColors[bus.status]}`}>
                          {bus.status}
                        </Badge>
                      </div>
                      <p className="mb-1 font-bold text-xs">{bus.plateNumber}</p>
                      {bus.driverName && (
                        <p className="text-[10px] text-muted-foreground truncate">{bus.driverName}</p>
                      )}
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-[10px]">
                          <span>Load</span>
                          <span>{bus.currentLoad}/{bus.capacity}</span>
                        </div>
                        <Progress value={(bus.currentLoad / bus.capacity) * 100} className="mt-1 h-1.5" />
                      </div>
                      {bus.route && (
                        <p className="mt-1 text-[10px] text-muted-foreground truncate">
                          {bus.route.name}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DISPATCH TAB */}
          <TabsContent value="dispatch">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RouteIcon className="h-5 w-5 text-[#1B5E20]" />
                    Dispatch Bus
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Select Available Bus</Label>
                    <Select value={dispatchBusId} onValueChange={setDispatchBusId}>
                      <SelectTrigger>
                        <SelectValue placeholder={`${availableForDispatch.length} buses available`} />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {availableForDispatch.map((bus) => (
                          <SelectItem key={bus.id} value={bus.id}>
                            {bus.plateNumber} — {bus.driverName || 'No driver'} (Cap: {bus.capacity})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Assign Route</Label>
                    <Select value={dispatchRouteId} onValueChange={setDispatchRouteId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select route" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {routes.map((route) => (
                          <SelectItem key={route.id} value={route.id}>
                            {route.name} ({route.distanceKm}km)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full bg-[#1B5E20] text-white hover:bg-[#1B5E20]/90"
                    size="lg"
                    onClick={handleDispatch}
                    disabled={dispatching || !dispatchBusId || !dispatchRouteId}
                  >
                    {dispatching ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Bus className="mr-2 h-4 w-4" />
                    )}
                    {dispatching ? 'Dispatching...' : 'Dispatch Bus'}
                  </Button>
                </CardContent>
              </Card>

              {/* Recently dispatched */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-[#1B5E20]" />
                    Active Deployments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 space-y-3 overflow-y-auto">
                    {buses
                      .filter((b) => b.status === 'in-transit' || b.status === 'loading')
                      .map((bus) => (
                        <div key={bus.id} className="flex items-center gap-3 rounded-lg border p-3">
                          <div className={`h-3 w-3 shrink-0 rounded-full ${statusColors[bus.status]} animate-pulse`} />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm">{bus.plateNumber}</p>
                            {bus.route && (
                              <p className="text-xs text-muted-foreground truncate">{bus.route.name}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="text-xs">{bus.status}</Badge>
                            <p className="mt-1 text-xs text-muted-foreground">{bus.currentLoad}/{bus.capacity}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ROUTES TAB */}
          <TabsContent value="routes">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RouteIcon className="h-5 w-5 text-[#1B5E20]" />
                  Route Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[600px] overflow-y-auto">
                  <div className="space-y-3">
                    {routes.map((route) => {
                      const routeBuses = buses.filter((b) => b.routeId === route.id);
                      const activeBuses = routeBuses.filter((b) => b.status !== 'maintenance');
                      const routeDemand = demandForecasts.filter((f) => f.pickupPointId === route.fromPointId);
                      const totalDemand = routeDemand.reduce((sum, f) => sum + f.predictedDemand, 0);

                      return (
                        <div key={route.id} className="rounded-lg border p-4 shadow-sm">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm">{route.name}</h4>
                              <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {route.distanceKm}km
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  ~{route.estimatedMin}min
                                </span>
                                <span className="flex items-center gap-1">
                                  <Bus className="h-3 w-3" />
                                  {activeBuses.length} active
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={totalDemand > 500 ? 'destructive' : totalDemand > 200 ? 'secondary' : 'outline'}>
                                Demand: {totalDemand}
                              </Badge>
                              <Badge variant={route.status === 'active' ? 'default' : 'secondary'}
                                className={route.status === 'active' ? 'bg-green-500' : ''}>
                                {route.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ALERTS TAB */}
          <TabsContent value="alerts">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Send Alert Form */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-[#1B5E20]" />
                    Send Alert
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Alert Title</Label>
                    <Input
                      placeholder="e.g., High Demand Alert"
                      value={alertTitle}
                      onChange={(e) => setAlertTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Message</Label>
                    <Textarea
                      placeholder="Alert details..."
                      value={alertMessage}
                      onChange={(e) => setAlertMessage(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Type</Label>
                      <Select value={alertType} onValueChange={setAlertType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">Info</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                          <SelectItem value="success">Success</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Target</Label>
                      <Select value={alertTarget} onValueChange={setAlertTarget}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Everyone</SelectItem>
                          <SelectItem value="coordinator">Coordinators</SelectItem>
                          <SelectItem value="passenger">Passengers</SelectItem>
                          <SelectItem value="driver">Drivers</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    className="w-full bg-[#1B5E20] text-white hover:bg-[#1B5E20]/90"
                    onClick={handleSendAlert}
                    disabled={sendingAlert}
                  >
                    {sendingAlert ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    {sendingAlert ? 'Sending...' : 'Send Alert'}
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Notifications */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-[#F9A825]" />
                    Recent Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 space-y-3 overflow-y-auto">
                    {notifications.map((notif) => (
                      <div key={notif.id} className="rounded-lg border p-3 shadow-sm">
                        <div className="mb-1 flex items-center gap-2">
                          {notif.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                          {notif.type === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                          {notif.type === 'info' && <Bell className="h-4 w-4 text-blue-500" />}
                          <span className="font-medium text-sm">{notif.title}</span>
                          <Badge variant="outline" className="ml-auto text-[10px]">{notif.target}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{notif.message}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
