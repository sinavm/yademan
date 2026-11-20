# Performance measurement

The Lighthouse workflow measures the deployed GitHub Pages site in both mobile and desktop presets, with three runs per preset. It runs weekly, on demand, and after relevant changes land on `main`.

Reports are uploaded as workflow artifacts for 30 days. Compare the median across the three runs rather than relying on one noisy run.

Review these metrics:
- Largest Contentful Paint (LCP)
- Total Blocking Time (TBT)
- Cumulative Layout Shift (CLS)
- Speed Index
- Total transferred bytes and image request count from the Lighthouse network/request data

This workflow deliberately collects measurements without enforcing a numeric pass/fail budget yet. A budget should only be introduced after collecting a stable baseline on the deployed site and reviewing real mobile-device measurements. Lighthouse is a lab signal, not a replacement for iOS Safari and Android Chrome testing on real networks.
