module.exports = {
  apps: [
    {
      name: 'rotakin',
      script: 'node_modules/.bin/next',
      args: 'start -p 3004',
      cwd: '/home/apps/rotakin',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3004,
      },
    },
  ],
};
