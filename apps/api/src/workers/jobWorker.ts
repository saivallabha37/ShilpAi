import prisma from '../utils/prisma';

// LLM Catalog Provider Adapter (PRD 05)
async function generateSmartCatalog(product: any): Promise<{
  finalDescription: string;
  structuredFields: Record<string, any>;
}> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.LLM_PROVIDER_KEY;
  const categoryLabel = product.category?.label || 'Traditional Indian Craft';

  // If Gemini API Key is available, attempt real LLM extraction
  if (apiKey && apiKey !== 'your-llm-key') {
    try {
      const prompt = `You are ShilpAI, an expert Indian artisan digital cataloging assistant.
Transform the following artisan raw product input into a professional B2B marketplace listing.
Do not invent ungrounded technical facts.

Artisan inputs:
- Product Name: ${product.name}
- Craft Category: ${categoryLabel}
- Raw Description: ${product.rawDescription || 'None provided'}
- Materials: ${product.materials || 'Handcrafted raw materials'}
- Production Time: ${product.productionTime || 'Handmade to order'}

Return a valid JSON object ONLY with the following schema:
{
  "title": "A concise, elegant, search-friendly title (e.g. Handcrafted Royal Blue Ceramic Vase)",
  "primaryMaterial": "Main materials used",
  "craftTechnique": "Traditional craft technique or school",
  "careInstructions": "Practical care guidelines",
  "culturalSignificance": "Brief 1-2 sentence cultural or heritage context of this Indian craft",
  "tags": ["array", "of", "search", "tags"],
  "finalDescription": "A professional, compelling 2-3 paragraph marketplace description highlighting authentic handwork, texture, and B2B utility."
}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonText) {
          const parsed = JSON.parse(jsonText);
          return {
            finalDescription: parsed.finalDescription || parsed.description,
            structuredFields: {
              title: parsed.title || product.name,
              primaryMaterial: parsed.primaryMaterial || product.materials || categoryLabel,
              craftTechnique: parsed.craftTechnique || categoryLabel,
              careInstructions: parsed.careInstructions || 'Handle with care. Wipe gently with a soft dry cloth.',
              culturalSignificance: parsed.culturalSignificance || `Traditional Indian handicraft rooted in regional heritage of ${categoryLabel}.`,
              tags: parsed.tags || [categoryLabel.toLowerCase(), 'handmade', 'artisan', 'b2b sourcing'],
            },
          };
        }
      }
    } catch (llmError) {
      console.warn('Gemini LLM call failed, falling back to deterministic synthesis:', llmError);
    }
  }

  // Graceful Fallback (PRD 05 FR-10: non-blocking, grounded in artisan inputs)
  const title = product.name.startsWith('Handcrafted') ? product.name : `Handcrafted ${product.name}`;
  const mat = product.materials || 'Authentic artisan materials';
  const time = product.productionTime || 'multi-day handcrafting process';
  const rawDesc = product.rawDescription || `Carefully handmade by traditional artisans using time-honored methods.`;

  const fallbackDescription = `${title} is an authentic expression of ${categoryLabel}. ` +
    `Meticulously fashioned from ${mat}, this product reflects generational craftsmanship and requires ${time} to produce. ` +
    `\n\nProduct Details:\n${rawDesc}\n\n` +
    `Ideal for conscious consumers, boutique retailers, and corporate gifting seeking authentic heritage craftsmanship.`;

  return {
    finalDescription: fallbackDescription,
    structuredFields: {
      title,
      primaryMaterial: mat,
      craftTechnique: categoryLabel,
      careInstructions: 'Clean gently with a soft dry cloth. Keep away from excessive moisture and harsh chemicals.',
      culturalSignificance: `Preserves the timeless heritage and indigenous techniques of Indian ${categoryLabel}.`,
      tags: [categoryLabel.toLowerCase().replace(/[^a-z0-9]/g, '-'), 'indian-handicrafts', 'ethical-sourcing', 'handmade'],
    },
  };
}

// Deterministic Price Recommendation Engine (PRD 07 FR-5 / FR-7)
function calculatePriceRecommendation(product: any): {
  materialCost: number;
  laborHours: number;
  hourlyRate: number;
  overheadAmount: number;
  calculatedBaseCost: number;
  suggestedMinPrice: number;
  suggestedMaxPrice: number;
  suggestedPointPrice: number;
  explanation: string;
} {
  // Deterministic extraction or realistic baseline estimation
  let materialCost = 350;
  if (product.materials) {
    if (product.materials.toLowerCase().includes('brass') || product.materials.toLowerCase().includes('metal')) materialCost = 650;
    else if (product.materials.toLowerCase().includes('silk') || product.materials.toLowerCase().includes('zardozi')) materialCost = 800;
    else if (product.materials.toLowerCase().includes('clay') || product.materials.toLowerCase().includes('terracotta')) materialCost = 200;
    else if (product.materials.toLowerCase().includes('quartz') || product.materials.toLowerCase().includes('pottery')) materialCost = 450;
  }

  let laborHours = 8;
  if (product.productionTime) {
    const match = product.productionTime.match(/(\d+)\s*(day|hr|hour|week)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      const unit = match[2].toLowerCase();
      if (unit.startsWith('day')) laborHours = num * 7;
      else if (unit.startsWith('week')) laborHours = num * 35;
      else laborHours = num;
    }
  }

  const hourlyRate = 75; // Standard rural artisan fair wage benchmark (₹75/hour)
  const overheadAmount = Math.round((materialCost + laborHours * hourlyRate) * 0.12); // 12% kiln, tooling, studio overhead

  const calculatedBaseCost = materialCost + (laborHours * hourlyRate) + overheadAmount;
  const suggestedMinPrice = Math.round(calculatedBaseCost * 1.25); // +25% margin
  const suggestedMaxPrice = Math.round(calculatedBaseCost * 1.70); // +70% margin
  const suggestedPointPrice = Math.round((suggestedMinPrice + suggestedMaxPrice) / 2);

  const explanation = `Base cost of ₹${calculatedBaseCost} derived from ₹${materialCost} raw materials + ${laborHours}h labor at fair wage benchmark of ₹${hourlyRate}/h + ₹${overheadAmount} workshop overhead. Recommended range provides 25%–70% sustainable margin.`;

  return {
    materialCost,
    laborHours,
    hourlyRate,
    overheadAmount,
    calculatedBaseCost,
    suggestedMinPrice,
    suggestedMaxPrice,
    suggestedPointPrice,
    explanation,
  };
}

const processCatalogGen = async (jobId: string, payload: any) => {
  const { productId, inputVersion } = payload;
  
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { category: true, voiceRecordings: true },
  });
  if (!product || product.inputVersion !== inputVersion) return; // Stale-result protection (PRD 03 / PRD 05)

  const { finalDescription, structuredFields } = await generateSmartCatalog(product);

  await prisma.productCatalog.upsert({
    where: { productId },
    update: { finalDescription, structuredFields },
    create: { productId, finalDescription, structuredFields },
  });

  await prisma.product.update({
    where: { id: productId },
    data: { catalogStatus: 'done' },
  });
};

const processPriceRec = async (jobId: string, payload: any) => {
  const { productId, inputVersion } = payload;
  
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.inputVersion !== inputVersion) return; // Stale-result protection

  const pricing = calculatePriceRecommendation(product);

  await prisma.priceRecommendation.upsert({
    where: { productId },
    update: {
      materialCost: pricing.materialCost,
      laborHours: pricing.laborHours,
      hourlyRate: pricing.hourlyRate,
      overheadAmount: pricing.overheadAmount,
      calculatedBaseCost: pricing.calculatedBaseCost,
      suggestedMinPrice: pricing.suggestedMinPrice,
      suggestedMaxPrice: pricing.suggestedMaxPrice,
      suggestedPointPrice: pricing.suggestedPointPrice,
      explanation: pricing.explanation,
      confidenceScore: 0.92,
    },
    create: {
      productId,
      materialCost: pricing.materialCost,
      laborHours: pricing.laborHours,
      hourlyRate: pricing.hourlyRate,
      overheadAmount: pricing.overheadAmount,
      calculatedBaseCost: pricing.calculatedBaseCost,
      suggestedMinPrice: pricing.suggestedMinPrice,
      suggestedMaxPrice: pricing.suggestedMaxPrice,
      suggestedPointPrice: pricing.suggestedPointPrice,
      explanation: pricing.explanation,
      confidenceScore: 0.92,
    },
  });

  await prisma.product.update({
    where: { id: productId },
    data: {
      suggestedPriceRange: {
        min: pricing.suggestedMinPrice,
        max: pricing.suggestedMaxPrice,
        currency: 'INR',
      },
      priceStatus: 'done',
    },
  });
};

export const startJobWorker = () => {
  setInterval(async () => {
    try {
      const pendingJobs = await prisma.job.findMany({
        where: { status: 'pending', type: { in: ['CATALOG_GEN', 'PRICE_REC'] } },
        take: 5,
        orderBy: { createdAt: 'asc' },
      });

      for (const job of pendingJobs) {
        await prisma.job.update({ where: { id: job.id }, data: { status: 'processing' } });

        try {
          if (job.type === 'CATALOG_GEN') {
            await processCatalogGen(job.id, job.payload);
          } else if (job.type === 'PRICE_REC') {
            await processPriceRec(job.id, job.payload);
          }
          await prisma.job.update({ where: { id: job.id }, data: { status: 'done' } });
        } catch (err: any) {
          console.error(`Job ${job.id} failed:`, err);
          await prisma.job.update({ where: { id: job.id }, data: { status: 'failed', errorMessage: err.message } });
          
          if (job.payload && (job.payload as any).productId) {
            const pid = (job.payload as any).productId;
            if (job.type === 'CATALOG_GEN') {
              await prisma.product.update({ where: { id: pid }, data: { catalogStatus: 'failed' } });
            } else if (job.type === 'PRICE_REC') {
              await prisma.product.update({ where: { id: pid }, data: { priceStatus: 'failed' } });
            }
          }
        }
        
        // Product state transition check:
        // Transition to ready_for_review when all async tasks reach a terminal state (PRD 03 Section 11b)
        if (job.payload && (job.payload as any).productId) {
          const pid = (job.payload as any).productId;
          const prod = await prisma.product.findUnique({ where: { id: pid }, include: { images: true } });
          if (prod && prod.status === 'processing') {
            const allImagesTerminal = prod.images.every((img) => img.processingStatus === 'done' || img.processingStatus === 'failed');
            const catalogTerminal = prod.catalogStatus === 'done' || prod.catalogStatus === 'failed';
            const priceTerminal = prod.priceStatus === 'done' || prod.priceStatus === 'failed';
            
            if (allImagesTerminal && catalogTerminal && priceTerminal) {
              await prisma.product.update({ where: { id: pid }, data: { status: 'ready_for_review' } });
            }
          }
        }
      }
    } catch (e) {
      // Gracefully handle database polling retry
    }
  }, 4000);
};
