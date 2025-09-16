# Analytical Backend

A MooseStack-powered analytical service that provides consumption APIs for Foo and Bar analytics with ClickHouse integration.

## Available Scripts

```bash
pnpm ufa-lite:devx ## start the analytical service
pnpm seed-foo ## copy data from remote ClickHouse to local foo table
pnpm seed-bar ## copy data from remote ClickHouse to local bar table
pnpm generate-sdk ## Runs the Kubb CLI to generate the SDK for the analytical service
```
