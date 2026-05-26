'use client';

import { useAppStore, type PickupPoint, type Route, type Bus, type NotificationItem } from '@/lib/store';
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { MapPin, Bus as BusIcon, Clock, Users, RouteIcon, ChevronRight, Phone, CheckCircle, Loader2, ArrowRight, Bell, AlertTriangle, Eye, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

// Dynamically import map component to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
);

// Bus status colors
const statusColors: Record<string, string> = {
  available: 'bg-green-500',
  'in-transit': 'bg-blue-500',
  loading: 'bg-yellow-500',
  maintenance: 'bg-red-500',
};

const statusLabels: Record<string, string> = {
  available: 'Available',
  'in-transit': 'In Transit',
  loading: 'Loading',
  maintenance: 'Maintenance',
};

export default function PassengerPortal() {
  const { user, setCurrentView, setSelectedPickupPoint } = useAppStore();
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [queueStatus, setQueueStatus] = useState<Array<{ pickupPointId: string; name: string; state: string; estimatedWait: number | null; queueLength: number | null }>>([]);
  const [events, setEvents] = useState<Array<{ id: string; name: string; description: string | null; date: string; endDate: string | null; status: string; expectedAttendance: number | null }>>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Tab state
  const [activeTab, setActiveTab] = useState('map');

  // Pre-registration form state
  const [formName, setFormName] = useState(user?.name || '');
  const [formPhone, setFormPhone] = useState(user?.phone || '');
  const [formPickupPoint, setFormPickupPoint] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formPassengers, setFormPassengers] = useState(1);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  // My trips
  const [myTrips, setMyTrips] = useState<Array<{ id: string; fullName: string; pickupPoint: PickupPoint; preferredTime: string | null; passengers: number; status: string; assignedBusId: string | null; assignedBus?: Bus }>>([]);

  // Assigned bus for current user
  const [assignedBus, setAssignedBus] = useState<Bus | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [routesRes, ppRes, busesRes, queueRes, eventsRes] = await Promise.all([
        fetch('/api/routes'),
        fetch('/api/pickup-points'),
        fetch('/api/buses'),
        fetch('/api/queue-status'),
        fetch('/api/events'),
      ]);
      const routesData = await routesRes.json();
      const ppData = await ppRes.json();
      const busesData = await busesRes.json();
      const queueData = await queueRes.json();
      const eventsData = await eventsRes.json();

      setRoutes(routesData);
      setPickupPoints(ppData.filter((pp: PickupPoint) => pp.name !== 'Redemption City'));
      setBuses(busesData);
      setQueueStatus(queueData);
      setEvents(eventsData);
    } catch (e) {
      console.error('Failed to load passenger data', e);
    }
  }, []);

  // Load notifications for this user
  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/notifications?target=passenger&userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch {
      // Silent fail
    }
  }, [user]);

  // Load user's pre-registrations / trips
  const loadMyTrips = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/preregister?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        // Enrich with pickup point data
        const enriched = data.map((trip: { id: string; fullName: string; pickupPointId: string; preferredTime: string | null; passengers: number; status: string; assignedBusId: string | null }) => {
          const pp = pickupPoints.find((p) => p.id === trip.pickupPointId);
          const bus = buses.find((b) => b.id === trip.assignedBusId);
          return {
            ...trip,
            pickupPoint: pp || { id: trip.pickupPointId, name: 'Unknown', state: '', latitude: 0, longitude: 0, address: null, capacity: null, active: false },
            assignedBus: bus,
          };
        });
        setMyTrips(enriched);

        // Find the first assigned bus for live tracking
        const assigned = enriched.find((t: { assignedBusId: string | null; status: string }) => t.assignedBusId && t.status === 'confirmed');
        if (assigned) {
          const bus = buses.find((b) => b.id === assigned.assignedBusId);
          setAssignedBus(bus || null);
        }
      }
    } catch {
      // Silent fail
    }
  }, [user, pickupPoints, buses]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    if (pickupPoints.length > 0 && buses.length > 0) {
      loadMyTrips();
    }
  }, [loadMyTrips, pickupPoints.length, buses.length]);

  // Group pickup points by state
  const pointsByState = pickupPoints.reduce<Record<string, PickupPoint[]>>((acc, pp) => {
    if (!acc[pp.state]) acc[pp.state] = [];
    acc[pp.state].push(pp);
    return acc;
  }, {});

  const getRouteForPP = (ppId: string) => routes.find((r) => r.fromPointId === ppId);
  const getBusesForRoute = (routeId: string) => buses.filter((b) => b.routeId === routeId);
  const getQueueForPP = (ppId: string) => queueStatus.find((q) => q.pickupPointId === ppId);

  const handlePreRegister = async () => {
    if (!formName || !formPhone || !formPickupPoint) {
      toast.error('Please fill in all required fields');
      return;
    }
    setFormSubmitting(true);
    try {
      const res = await fetch('/api/preregister', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formName,
          phone: formPhone,
          pickupPointId: formPickupPoint,
          preferredTime: formTime || undefined,
          passengers: formPassengers,
          userId: user?.id || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Registration failed');
      }
      const data = await res.json();
      const pp = pickupPoints.find((p) => p.id === formPickupPoint);
      if (pp) {
        setMyTrips((prev) => [...prev, {
          id: data.id,
          fullName: data.fullName,
          pickupPoint: pp,
          preferredTime: data.preferredTime,
          passengers: data.passengers,
          status: data.status,
          assignedBusId: data.assignedBusId || null,
        }]);
      }
      setFormSuccess(true);
      toast.success('Pre-registration successful! Your trip has been recorded.');
      setTimeout(() => {
        setFormName(user?.name || '');
        setFormPhone('');
        setFormPickupPoint('');
        setFormTime('');
        setFormPassengers(1);
        setFormSuccess(false);
      }, 3000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Mark notification as read
  const handleMarkNotifRead = async (notifId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notifId }),
      });
      loadNotifications();
    } catch {
      // Silent fail
    }
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allForUser: user.id }),
      });
      loadNotifications();
      toast.success('All notifications marked as read');
    } catch {
      // Silent fail
    }
  };

  const activeEvent = events.find((e) => e.status === 'upcoming' || e.status === 'active');
  const redemptionCity = { lat: 6.7765, lng: 3.4310 };
  const unreadNotifs = notifications.filter((n) => !n.read);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Passenger <span className="text-[#1B5E20]">Portal</span>
          </h1>
          <p className="text-muted-foreground">
            {activeEvent ? `Traveling to ${activeEvent.name}` : 'Find your route to Redemption City'}
            {user && <span className="ml-2 text-[#1B5E20] font-medium">• Welcome, {user.name || user.email}</span>}
          </p>
        </motion.div>

        {/* Assigned Bus Alert */}
        {assignedBus && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="border-[#1B5E20]/30 bg-[#1B5E20]/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1B5E20]">
                    <BusIcon className="h-6 w-6 text-[#F9A825]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[#1B5E20] text-sm">Your Bus: {assignedBus.plateNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      Status: <span className={`font-medium ${assignedBus.status === 'in-transit' ? 'text-blue-600' : assignedBus.status === 'loading' ? 'text-yellow-600' : 'text-green-600'}`}>
                        {statusLabels[assignedBus.status]}
                      </span>
                      {assignedBus.route && ` • ${assignedBus.route.name}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {assignedBus.currentLoad}/{assignedBus.capacity} passengers
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-[#1B5E20] text-white hover:bg-[#1B5E20]/90"
                    onClick={() => setActiveTab('tracking')}
                  >
                    <Navigation className="mr-1 h-3 w-3" />
                    Track
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Unread Notifications Banner */}
        {unreadNotifs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <Card className="border-[#F9A825]/30 bg-[#F9A825]/5">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-[#F9A825]" />
                  <span className="text-sm font-medium">
                    {unreadNotifs.length} unread notification{unreadNotifs.length > 1 ? 's' : ''}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto text-xs text-[#1B5E20] h-7"
                    onClick={() => setActiveTab('notifications')}
                  >
                    View All
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex w-full overflow-x-auto gap-1 p-1">
            <TabsTrigger value="map" className="text-xs whitespace-nowrap flex-shrink-0">Live Map</TabsTrigger>
            <TabsTrigger value="routes" className="text-xs whitespace-nowrap flex-shrink-0">Routes</TabsTrigger>
            <TabsTrigger value="register" className="text-xs whitespace-nowrap flex-shrink-0">Register</TabsTrigger>
            <TabsTrigger value="tracking" className="text-xs whitespace-nowrap flex-shrink-0">Tracking</TabsTrigger>
            <TabsTrigger value="trips" className="text-xs whitespace-nowrap flex-shrink-0">My Trips</TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs whitespace-nowrap flex-shrink-0 relative">
              Alerts
              {unreadNotifs.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {unreadNotifs.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* LIVE MAP TAB */}
          <TabsContent value="map">
            <Card className="overflow-hidden shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[#1B5E20]" />
                  Live Route Map
                  <Badge variant="secondary" className="ml-auto">Live</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[500px] w-full" id="passenger-map">
                  <PassengerMapComponent
                    pickupPoints={pickupPoints}
                    routes={routes}
                    buses={buses}
                    redemptionCity={redemptionCity}
                    assignedBus={assignedBus}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ROUTES TAB */}
          <TabsContent value="routes">
            <div className="space-y-6">
              {Object.entries(pointsByState).map(([state, points]) => (
                <motion.div
                  key={state}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h3 className="mb-3 flex items-center gap-2 text-lg font-bold">
                    <MapPin className="h-5 w-5 text-[#1B5E20]" />
                    {state} State
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {points.map((pp) => {
                      const route = getRouteForPP(pp.id);
                      const routeBuses = route ? getBusesForRoute(route.id) : [];
                      const queue = getQueueForPP(pp.id);
                      const activeBuses = routeBuses.filter((b) => b.status !== 'maintenance');

                      return (
                        <Card key={pp.id} className="shadow-md hover:shadow-lg transition-shadow">
                          <CardContent className="p-4">
                            <div className="mb-3 flex items-start justify-between">
                              <div>
                                <h4 className="font-bold text-sm">{pp.name}</h4>
                                {pp.address && (
                                  <p className="text-xs text-muted-foreground">{pp.address}</p>
                                )}
                              </div>
                              {queue && (
                                <Badge variant={queue.estimatedWait && queue.estimatedWait > 30 ? 'destructive' : 'secondary'} className="text-xs shrink-0">
                                  ~{queue.estimatedWait}min wait
                                </Badge>
                              )}
                            </div>

                            {route && (
                              <div className="space-y-2 rounded-lg bg-muted/50 p-3">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Distance</span>
                                  <span className="font-medium">{route.distanceKm}km</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Travel Time</span>
                                  <span className="font-medium">~{route.estimatedMin}min</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Active Buses</span>
                                  <span className="font-medium">{activeBuses.length}</span>
                                </div>
                                {queue && queue.queueLength && (
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Queue</span>
                                    <span className="font-medium">{queue.queueLength} people</span>
                                  </div>
                                )}
                              </div>
                            )}

                            <Button
                              size="sm"
                              className="mt-3 w-full bg-[#1B5E20] text-white hover:bg-[#1B5E20]/90"
                              onClick={() => {
                                setSelectedPickupPoint(pp);
                                setFormPickupPoint(pp.id);
                                setActiveTab('register');
                              }}
                            >
                              <ArrowRight className="mr-1 h-3 w-3" />
                              Register from here
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* PRE-REGISTRATION TAB */}
          <TabsContent value="register">
            <div className="mx-auto max-w-lg">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-[#1B5E20]" />
                    Pre-Register Your Trip
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {formSuccess ? (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="py-8 text-center"
                    >
                      <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
                      <h3 className="mb-2 text-xl font-bold">Registration Successful!</h3>
                      <p className="text-muted-foreground">You will receive a confirmation and bus assignment shortly.</p>
                    </motion.div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          placeholder="Enter your full name"
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input
                          id="phone"
                          placeholder="+234-XXX-XXX-XXXX"
                          value={formPhone}
                          onChange={(e) => setFormPhone(e.target.value)}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">Format: +234-801-234-5678</p>
                      </div>
                      <div>
                        <Label htmlFor="pickup">Pickup Point *</Label>
                        <Select value={formPickupPoint} onValueChange={setFormPickupPoint}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select pickup point" />
                          </SelectTrigger>
                          <SelectContent className="max-h-64">
                            {Object.entries(pointsByState).map(([state, points]) => (
                              <div key={state}>
                                <p className="px-2 py-1 text-xs font-bold text-muted-foreground">{state}</p>
                                {points.map((pp) => (
                                  <SelectItem key={pp.id} value={pp.id}>
                                    {pp.name}
                                  </SelectItem>
                                ))}
                              </div>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="time">Preferred Departure Time</Label>
                        <Select value={formTime} onValueChange={setFormTime}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select time slot" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="06:00-08:00">6:00 AM - 8:00 AM</SelectItem>
                            <SelectItem value="08:00-10:00">8:00 AM - 10:00 AM</SelectItem>
                            <SelectItem value="10:00-12:00">10:00 AM - 12:00 PM</SelectItem>
                            <SelectItem value="12:00-14:00">12:00 PM - 2:00 PM</SelectItem>
                            <SelectItem value="14:00-16:00">2:00 PM - 4:00 PM</SelectItem>
                            <SelectItem value="16:00-18:00">4:00 PM - 6:00 PM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="passengers">Number of Passengers</Label>
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setFormPassengers(Math.max(1, formPassengers - 1))}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center font-bold text-lg">{formPassengers}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setFormPassengers(Math.min(10, formPassengers + 1))}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                      <Button
                        className="w-full bg-[#1B5E20] text-white hover:bg-[#1B5E20]/90"
                        size="lg"
                        onClick={handlePreRegister}
                        disabled={formSubmitting}
                      >
                        {formSubmitting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="mr-2 h-4 w-4" />
                        )}
                        {formSubmitting ? 'Registering...' : 'Pre-Register'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* LIVE BUS TRACKING TAB */}
          <TabsContent value="tracking">
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-lg font-bold">
                <BusIcon className="h-5 w-5 text-[#1B5E20]" />
                Live Bus Tracking
                <Badge variant="secondary" className="animate-pulse">Live</Badge>
              </h3>

              {/* Assigned Bus Featured Card */}
              {assignedBus && (
                <Card className="border-[#1B5E20]/30 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1B5E20]">
                        <Navigation className="h-4 w-4 text-[#F9A825]" />
                      </div>
                      Your Assigned Bus
                      <Badge className="ml-auto bg-[#1B5E20] text-white">Assigned</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full ${statusColors[assignedBus.status]} animate-pulse`} />
                          <span className="font-bold text-lg">{assignedBus.plateNumber}</span>
                          <Badge variant="outline" className="text-xs">
                            {statusLabels[assignedBus.status]}
                          </Badge>
                        </div>
                        {assignedBus.route && (
                          <div className="rounded-lg bg-muted/50 p-3">
                            <div className="flex items-center gap-1 text-sm font-medium">
                              <MapPin className="h-3 w-3 text-[#1B5E20]" />
                              {assignedBus.route.name}
                            </div>
                            {assignedBus.route.distanceKm && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {assignedBus.route.distanceKm}km • ~{assignedBus.route.estimatedMin}min
                              </p>
                            )}
                          </div>
                        )}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Capacity</span>
                            <span className="font-medium">{assignedBus.currentLoad}/{assignedBus.capacity}</span>
                          </div>
                          <Progress
                            value={(assignedBus.currentLoad / assignedBus.capacity) * 100}
                            className="h-3"
                          />
                        </div>
                        {assignedBus.driver && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            Driver: {assignedBus.driver.name}
                            {assignedBus.driver.driverPhone && (
                              <span className="ml-1">• {assignedBus.driver.driverPhone}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        {assignedBus.latitude && assignedBus.longitude ? (
                          <>
                            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3">
                              <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">Live Position</p>
                              <p className="font-mono text-sm">
                                {assignedBus.latitude.toFixed(6)}, {assignedBus.longitude.toFixed(6)}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                Updated: {new Date(assignedBus.lastUpdated).toLocaleTimeString()}
                              </p>
                            </div>
                          </>
                        ) : (
                          <div className="rounded-lg bg-muted/50 p-3 text-center">
                            <p className="text-xs text-muted-foreground">No GPS data available yet</p>
                            <p className="text-[10px] text-muted-foreground mt-1">The driver has not started tracking</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* All Active Buses */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {buses
                  .filter((b) => b.status !== 'maintenance' && b.route)
                  .map((bus) => (
                    <Card key={bus.id} className={`shadow-md ${assignedBus?.id === bus.id ? 'border-[#1B5E20]/40 ring-1 ring-[#1B5E20]/20' : ''}`}>
                      <CardContent className="p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`h-3 w-3 rounded-full ${statusColors[bus.status]} ${bus.status === 'in-transit' ? 'animate-pulse' : ''}`} />
                            <span className="font-bold text-sm">{bus.plateNumber}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {statusLabels[bus.status]}
                          </Badge>
                        </div>

                        {bus.route && (
                          <div className="mb-3 rounded-lg bg-muted/50 p-2">
                            <div className="flex items-center gap-1 text-xs">
                              <MapPin className="h-3 w-3 text-[#1B5E20]" />
                              <span className="font-medium">{bus.route.name}</span>
                            </div>
                            {bus.route.distanceKm && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {bus.route.distanceKm}km • ~{bus.route.estimatedMin}min
                              </p>
                            )}
                          </div>
                        )}

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Capacity</span>
                            <span className="font-medium">{bus.currentLoad}/{bus.capacity}</span>
                          </div>
                          <Progress
                            value={(bus.currentLoad / bus.capacity) * 100}
                            className="h-2"
                          />
                        </div>

                        {bus.driver && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {bus.driver.name}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          </TabsContent>

          {/* MY TRIPS TAB */}
          <TabsContent value="trips">
            <div className="mx-auto max-w-lg">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RouteIcon className="h-5 w-5 text-[#1B5E20]" />
                    My Trips
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {myTrips.length === 0 ? (
                    <div className="py-8 text-center">
                      <RouteIcon className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
                      <p className="text-muted-foreground">No trips registered yet.</p>
                      <Button
                        variant="outline"
                        className="mt-3"
                        onClick={() => setActiveTab('register')}
                      >
                        Pre-Register Now
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {myTrips.map((trip) => (
                        <div key={trip.id} className="rounded-lg border p-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-sm">{trip.pickupPoint.name}</h4>
                            <Badge
                              variant={trip.status === 'confirmed' ? 'default' : trip.status === 'cancelled' ? 'destructive' : 'secondary'}
                              className={trip.status === 'confirmed' ? 'bg-green-500' : ''}
                            >
                              {trip.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {trip.passengers} passenger{trip.passengers > 1 ? 's' : ''} • {trip.preferredTime || 'No time preference'}
                          </p>
                          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {trip.pickupPoint.state} State
                          </div>
                          {trip.assignedBus && (
                            <div className="mt-2 rounded-lg bg-[#1B5E20]/5 p-2">
                              <div className="flex items-center gap-2">
                                <BusIcon className="h-3 w-3 text-[#1B5E20]" />
                                <span className="text-xs font-medium text-[#1B5E20]">
                                  Assigned: {trip.assignedBus.plateNumber}
                                </span>
                                <Badge variant="outline" className="text-[10px] ml-auto">
                                  {statusLabels[trip.assignedBus.status]}
                                </Badge>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* NOTIFICATIONS TAB */}
          <TabsContent value="notifications">
            <div className="mx-auto max-w-lg">
              <Card className="shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5 text-[#1B5E20]" />
                      Notifications
                    </CardTitle>
                    {unreadNotifs.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-[#1B5E20] h-7"
                        onClick={handleMarkAllRead}
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        Mark all read
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center">
                      <Bell className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
                      <p className="text-muted-foreground text-sm">No notifications yet</p>
                    </div>
                  ) : (
                    <div className="max-h-96 space-y-2 overflow-y-auto">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`rounded-lg border p-3 transition-colors ${!notif.read ? 'bg-[#1B5E20]/5 border-[#1B5E20]/20' : ''}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {notif.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />}
                            {notif.type === 'success' && <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />}
                            {notif.type === 'info' && <Bell className="h-4 w-4 text-blue-500 shrink-0" />}
                            <span className="font-medium text-sm">{notif.title}</span>
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
                                className="h-5 text-[10px] text-[#1B5E20]"
                                onClick={() => handleMarkNotifRead(notif.id)}
                              >
                                <Eye className="mr-1 h-3 w-3" />
                                Read
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Map sub-component
function PassengerMapComponent({
  pickupPoints,
  routes,
  buses,
  redemptionCity,
  assignedBus,
}: {
  pickupPoints: PickupPoint[];
  routes: Route[];
  buses: Bus[];
  redemptionCity: { lat: number; lng: number };
  assignedBus: Bus | null;
}) {
  const [mapReady, setMapReady] = useState(false);
  const [leaflet, setLeaflet] = useState<typeof import('leaflet') | null>(null);

  useEffect(() => {
    import('leaflet').then((L) => {
      // Fix default icon issue
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
      <div className="flex h-full items-center justify-center bg-muted">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#1B5E20]" />
          <p className="mt-2 text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  const busIcon = leaflet.divIcon({
    html: `<div style="background:#1B5E20;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #F9A825;box-shadow:0 2px 6px rgba(0,0,0,0.3)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F9A825" stroke-width="2"><rect x="3" y="3" width="18" height="14" rx="2"/><line x1="3" y1="17" x2="21" y2="17"/><line x1="7" y1="20" x2="7" y2="17"/><line x1="17" y1="20" x2="17" y2="17"/></svg></div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  const assignedBusIcon = leaflet.divIcon({
    html: `<div style="background:#F9A825;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid #1B5E20;box-shadow:0 2px 10px rgba(0,0,0,0.5)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1B5E20" stroke-width="2"><rect x="3" y="3" width="18" height="14" rx="2"/><line x1="3" y1="17" x2="21" y2="17"/><line x1="7" y1="20" x2="7" y2="17"/><line x1="17" y1="20" x2="17" y2="17"/></svg></div>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

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

  return (
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
                pathOptions={{ color: '#1B5E20', weight: 2, opacity: 0.5, dashArray: '8 4' }}
              />
            )}
          </div>
        );
      })}

      {/* Assigned bus marker (highlighted) */}
      {assignedBus && assignedBus.latitude && assignedBus.longitude && (
        <Marker
          position={[assignedBus.latitude, assignedBus.longitude]}
          icon={assignedBusIcon}
        >
          <Popup>
            <div>
              <strong className="text-[#1B5E20]">Your Bus: {assignedBus.plateNumber}</strong>
              <br />
              <span className="text-xs capitalize">{assignedBus.status}</span>
              <br />
              <span className="text-xs">{assignedBus.currentLoad}/{assignedBus.capacity} passengers</span>
              {assignedBus.driver && (
                <>
                  <br />
                  <span className="text-xs">Driver: {assignedBus.driver.name}</span>
                </>
              )}
            </div>
          </Popup>
        </Marker>
      )}

      {/* Other bus markers */}
      {buses
        .filter((b) => b.latitude && b.longitude && b.status !== 'maintenance' && b.id !== assignedBus?.id)
        .map((bus) => (
          <Marker key={bus.id} position={[bus.latitude!, bus.longitude!]} icon={busIcon}>
            <Popup>
              <div>
                <strong>{bus.plateNumber}</strong>
                <br />
                <span className="text-xs capitalize">{bus.status}</span>
                <br />
                <span className="text-xs">{bus.currentLoad}/{bus.capacity} passengers</span>
                {bus.driver && (
                  <>
                    <br />
                    <span className="text-xs">Driver: {bus.driver.name}</span>
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
