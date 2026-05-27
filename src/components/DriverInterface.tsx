'use client';

import { useAppStore } from '@/lib/store';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Bus, MapPin, Clock, Users, PlayCircle, Navigation, CheckCircle2, Wrench, Loader2, Bell, Plus, Minus, Route } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import type { Bus as BusType, NotificationItem } from '@/lib/store';

const statusFlow = ['available', 'loading', 'in-transit', 'available'] as const;
const statusActions: Record<string, { label: string; icon: React.ReactNode; next: string; color: string }> = {
  available: { label: 'Start Loading', icon: <PlayCircle className="h-5 w-5" />, next: 'loading', color: 'bg-green-600 hover:bg-green-700 text-white' },
  loading: { label: 'Depart', icon: <Navigation className="h-5 w-5" />, next: 'in-transit', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
  'in-transit': { label: 'Arrived', icon: <CheckCircle2 className="h-5 w-5" />, next: 'available', color: 'bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white' },
};

export default function DriverInterface() {
  const { user } = useAppStore();
  const [buses, setBuses] = useState<BusType[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedBusId, setSelectedBusId] = useState('');
  const [updating, setUpdating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gpsTracking, setGpsTracking] = useState(false);
  const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      // If driver is logged in, only load their assigned buses
      let busesUrl = '/api/buses';
      if (user?.role === 'driver' && user?.assignedBuses && user.assignedBuses.length > 0) {
        busesUrl = `/api/buses?driverId=${user.id}`;
      }

      const [busesRes, notifsRes] = await Promise.all([
        fetch(busesUrl),
        fetch('/api/notifications'),
      ]);
      const busesData = await busesRes.json();
      setBuses(busesData);
      setNotifications((await notifsRes.json()).filter((n: NotificationItem) => n.target === 'driver' || n.target === 'all'));

      // Auto-select bus for logged-in drivers
      if (user?.role === 'driver' && busesData.length > 0 && !selectedBusId) {
        setSelectedBusId(busesData[0].id);
      }
    } catch (e) {
      console.error('Failed to load driver data', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role, user?.assignedBuses, selectedBusId]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  const selectedBus = buses.find((b) => b.id === selectedBusId);

  // GPS Auto-Tracking
  const startGpsTracking = useCallback(() => {
    if (!selectedBusId) return;

    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setGpsTracking(true);
    toast.success('GPS tracking started. Your location will update every 5 seconds.');

    // Use watchPosition for continuous tracking
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        try {
          await fetch('/api/driver-location', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              busId: selectedBusId,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          });
        } catch {
          // Silently fail GPS updates
        }
      },
      (error) => {
        console.error('GPS error:', error);
        if (error.code === error.PERMISSION_DENIED) {
          toast.error('GPS permission denied. Please enable location access.');
          stopGpsTracking();
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
    );

    // Also update every 5 seconds as backup
    gpsIntervalRef.current = setInterval(async () => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            await fetch('/api/driver-location', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                busId: selectedBusId,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              }),
            });
          } catch {
            // Silently fail
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    }, 5000);
  }, [selectedBusId]);

  const stopGpsTracking = useCallback(() => {
    setGpsTracking(false);
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (gpsIntervalRef.current) {
      clearInterval(gpsIntervalRef.current);
      gpsIntervalRef.current = null;
    }
    toast.info('GPS tracking stopped');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (gpsIntervalRef.current) {
        clearInterval(gpsIntervalRef.current);
      }
    };
  }, []);

  // Stop GPS if bus changes
  useEffect(() => {
    if (gpsTracking) {
      stopGpsTracking();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusId]);

  const updateBusStatus = async (newStatus: string) => {
    if (!selectedBusId) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/buses/${selectedBusId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Update failed');
      }
      toast.success(`Bus status updated to ${newStatus}`);
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const updatePassengerCount = async (delta: number) => {
    if (!selectedBus) return;
    const newLoad = Math.max(0, Math.min(selectedBus.capacity, selectedBus.currentLoad + delta));
    setUpdating(true);
    try {
      const res = await fetch(`/api/buses/${selectedBusId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentLoad: newLoad }),
      });
      if (!res.ok) throw new Error('Update failed');
      loadData();
    } catch {
      toast.error('Failed to update passenger count');
    } finally {
      setUpdating(false);
    }
  };

  const updateLocationManual = async () => {
    if (!selectedBus) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          setUpdating(true);
          try {
            const res = await fetch('/api/driver-location', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                busId: selectedBusId,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              }),
            });
            if (!res.ok) throw new Error('Update failed');
            toast.success('Location updated from GPS');
            loadData();
          } catch {
            toast.error('Failed to update location');
          } finally {
            setUpdating(false);
          }
        },
        async () => {
          // GPS denied or unavailable — do NOT write fake data
          toast.error('GPS unavailable. Please enable location services to update your bus position.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      // No geolocation API — do NOT write fake data
      toast.error('Your browser does not support geolocation. Location update is not available.');
    }
  };

  const setMaintenance = async () => {
    if (!selectedBusId) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/buses/${selectedBusId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'maintenance' }),
      });
      if (!res.ok) throw new Error('Update failed');
      toast.success('Bus set to maintenance');
      loadData();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
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
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Driver <span className="text-[#1B5E20]">Interface</span>
          </h1>
          <p className="text-muted-foreground">
            Manage your bus, passengers, and route
            {user && <span className="ml-2 text-[#1B5E20] font-medium">• Welcome, {user.name || user.email}</span>}
          </p>
        </motion.div>

        {/* Bus Selection */}
        <Card className="mb-6 shadow-lg">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1">
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedBusId}
                  onChange={(e) => setSelectedBusId(e.target.value)}
                >
                  <option value="">Select your bus</option>
                  {buses.map((bus) => (
                    <option key={bus.id} value={bus.id}>
                      {bus.plateNumber} — {bus.driver?.name || 'Unassigned'} ({bus.status})
                    </option>
                  ))}
                </select>
              </div>
              {selectedBus && (
                <Badge
                  variant="outline"
                  className={`text-sm ${selectedBus.status === 'available' ? 'bg-green-100 text-green-700' : selectedBus.status === 'in-transit' ? 'bg-blue-100 text-blue-700' : selectedBus.status === 'loading' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}
                >
                  {selectedBus.status.toUpperCase()}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <AnimatePresence mode="wait">
          {selectedBus ? (
            <motion.div
              key={selectedBusId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Status Controls */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bus className="h-5 w-5 text-[#1B5E20]" />
                    Bus Status Control
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {selectedBus.status !== 'maintenance' && statusActions[selectedBus.status] && (
                      <Button
                        size="lg"
                        className={statusActions[selectedBus.status].color}
                        onClick={() => updateBusStatus(statusActions[selectedBus.status].next)}
                        disabled={updating}
                      >
                        {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : statusActions[selectedBus.status].icon}
                        {statusActions[selectedBus.status].label}
                      </Button>
                    )}
                    {selectedBus.status !== 'maintenance' && (
                      <Button
                        size="lg"
                        variant="destructive"
                        onClick={setMaintenance}
                        disabled={updating}
                      >
                        <Wrench className="mr-2 h-4 w-4" />
                        Set Maintenance
                      </Button>
                    )}
                    {selectedBus.status === 'maintenance' && (
                      <Button
                        size="lg"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => updateBusStatus('available')}
                        disabled={updating}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Return to Service
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Passenger Counter */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-[#1B5E20]" />
                    Passenger Counter
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center gap-6">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-14 w-14 text-2xl font-bold"
                      onClick={() => updatePassengerCount(-1)}
                      disabled={updating || selectedBus.currentLoad <= 0}
                    >
                      <Minus className="h-6 w-6" />
                    </Button>
                    <div className="text-center">
                      <p className="text-5xl font-bold text-[#1B5E20]">{selectedBus.currentLoad}</p>
                      <p className="text-sm text-muted-foreground">of {selectedBus.capacity}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-14 w-14 text-2xl font-bold"
                      onClick={() => updatePassengerCount(1)}
                      disabled={updating || selectedBus.currentLoad >= selectedBus.capacity}
                    >
                      <Plus className="h-6 w-6" />
                    </Button>
                  </div>
                  <div className="mt-4">
                    <Progress
                      value={(selectedBus.currentLoad / selectedBus.capacity) * 100}
                      className="h-4"
                    />
                    <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                      <span>0</span>
                      <span className="font-medium">
                        {Math.round((selectedBus.currentLoad / selectedBus.capacity) * 100)}% Full
                      </span>
                      <span>{selectedBus.capacity}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Route Info */}
              {selectedBus.route && (
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Route className="h-5 w-5 text-[#1B5E20]" />
                      Current Route
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <div>
                        <p className="text-xs text-muted-foreground">From</p>
                        <p className="font-medium text-sm">{selectedBus.route.fromPoint?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">To</p>
                        <p className="font-medium text-sm">{selectedBus.route.toPoint?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Distance</p>
                        <p className="font-medium text-sm flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-[#1B5E20]" />
                          {selectedBus.route.distanceKm}km
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Duration</p>
                        <p className="font-medium text-sm flex items-center gap-1">
                          <Clock className="h-3 w-3 text-[#1B5E20]" />
                          ~{selectedBus.route.estimatedMin}min
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-xs text-muted-foreground">Bus Plate Number</p>
                      <p className="text-lg font-bold text-[#1B5E20]">{selectedBus.plateNumber}</p>
                    </div>
                    {selectedBus.driver && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground">Driver</p>
                        <p className="font-medium text-sm">{selectedBus.driver.name}</p>
                        {selectedBus.driver.driverPhone && (
                          <p className="text-xs text-muted-foreground">{selectedBus.driver.driverPhone}</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* GPS Update */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Navigation className="h-5 w-5 text-[#1B5E20]" />
                      GPS Location
                    </div>
                    {gpsTracking && (
                      <Badge className="bg-green-500 text-white animate-pulse">Tracking</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        {selectedBus.latitude && selectedBus.longitude ? (
                          <div className="space-y-1">
                            <p className="font-mono text-sm">
                              <span className="text-muted-foreground">Lat:</span> {selectedBus.latitude.toFixed(6)}
                            </p>
                            <p className="font-mono text-sm">
                              <span className="text-muted-foreground">Lng:</span> {selectedBus.longitude.toFixed(6)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Last updated: {new Date(selectedBus.lastUpdated).toLocaleTimeString()}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No location data</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={updateLocationManual}
                          disabled={updating || gpsTracking}
                          className="bg-[#1B5E20] text-white hover:bg-[#1B5E20]/90"
                        >
                          {updating ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Navigation className="mr-2 h-4 w-4" />
                          )}
                          Update Once
                        </Button>
                        {!gpsTracking ? (
                          <Button
                            onClick={startGpsTracking}
                            className="bg-blue-600 text-white hover:bg-blue-700"
                          >
                            <Navigation className="mr-2 h-4 w-4" />
                            Auto-Track
                          </Button>
                        ) : (
                          <Button
                            onClick={stopGpsTracking}
                            variant="destructive"
                          >
                            Stop Tracking
                          </Button>
                        )}
                      </div>
                    </div>
                    {gpsTracking && (
                      <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3">
                        <p className="text-xs text-blue-700 dark:text-blue-400">
                          GPS auto-tracking is active. Your location will be updated every 5 seconds. Keep this page open while driving.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Notifications */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-[#F9A825]" />
                    Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">No notifications</p>
                    ) : (
                      notifications.slice(0, 10).map((notif) => (
                        <div key={notif.id} className="rounded-lg border p-3">
                          <div className="flex items-center gap-2">
                            {notif.type === 'warning' && <Badge variant="destructive" className="text-[10px]">Warning</Badge>}
                            {notif.type === 'success' && <Badge className="bg-green-500 text-[10px]">Success</Badge>}
                            {notif.type === 'info' && <Badge variant="secondary" className="text-[10px]">Info</Badge>}
                            <span className="text-sm font-medium">{notif.title}</span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-16 text-center"
            >
              <Bus className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
              <h3 className="mb-2 text-xl font-bold">Select Your Bus</h3>
              <p className="text-muted-foreground">Choose your assigned bus from the dropdown above to get started.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
