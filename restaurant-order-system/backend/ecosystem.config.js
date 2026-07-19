module.exports = {
  apps: [
    {
      // ── App Configuration ─────────────────────────────────────────────
      name: 'restaurant',
      script: 'server.js',
      cwd: '/home/ec2-user/Restaurant-Order-System/restaurant-order-system/backend',

      // ── Instance & Cluster ────────────────────────────────────────────
      instances: 1,           // Use 'max' to use all CPU cores (cluster mode)
      exec_mode: 'fork',      // Change to 'cluster' for multi-core scaling

      // ── Auto-restart ──────────────────────────────────────────────────
      autorestart: true,
      watch: false,           // Don't watch files in production (use PM2 reload)
      max_memory_restart: '400M',

      // ── Restart Behavior ──────────────────────────────────────────────
      restart_delay: 3000,    // Wait 3s before restart
      max_restarts: 10,
      min_uptime: '10s',

      // ── Graceful Shutdown ─────────────────────────────────────────────
      kill_timeout: 5000,     // Wait 5s for graceful shutdown
      listen_timeout: 10000,  // Wait 10s for app to be ready

      // ── Logging ───────────────────────────────────────────────────────
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/home/ec2-user/.pm2/logs/restaurant-error.log',
      out_file: '/home/ec2-user/.pm2/logs/restaurant-out.log',
      merge_logs: true,

      // ── Environment Variables ─────────────────────────────────────────
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 5001,
      }
    }
  ],

  // ── PM2 Deploy Configuration ───────────────────────────────────────────────
  deploy: {
    production: {
      user: 'ec2-user',
      host: process.env.EC2_HOST || 'YOUR_EC2_PUBLIC_IP',
      ref: 'origin/main',
      repo: 'https://github.com/ajithkumar31082004-bit/Restaurant-Order-System.git',
      path: '/home/ec2-user/Restaurant-Order-System',
      'post-deploy': [
        'cd restaurant-order-system/backend',
        'npm ci --omit=dev',
        'pm2 reload ecosystem.config.js --env production',
        'pm2 save'
      ].join(' && '),
      'pre-setup': 'apt update -y || dnf update -y',
    }
  }
};
