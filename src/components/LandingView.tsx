'use client';

import { useAppStore, type Route, type PickupPoint, type EventItem } from '@/lib/store';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Bus, ArrowRight, Users, Calendar, Shield, BarChart3, Bell, Route as RouteIcon, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';

export default function LandingView() {
  const { setCurrentView, isAuthenticated, user } = useAppStore();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [routesRes, ppRes, eventsRes] = await Promise.all([
          fetch('/api/routes'),
          fetch('/api/pickup-points'),
          fetch('/api/events'),
        ]);
        const routesData = await routesRes.json();
        const ppData = await ppRes.json();
        const eventsData = await eventsRes.json();
        setRoutes(routesData);
        setPickupPoints(ppData.filter((pp: PickupPoint) => pp.name !== 'Redemption City'));
        setEvents(eventsData);
      } catch (e) {
        console.error('Failed to load landing data', e);
      }
    }
    loadData();
  }, []);

  // Helper: navigate to passenger portal (with auth check)
  const goToPassenger = () => {
    if (isAuthenticated && user?.role === 'passenger') {
      setCurrentView('passenger');
    } else {
      setCurrentView('passenger-login');
    }
  };

  // Helper: navigate to coordinator dashboard (with auth check)
  const goToCoordinator = () => {
    if (isAuthenticated && user?.role === 'coordinator') {
      setCurrentView('coordinator');
    } else {
      setCurrentView('coordinator-login');
    }
  };

  // Group pickup points by state
  const pointsByState = pickupPoints.reduce<Record<string, PickupPoint[]>>((acc, pp) => {
    if (!acc[pp.state]) acc[pp.state] = [];
    acc[pp.state].push(pp);
    return acc;
  }, {});

  // Get route info for a pickup point
  const getRouteForPP = (ppId: string) => routes.find((r) => r.fromPointId === ppId);

  return (
    <div className="min-h-screen">
      {/* HERO SECTION */}
      <section className="relative flex min-h-[85vh] items-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/bus-background.png"
            alt="RouteShepherd fleet"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1B5E20]/95 via-[#1B5E20]/80 to-[#1B5E20]/50" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl"
          >
            <Badge className="mb-4 border-[#F9A825]/30 bg-[#F9A825]/10 text-[#F9A825] hover:bg-[#F9A825]/20">
              Kingdom Hack 3.0
            </Badge>
            <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Route<span className="text-[#F9A825]">Shepherd</span>
            </h1>
            <p className="mb-8 text-xl text-white/80 sm:text-2xl">
              Intelligent Transit Coordination for Redemption City
            </p>
            <p className="mb-10 max-w-lg text-base text-white/60">
              Coordinating 300+ buses across 17 pickup points nationwide for RCCG events.
              Eliminating chaos, reducing wait times from 6 hours to under 30 minutes.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                onClick={goToPassenger}
                className="bg-[#F9A825] text-[#1B5E20] hover:bg-[#F9A825]/90 font-semibold text-base px-8"
              >
                <Users className="mr-2 h-5 w-5" />
                Pre-Register Your Trip
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={goToCoordinator}
                className="border-white/30 text-white hover:bg-white/10 font-semibold text-base px-8"
              >
                <BarChart3 className="mr-2 h-5 w-5" />
                Coordinator Login
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ROUTES BY STATE */}
      <section className="bg-background py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-10 text-center">
              <h2 className="mb-3 text-3xl font-bold text-foreground sm:text-4xl">
                Pickup Points & <span className="text-[#1B5E20]">Routes</span>
              </h2>
              <p className="mx-auto max-w-2xl text-muted-foreground">
                17 pickup points across 7 states with direct routes to Redemption City on the Lagos-Ibadan Expressway
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(pointsByState).map(([state, points], stateIdx) => (
                <motion.div
                  key={state}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: stateIdx * 0.1 }}
                >
                  <Card className="h-full border-l-4 border-l-[#1B5E20] shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <MapPin className="h-5 w-5 text-[#1B5E20]" />
                        {state} State
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {points.length} point{points.length > 1 ? 's' : ''}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {points.map((pp) => {
                        const route = getRouteForPP(pp.id);
                        return (
                          <div
                            key={pp.id}
                            className="flex items-center justify-between rounded-lg bg-muted/50 p-3 transition-colors hover:bg-muted"
                          >
                            <div>
                              <p className="font-medium text-sm">{pp.name}</p>
                              {pp.address && (
                                <p className="text-xs text-muted-foreground">{pp.address}</p>
                              )}
                            </div>
                            {route && (
                              <div className="text-right shrink-0 ml-3">
                                <div className="flex items-center gap-1 text-xs font-medium text-[#1B5E20]">
                                  <RouteIcon className="h-3 w-3" />
                                  {route.distanceKm}km
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  ~{route.estimatedMin}min
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Button
                variant="outline"
                size="lg"
                onClick={goToPassenger}
                className="border-[#1B5E20] text-[#1B5E20] hover:bg-[#1B5E20] hover:text-white"
              >
                Explore Live Map
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* UPCOMING EVENTS */}
      <section className="bg-muted/30 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-10 text-center">
              <h2 className="mb-3 text-3xl font-bold text-foreground sm:text-4xl">
                Upcoming <span className="text-[#1B5E20]">Events</span>
              </h2>
              <p className="mx-auto max-w-2xl text-muted-foreground">
                Plan your trip for the next major gathering at Redemption City
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {events.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4 }}
                >
                  <Card className="overflow-hidden shadow-md hover:shadow-xl transition-shadow">
                    <div className="bg-gradient-to-r from-[#1B5E20] to-[#2E7D32] p-6 text-white">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge className="mb-2 border-white/30 bg-white/10 text-white">
                            {event.status}
                          </Badge>
                          <h3 className="text-xl font-bold">{event.name}</h3>
                        </div>
                        <Calendar className="h-8 w-8 text-[#F9A825]" />
                      </div>
                    </div>
                    <CardContent className="p-6">
                      {event.description && (
                        <p className="mb-4 text-sm text-muted-foreground">{event.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-[#1B5E20]" />
                          <span>{new Date(event.date).toLocaleDateString('en-NG', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </div>
                        {event.expectedAttendance && (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-[#F9A825]" />
                            <span>{(event.expectedAttendance / 1000000).toFixed(0)}M expected</span>
                          </div>
                        )}
                      </div>
                      <Button
                        className="mt-4 w-full bg-[#1B5E20] text-white hover:bg-[#1B5E20]/90"
                        onClick={goToPassenger}
                      >
                        Register for this Event
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* WHY ROUTESHEPHERD */}
      <section className="bg-background py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-10 text-center">
              <h2 className="mb-3 text-3xl font-bold text-foreground sm:text-4xl">
                Why <span className="text-[#1B5E20]">RouteShepherd</span>
              </h2>
              <p className="mx-auto max-w-2xl text-muted-foreground">
                Purpose-built for the unique challenges of mass transit to Redemption City
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: <BarChart3 className="h-8 w-8" />,
                  title: 'AI-Powered Demand Forecasting',
                  desc: 'Machine learning models predict passenger demand per pickup point per time slot, enabling proactive bus deployment before queues form. Our confidence-weighted forecasts turn reactive chaos into proactive coordination.',
                  color: 'text-[#1B5E20]',
                },
                {
                  icon: <Bus className="h-8 w-8" />,
                  title: 'Real-Time Fleet Tracking',
                  desc: 'GPS-enabled bus tracking with live position updates on an interactive map. Coordinators see every bus, its load status, driver info, and ETA. Passengers track their bus approaching in real-time.',
                  color: 'text-[#F9A825]',
                },
                {
                  icon: <Shield className="h-8 w-8" />,
                  title: 'Smart Dispatch System',
                  desc: 'One-click bus dispatch with route assignment. The system prevents double-assignment, validates bus availability, and automatically notifies drivers and passengers of new deployments.',
                  color: 'text-[#1B5E20]',
                },
                {
                  icon: <Users className="h-8 w-8" />,
                  title: 'Pre-Registration Portal',
                  desc: 'Passengers pre-register their trip with preferred pickup point, time slot, and group size. This feeds into demand forecasting and ensures buses are deployed where and when they are needed most.',
                  color: 'text-[#F9A825]',
                },
                {
                  icon: <RouteIcon className="h-8 w-8" />,
                  title: 'Route Intelligence',
                  desc: 'Real route data with actual distances and travel times from every pickup point to Redemption City. No guesswork — coordinators and passengers see precise information for 17 routes across 7 states.',
                  color: 'text-[#1B5E20]',
                },
                {
                  icon: <Bell className="h-8 w-8" />,
                  title: 'Targeted Alert System',
                  desc: 'Send targeted notifications to passengers, drivers, coordinators, or everyone. High demand warnings, route changes, safety alerts, and dispatch confirmations — all delivered in real-time.',
                  color: 'text-[#F9A825]',
                },
              ].map((feature, idx) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
                >
                  <Card className="h-full shadow-md hover:shadow-lg transition-shadow group">
                    <CardContent className="p-6">
                      <div className={`mb-4 ${feature.color} group-hover:scale-110 transition-transform`}>
                        {feature.icon}
                      </div>
                      <h3 className="mb-2 text-lg font-bold">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-[#1B5E20] to-[#2E7D32] py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
              Ready to Transform Your Journey?
            </h2>
            <p className="mb-8 text-white/70">
              Join thousands of worshippers who pre-register for a seamless trip to Redemption City.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                onClick={goToPassenger}
                className="bg-[#F9A825] text-[#1B5E20] hover:bg-[#F9A825]/90 font-semibold text-base px-8"
              >
                <Users className="mr-2 h-5 w-5" />
                Pre-Register Now
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={goToCoordinator}
                className="border-white/30 text-white hover:bg-white/10 font-semibold text-base px-8"
              >
                Open Coordinator Dashboard
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t bg-background py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <img src="/logo-icon.png" alt="RouteShepherd" className="h-7 w-7 rounded-md" />
              <span className="font-bold text-[#1B5E20] dark:text-[#4CAF50]">RouteShepherd</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Built for Kingdom Hack 3.0 — AI-Powered Transit Coordination for Redemption City
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
