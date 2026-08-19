import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Demo images (hosted on Cloudinary, uploaded to eventicate/<businessName>/<type>)
const IMG = {
  grandBallroom: "https://res.cloudinary.com/u1ucoiox/image/upload/v1786893153/eventicate/Grand-Hall-Events/venues/grand-ballroom.jpg",
  gardenPavilion: "https://res.cloudinary.com/u1ucoiox/image/upload/v1786893154/eventicate/Grand-Hall-Events/venues/garden-pavilion.jpg",
  weddingBuffet: "https://res.cloudinary.com/u1ucoiox/image/upload/v1786893155/eventicate/Delight-Catering-Co/catering/wedding-buffet.jpg",
  signaturePlate: "https://res.cloudinary.com/u1ucoiox/image/upload/v1786893159/eventicate/Delight-Catering-Co/catering/signature-plate.jpg",
  marqueeTent: "https://res.cloudinary.com/u1ucoiox/image/upload/v1786893163/eventicate/Tents-Africa/tents/marquee-tent.jpg",
  concertRig: "https://res.cloudinary.com/u1ucoiox/image/upload/v1786893165/eventicate/SoundPro-PA-Systems/pa/concert-rig.jpg",
  djBooth: "https://res.cloudinary.com/u1ucoiox/image/upload/v1786893167/eventicate/SoundPro-PA-Systems/pa/dj-booth.jpg",
};

