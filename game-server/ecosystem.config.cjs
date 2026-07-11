module.exports = {
  apps: [
    {
      name: "olddungeons-engine",
      cwd: __dirname,
      script: "engine.js",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      },
      // Carrega .env do próprio diretório
      node_args: "--require=dotenv/config",
    },
  ],
};
