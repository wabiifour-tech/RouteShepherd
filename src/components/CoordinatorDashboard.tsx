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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Bus, MapPin, Clock, Users, BarChart3, Bell, Send, Loader2, AlertTriangle, CheckCircle, Route as RouteIcon, Activity, RefreshCw, Plus, Trash2, Edit, UserPlus, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';
import dynamic from 'next/dynamic';
import type { Bus as BusType, Route as RouteType, PickupPoint, DemandForecast, NotificationItem } from '@/lib/store';
import 'leaflet/dist/leaflet.css';

const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then((mod) => mod.Polyline), { ssr: false });

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

interface DriverUser {
  id: string;
  email: string;
  name: string | null;
  driverPhone: string | null;
  role: string;
  assignedBuses: BusType[];
}

export default function CoordinatorDashboard() {
  const [buses, setBuses] = useState<BusType[]>([]);
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [demandForecasts, setDemandForecasts] = useState<DemandForecast[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [drivers, setDrivers] = useState<DriverUser[]>([]);
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
  const [alertUserId, setAlertUserId] = useState('');
  const [sendingAlert, setSendingAlert] = useState(false);

  // Selected forecast pickup point
  const [forecastPickupPoint, setForecastPickupPoint] = useState('all');

  // Driver management
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
  const [editDriverId, setEditDriverId] = useState<string | null>(null);
  const [driverName, setDriverName] = useState('');
  const [driverEmail, setDriverEmail] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverBusId, setDriverBusId] = useState('');
  const [driverPin, setDriverPin] = useState('');
  const [savingDriver, setSavingDriver] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState('demand');

  const loadData = useCallback(async () => {
    try {
      const [busesRes, routesRes, ppRes, forecastsRes, notifsRes, driversRes] = await Promise.all([
        fetch('/api/buses'),
        fetch('/api/routes'),
        fetch('/api/pickup-points'),
        fetch('/api/demand-forecasts'),
        fetch('/api/notifications'),
        fetch('/api/drivers'),
      ]);
      setBuses(await busesRes.json());
      setRoutes(await routesRes.json());
      const ppData = await ppRes.json();
      setPickupPoints(ppData.filter((pp: PickupPoint) => pp.name !== 'Redemption City'));
      setDemandForecasts(await forecastsRes.json());
      setNotifications(await notifsRes.json());
      setDrivers(await driversRes.json());
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

  // Buses without drivers
  const unassignedBuses = buses.filter((b) => !b.driverId);

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
          userId: alertUserId || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to send alert');
      toast.success('Alert sent successfully!');
      setAlertTitle('');
      setAlertMessage('');
      setAlertUserId('');
      loadData();
    } catch {
      toast.error('Failed to send alert');
    } finally {
      setSendingAlert(false);
    }
  };

  // Mark notification as read
  const handleMarkRead = async (notifId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notifId }),
      });
      loadData();
    } catch {
      // Silent fail
    }
  };

  // Driver management handlers
  const openAddDriver = () => {
    setEditDriverId(null);
    setDriverName('');
    setDriverEmail('');
    setDriverPhone('');
    setDriverBusId('');
    setDriverPin('');
    setDriverDialogOpen(true);
  };

  const openEditDriver = (driver: DriverUser) => {
    setEditDriverId(driver.id);
    setDriverName(driver.name || '');
    setDriverEmail(driver.email);
    setDriverPhone(driver.driverPhone || '');
    setDriverBusId(driver.assignedBuses?.[0]?.id || '');
    setDriverDialogOpen(true);
  };

  const handleSaveDriver = async () => {
    if (!driverName || !driverEmail || !driverPhone) {
      toast.error('Please fill in all driver details');
      return;
    }
    setSavingDriver(true);
    try {
      if (editDriverId) {
        const res = await fetch('/api/drivers', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editDriverId,
            name: driverName,
            email: driverEmail,
            phone: driverPhone,
            busId: driverBusId || null,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to update driver');
        }
        toast.success('Driver updated successfully!');
      } else {
        const res = await fetch('/api/drivers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: driverName,
            email: driverEmail,
            phone: driverPhone,
            pin: driverPin || undefined,
            busId: driverBusId || undefined,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to add driver');
        }
        const data = await res.json();
        toast.success(`Driver added successfully! PIN: ${data.assignedPin} — Share this PIN with the driver. They must change it on first login.`);
      }
      setDriverDialogOpen(false);
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save driver');
    } finally {
      setSavingDriver(false);
    }
  };

  const handleDeleteDriver = async (driverId: string) => {
    if (!confirm('Are you sure you want to remove this driver?')) return;
    try {
      const res = await fetch(`/api/drivers?id=${driverId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete driver');
      toast.success('Driver removed');
      loadData();
    } catch {
      toast.error('Failed to remove driver');
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
            { label: 'Fleet Load', value: totalCapacity > 0 ? `${Math.round((totalLoad / totalCapacity) * 100)}%` : '0%', icon: <Users className="h-4 w-4" />, color: 'bg-[#F9A825]/20 text-[#F9A825]' },
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex w-full overflow-x-auto gap-1 p-1">
            <TabsTrigger value="demand" className="text-xs whitespace-nowrap flex-shrink-0">Demand</TabsTrigger>
            <TabsTrigger value="fleet" className="text-xs whitespace-nowrap flex-shrink-0">Fleet</TabsTrigger>
            <TabsTrigger value="map" className="text-xs whitespace-nowrap flex-shrink-0">Map</TabsTrigger>
            <TabsTrigger value="dispatch" className="text-xs whitespace-nowrap flex-shrink-0">Dispatch</TabsTrigger>
            <TabsTrigger value="drivers" className="text-xs whitespace-nowrap flex-shrink-0">Drivers</TabsTrigger>
            <TabsTrigger value="routes" className="text-xs whitespace-nowrap flex-shrink-0">Routes</TabsTrigger>
            <TabsTrigger value="alerts" className="text-xs whitespace-nowrap flex-shrink-0">Alerts</TabsTrigger>
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
                      {bus.driver && (
                        <p className="text-[10px] text-muted-foreground truncate">{bus.driver.name}</p>
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

          {/* LIVE MAP TAB */}
          <TabsContent value="map">
            <Card className="overflow-hidden shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-[#1B5E20]" />
                    Live Fleet Map
                    <Badge variant="secondary" className="animate-pulse ml-2">Live</Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <div className="h-3 w-3 rounded-full bg-green-500" /> Available
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-3 w-3 rounded-full bg-blue-500" /> In Transit
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-3 w-3 rounded-full bg-yellow-500" /> Loading
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <CoordinatorMapComponent
                  buses={buses}
                  routes={routes}
                  pickupPoints={pickupPoints}
                />
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
                            {bus.plateNumber} — {bus.driver?.name || 'No driver'} (Cap: {bus.capacity})
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
                      .length === 0 ? (
                      <div className="py-8 text-center">
                        <Activity className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
                        <p className="text-muted-foreground text-sm">No active deployments</p>
                      </div>
                    ) : (
                      buses
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
                              {bus.latitude && bus.longitude && (
                                <p className="text-[10px] text-muted-foreground font-mono">
                                  {bus.latitude.toFixed(4)}, {bus.longitude.toFixed(4)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* DRIVERS TAB */}
          <TabsContent value="drivers">
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-[#1B5E20]" />
                    Driver Management
                  </CardTitle>
                  <Dialog open={driverDialogOpen} onOpenChange={setDriverDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-[#1B5E20] text-white hover:bg-[#1B5E20]/90" onClick={openAddDriver}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add Driver
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editDriverId ? 'Edit Driver' : 'Add New Driver'}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label>Driver Name *</Label>
                          <Input
                            placeholder="Full name"
                            value={driverName}
                            onChange={(e) => setDriverName(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Driver Email * <span className="text-muted-foreground font-normal">(This is their login)</span></Label>
                          <Input
                            type="email"
                            placeholder="driver@example.com"
                            value={driverEmail}
                            onChange={(e) => setDriverEmail(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Phone Number *</Label>
                          <Input
                            placeholder="+234-XXX-XXX-XXXX"
                            value={driverPhone}
                            onChange={(e) => setDriverPhone(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Assign to Bus</Label>
                          <Select value={driverBusId} onValueChange={setDriverBusId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a bus (optional)" />
                            </SelectTrigger>
                            <SelectContent className="max-h-64">
                              <SelectItem value="__none__">No bus assignment</SelectItem>
                              {unassignedBuses.map((bus) => (
                                <SelectItem key={bus.id} value={bus.id}>
                                  {bus.plateNumber} (Cap: {bus.capacity})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {!editDriverId && (
                          <div>
                            <Label>6-Digit PIN <span className="text-muted-foreground font-normal">(Auto-generated if left blank)</span></Label>
                            <Input
                              placeholder="Leave blank for auto-generated PIN"
                              value={driverPin}
                              onChange={(e) => setDriverPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              maxLength={6}
                            />
                            <p className="text-xs text-muted-foreground mt-1">The driver will use this PIN to sign in. A unique PIN will be auto-generated if left blank. The driver must change it on first login.</p>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button
                          className="bg-[#1B5E20] text-white hover:bg-[#1B5E20]/90"
                          onClick={handleSaveDriver}
                          disabled={savingDriver}
                        >
                          {savingDriver && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {editDriverId ? 'Save Changes' : 'Add Driver'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {drivers.length === 0 ? (
                  <div className="py-8 text-center">
                    <Users className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No drivers added yet.</p>
                    <Button variant="outline" className="mt-3" onClick={openAddDriver}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Your First Driver
                    </Button>
                  </div>
                ) : (
                  <div className="max-h-[500px] overflow-y-auto space-y-3">
                    {drivers.map((driver) => (
                      <div key={driver.id} className="flex items-center gap-3 rounded-lg border p-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1B5E20]/10">
                          <Users className="h-5 w-5 text-[#1B5E20]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm">{driver.name || 'Unnamed'}</p>
                          <p className="text-xs text-muted-foreground">{driver.email}</p>
                          {driver.driverPhone && (
                            <p className="text-xs text-muted-foreground">{driver.driverPhone}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          {driver.assignedBuses && driver.assignedBuses.length > 0 ? (
                            <Badge className="bg-[#1B5E20] text-white text-xs">
                              {driver.assignedBuses[0].plateNumber}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Unassigned</Badge>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDriver(driver)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteDriver(driver.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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
                  <div>
                    <Label>Specific User ID <span className="text-muted-foreground font-normal">(optional — leave blank for broadcast)</span></Label>
                    <Input
                      placeholder="User ID for direct notification"
                      value={alertUserId}
                      onChange={(e) => setAlertUserId(e.target.value)}
                    />
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
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5 text-[#F9A825]" />
                      Recent Notifications
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {notifications.filter((n) => !n.read).length} unread
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 space-y-3 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center">
                        <Bell className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`rounded-lg border p-3 shadow-sm transition-colors ${!notif.read ? 'bg-[#1B5E20]/5 border-[#1B5E20]/20' : ''}`}
                        >
                          <div className="mb-1 flex items-center gap-2">
                            {notif.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                            {notif.type === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                            {notif.type === 'info' && <Bell className="h-4 w-4 text-blue-500" />}
                            <span className="font-medium text-sm">{notif.title}</span>
                            <Badge variant="outline" className="ml-auto text-[10px]">{notif.target}</Badge>
                            {notif.userId && (
                              <Badge className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                Direct
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{notif.message}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(notif.createdAt).toLocaleString()}
                            </span>
                            {!notif.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] text-[#1B5E20]"
                                onClick={() => handleMarkRead(notif.id)}
                              >
                                <Eye className="mr-1 h-3 w-3" />
                                Mark read
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
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

// Coordinator Map Sub-component
function CoordinatorMapComponent({
  buses,
  routes,
  pickupPoints,
}: {
  buses: BusType[];
  routes: RouteType[];
  pickupPoints: PickupPoint[];
}) {
  const [mapReady, setMapReady] = useState(false);
  const [leaflet, setLeaflet] = useState<typeof import('leaflet') | null>(null);

  const redemptionCity = { lat: 6.7765, lng: 3.4310 };

  useEffect(() => {
    import('leaflet').then((L) => {
      delete (L.default.Icon.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.default.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });
      setLeaflet(L.default);
      setMapReady(true);
    });
  }, []);

  if (!mapReady || !leaflet) {
    return (
      <div className="flex h-[500px] items-center justify-center bg-muted">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#1B5E20]" />
          <p className="mt-2 text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  // Bus icons by status
  const getBusIcon = (status: string) => {
    const colors: Record<string, string> = {
      available: '#1B5E20',
      'in-transit': '#3B82F6',
      loading: '#F9A825',
      maintenance: '#EF4444',
    };
    const color = colors[status] || '#1B5E20';
    return leaflet.divIcon({
      html: `<div style="background:${color};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid #F9A825;box-shadow:0 2px 8px rgba(0,0,0,0.4)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F9A825" stroke-width="2"><rect x="3" y="3" width="18" height="14" rx="2"/><line x1="3" y1="17" x2="21" y2="17"/><line x1="7" y1="20" x2="7" y2="17"/><line x1="17" y1="20" x2="17" y2="17"/></svg></div>`,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  const pickupIcon = leaflet.divIcon({
    html: `<div style="background:#F9A825;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #1B5E20;box-shadow:0 2px 6px rgba(0,0,0,0.3)"><svg width="12" height="12" viewBox="0 0 24 24" fill="#1B5E20" stroke="none"><circle cx="12" cy="12" r="4"/></svg></div>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  const destIcon = leaflet.divIcon({
    html: `<div style="background:#1B5E20;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid #F9A825;box-shadow:0 2px 8px rgba(0,0,0,0.4)"><svg width="18" height="18" viewBox="0 0 24 24" fill="#F9A825" stroke="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  // Active buses (in-transit or loading) with GPS data
  const activeBuses = buses.filter(
    (b) => b.latitude && b.longitude && (b.status === 'in-transit' || b.status === 'loading')
  );
  const otherBusesWithGps = buses.filter(
    (b) => b.latitude && b.longitude && b.status !== 'in-transit' && b.status !== 'loading' && b.status !== 'maintenance'
  );

  return (
    <div className="h-[500px] w-full">
      <MapContainer
        center={[7.5, 4.5]}
        zoom={7}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Redemption City marker */}
        <Marker position={[redemptionCity.lat, redemptionCity.lng]} icon={destIcon}>
          <Popup>
            <div className="text-center">
              <strong className="text-[#1B5E20]">Redemption City</strong>
              <br />
              <span className="text-xs">Final Destination</span>
            </div>
          </Popup>
        </Marker>

        {/* Pickup point markers and route lines */}
        {pickupPoints.map((pp) => {
          const route = routes.find((r) => r.fromPointId === pp.id);
          return (
            <div key={pp.id}>
              <Marker position={[pp.latitude, pp.longitude]} icon={pickupIcon}>
                <Popup>
                  <div>
                    <strong>{pp.name}</strong>
                    <br />
                    <span className="text-xs">{pp.state} State</span>
                    {route && (
                      <>
                        <br />
                        <span className="text-xs">{route.distanceKm}km • ~{route.estimatedMin}min</span>
                      </>
                    )}
                  </div>
                </Popup>
              </Marker>
              {route && (
                <Polyline
                  positions={[
                    [pp.latitude, pp.longitude],
                    [redemptionCity.lat, redemptionCity.lng],
                  ]}
                  pathOptions={{ color: '#1B5E20', weight: 2, opacity: 0.4, dashArray: '8 4' }}
                />
              )}
            </div>
          );
        })}

        {/* Active bus markers (in-transit / loading) */}
        {activeBuses.map((bus) => (
          <Marker key={`active-${bus.id}`} position={[bus.latitude!, bus.longitude!]} icon={getBusIcon(bus.status)}>
            <Popup>
              <div>
                <strong className="text-[#1B5E20]">{bus.plateNumber}</strong>
                <br />
                <span className="text-xs capitalize" style={{ color: bus.status === 'in-transit' ? '#3B82F6' : '#F9A825' }}>
                  ● {bus.status}
                </span>
                <br />
                <span className="text-xs">{bus.currentLoad}/{bus.capacity} passengers</span>
                {bus.driver && (
                  <>
                    <br />
                    <span className="text-xs">Driver: {bus.driver.name}</span>
                  </>
                )}
                {bus.route && (
                  <>
                    <br />
                    <span className="text-xs">Route: {bus.route.name}</span>
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Other available buses with GPS */}
        {otherBusesWithGps.map((bus) => (
          <Marker key={`other-${bus.id}`} position={[bus.latitude!, bus.longitude!]} icon={getBusIcon(bus.status)}>
            <Popup>
              <div>
                <strong>{bus.plateNumber}</strong>
                <br />
                <span className="text-xs capitalize">● {bus.status}</span>
                <br />
                <span className="text-xs">{bus.currentLoad}/{bus.capacity} passengers</span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
