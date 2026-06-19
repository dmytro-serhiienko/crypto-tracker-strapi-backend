import { factories } from '@strapi/strapi';

type DiaQuotation = {
  Price?: number;
  PriceYesterday?: number;
};

export default factories.createCoreController('api::coin.coin', ({ strapi }) => ({
  async sync(ctx) {
    const coins = await strapi.documents('api::coin.coin').findMany({
      fields: ['documentId', 'symbol'],
    });

    const results: Array<{ symbol: string; status: string; price?: number }> = [];

    for (const coin of coins) {
      try {
        const response = await fetch(`https://api.diadata.org/v1/quotation/${coin.symbol}`);

        if (!response.ok) {
          results.push({ symbol: coin.symbol, status: 'not_found_on_dia' });
          continue;
        }

        const diaData: DiaQuotation = await response.json();

        if (typeof diaData.Price !== 'number') {
          results.push({ symbol: coin.symbol, status: 'no_price_in_response' });
          continue;
        }

        const newPrice = diaData.Price;
        const yesterdayPrice = diaData.PriceYesterday;
        const priceChange24h = yesterdayPrice
          ? ((newPrice - yesterdayPrice) / yesterdayPrice) * 100
          : 0;

        await strapi.documents('api::coin.coin').update({
          documentId: coin.documentId,
          data: {
            currentPrice: newPrice,
            priceChange24h: Number(priceChange24h.toFixed(2)),
          } as any,
          status: 'published',
        });

        results.push({ symbol: coin.symbol, status: 'updated', price: newPrice });
      } catch (err) {
        strapi.log.error(`Sync failed for ${coin.symbol}: ${err}`);
        results.push({ symbol: coin.symbol, status: 'error' });
      }
    }

    ctx.body = {
      message: 'Sync completed',
      updated: results.filter((r) => r.status === 'updated').length,
      skipped: results.filter((r) => r.status !== 'updated').length,
      results,
    };
  },
}));