async function main() {
  // Never seed privileged demo accounts (well-known passwords) into production.
  if (process.env.NODE_ENV === "production" && process.env.SEED_ALLOWED !== "true") {
    console.error(
      "Refusing to seed: NODE_ENV=production would create demo accounts with known passwords.\n" +
        "If you really want this, run with SEED_ALLOWED=true and change the passwords afterwards."
    );
    process.exit(1);
  }

  console.log("Seeding Eventicate database...");

  const passwordHash = await bcrypt.hash("password123", 12);

  // Default subscription plans
  const plans = [
    {
      name: "Free",
      description: "Perfect for getting started with basic event services",
      price: 0,
      trialDays: 30,
      maxServices: 5,
      maxEquipment: 10,
      maxBookings: 25,
      maxVenues: 1,
      maxVehicles: 1,
      features: JSON.stringify(["Basic listing", "Standard support", "Email notifications"]),
      sortOrder: 0,
    },
    {
      name: "Basic",
      description: "For growing businesses with more service offerings",
      price: 2900,
      trialDays: 0,
      maxServices: 15,
      maxEquipment: 30,
      maxBookings: 100,
      maxVenues: 3,
      maxVehicles: 3,
      features: JSON.stringify(["Enhanced listing", "Priority support", "Email & SMS notifications", "Basic analytics", "Calendar sync"]),
      sortOrder: 1,
    },
    {
      name: "Pro",
      description: "For established businesses with high volume",
      price: 7900,
      trialDays: 0,
      maxServices: 50,
      maxEquipment: 100,
      maxBookings: 500,
      maxVenues: 10,
      maxVehicles: 10,
      features: JSON.stringify(["Featured listing", "Premium support", "All notifications", "Advanced analytics", "Calendar sync", "API access", "Custom branding"]),
      sortOrder: 2,
    },
    {
      name: "Enterprise",
      description: "For large-scale event service providers",
      price: 19900,
      trialDays: 0,
      maxServices: -1,
      maxEquipment: -1,
      maxBookings: -1,
      maxVenues: -1,
      maxVehicles: -1,
      features: JSON.stringify(["Unlimited everything", "Dedicated account manager", "White-label options", "Advanced API access", "Custom integrations", "SLA guarantee", "Multi-user access"]),
      sortOrder: 3,
    },
  ];

  for (const plan of plans) {
    const existing = await prisma.subscriptionPlan.findFirst({ where: { name: plan.name } });
    if (existing) {
      await prisma.subscriptionPlan.update({ where: { id: existing.id }, data: plan });
    } else {
      await prisma.subscriptionPlan.create({ data: plan });
    }
  }

  // Admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@eventicate.com" },
    update: { phone: "+254700000001" },
    create: {
      email: "admin@eventicate.com",
      passwordHash,
      firstName: "Admin",
      lastName: "User",
      role: "ADMIN",
      phone: "+254700000001",
      isVerified: true,
    },
  });

  // Customer
  const customer = await prisma.user.upsert({
    where: { email: "customer@eventicate.com" },
    update: { phone: "+254700000002" },
    create: {
      email: "customer@eventicate.com",
      passwordHash,
      firstName: "Jane",
      lastName: "Organizer",
      role: "CUSTOMER",
      phone: "+254700000002",
      isVerified: true,
      customerProfile: { create: { city: "Nairobi", country: "Kenya" } },
    },
  });

  // PA System Provider
  const paProvider = await prisma.user.upsert({
    where: { email: "pa@soundpro.com" },
    update: { phone: "+254700000003" },
    create: {
      email: "pa@soundpro.com",
      passwordHash,
      firstName: "Mike",
      lastName: "Sound",
      role: "PROVIDER",
      phone: "+254700000003",
      isVerified: true,
      providerProfile: {
        create: {
          businessName: "SoundPro PA Systems",
          description: "Professional PA and audio equipment for all event types. Full setup and operator services available.",
          category: "PA_SYSTEM",
          city: "Nairobi",
          country: "Kenya",
          isApproved: true,
          averageRating: 4.8,
          totalReviews: 24,
        },
      },
    },
    include: { providerProfile: true },
  });

  // Catering Provider
  const cateringProvider = await prisma.user.upsert({
    where: { email: "catering@delight.com" },
    update: { phone: "+254700000004" },
    create: {
      email: "catering@delight.com",
      passwordHash,
      firstName: "Maria",
      lastName: "Delight",
      role: "PROVIDER",
      phone: "+254700000004",
      isVerified: true,
      providerProfile: {
        create: {
          businessName: "Delight Catering Co.",
          description: "Premium catering for weddings, funerals, corporate events, and celebrations.",
          category: "CATERING",
          city: "Mombasa",
          country: "Kenya",
          isApproved: true,
          averageRating: 4.6,
          totalReviews: 18,
        },
      },
    },
    include: { providerProfile: true },
  });

  // Venue Provider
  const venueProvider = await prisma.user.upsert({
    where: { email: "venue@grandhall.com" },
    update: { phone: "+254700000005" },
    create: {
      email: "venue@grandhall.com",
      passwordHash,
      firstName: "Robert",
      lastName: "Hall",
      role: "PROVIDER",
      phone: "+254700000005",
      isVerified: true,
      providerProfile: {
        create: {
          businessName: "Grand Hall Events",
          description: "Elegant venue space for up to 500 guests. Perfect for weddings and corporate events.",
          category: "VENUE",
          city: "Nairobi",
          country: "Kenya",
          isApproved: true,
          averageRating: 4.9,
          totalReviews: 42,
        },
      },
    },
    include: { providerProfile: true },
  });

  // Tents Provider
  const tentsProvider = await prisma.user.upsert({
    where: { email: "tents@canopy.com" },
    update: { phone: "+254700000006" },
    create: {
      email: "tents@canopy.com",
      passwordHash,
      firstName: "Dennis",
      lastName: "Canopy",
      role: "PROVIDER",
      phone: "+254700000006",
      isVerified: true,
      providerProfile: {
        create: {
          businessName: "Tents Africa",
          description: "Marquee and canopy tents for weddings, outdoor events, and corporate functions. Setup and teardown included.",
          category: "TENTS",
          city: "Nairobi",
          country: "Kenya",
          isApproved: true,
          averageRating: 4.7,
          totalReviews: 31,
        },
      },
    },
    include: { providerProfile: true },
  });

  const paProfile = paProvider.providerProfile!;
  const cateringProfile = cateringProvider.providerProfile!;
  const venueProfile = venueProvider.providerProfile!;
  const tentsProfile = tentsProvider.providerProfile!;

  // Sample event for customer (fetched early so it can be cleared idempotently)
  const customerProfile = await prisma.customerProfile.findUnique({
    where: { userId: customer.id },
  });

  // Clear demo content (idempotent re-seed)
  await prisma.$transaction([
    prisma.equipment.deleteMany({ where: { providerId: { in: [paProfile.id, tentsProfile.id] } } }),
    prisma.menuPackage.deleteMany({ where: { providerId: cateringProfile.id } }),
    prisma.venue.deleteMany({ where: { providerId: venueProfile.id } }),
    prisma.pricingRule.deleteMany({ where: { providerId: { in: [paProfile.id, cateringProfile.id, venueProfile.id, tentsProfile.id] } } }),
    prisma.booking.deleteMany({ where: { providerId: { in: [paProfile.id, cateringProfile.id, venueProfile.id, tentsProfile.id] } } }),
    prisma.service.deleteMany({ where: { providerId: { in: [paProfile.id, cateringProfile.id, venueProfile.id, tentsProfile.id] } } }),
    prisma.event.deleteMany({ where: { customerId: customerProfile?.id, title: "Sarah & John's Wedding" } }),
  ]);

  // PA Services & Equipment
  const paService = await prisma.service.create({
    data: {
      providerId: paProfile.id,
      name: "Full PA System Package",
      description: "Complete sound system with speakers, mixer, microphones, and operator",
      category: "PA_SYSTEM",
      basePrice: 35000,
      images: JSON.stringify([IMG.concertRig, IMG.djBooth]),
    },
  });

  await prisma.equipment.createMany({
    data: [
      { providerId: paProfile.id, name: "JBL PRX Speakers", category: "audio", subcategory: "Speakers", quantity: 4, rentalPrice: 15000, setupCharge: 3000, operatorCharge: 5000, images: JSON.stringify([IMG.concertRig]) },
      { providerId: paProfile.id, name: "Yamaha MG16 Mixer", category: "audio", subcategory: "Mixers", quantity: 2, rentalPrice: 8000, setupCharge: 2000, images: JSON.stringify([IMG.djBooth]) },
      { providerId: paProfile.id, name: "Shure SM58 Microphones", category: "audio", subcategory: "Microphones", quantity: 6, rentalPrice: 2500, images: JSON.stringify([]) },
      { providerId: paProfile.id, name: "Moving Head Lights", category: "lighting", subcategory: "Moving Heads", quantity: 8, rentalPrice: 6000, setupCharge: 3000, images: JSON.stringify([]) },
    ],
  });

  // Dynamic pricing for PA (KES)
  await prisma.pricingRule.createMany({
    data: [
      { providerId: paProfile.id, serviceId: paService.id, name: "Wedding Rate", eventType: "WEDDING", priceModifier: 50000, modifierType: "fixed" },
      { providerId: paProfile.id, serviceId: paService.id, name: "Funeral Rate", eventType: "FUNERAL", priceModifier: 20000, modifierType: "fixed" },
      { providerId: paProfile.id, serviceId: paService.id, name: "Corporate Rate", eventType: "CORPORATE", priceModifier: 60000, modifierType: "fixed" },
      { providerId: paProfile.id, name: "Weekend Surcharge", isWeekend: true, priceModifier: 1.2, modifierType: "multiplier" },
    ],
  });

  // Catering packages (KES)
  await prisma.menuPackage.createMany({
    data: [
      {
        providerId: cateringProfile.id,
        name: "Wedding Package",
        description: "Premium wedding catering with full buffet and drinks",
        eventType: "WEDDING",
        servingStyle: "buffet",
        guestCount: 200,
        includesDrinks: true,
        includesDessert: true,
        menuItems: JSON.stringify(["Grilled chicken", "Beef stew", "Salad bar", "Rice dishes", "Wedding cake"]),
        dietaryOptions: JSON.stringify(["Vegetarian", "Halal", "Gluten-free"]),
        basePrice: 150000,
        pricePerGuest: 1500,
        images: JSON.stringify([IMG.weddingBuffet]),
      },
      {
        providerId: cateringProfile.id,
        name: "Funeral Package",
        description: "Simple and respectful meal service",
        eventType: "FUNERAL",
        servingStyle: "buffet",
        guestCount: 100,
        includesDrinks: false,
        includesDessert: false,
        menuItems: JSON.stringify(["Simple meal", "Tea service", "Sandwiches"]),
        dietaryOptions: JSON.stringify(["Vegetarian"]),
        basePrice: 45000,
        pricePerGuest: 450,
        images: JSON.stringify([IMG.signaturePlate]),
      },
    ],
  });

  // Venues (KES)
  await prisma.venue.createMany({
    data: [
      {
        providerId: venueProfile.id,
        name: "Grand Ballroom",
        description: "Our flagship ballroom with crystal chandeliers and panoramic views",
        location: "123 Moi Avenue, Nairobi, Kenya",
        capacity: 500,
        facilities: JSON.stringify(["Parking", "AC", "Stage", "Bridal suite", "Kitchen", "WiFi"]),
        images: JSON.stringify([IMG.grandBallroom]),
        videos: JSON.stringify([]),
        basePrice: 120000,
        packages: JSON.stringify([
          { name: "Basic", price: 120000, hours: 6 },
          { name: "Premium", price: 180000, hours: 10, includes: ["Decoration", "Coordinator"] },
        ]),
        eventPricing: JSON.stringify({ WEDDING: 180000, CORPORATE: 150000, FUNERAL: 80000 }),
      },
      {
        providerId: venueProfile.id,
        name: "Garden Pavilion",
        description: "Outdoor garden pavilion surrounded by landscaped lawns, ideal for open-air receptions",
        location: "45 Karen Road, Karen, Nairobi",
        capacity: 250,
        facilities: JSON.stringify(["Parking", "Garden", "Stage", "WiFi"]),
        images: JSON.stringify([IMG.gardenPavilion]),
        videos: JSON.stringify([]),
        basePrice: 90000,
        packages: JSON.stringify([
          { name: "Basic", price: 90000, hours: 6 },
          { name: "Premium", price: 140000, hours: 10, includes: ["Decoration", "Coordinator"] },
        ]),
        eventPricing: JSON.stringify({ WEDDING: 140000, CORPORATE: 110000, FUNERAL: 60000 }),
      },
    ],
  });

  // Tents equipment (KES)
  await prisma.equipment.createMany({
    data: [
      { providerId: tentsProfile.id, name: "10x20 Marquee Tent", category: "tents", subcategory: "Marquees", quantity: 4, rentalPrice: 25000, setupCharge: 5000, transportCharge: 3000, images: JSON.stringify([IMG.marqueeTent]) },
      { providerId: tentsProfile.id, name: "15x30 Wedding Marquee", category: "tents", subcategory: "Marquees", quantity: 2, rentalPrice: 45000, setupCharge: 8000, transportCharge: 4000, images: JSON.stringify([IMG.marqueeTent]) },
      { providerId: tentsProfile.id, name: "20x20 Canopy Tent", category: "tents", subcategory: "Canopies", quantity: 6, rentalPrice: 20000, setupCharge: 4000, transportCharge: 3000, images: JSON.stringify([]) },
      { providerId: tentsProfile.id, name: "Side Walls (Full Set)", category: "tents", subcategory: "Accessories", quantity: 20, rentalPrice: 3000, images: JSON.stringify([]) },
    ],
  });

  // Sample event for customer
  if (customerProfile) {
    const event = await prisma.event.create({
      data: {
        customerId: customerProfile.id,
        title: "Sarah & John's Wedding",
        eventType: "WEDDING",
        eventDate: new Date("2026-09-15T16:00:00"),
        location: "Grand Hall Events, Nairobi",
        guestCount: 200,
        budgetMin: 500000,
        budgetMax: 900000,
        description: "Outdoor ceremony with indoor reception",
        requiredServices: JSON.stringify(["VENUE", "CATERING", "PA_SYSTEM", "TENTS"]),
      },
    });

    const booking = await prisma.booking.create({
      data: {
        eventId: event.id,
        customerId: customerProfile.id,
        providerId: paProfile.id,
        serviceId: paService.id,
        status: "QUOTATION_REQUESTED",
        quotedPrice: 35000,
        customerNotes: "Need full PA setup for ceremony and reception",
      },
    });

    // Seed a starter conversation so the messaging UI has data out of the box.
    const conversation = await prisma.conversation.create({
      data: { bookingId: booking.id },
    });
    await prisma.message.createMany({
      data: [
        {
          conversationId: conversation.id,
          senderId: customer.id,
          receiverId: paProvider.id,
          bookingId: booking.id,
          type: "TEXT",
          content: "Hi Mike! We booked the full PA setup for our wedding on Sep 15. A few quick questions.",
          createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        },
        {
          conversationId: conversation.id,
          senderId: paProvider.id,
          receiverId: customer.id,
          bookingId: booking.id,
          type: "TEXT",
          content: "Hi Jane! Congrats! Happy to help — what do you need to know?",
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          isRead: true,
        },
      ],
    });
  }

  // Default system config
  await prisma.systemConfig.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", appName: "Eventicate" },
  });

  // Seed locations
  const locationsData = [
    { name: "Kenya", subdivisions: ["Baringo","Bomet","Bungoma","Busia","Elgeyo-Marakwet","Embu","Garissa","Homa Bay","Isiolo","Kajiado","Kakamega","Kericho","Kiambu","Kilifi","Kirinyaga","Kisii","Kisumu","Kitui","Kwale","Laikipia","Lamu","Machakos","Makueni","Mandera","Marsabit","Meru","Migori","Mombasa","Murang'a","Nairobi","Nakuru","Nandi","Narok","Nyamira","Nyandarua","Nyeri","Samburu","Siaya","Taita-Taveta","Tana River","Tharaka-Nithi","Trans-Nzoia","Turkana","Uasin Gishu","Vihiga","Wajir","West Pokot"] },
    { name: "Uganda", subdivisions: ["Central Region","Eastern Region","Northern Region","Western Region"] },
    { name: "Tanzania", subdivisions: ["Arusha","Dar es Salaam","Dodoma","Geita","Iringa","Kagera","Katavi","Kigoma","Kilimanjaro","Lindi","Manyara","Mara","Mbeya","Morogoro","Mtwara","Mwanza","Njombe","Pemba North","Pemba South","Pwani","Rukwa","Ruvuma","Shinyanga","Simiyu","Singida","Songwe","Tabora","Tanga","Zanzibar North","Zanzibar South","Zanzibar Urban West"] },
  ];

  for (let ci = 0; ci < locationsData.length; ci++) {
    const c = locationsData[ci];
    const country = await prisma.country.upsert({
      where: { name: c.name },
      update: {},
      create: { name: c.name, sortOrder: ci },
    });
    for (let si = 0; si < c.subdivisions.length; si++) {
      const s = c.subdivisions[si];
      await prisma.subdivision.upsert({
        where: { countryId_name: { countryId: country.id, name: s } },
        update: {},
        create: { countryId: country.id, name: s, sortOrder: si },
      });
    }
  }

  console.log("Seed completed!");
  console.log("\nDemo accounts (password: password123):");
  console.log("  Admin:    admin@eventicate.com");
  console.log("  Customer: customer@eventicate.com");
  console.log("  PA:       pa@soundpro.com");
  console.log("  Catering: catering@delight.com");
  console.log("  Venue:    venue@grandhall.com");
  console.log("  Tents:    tents@canopy.com");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
