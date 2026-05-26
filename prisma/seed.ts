import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Redemption City coordinates
const REDEMPTION_CITY = { lat: 6.7765, lng: 3.4310 };

const pickupPoints = [
  // Lagos State
  { name: "Ikeja City Mall", state: "Lagos", latitude: 6.6018, longitude: 3.3515, address: "Obafemi Awolowo Way, Ikeja", capacity: 500 },
  { name: "Oshodi Transport Terminal", state: "Lagos", latitude: 6.5634, longitude: 3.3423, address: "Oshodi-Apapa Expressway, Oshodi", capacity: 800 },
  { name: "Berger Bus Stop", state: "Lagos", latitude: 6.6298, longitude: 3.3795, address: "Lagos-Ibadan Expressway, Berger", capacity: 600 },
  { name: "CMS Bus Terminal", state: "Lagos", latitude: 6.4492, longitude: 3.3925, address: "Marina, Lagos Island", capacity: 400 },
  { name: "Mile 2 Bus Stop", state: "Lagos", latitude: 6.4698, longitude: 3.3101, address: "Badagry Expressway, Mile 2", capacity: 350 },
  { name: "Festac Gate", state: "Lagos", latitude: 6.4758, longitude: 3.2956, address: "5th Avenue, Festac Town", capacity: 300 },
  { name: "Surulere National Stadium", state: "Lagos", latitude: 6.4997, longitude: 3.3632, address: "Surulere, Lagos", capacity: 450 },
  { name: "Maryland Junction", state: "Lagos", latitude: 6.5720, longitude: 3.3650, address: "Ikorodu Road, Maryland", capacity: 350 },
  { name: "Anthony Village", state: "Lagos", latitude: 6.5790, longitude: 3.3620, address: "Ikorodu Road, Anthony", capacity: 250 },
  { name: "Ajah Bus Terminal", state: "Lagos", latitude: 6.4490, longitude: 3.5670, address: "Lekki-Epe Expressway, Ajah", capacity: 300 },
  // Ogun State
  { name: "Abeokuta Central", state: "Ogun", latitude: 7.1475, longitude: 3.3619, address: "Kuto, Abeokuta", capacity: 400 },
  { name: "Mowe-Ibafo Junction", state: "Ogun", latitude: 6.7900, longitude: 3.4600, address: "Lagos-Ibadan Expressway, Mowe", capacity: 350 },
  // Oyo State
  { name: "Ibadan Challenge", state: "Oyo", latitude: 7.3775, longitude: 3.8730, address: "Challenge Roundabout, Ibadan", capacity: 500 },
  // Osun State
  { name: "Osogbo Railway Station", state: "Osun", latitude: 7.7750, longitude: 4.5615, address: "Station Road, Osogbo", capacity: 300 },
  // Ondo State
  { name: "Akure Motor Park", state: "Ondo", latitude: 7.2500, longitude: 5.1950, address: "Oba Adesida Road, Akure", capacity: 250 },
  // Kwara State
  { name: "Ilorin General Hospital Junction", state: "Kwara", latitude: 8.4790, longitude: 4.5620, address: "Ilorin-Jebba Road, Ilorin", capacity: 200 },
  // FCT
  { name: "Abuja Central Park", state: "FCT", latitude: 9.0579, longitude: 7.4950, address: "Central Business District, Abuja", capacity: 300 },
];

