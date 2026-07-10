module.exports = {
  apps: [
    {
      name: "olddungeons",
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      env: { NODE_ENV: "production" },
      out_file: "logs/out.log",
      error_file: "logs/err.log",
      merge_logs: true,
      time: true,
    },
  ],
};
