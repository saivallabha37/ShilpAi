import prisma from '../utils/prisma';

const processCatalogGen = async (jobId: string, payload: any) => {
  const { productId, inputVersion } = payload;
  
  const product = await prisma.product.findUnique({ where: { id: productId }, include: { category: true } });
  if (!product || product.inputVersion !== inputVersion) return; // Stale

  // Mock LLM Call
  const generatedDescription = `This beautifully crafted ${product.name} is made of ${product.materials || 'fine materials'}. ` +
                               `${product.rawDescription ? 'It features: ' + product.rawDescription : ''}`;
                               
  const structuredFields = {
    title: product.name,
    primaryMaterial: product.materials || 'Unknown',
    craftTechnique: product.category?.label || 'Handcrafted',
  };

  await prisma.productCatalog.upsert({
    where: { productId },
    update: { finalDescription: generatedDescription, structuredFields },
    create: { productId, finalDescription: generatedDescription, structuredFields }
  });

  await prisma.product.update({
    where: { id: productId },
    data: { catalogStatus: 'done' }
  });
};

const processPriceRec = async (jobId: string, payload: any) => {
  const { productId, inputVersion } = payload;
  
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.inputVersion !== inputVersion) return; // Stale

  // Mock Deterministic Calculation
  const suggestedPriceRange = {
    min: 500,
    max: 1500,
    currency: 'INR'
  };

  await prisma.product.update({
    where: { id: productId },
    data: { suggestedPriceRange, priceStatus: 'done' }
  });
};

export const startJobWorker = () => {
  setInterval(async () => {
    try {
      // Very simplified polling (without SKIP LOCKED for SQLite/dev simplicity, 
      // but in prod Postgres we would use raw query with SKIP LOCKED as in Python)
      const pendingJobs = await prisma.job.findMany({
        where: { status: 'pending', type: { in: ['CATALOG_GEN', 'PRICE_REC'] } },
        take: 5,
        orderBy: { createdAt: 'asc' }
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
          await prisma.job.update({ where: { id: job.id }, data: { status: 'failed', errorMessage: err.message } });
          
          // Also mark product status as failed so it doesn't get stuck
          if (job.payload && (job.payload as any).productId) {
             const pid = (job.payload as any).productId;
             if (job.type === 'CATALOG_GEN') {
               await prisma.product.update({ where: { id: pid }, data: { catalogStatus: 'failed' } });
             } else if (job.type === 'PRICE_REC') {
               await prisma.product.update({ where: { id: pid }, data: { priceStatus: 'failed' } });
             }
          }
        }
        
        // Finally, check if product is ready_for_review
        if (job.payload && (job.payload as any).productId) {
           const pid = (job.payload as any).productId;
           const prod = await prisma.product.findUnique({ where: { id: pid }, include: { images: true } });
           if (prod && prod.status === 'processing') {
              const allImagesTerminal = prod.images.every(img => img.processingStatus === 'done' || img.processingStatus === 'failed');
              const catalogTerminal = prod.catalogStatus === 'done' || prod.catalogStatus === 'failed';
              const priceTerminal = prod.priceStatus === 'done' || prod.priceStatus === 'failed';
              
              if (allImagesTerminal && catalogTerminal && priceTerminal) {
                 await prisma.product.update({ where: { id: pid }, data: { status: 'ready_for_review' } });
              }
           }
        }
      }
    } catch (e) {
      console.error("Job worker error:", e);
    }
  }, 5000);
};