const routes = [
  // Lagos routes
  { name: "Ikeja → Redemption City", fromIdx: 0, toIdx: -1, distanceKm: 42, estimatedMin: 60 },
  { name: "Oshodi → Redemption City", fromIdx: 1, toIdx: -1, distanceKm: 48, estimatedMin: 70 },
  { name: "Berger → Redemption City", fromIdx: 2, toIdx: -1, distanceKm: 35, estimatedMin: 45 },
  { name: "CMS → Redemption City", fromIdx: 3, toIdx: -1, distanceKm: 55, estimatedMin: 85 },
  { name: "Mile 2 → Redemption City", fromIdx: 4, toIdx: -1, distanceKm: 60, estimatedMin: 90 },
  { name: "Festac → Redemption City", fromIdx: 5, toIdx: -1, distanceKm: 58, estimatedMin: 88 },
  { name: "Surulere → Redemption City", fromIdx: 6, toIdx: -1, distanceKm: 50, estimatedMin: 75 },
  { name: "Maryland → Redemption City", fromIdx: 7, toIdx: -1, distanceKm: 45, estimatedMin: 65 },
  { name: "Anthony → Redemption City", fromIdx: 8, toIdx: -1, distanceKm: 44, estimatedMin: 63 },
  { name: "Ajah → Redemption City", fromIdx: 9, toIdx: -1, distanceKm: 72, estimatedMin: 105 },
  // Ogun routes
  { name: "Abeokuta → Redemption City", fromIdx: 10, toIdx: -1, distanceKm: 85, estimatedMin: 110 },
  { name: "Mowe → Redemption City", fromIdx: 11, toIdx: -1, distanceKm: 15, estimatedMin: 20 },
  // Oyo route
  { name: "Ibadan → Redemption City", fromIdx: 12, toIdx: -1, distanceKm: 105, estimatedMin: 130 },
  // Osun route
  { name: "Osogbo → Redemption City", fromIdx: 13, toIdx: -1, distanceKm: 195, estimatedMin: 210 },
  // Ondo route
  { name: "Akure → Redemption City", fromIdx: 14, toIdx: -1, distanceKm: 210, estimatedMin: 240 },
  // Kwara route
  { name: "Ilorin → Redemption City", fromIdx: 15, toIdx: -1, distanceKm: 310, estimatedMin: 330 },
  // FCT route
  { name: "Abuja → Redemption City", fromIdx: 16, toIdx: -1, distanceKm: 550, estimatedMin: 480 },
];

// Nigerian plate number generator
function generatePlateNumbers(): string[] {
  const plates: string[] = [];
  const lagosPrefixes = ["LSR", "LSD", "LSB", "LSK", "LSM"];
  const ogunPrefixes = ["OGN", "OGA", "OGB"];
  const oyoPrefixes = ["OYB", "OYO"];
  const others = ["OSS", "OND", "KWA", "FCT"];

  // Lagos buses (30)
  for (let i = 0; i < 30; i++) {
    const prefix = lagosPrefixes[i % lagosPrefixes.length];
    const num = 100 + Math.floor(Math.random() * 899);
    const letters = String.fromCharCode(65 + Math.floor(Math.random() * 26)) + String.fromCharCode(65 + Math.floor(Math.random() * 26));
    plates.push(`${prefix}-${num}-${letters}`);
  }
  // Ogun buses (10)
  for (let i = 0; i < 10; i++) {
    const prefix = ogunPrefixes[i % ogunPrefixes.length];
    const num = 100 + Math.floor(Math.random() * 899);
    const letters = String.fromCharCode(65 + Math.floor(Math.random() * 26)) + String.fromCharCode(65 + Math.floor(Math.random() * 26));
    plates.push(`${prefix}-${num}-${letters}`);
  }
  // Oyo buses (5)
  for (let i = 0; i < 5; i++) {
    const prefix = oyoPrefixes[i % oyoPrefixes.length];
    const num = 100 + Math.floor(Math.random() * 899);
    const letters = String.fromCharCode(65 + Math.floor(Math.random() * 26)) + String.fromCharCode(65 + Math.floor(Math.random() * 26));
    plates.push(`${prefix}-${num}-${letters}`);
  }
  // Others (5)
  for (let i = 0; i < 5; i++) {
    const prefix = others[i % others.length];
    const num = 100 + Math.floor(Math.random() * 899);
    const letters = String.fromCharCode(65 + Math.floor(Math.random() * 26)) + String.fromCharCode(65 + Math.floor(Math.random() * 26));
    plates.push(`${prefix}-${num}-${letters}`);
  }
  return plates;
}

