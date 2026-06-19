export default {
  routes: [
    {
      //! Создает публичный endpoint POST /api/coins/sync => обновления цен
      method: 'POST',
      path: '/coins/sync',
      handler: 'coin.sync',
      config: {
        auth: false,
      },
    },
  ],
};
