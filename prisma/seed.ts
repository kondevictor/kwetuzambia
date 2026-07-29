import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function user(email: string, name: string, role: string, phone?: string) {
  const passwordHash = await bcrypt.hash("password123", 10);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name, role, phone, passwordHash, verified: true, wallet: { create: {} } },
  });
}

async function main() {
  console.log("Seeding Kwetu demo data...");

  // ---------- Users ----------
  const admin = await user("admin@kwetu.zm", "Kwetu Admin", "ADMIN", "+260970000001");
  const rider = await user("chanda@example.com", "Chanda Mwale", "CONSUMER", "+260970000002");
  const mazhanduOwner = await user("ops@mazhandu.example.com", "Mazhandu Ops", "SUPPLIER", "+260970000003");
  const powerToolsOwner = await user("ops@powertools.example.com", "Power Tools Ops", "SUPPLIER", "+260970000004");
  const lodgeOwner = await user("host@livingstonelodge.example.com", "Livingstone Lodge Host", "SUPPLIER", "+260970000005");
  const organiser = await user("events@kuomboka.example.com", "Kuomboka Events", "SUPPLIER", "+260970000006");
  const provider = await user("provider@fixit.example.com", "FixIt Electricals", "SUPPLIER", "+260970000007");
  const landlord = await user("landlord@example.com", "Bwalya Properties", "SUPPLIER", "+260970000008");
  const seller = await user("seller@example.com", "Chibombo Land Co", "SUPPLIER", "+260970000009");

  // ---------- Vertical 1: Bus ----------
  const mazhandu = await prisma.operator.create({
    data: { name: "Mazhandu Family Bus", ownerId: mazhanduOwner.id, verified: true },
  });
  const powerTools = await prisma.operator.create({
    data: { name: "Power Tools Coach Services", ownerId: powerToolsOwner.id, verified: true },
  });

  const routeLskNdola = await prisma.route.create({
    data: { operatorId: mazhandu.id, origin: "Lusaka", destination: "Ndola" },
  });
  const routeLskLvi = await prisma.route.create({
    data: { operatorId: powerTools.id, origin: "Lusaka", destination: "Livingstone" },
  });
  const routeLskKtw = await prisma.route.create({
    data: { operatorId: mazhandu.id, origin: "Lusaka", destination: "Kitwe" },
  });

  const now = new Date();
  function hoursFromNow(h: number) {
    return new Date(now.getTime() + h * 60 * 60 * 1000);
  }

  async function makeTrip(routeId: string, plate: string, departInHours: number, durationHours: number, fareZmw: number, seats = 44) {
    const trip = await prisma.trip.create({
      data: {
        routeId,
        departAt: hoursFromNow(departInHours),
        arriveAt: hoursFromNow(departInHours + durationHours),
        basePriceMinor: Math.round(fareZmw * 100),
        busPlate: plate,
        totalSeats: seats,
      },
    });
    const rows = "ABCD";
    const seatData = [];
    for (let n = 1; n <= Math.ceil(seats / 4); n++) {
      for (const r of rows) {
        if (seatData.length >= seats) break;
        seatData.push({ tripId: trip.id, seatNo: `${n}${r}` });
      }
    }
    await prisma.seat.createMany({ data: seatData });
    return trip;
  }

  await makeTrip(routeLskNdola.id, "BAZ 1234", 18, 4, 180);
  await makeTrip(routeLskNdola.id, "BAZ 1235", 30, 4, 180);
  await makeTrip(routeLskLvi.id, "BAZ 5678", 20, 7, 350);
  await makeTrip(routeLskKtw.id, "BAZ 4321", 24, 5, 200);

  // ---------- Vertical 2: Accommodation ----------
  const lodge = await prisma.property.create({
    data: {
      ownerId: lodgeOwner.id,
      name: "Zambezi View Lodge",
      city: "Livingstone",
      description: "Riverside lodge minutes from Victoria Falls, business-traveller friendly with fast wifi.",
      verified: true,
      rooms: {
        create: [
          { type: "Standard Twin", ratePerNightMinor: 45000, quantity: 6 },
          { type: "River View Suite", ratePerNightMinor: 95000, quantity: 3 },
        ],
      },
    },
  });
  await prisma.property.create({
    data: {
      ownerId: lodgeOwner.id,
      name: "Lusaka City Apartments",
      city: "Lusaka",
      description: "Serviced apartments in Rhodes Park, popular with corporate and diaspora travellers.",
      verified: true,
      rooms: { create: [{ type: "1-Bedroom Apartment", ratePerNightMinor: 60000, quantity: 8 }] },
    },
  });

  // ---------- Vertical 3: Events ----------
  await prisma.event.create({
    data: {
      ownerId: organiser.id,
      name: "Kuomboka Ceremony Viewing",
      venue: "Mongu, Western Province",
      startsAt: hoursFromNow(24 * 21),
      verified: true,
      ticketTiers: {
        create: [
          { name: "General", priceMinor: 5000, quantity: 5000 },
          { name: "VIP Pavilion", priceMinor: 25000, quantity: 300 },
        ],
      },
    },
  });
  await prisma.event.create({
    data: {
      ownerId: organiser.id,
      name: "Copperbelt derby: Nkana vs Power Dynamos",
      venue: "Levy Mwanawasa Stadium, Ndola",
      startsAt: hoursFromNow(24 * 10),
      verified: true,
      ticketTiers: { create: [{ name: "Terraces", priceMinor: 3000, quantity: 10000 }] },
    },
  });

  // ---------- Vertical 4: Services marketplace ----------
  await prisma.serviceListing.create({
    data: {
      ownerId: provider.id,
      title: "Licensed electrician — home & office wiring",
      category: "TRADES",
      description: "10 years experience, ZESCO-compliant installations, same-day call-outs in Lusaka.",
      priceMinor: 35000,
      verified: true,
    },
  });
  await prisma.serviceListing.create({
    data: {
      ownerId: provider.id,
      title: "Deep clean — 3 bedroom house",
      category: "CLEANING",
      description: "Full team, own equipment, 4-hour turnaround.",
      priceMinor: 25000,
      verified: true,
    },
  });

  // ---------- Vertical 5: Property rental placement ----------
  await prisma.propertyListing.create({
    data: {
      ownerId: landlord.id,
      title: "3-bedroom house, Kabulonga",
      city: "Lusaka",
      monthlyRentMinor: 850000,
      description: "Walled compound, borehole, 2 minutes from Kabulonga shopping centre.",
      contactPhone: "+260970000008",
      period: "DAYS_14",
      placementFeeMinor: 8500,
      verified: true,
      paidUntil: hoursFromNow(24 * 14),
    },
  });

  // ---------- Vertical 6: Land listings ----------
  await prisma.landListing.create({
    data: {
      ownerId: seller.id,
      title: "1-acre residential plot, Chalala",
      location: "Lusaka West / Chalala",
      sizeAcres: 1,
      priceMinor: 25000000,
      description: "Titled, ready for immediate development, close to the new bypass.",
      contactPhone: "+260970000009",
      placementFeeMinor: 25000,
      verified: true,
      paidUntil: hoursFromNow(24 * 30),
    },
  });

  // ---------- Vertical 8: Partner referrals ----------
  await prisma.referralPartner.createMany({
    data: [
      { name: "Yango", category: "RIDES", outboundUrl: "https://yango.com", ratePct: 4.0 },
      { name: "Yango Food", category: "FOOD", outboundUrl: "https://food.yango.com", ratePct: 4.0 },
    ],
  });

  console.log("Seed complete.");
  console.log("Demo login: chanda@example.com / password123 (consumer)");
  console.log("Demo login: admin@kwetu.zm / password123 (admin)");
  console.log("Demo login: ops@mazhandu.example.com / password123 (bus operator supplier)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
