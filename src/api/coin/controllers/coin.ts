import { factories } from '@strapi/strapi';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

type DiaQuotation = {
  Price?: number;
  PriceYesterday?: number;
  LogoURL?: string;
};

//! Скачивает логотип по ссылке, временно сохраняет файл и загружает его в Media библ.
async function uploadLogo(strapi: any, logoUrl: string, symbol: string) {
  const imageResponse = await fetch(logoUrl);
  if (!imageResponse.ok) {
    return null;
  }

  const buffer = Buffer.from(await imageResponse.arrayBuffer());
  const tmpPath = path.join(
    os.tmpdir(),
    `${symbol.toLowerCase()}-logo-${Date.now()}.png`
  );

  try {
    await fs.writeFile(tmpPath, buffer);

    const uploadedFiles = await strapi
      .plugin('upload')
      .service('upload')
      .upload({
        data: {},
        files: {
          path: tmpPath,
          name: `${symbol.toLowerCase()}-logo.png`,
          type: imageResponse.headers.get('content-type') || 'image/png',
          size: buffer.length,
        },
      });

    return uploadedFiles?.[0]?.id ?? null;
  } finally {
    await fs.rm(tmpPath, { force: true });
  }
}

export default factories.createCoreController(
  'api::coin.coin',
  ({ strapi }) => ({
    //! Обновляет цены монет через DIA API и возвращает => что обновилось
    async sync(ctx) {
      const coins = await strapi.documents('api::coin.coin').findMany({
        fields: ['symbol'],
        populate: {
          logo: true,
        },
        status: 'published',
        pagination: {
          pageSize: 100,
        },
      } as any);

      const results: Array<{ symbol: string; status: string; price?: number }> =
        [];

      for (const coin of coins) {
        try {
          const response = await fetch(
            `https://api.diadata.org/v1/quotation/${coin.symbol}`
          );

          if (!response.ok) {
            results.push({ symbol: coin.symbol, status: 'not_found_on_dia' });
            continue;
          }

          const diaData = (await response.json()) as DiaQuotation;

          if (!diaData.Price) {
            results.push({
              symbol: coin.symbol,
              status: 'no_price_in_response',
            });
            continue;
          }

          const newPrice = diaData.Price;
          const yesterdayPrice = diaData.PriceYesterday;
          const priceChange24h = yesterdayPrice
            ? ((newPrice - yesterdayPrice) / yesterdayPrice) * 100
            : 0;

          const updateData: Record<string, unknown> = {
            currentPrice: newPrice,
            priceChange24h: Number(priceChange24h.toFixed(2)),
          };

          //! Качаем и заливаем лого только если у монеты его ещё нет —
          //!!! не дублируем загрузку при каждом sync
          const hasLogo = (coin as any).logo;
          if (!hasLogo && diaData.LogoURL) {
            try {
              const logoId = await uploadLogo(
                strapi,
                diaData.LogoURL,
                coin.symbol
              );
              if (logoId) {
                updateData.logo = logoId;
              }
            } catch (err) {
              strapi.log.warn(`Logo upload failed for ${coin.symbol}: ${err}`);
            }
          }

          await strapi.documents('api::coin.coin').update({
            documentId: coin.documentId,
            data: updateData as any,
            status: 'published',
          });

          results.push({
            symbol: coin.symbol,
            status: 'updated',
            price: newPrice,
          });
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
  })
);
