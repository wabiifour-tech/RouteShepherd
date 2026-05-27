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
  { name: "Abeokuta → Redemption City", fromIdx: 10, toIdx: -1, distanceKm: 85, estimatedMin: 110 },
  { name: "Mowe → Redemption City", fromIdx: 11, toIdx: -1, distanceKm: 15, estimatedMin: 20 },
  { name: "Ibadan → Redemption City", fromIdx: 12, toIdx: -1, distanceKm: 105, estimatedMin: 130 },
  { name: "Osogbo → Redemption City", fromIdx: 13, toIdx: -1, distanceKm: 195, estimatedMin: 210 },
  { name: "Akure → Redemption City", fromIdx: 14, toIdx: -1, distanceKm: 210, estimatedMin: 240 },
  { name: "Ilorin → Redemption City", fromIdx: 15, toIdx: -1, distanceKm: 310, estimatedMin: 330 },
  { name: "Abuja → Redemption City", fromIdx: 16, toIdx: -1, distanceKm: 550, estimatedMin: 480 },
];

async function main() {
  console.log("🌱 Seeding essential data (no demo data)...");

  // 1. Create Coordinator Users
  console.log("👤 Creating coordinator accounts...");
  const saltRounds = 10;
  const coordinatorPassword1 = await bcrypt.hash('Shepherd@2026!', saltRounds);
  const coordinatorPassword2 = await bcrypt.hash('Admin@2026!', saltRounds);

  await prisma.user.create({
    data: {
      email: 'coordinator@routeshepherd.ng',
      name: 'Head Coordinator',
      role: 'coordinator',
      provider: 'credentials',
      passwordHash: coordinatorPassword1,
    },
  });

  await prisma.user.create({
    data: {
      email: 'admin@routeshepherd.ng',
      name: 'System Admin',
      role: 'coordinator',
      provider: 'credentials',
      passwordHash: coordinatorPassword2,
    },
  });

  console.log("   ✅ Created 2 coordinator accounts");

  // 2. Create Events
  console.log("📅 Creating events...");
  const congress = await prisma.event.create({
    data: {
      name: "Holy Ghost Congress 2026",
      description: "The annual Holy Ghost Congress at Redemption City, featuring powerful ministrations, worship, and divine encounters.",
      date: new Date("2026-12-07T00:00:00Z"),
      endDate: new Date("2026-12-12T00:00:00Z"),
      status: "upcoming",
      expectedAttendance: 5000000,
    },
  });

  await prisma.event.create({
    data: {
      name: "Annual Convention 2026",
      description: "The 74th Annual Convention of the Redeemed Christian Church of God.",
      date: new Date("2026-08-03T00:00:00Z"),
      endDate: new Date("2026-08-09T00:00:00Z"),
      status: "upcoming",
      expectedAttendance: 3000000,
    },
  });

  // 3. Create Pickup Points
  console.log("📍 Creating pickup points...");
  const createdPickupPoints = [];
  for (const pp of pickupPoints) {
    const created = await prisma.pickupPoint.create({ data: pp });
    createdPickupPoints.push(created);
  }

  // Create Redemption City as a pickup point
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

  // 4. Create Routes
  console.log("🛣️ Creating routes...");
  for (const route of routes) {
    const fromPoint = createdPickupPoints[route.fromIdx];
    await prisma.route.create({
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
  }

  console.log(`✅ Essential data seeded!`);
  console.log(`   - 2 Coordinator Users (coordinator@routeshepherd.ng / admin@routeshepherd.ng)`);
  console.log(`   - 2 Events`);
  console.log(`   - ${createdPickupPoints.length + 1} Pickup Points (including Redemption City)`);
  console.log(`   - ${routes.length} Routes`);
  console.log(`   - No demo drivers, buses, passengers, or notifications (add via the app)`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