const driverNames = [
  "Adebayo Ogundimu", "Chinedu Eze", "Ibrahim Musa", "Olumide Adeyemi", "Emeka Nwankwo",
  "Babatunde Ogunleye", "Abdulahi Garba", "Segun Olanrewaju", "Uchechukwu Obi", "Kunle Adeosun",
  "Mohammed Bello", "Afolabi Ojo", "Nnamdi Okafor", "Yusuf Abdullahi", "Tunde Bakare",
  "Chukwuma Emenike", "Rasheed Alabi", "Obinna Nwosu", "Suleiman Idris", "Femi Ogunlesi",
  "Godwin Adigwe", "Aminu Sani", "Patrick Eze", "Dauda Oyeniran", "Biodun Akindele",
  "Haruna Tanko", "Victor Ibe", "Gbenga Olatunji", "Aliyu Musa", "Clement Obi",
  "Samuel Adesanya", "Musa Bello", "Emmanuel Chukwu", "Waheed Olayinka", "Anthony Nwankwo",
  "Isa Mohammed", "Kola Adeyemi", "Obiora Eze", "Jamiu Adekunle", "Samuel Okeke",
  "Abdulrasheed Aliyu", "Kingsley Ike", "Tajudeen Adeyemi", "Felix Okonkwo", "Abubakar Sadiq",
  "Adegoke Adeniyi", "Chidi Nnamdi", "Murtala Yahaya", "Jide Ogunbanwo", "Paul Okoro",
];

const driverPhones = [
  "+234-801-234-5678", "+234-802-345-6789", "+234-803-456-7890", "+234-804-567-8901", "+234-805-678-9012",
  "+234-806-789-0123", "+234-807-890-1234", "+234-808-901-2345", "+234-809-012-3456", "+234-810-123-4567",
  "+234-811-234-5678", "+234-812-345-6789", "+234-813-456-7890", "+234-814-567-8901", "+234-815-678-9012",
  "+234-816-789-0123", "+234-817-890-1234", "+234-818-901-2345", "+234-819-012-3456", "+234-820-123-4567",
  "+234-821-234-5678", "+234-822-345-6789", "+234-823-456-7890", "+234-824-567-8901", "+234-825-678-9012",
  "+234-826-789-0123", "+234-827-890-1234", "+234-828-901-2345", "+234-829-012-3456", "+234-830-123-4567",
  "+234-831-234-5678", "+234-832-345-6789", "+234-833-456-7890", "+234-834-567-8901", "+234-835-678-9012",
  "+234-836-789-0123", "+234-837-890-1234", "+234-838-901-2345", "+234-839-012-3456", "+234-840-123-4567",
  "+234-841-234-5678", "+234-842-345-6789", "+234-843-456-7890", "+234-844-567-8901", "+234-845-678-9012",
  "+234-846-789-0123", "+234-847-890-1234", "+234-848-901-2345", "+234-849-012-3456", "+234-850-123-4567",
];

const busStatuses = ["available", "in-transit", "loading", "maintenance"];

const timeSlots = ["06:00-08:00", "08:00-10:00", "10:00-12:00", "12:00-14:00", "14:00-16:00", "16:00-18:00"];

// Generate email from driver name
function generateDriverEmail(name: string, index: number): string {
  const parts = name.toLowerCase().split(' ');
  return `${parts[0]}.${parts[parts.length - 1]}${index}@routeshepherd.ng`;
}

