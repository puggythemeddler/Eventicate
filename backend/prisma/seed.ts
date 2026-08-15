import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
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
      price: 29,
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
      price: 79,
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
      price: 199,
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
    update: {},
    create: {
      email: "admin@eventicate.com",
      passwordHash,
      firstName: "Admin",
      lastName: "User",
      role: "ADMIN",
      isVerified: true,
    },
  });

  // Customer
  const customer = await prisma.user.upsert({
    where: { email: "customer@eventicate.com" },
    update: {},
    create: {
      email: "customer@eventicate.com",
      passwordHash,
      firstName: "Jane",
      lastName: "Organizer",
      role: "CUSTOMER",
      isVerified: true,
      customerProfile: { create: { city: "New York", country: "USA" } },
    },
  });

  // PA System Provider
  const paProvider = await prisma.user.upsert({
    where: { email: "pa@soundpro.com" },
    update: {},
    create: {
      email: "pa@soundpro.com",
      passwordHash,
      firstName: "Mike",
      lastName: "Sound",
      role: "PROVIDER",
      isVerified: true,
      providerProfile: {
        create: {
          businessName: "SoundPro PA Systems",
          description: "Professional PA and audio equipment for all event types. Full setup and operator services available.",
          category: "PA_SYSTEM",
          city: "New York",
          country: "USA",
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
    update: {},
    create: {
      email: "catering@delight.com",
      passwordHash,
      firstName: "Maria",
      lastName: "Delight",
      role: "PROVIDER",
      isVerified: true,
      providerProfile: {
        create: {
          businessName: "Delight Catering Co.",
          description: "Premium catering for weddings, funerals, corporate events, and celebrations.",
          category: "CATERING",
          city: "New York",
          country: "USA",
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
    update: {},
    create: {
      email: "venue@grandhall.com",
      passwordHash,
      firstName: "Robert",
      lastName: "Hall",
      role: "PROVIDER",
      isVerified: true,
      providerProfile: {
        create: {
          businessName: "Grand Hall Events",
          description: "Elegant venue space for up to 500 guests. Perfect for weddings and corporate events.",
          category: "VENUE",
          city: "New York",
          country: "USA",
          isApproved: true,
          averageRating: 4.9,
          totalReviews: 42,
        },
      },
    },
    include: { providerProfile: true },
  });

  const paProfile = paProvider.providerProfile!;
  const cateringProfile = cateringProvider.providerProfile!;
  const venueProfile = venueProvider.providerProfile!;

  // PA Services & Equipment
  const paService = await prisma.service.create({
    data: {
      providerId: paProfile.id,
      name: "Full PA System Package",
      description: "Complete sound system with speakers, mixer, microphones, and operator",
      category: "PA_SYSTEM",
      basePrice: 500,
      images: JSON.stringify([]),
    },
  });

  await prisma.equipment.createMany({
    data: [
      { providerId: paProfile.id, name: "JBL PRX Speakers", category: "audio", subcategory: "Speakers", quantity: 4, rentalPrice: 150, setupCharge: 50, operatorCharge: 100, images: "[]" },
      { providerId: paProfile.id, name: "Yamaha MG16 Mixer", category: "audio", subcategory: "Mixers", quantity: 2, rentalPrice: 80, setupCharge: 30, images: "[]" },
      { providerId: paProfile.id, name: "Shure SM58 Microphones", category: "audio", subcategory: "Microphones", quantity: 6, rentalPrice: 25, images: "[]" },
      { providerId: paProfile.id, name: "Moving Head Lights", category: "lighting", subcategory: "Moving Heads", quantity: 8, rentalPrice: 40, setupCharge: 60, images: "[]" },
    ],
  });

  // Dynamic pricing for PA
  await prisma.pricingRule.createMany({
    data: [
      { providerId: paProfile.id, serviceId: paService.id, name: "Wedding Rate", eventType: "WEDDING", priceModifier: 500, modifierType: "fixed" },
      { providerId: paProfile.id, serviceId: paService.id, name: "Funeral Rate", eventType: "FUNERAL", priceModifier: 250, modifierType: "fixed" },
      { providerId: paProfile.id, serviceId: paService.id, name: "Corporate Rate", eventType: "CORPORATE", priceModifier: 800, modifierType: "fixed" },
      { providerId: paProfile.id, name: "Weekend Surcharge", isWeekend: true, priceModifier: 1.2, modifierType: "multiplier" },
    ],
  });

  // Catering packages
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
        basePrice: 8000,
        pricePerGuest: 25,
        images: "[]",
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
        basePrice: 2000,
        pricePerGuest: 15,
        images: "[]",
      },
    ],
  });

  // Venue
  await prisma.venue.create({
    data: {
      providerId: venueProfile.id,
      name: "Grand Ballroom",
      description: "Our flagship ballroom with crystal chandeliers and panoramic views",
      location: "123 Event Avenue, New York, NY",
      capacity: 500,
      facilities: JSON.stringify(["Parking", "AC", "Stage", "Bridal suite", "Kitchen", "WiFi"]),
      images: JSON.stringify([]),
      videos: JSON.stringify([]),
      basePrice: 5000,
      packages: JSON.stringify([
        { name: "Basic", price: 5000, hours: 6 },
        { name: "Premium", price: 8000, hours: 10, includes: ["Decoration", "Coordinator"] },
      ]),
      eventPricing: JSON.stringify({ WEDDING: 8000, CORPORATE: 6000, FUNERAL: 3000 }),
    },
  });

  // Sample event for customer
  const customerProfile = await prisma.customerProfile.findUnique({
    where: { userId: customer.id },
  });

  if (customerProfile) {
    const event = await prisma.event.create({
      data: {
        customerId: customerProfile.id,
        title: "Sarah & John's Wedding",
        eventType: "WEDDING",
        eventDate: new Date("2026-09-15T16:00:00"),
        location: "Grand Hall Events, New York",
        guestCount: 200,
        budgetMin: 15000,
        budgetMax: 25000,
        description: "Outdoor ceremony with indoor reception",
        requiredServices: JSON.stringify(["VENUE", "CATERING", "PA_SYSTEM", "PHOTOGRAPHY"]),
      },
    });

    await prisma.booking.create({
      data: {
        eventId: event.id,
        customerId: customerProfile.id,
        providerId: paProfile.id,
        serviceId: paService.id,
        status: "QUOTATION_REQUESTED",
        quotedPrice: 500,
        customerNotes: "Need full PA setup for ceremony and reception",
      },
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
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
