module.exports = {
  apps: [
    {
      name: 'cloudpro',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '850M',
      restart_delay: 2000,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
