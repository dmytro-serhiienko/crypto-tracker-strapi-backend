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