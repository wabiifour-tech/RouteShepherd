import { create } from 'zustand';

export type ViewType = 'landing' | 'passenger' | 'coordinator' | 'driver'
  | 'passenger-login' | 'coordinator-login' | 'driver-login';

export interface PickupPoint {
  id: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  address: string | null;
  capacity: number | null;
  active: boolean;
}

export interface Route {
  id: string;
  name: string;
  fromPointId: string;
  toPointId: string;
  distanceKm: number | null;
  estimatedMin: number | null;
  status: string;
  eventId: string | null;
  fromPoint?: PickupPoint;
  toPoint?: PickupPoint;
  _count?: { buses: number };
}

export interface DriverInfo {
  id: string;
  name: string | null;
  email: string;
  driverPhone: string | null;
}

export interface Bus {
  id: string;
  plateNumber: string;
  capacity: number;
  currentLoad: number;
  status: string;
  driverId: string | null;
  routeId: string | null;
  eventId: string | null;
  latitude: number | null;
  longitude: number | null;
  lastUpdated: string;
  route?: Route;
  driver?: DriverInfo;
}

export interface QueueEntry {
  id: string;
  pickupPointId: string;
  estimatedWait: number | null;
  queueLength: number | null;
  recordedAt: string;
  pickupPoint?: PickupPoint;
}

export interface DemandForecast {
  id: string;
  pickupPointId: string;
  timeSlot: string;
  predictedDemand: number;
  confidence: number | null;
  pickupPoint?: PickupPoint;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  target: string;
  read: boolean;
  createdAt: string;
}

export interface PreRegistration {
  id: string;
  fullName: string;
  phone: string;
  pickupPointId: string;
  preferredTime: string | null;
  passengers: number;
  status: string;
  createdAt: string;
  pickupPoint?: PickupPoint;
}

export interface EventItem {
  id: string;
  name: string;
  description: string | null;
  date: string;
  endDate: string | null;
  status: string;
  expectedAttendance: number | null;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string; // passenger, coordinator, driver
  phone: string | null;
  provider: string;
  driverPhone?: string | null;
  assignedBuses?: Bus[];
  pinChangeRequired?: boolean;
}

interface AppState {
  // Navigation
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;

  // Auth
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  isAuthenticated: boolean;

  // Selected items
  selectedBus: Bus | null;
  setSelectedBus: (bus: Bus | null) => void;
  selectedRoute: Route | null;
  setSelectedRoute: (route: Route | null) => void;
  selectedPickupPoint: PickupPoint | null;
  setSelectedPickupPoint: (pp: PickupPoint | null) => void;

  // Data caches
  buses: Bus[];
  setBuses: (buses: Bus[]) => void;
  routes: Route[];
  setRoutes: (routes: Route[]) => void;
  pickupPoints: PickupPoint[];
  setPickupPoints: (pps: PickupPoint[]) => void;
  queueEntries: QueueEntry[];
  setQueueEntries: (entries: QueueEntry[]) => void;
  demandForecasts: DemandForecast[];
  setDemandForecasts: (forecasts: DemandForecast[]) => void;
  notifications: NotificationItem[];
  setNotifications: (notifications: NotificationItem[]) => void;
  events: EventItem[];
  setEvents: (events: EventItem[]) => void;
  preRegistrations: PreRegistration[];
  setPreRegistrations: (preregs: PreRegistration[]) => void;

  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Refresh counter for auto-refresh
  refreshCounter: number;
  triggerRefresh: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Navigation
  currentView: 'landing',
  setCurrentView: (view) => set({ currentView: view }),

  // Auth
  user: null,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  isAuthenticated: false,

  // Selected items
  selectedBus: null,
  setSelectedBus: (bus) => set({ selectedBus: bus }),
  selectedRoute: null,
  setSelectedRoute: (route) => set({ selectedRoute: route }),
  selectedPickupPoint: null,
  setSelectedPickupPoint: (pp) => set({ selectedPickupPoint: pp }),

  // Data caches
  buses: [],
  setBuses: (buses) => set({ buses }),
  routes: [],
  setRoutes: (routes) => set({ routes }),
  pickupPoints: [],
  setPickupPoints: (pps) => set({ pickupPoints: pps }),
  queueEntries: [],
  setQueueEntries: (entries) => set({ queueEntries: entries }),
  demandForecasts: [],
  setDemandForecasts: (forecasts) => set({ demandForecasts: forecasts }),
  notifications: [],
  setNotifications: (notifications) => set({ notifications }),
  events: [],
  setEvents: (events) => set({ events }),
  preRegistrations: [],
  setPreRegistrations: (preregs) => set({ preRegistrations: preregs }),

  // Loading states
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),

  // Refresh counter
  refreshCounter: 0,
  triggerRefresh: () => set((state) => ({ refreshCounter: state.refreshCounter + 1 })),
}));
