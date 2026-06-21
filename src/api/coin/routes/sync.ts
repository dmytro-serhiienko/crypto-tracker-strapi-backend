//! Кастомный endpoint /api/coins/sync — подтягивает свежие цены из внешнего API и обновляет записи

export default {
  routes: [
    {
      method: 'POST',
      path: '/coins/sync',
      handler: 'coin.sync',
      config: {
        auth: false,
      },
    },
  ],
};
