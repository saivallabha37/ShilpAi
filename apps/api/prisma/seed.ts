import { PrismaClient, Role, AccountStatus, ProfileCompleteness, ProductStatus, JobStatus, InquiryStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding ShilpAI database...');

  // 1. Clear existing seed data safely if needed
  await prisma.inquiry.deleteMany({});
  await prisma.productTranslation.deleteMany({});
  await prisma.productCatalog.deleteMany({});
  await prisma.priceRecommendation.deleteMany({});
  await prisma.voiceRecording.deleteMany({});
  await prisma.productImage.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.artisanProfile.deleteMany({});
  await prisma.buyerProfile.deleteMany({});
  await prisma.artisanCredential.deleteMany({});
  await prisma.buyerCredential.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.otpCode.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.craftCategory.deleteMany({});

  console.log('Cleared existing data.');

  // 2. Seed Standard Craft Categories (PRD 02)
  const categoriesData = [
    { label: 'Blue Pottery', iconRef: 'pottery' },
    { label: 'Handloom & Textiles', iconRef: 'textile' },
    { label: 'Terracotta & Clay', iconRef: 'clay' },
    { label: 'Wood Carving & Inlay', iconRef: 'wood' },
    { label: 'Metalcraft & Dhokra', iconRef: 'metal' },
    { label: 'Traditional Folk Painting', iconRef: 'palette' },
    { label: 'Leathercraft & Mojari', iconRef: 'leather' },
    { label: 'Cane & Bamboo Crafts', iconRef: 'bamboo' },
    { label: 'Stone Carving', iconRef: 'stone' },
    { label: 'Zardozi & Embroidery', iconRef: 'needle' },
  ];

  const categories = await Promise.all(
    categoriesData.map((cat) =>
      prisma.craftCategory.create({
        data: cat,
      })
    )
  );
  console.log(`Seeded ${categories.length} craft categories.`);

  const catMap = new Map(categories.map((c) => [c.label, c.id]));

  // 3. Seed Artisan 1: Rameshwar Prajapati (Jaipur Blue Pottery)
  const artisanUser1 = await prisma.user.create({
    data: {
      role: Role.ARTISAN,
      status: AccountStatus.active,
      artisanCredential: {
        create: {
          phoneNumber: '+919876543210',
          phoneVerifiedAt: new Date(),
        },
      },
      artisanProfile: {
        create: {
          name: 'Rameshwar Prajapati',
          craftCategoryId: catMap.get('Blue Pottery'),
          locationState: 'Rajasthan',
          locationDistrict: 'Jaipur',
          bio: 'Third-generation master artisan in GI-tagged Jaipur Blue Pottery, specializing in traditional floral motifs using quartz stone and Egyptian paste.',
          photoUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80',
          completeness: ProfileCompleteness.complete,
        },
      },
    },
  });

  // 4. Seed Artisan 2: Sunita Devi (Madhubani Painting)
  const artisanUser2 = await prisma.user.create({
    data: {
      role: Role.ARTISAN,
      status: AccountStatus.active,
      artisanCredential: {
        create: {
          phoneNumber: '+919876543211',
          phoneVerifiedAt: new Date(),
        },
      },
      artisanProfile: {
        create: {
          name: 'Sunita Devi',
          craftCategoryId: catMap.get('Traditional Folk Painting'),
          locationState: 'Bihar',
          locationDistrict: 'Madhubani',
          bio: 'State-awarded Mithila painter preserving ancient Kohbar and Kachni line-art styles with organic vegetable dyes.',
          photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
          completeness: ProfileCompleteness.complete,
        },
      },
    },
  });

  // 5. Seed Buyer: Ananya Sharma (FabHeritage Retail)
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const buyerUser = await prisma.user.create({
    data: {
      role: Role.BUYER,
      status: AccountStatus.active,
      buyerCredential: {
        create: {
          email: 'buyer@fabheritage.com',
          passwordHash,
          emailVerifiedAt: new Date(),
        },
      },
      buyerProfile: {
        create: {
          organizationName: 'FabHeritage Retail & Exports Ltd',
          contactName: 'Ananya Sharma',
        },
      },
    },
    include: { buyerProfile: true },
  });
  console.log('Seeded sample artisans and buyer.');

  // 6. Seed Product 1: Handcrafted Royal Blue Ceramic Vase
  const product1 = await prisma.product.create({
    data: {
      artisanId: artisanUser1.id,
      name: 'Handcrafted Royal Blue Ceramic Vase',
      rawDescription: 'Jaipur blue pottery vase with Persian floral artwork. Made without clay using quartz powder and multani mitti. Hand glazed and fired.',
      categoryId: catMap.get('Blue Pottery'),
      materials: 'Quartz stone powder, recycled glass, Multani Mitti (Fuller Earth), natural copper glaze',
      productionTime: '4 days per piece',
      quantityAvailable: 45,
      price: 1450,
      suggestedPriceRange: { min: 1200, max: 1750, currency: 'INR' },
      catalogStatus: JobStatus.done,
      priceStatus: JobStatus.done,
      status: ProductStatus.published,
      publishedAt: new Date(),
      inputVersion: 1,
      images: {
        create: [
          {
            order: 0,
            rawImageUrl: 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&w=800&q=80',
            processedImageUrl: 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&w=800&q=80',
            thumbnailUrl: 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&w=256&q=80',
            processingStatus: JobStatus.done,
            sourceVersion: 1,
          },
        ],
      },
      catalog: {
        create: {
          finalDescription: 'Elevate your interiors with this GI-certified Jaipur Blue Pottery vase. Distinguished by its signature Persian cobalt blue glaze and intricate floral tracery, each vase is molded without natural clay using ground quartz and glass, resulting in an impervious, low-porosity ceramic marvel.',
          structuredFields: {
            title: 'Handcrafted Royal Blue Ceramic Vase',
            primaryMaterial: 'Quartz stone powder & natural mineral glaze',
            craftTechnique: 'Jaipur Blue Pottery (Clay-free low-fire ceramic)',
            dimensions: '12 inches Height x 5.5 inches Diameter',
            colorPalette: 'Cobalt Blue, Turquoise, White, Golden Yellow',
            careInstructions: 'Wipe with damp cloth. Decorative use only; do not soak in acidic water.',
            culturalSignificance: 'Introduced to Jaipur by Maharaja Sawai Ram Singh II in the 19th century, carrying royal Turko-Persian ancestry.',
            tags: ['blue pottery', 'jaipur craft', 'ceramic vase', 'handmade home decor', 'b2b corporate gift'],
          },
        },
      },
      priceRecommendation: {
        create: {
          materialCost: 450,
          laborHours: 8,
          hourlyRate: 75,
          overheadAmount: 100,
          calculatedBaseCost: 1150,
          suggestedMinPrice: 1250,
          suggestedMaxPrice: 1750,
          suggestedPointPrice: 1450,
          explanation: 'Calculated from ₹450 raw quartz/glaze cost + 8 artisan labor hours at ₹75/hr benchmark + ₹100 kiln overhead. Suggested markup yields 25%-50% sustainable margin.',
          confidenceScore: 0.94,
        },
      },
    },
  });

  // 7. Seed Product 2: Authentic Madhubani Tree of Life Painting
  const product2 = await prisma.product.create({
    data: {
      artisanId: artisanUser2.id,
      name: 'Authentic Madhubani Tree of Life Painting',
      rawDescription: 'Handmade paper painting with natural colours depicting the sacred Tree of Life and birds. Painted with bamboo stylus.',
      categoryId: catMap.get('Traditional Folk Painting'),
      materials: 'Handmade cotton rag paper, natural vegetable pigments, cow dung wash primer',
      productionTime: '6 days per artwork',
      quantityAvailable: 20,
      price: 2800,
      suggestedPriceRange: { min: 2400, max: 3400, currency: 'INR' },
      catalogStatus: JobStatus.done,
      priceStatus: JobStatus.done,
      status: ProductStatus.published,
      publishedAt: new Date(),
      inputVersion: 1,
      images: {
        create: [
          {
            order: 0,
            rawImageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
            processedImageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
            thumbnailUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=256&q=80',
            processingStatus: JobStatus.done,
            sourceVersion: 1,
          },
        ],
      },
      catalog: {
        create: {
          finalDescription: 'A classic portrayal of fertility, harmony, and cosmic equilibrium through the revered Tree of Life motif. Crafted using fine Kachni line work and natural plant-derived dyes, each artwork is created using nibs and bamboo twigs on acid-free handmade paper.',
          structuredFields: {
            title: 'Authentic Madhubani Tree of Life Painting',
            primaryMaterial: 'Handmade handmade rag paper & natural mineral/plant dyes',
            craftTechnique: 'Mithila / Madhubani Kachni Line Painting',
            dimensions: '18 inches x 24 inches (Unframed)',
            colorPalette: 'Lampblack, Indigo, Madder Red, Turmeric Ochre',
            careInstructions: 'Keep away from direct moisture and harsh sun exposure. Framing with UV-protected glass recommended.',
            culturalSignificance: 'Sacred domestic ritual art form practiced for centuries by women in the Mithila region of Northern Bihar.',
            tags: ['madhubani painting', 'folk art', 'bihar craft', 'tree of life', 'wall art'],
          },
        },
      },
      priceRecommendation: {
        create: {
          materialCost: 350,
          laborHours: 22,
          hourlyRate: 85,
          overheadAmount: 150,
          calculatedBaseCost: 2370,
          suggestedMinPrice: 2400,
          suggestedMaxPrice: 3400,
          suggestedPointPrice: 2800,
          explanation: 'Accounts for high labor intensity (22 hours of meticulous line work). Sustainable wage benchmark of ₹85/hr yields fair floor at ₹2,400.',
          confidenceScore: 0.91,
        },
      },
    },
  });

  // 8. Seed Product 3: Terracotta Elephant Planter (Draft for testing edit flow)
  await prisma.product.create({
    data: {
      artisanId: artisanUser1.id,
      name: 'Terracotta Elephant Garden Planter',
      rawDescription: 'Clay elephant planter for indoor balcony or garden. Needs baking.',
      categoryId: catMap.get('Terracotta & Clay'),
      materials: 'Natural riverbed terracotta clay',
      productionTime: '2 days',
      quantityAvailable: 15,
      price: null,
      status: ProductStatus.draft,
      inputVersion: 1,
      images: {
        create: [
          {
            order: 0,
            rawImageUrl: 'https://images.unsplash.com/photo-1590402494682-cd3fb53b1f70?auto=format&fit=crop&w=800&q=80',
            processingStatus: JobStatus.pending,
            sourceVersion: 1,
          },
        ],
      },
    },
  });

  // 9. Seed Sample Inquiries (PRD 08)
  if (buyerUser.buyerProfile) {
    await prisma.inquiry.create({
      data: {
        productId: product1.id,
        buyerId: buyerUser.buyerProfile.id,
        quantity: 50,
        requirements: 'Custom gift packaging with eco-friendly jute boxes for Diwali corporate gifting.',
        targetLocation: 'Bandra Kurla Complex, Mumbai',
        message: 'Hello Rameshwar-ji, we represent a corporate client looking to source 50 units of your Royal Blue Vase by October 25. Please let us know if bulk lead-time permits.',
        status: InquiryStatus.SUBMITTED,
        isViewed: true,
        viewedAt: new Date(),
      },
    });

    await prisma.inquiry.create({
      data: {
        productId: product2.id,
        buyerId: buyerUser.buyerProfile.id,
        quantity: 10,
        requirements: 'Framed in dark teakwood with certificate of artisan origin.',
        targetLocation: 'Connaught Place, New Delhi',
        message: 'Looking for 10 pieces for our heritage hotel corridor. We would like to confirm sizing consistency.',
        status: InquiryStatus.ACCEPTED,
        isViewed: true,
        viewedAt: new Date(),
      },
    });
    console.log('Seeded sample B2B inquiries.');
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
