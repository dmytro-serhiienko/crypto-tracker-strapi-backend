import { factories } from '@strapi/strapi';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

// типизация данных с DIA API
type DiaQuotation = {
  Price?: number;
  PriceYesterday?: number;
  LogoURL?: string;
};

//! Функция загрузки логотипа
// запрос в интернет (fetch) по ссылке logoUrl => скачаиваем картинку =>
// если ссылка битая (!imageResponse.ok) => возвращаем null (ничего)
async function uploadLogo(strapi: any, logoUrl: string, symbol: string) {
  const imageResponse = await fetch(logoUrl);
  if (!imageResponse.ok) {
    return null;
  }

  // буфер => картинку в набор байт
  // tmpPath — путь для временного файла в системе + цифры
  const buffer = Buffer.from(await imageResponse.arrayBuffer());
  const tmpPath = path.join(
    os.tmpdir(),
    `${symbol.toLowerCase()}-logo-${Date.now()}.png`
  );

  // записываем картинку из буфера во временный файл на ЖД
  // вызываем встроенной upload для загрузки в Strapi
  // возвращаем id => удаляем fs.rm временный файл с диска
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
    //! Загружаем из базы данных список наших монет (пока что 100)
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

      // пустой масив для записи результата
      const results: Array<{ symbol: string; status: string; price?: number }> =
        [];

      // цикл обновления монет
      for (const coin of coins) {
        try {
          const response = await fetch(
            `https://api.diadata.org/v1/quotation/${coin.symbol}`
          );

          // не нашел монеу идем дальше
          if (!response.ok) {
            results.push({ symbol: coin.symbol, status: 'not_found_on_dia' });
            continue;
          }

          // читаем
          const diaData = (await response.json()) as DiaQuotation;

          // нет цены идем дальше
          if (!diaData.Price) {
            results.push({
              symbol: coin.symbol,
              status: 'no_price_in_response',
            });
            continue;
          }

          // Смотрим вчерашнюю цену. Если есть, по математической формуле считаем процент изменения цены за сутки.
          // Если вчерашней цены нет — ставим 0.
          const newPrice = diaData.Price;
          const yesterdayPrice = diaData.PriceYesterday;
          const priceChange24h = yesterdayPrice
            ? ((newPrice - yesterdayPrice) / yesterdayPrice) * 100
            : 0;

          const updateData: Record<string, unknown> = {
            currentPrice: newPrice,
            priceChange24h: Number(priceChange24h.toFixed(2)),
          };

          // Проверяем, есть ли уже у монеты логотип (hasLogo).
          // Если картинка скачалась, мы добавляем её id к данным для обновления.
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

          // обновляем монету в базе данных Strapi по её documentId
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
          //! главный catch
        } catch (err) {
          strapi.log.error(`Sync failed for ${coin.symbol}: ${err}`);
          results.push({ symbol: coin.symbol, status: 'error' });
        }
      }

      // Текст Sync completed.
      // updated считаем количество элементов в журнале, у которых статус равен 'updated'.
      // skipped считаем все остальные монеты, которые были пропущены из-за разных ошибок.
      // results прикрепляем весь детальный журнал со статусом по каждой монете.
      ctx.body = {
        message: 'Sync completed',
        updated: results.filter((r) => r.status === 'updated').length,
        skipped: results.filter((r) => r.status !== 'updated').length,
        results,
      };
    },
  })
);
