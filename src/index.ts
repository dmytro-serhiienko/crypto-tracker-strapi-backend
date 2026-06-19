import type { Core } from '@strapi/strapi';

const coins = [
  {
    name: 'Bitcoin',
    symbol: 'BTC',
    currentPrice: 65000,
    priceChange24h: 2.5,
    category: 'Layer1',
  },
  {
    name: 'Ethereum',
    symbol: 'ETH',
    currentPrice: 3500,
    priceChange24h: 1.8,
    category: 'Layer1',
  },
  {
    name: 'Solana',
    symbol: 'SOL',
    currentPrice: 150,
    priceChange24h: -3.2,
    category: 'Layer1',
  },
  {
    name: 'Cardano',
    symbol: 'ADA',
    currentPrice: 0.45,
    priceChange24h: 0.9,
    category: 'Layer1',
  },
  {
    name: 'Polkadot',
    symbol: 'DOT',
    currentPrice: 6.2,
    priceChange24h: -1.1,
    category: 'Layer1',
  },
  {
    name: 'Avalanche',
    symbol: 'AVAX',
    currentPrice: 28,
    priceChange24h: 4.1,
    category: 'Layer1',
  },
  {
    name: 'Uniswap',
    symbol: 'UNI',
    currentPrice: 7.5,
    priceChange24h: 2.0,
    category: 'DeFi',
  },
  {
    name: 'Aave',
    symbol: 'AAVE',
    currentPrice: 95,
    priceChange24h: -0.5,
    category: 'DeFi',
  },
  {
    name: 'Maker',
    symbol: 'MKR',
    currentPrice: 1500,
    priceChange24h: 1.2,
    category: 'DeFi',
  },
  {
    name: 'Curve DAO',
    symbol: 'CRV',
    currentPrice: 0.32,
    priceChange24h: -2.8,
    category: 'DeFi',
  },
  {
    name: 'Compound',
    symbol: 'COMP',
    currentPrice: 55,
    priceChange24h: 0.3,
    category: 'DeFi',
  },
  {
    name: 'Dogecoin',
    symbol: 'DOGE',
    currentPrice: 0.12,
    priceChange24h: 5.6,
    category: 'Meme',
  },
  {
    name: 'Shiba Inu',
    symbol: 'SHIB',
    currentPrice: 0.000018,
    priceChange24h: 3.3,
    category: 'Meme',
  },
  {
    name: 'Pepe',
    symbol: 'PEPE',
    currentPrice: 0.0000012,
    priceChange24h: 8.9,
    category: 'Meme',
  },
  {
    name: 'Floki',
    symbol: 'FLOKI',
    currentPrice: 0.00018,
    priceChange24h: -4.4,
    category: 'Meme',
  },
  {
    name: 'Bonk',
    symbol: 'BONK',
    currentPrice: 0.000022,
    priceChange24h: 6.1,
    category: 'Meme',
  },
  {
    name: 'Tether',
    symbol: 'USDT',
    currentPrice: 1.0,
    priceChange24h: 0.01,
    category: 'Stablecoin',
  },
  {
    name: 'USD Coin',
    symbol: 'USDC',
    currentPrice: 1.0,
    priceChange24h: -0.01,
    category: 'Stablecoin',
  },
  {
    name: 'Dai',
    symbol: 'DAI',
    currentPrice: 1.0,
    priceChange24h: 0.02,
    category: 'Stablecoin',
  },
  {
    name: 'TrueUSD',
    symbol: 'TUSD',
    currentPrice: 1.0,
    priceChange24h: 0.0,
    category: 'Stablecoin',
  },
];

//! Создает график цены за 7 дней на основе стартовой цены монеты
function generateSparkline(basePrice: number) {
  const points: number[] = [];
  let price = basePrice;
  for (let i = 0; i < 7; i++) {
    const change = (Math.random() - 0.5) * 0.05;
    price = price * (1 + change);
    points.push(Number(price.toFixed(8)));
  }
  return points;
}

export default {
  register() {},

  //! Запускается при старте Strapi и заполняет базу монетами, если она пустая.
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const count = await strapi.documents('api::coin.coin').count({});

    if (count > 0) {
      strapi.log.info(`Coins already seeded (${count} found), skipping.`);
      return;
    }

    for (const coin of coins) {
      await strapi.documents('api::coin.coin').create({
        data: {
          ...coin,
          description: `${coin.name} (${coin.symbol}) is a digital asset in the ${coin.category} category.`,
          sparkline: generateSparkline(coin.currentPrice),
        },
        status: 'published',
      } as any);
    }

    strapi.log.info(`Seeded ${coins.length} coins.`);
  },
};