async function main() {
  console.log("🌱 Seeding database...");

  // Clean up existing data
  await prisma.preRegistration.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.demandForecast.deleteMany();
  await prisma.queueEntry.deleteMany();
  await prisma.bus.deleteMany();
  await prisma.route.deleteMany();
  await prisma.pickupPoint.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Coordinator Users
  console.log("👤 Creating coordinator accounts...");
  const saltRounds = 10;
  const coordinatorPassword1 = await bcrypt.hash('Shepherd@2026!', saltRounds);
  const coordinatorPassword2 = await bcrypt.hash('Admin@2026!', saltRounds);

  const coordinator1 = await prisma.user.create({
    data: {
      email: 'coordinator@routeshepherd.ng',
      name: 'Head Coordinator',
      role: 'coordinator',
      provider: 'credentials',
      passwordHash: coordinatorPassword1,
    },
  });

  const coordinator2 = await prisma.user.create({
    data: {
      email: 'admin@routeshepherd.ng',
      name: 'System Admin',
      role: 'coordinator',
      provider: 'credentials',
      passwordHash: coordinatorPassword2,
    },
  });

  console.log(`   ✅ Created 2 coordinator accounts`);

  // 2. Create Driver Users
  console.log("🚗 Creating driver accounts...");
  const driverUsers = [];
  for (let i = 0; i < driverNames.length; i++) {
    const driver = await prisma.user.create({
      data: {
        email: generateDriverEmail(driverNames[i], i),
        name: driverNames[i],
        role: 'driver',
        provider: 'email-only',
        driverPhone: driverPhones[i % driverPhones.length],
      },
    });
    driverUsers.push(driver);
  }
  console.log(`   ✅ Created ${driverUsers.length} driver accounts`);

  // 3. Create Events
  console.log("📅 Creating events...");
  const congress = await prisma.event.create({
    data: {
      name: "Holy Ghost Congress 2026",
      description: "The annual Holy Ghost Congress at Redemption City, featuring powerful ministrations, worship, and divine encounters. The largest gathering of RCCG members worldwide.",
      date: new Date("2026-12-07T00:00:00Z"),
      endDate: new Date("2026-12-12T00:00:00Z"),
      status: "upcoming",
      expectedAttendance: 5000000,
    },
  });

  const convention = await prisma.event.create({
    data: {
      name: "Annual Convention 2026",
      description: "The 74th Annual Convention of the Redeemed Christian Church of God. A week of spiritual renewal, celebration, and fellowship.",
      date: new Date("2026-08-03T00:00:00Z"),
      endDate: new Date("2026-08-09T00:00:00Z"),
      status: "upcoming",
      expectedAttendance: 3000000,
    },
  });

  // 4. Create Pickup Points
  console.log("📍 Creating pickup points...");
  const createdPickupPoints = [];
  for (const pp of pickupPoints) {
    const created = await prisma.pickupPoint.create({ data: pp });
    createdPickupPoints.push(created);
  }

  // Create Redemption City as a pickup point for route destinations
  const redemptionCity = await prisma.pickupPoint.create({
    data: {
      name: "Redemption City",
      state: "Ogun",
      latitude: REDEMPTION_CITY.lat,
      longitude: REDEMPTION_CITY.lng,
      address: "Lagos-Ibadan Expressway, Mowe, Ogun State",
      capacity: 5000,
      active: true,
    },
  });

  // 5. Create Routes
  console.log("🛣️ Creating routes...");
  const createdRoutes = [];
  for (const route of routes) {
    const fromPoint = createdPickupPoints[route.fromIdx];
    const created = await prisma.route.create({
      data: {
        name: route.name,
        fromPointId: fromPoint.id,
        toPointId: redemptionCity.id,
        distanceKm: route.distanceKm,
        estimatedMin: route.estimatedMin,
        status: "active",
        eventId: congress.id,
      },
    });
    createdRoutes.push(created);
  }

  // 6. Create Buses (with driver assignments via User model)
  console.log("🚌 Creating buses...");
  const plates = generatePlateNumbers();
  const createdBuses = [];

  for (let i = 0; i < plates.length; i++) {
    const routeIdx = i % createdRoutes.length;
    const statusIdx = i < 15 ? 0 : i < 30 ? 1 : i < 40 ? 2 : 3;
    const route = createdRoutes[routeIdx];
    const status = busStatuses[statusIdx];
    const capacity = [35, 45, 50, 60][Math.floor(Math.random() * 4)];
    const currentLoad = status === "in-transit" ? Math.floor(Math.random() * capacity * 0.8) + Math.floor(capacity * 0.2) :
                        status === "loading" ? Math.floor(Math.random() * capacity * 0.5) : 0;

    // Generate random coordinates along the route for in-transit buses
    let busLat: number | null = null;
    let busLng: number | null = null;
    if (status === "in-transit" || status === "loading") {
      const fromPP = createdPickupPoints[routes[routeIdx].fromIdx];
      const progress = status === "in-transit" ? 0.3 + Math.random() * 0.6 : 0.05 + Math.random() * 0.15;
      busLat = fromPP.latitude + (REDEMPTION_CITY.lat - fromPP.latitude) * progress + (Math.random() - 0.5) * 0.01;
      busLng = fromPP.longitude + (REDEMPTION_CITY.lng - fromPP.longitude) * progress + (Math.random() - 0.5) * 0.01;
    } else if (status === "available") {
      const fromPP = createdPickupPoints[routes[routeIdx].fromIdx];
      busLat = fromPP.latitude + (Math.random() - 0.5) * 0.02;
      busLng = fromPP.longitude + (Math.random() - 0.5) * 0.02;
    }

    // Assign driver to bus
    const driverUser = driverUsers[i % driverUsers.length];

    const bus = await prisma.bus.create({
      data: {
        plateNumber: plates[i],
        capacity,
        currentLoad,
        status,
        driverId: driverUser.id,
        routeId: route.id,
        eventId: congress.id,
        latitude: busLat,
        longitude: busLng,
        lastUpdated: new Date(),
      },
    });
    createdBuses.push(bus);
  }

  // 7. Create Queue Entries
  console.log("📋 Creating queue entries...");
  for (const pp of createdPickupPoints) {
    const baseWait = pp.state === "Lagos" ? 15 + Math.floor(Math.random() * 45) :
                     pp.state === "Ogun" ? 5 + Math.floor(Math.random() * 20) :
                     10 + Math.floor(Math.random() * 30);
    await prisma.queueEntry.create({
      data: {
        pickupPointId: pp.id,
        estimatedWait: baseWait,
        queueLength: Math.floor(baseWait / 3) * 10 + Math.floor(Math.random() * 30),
        recordedAt: new Date(),
      },
    });
  }

  // 8. Create Demand Forecasts
  console.log("📊 Creating demand forecasts...");
  for (const pp of createdPickupPoints) {
    for (const slot of timeSlots) {
      const isPeak = slot === "06:00-08:00" || slot === "08:00-10:00";
      const baseDemand = pp.state === "Lagos" ? 200 : pp.state === "Ogun" ? 80 : 50;
      const predictedDemand = isPeak ?
        baseDemand + Math.floor(Math.random() * 150) :
        baseDemand + Math.floor(Math.random() * 80);

      await prisma.demandForecast.create({
        data: {
          pickupPointId: pp.id,
          timeSlot: slot,
          predictedDemand,
          confidence: 0.65 + Math.random() * 0.3,
        },
      });
    }
  }

  // 9. Create Notifications
  console.log("🔔 Creating notifications...");
  await prisma.notification.createMany({
    data: [
      { title: "Holy Ghost Congress 2026 - Registration Open", message: "Pre-registration for the Holy Ghost Congress 2026 is now open. Book your bus early to avoid delays.", type: "info", target: "all" },
      { title: "High Demand Expected at Oshodi", message: "Demand forecast shows exceptionally high passenger volume at Oshodi Transport Terminal for morning departure slots. Consider alternative pickup points.", type: "warning", target: "passenger" },
      { title: "New Buses Deployed on Lagos Routes", message: "15 additional buses have been deployed across Lagos routes to meet increased demand for the upcoming Congress.", type: "success", target: "all" },
      { title: "Route Maintenance Alert", message: "The Ibadan-Challenge route has scheduled road maintenance. Expect 20-minute delays.", type: "warning", target: "driver" },
      { title: "Dispatch Update Required", message: "3 buses at Berger Bus Stop are awaiting dispatch assignment. Please review and assign routes.", type: "info", target: "coordinator" },
      { title: "Safety Reminder", message: "All drivers must conduct pre-trip vehicle inspections before departure. Safety is our top priority.", type: "info", target: "driver" },
      { title: "Peak Hours Advisory", message: "Peak travel hours are 6AM-10AM and 4PM-7PM. Plan your departure accordingly for shorter wait times.", type: "info", target: "passenger" },
      { title: "Abuja Route Added", message: "A new direct route from Abuja Central Park to Redemption City has been added for the Holy Ghost Congress.", type: "success", target: "all" },
    ],
  });

  // 10. Create Sample Pre-Registrations
  console.log("📝 Creating sample pre-registrations...");
  const samplePreregs = [
    { fullName: "Adebayo Johnson", phone: "+234-801-234-5678", pickupPointIdx: 0, preferredTime: "06:00-08:00", passengers: 3, status: "confirmed" },
    { fullName: "Chioma Nwosu", phone: "+234-802-345-6789", pickupPointIdx: 6, preferredTime: "08:00-10:00", passengers: 2, status: "confirmed" },
    { fullName: "Ibrahim Garba", phone: "+234-803-456-7890", pickupPointIdx: 12, preferredTime: "06:00-08:00", passengers: 5, status: "pending" },
    { fullName: "Funke Adeyemi", phone: "+234-804-567-8901", pickupPointIdx: 2, preferredTime: "10:00-12:00", passengers: 4, status: "confirmed" },
    { fullName: "Emmanuel Okafor", phone: "+234-805-678-9012", pickupPointIdx: 10, preferredTime: "08:00-10:00", passengers: 2, status: "pending" },
    { fullName: "Blessing Obi", phone: "+234-806-789-0123", pickupPointIdx: 1, preferredTime: "06:00-08:00", passengers: 1, status: "confirmed" },
    { fullName: "Aminu Sule", phone: "+234-807-890-1234", pickupPointIdx: 16, preferredTime: "06:00-08:00", passengers: 6, status: "pending" },
    { fullName: "Grace Olawale", phone: "+234-808-901-2345", pickupPointIdx: 7, preferredTime: "14:00-16:00", passengers: 2, status: "confirmed" },
  ];

  for (const prereg of samplePreregs) {
    await prisma.preRegistration.create({
      data: {
        fullName: prereg.fullName,
        phone: prereg.phone,
        pickupPointId: createdPickupPoints[prereg.pickupPointIdx].id,
        preferredTime: prereg.preferredTime,
        passengers: prereg.passengers,
        status: prereg.status,
      },
    });
  }

  console.log(`✅ Seed completed! Created:`);
  console.log(`   - 2 Coordinator Users (coordinator@routeshepherd.ng / admin@routeshepherd.ng)`);
  console.log(`   - ${driverUsers.length} Driver Users`);
  console.log(`   - 2 Events`);
  console.log(`   - ${createdPickupPoints.length + 1} Pickup Points (including Redemption City)`);
  console.log(`   - ${createdRoutes.length} Routes`);
  console.log(`   - ${createdBuses.length} Buses`);
  console.log(`   - ${createdPickupPoints.length} Queue Entries`);
  console.log(`   - ${createdPickupPoints.length * timeSlots.length} Demand Forecasts`);
  console.log(`   - 8 Notifications`);
  console.log(`   - ${samplePreregs.length} Pre-Registrations`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
