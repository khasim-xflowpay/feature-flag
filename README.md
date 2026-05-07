This is a [Next.js](https://nextjs.org) App Router project that reads **hosted configuration** from **AWS AppConfig** and optionally **publishes** updates (new version + deployment) from an admin UI.

## Feature flags admin (list / edit / deploy)

1. Copy [`.env.local.example`](.env.local.example) to `.env.local` and fill in AWS and AppConfig IDs.
2. Set **`APPCONFIG_DEPLOYMENT_STRATEGY_ID`** — required for writes. In the AWS console: AppConfig → Deployment strategies → copy an existing strategy ID (or create one, e.g. linear growth).
3. Ensure IAM credentials used locally (or by the app role when deployed) allow:
   - **Read**: `appconfig:StartConfigurationSession`, `appconfig:GetLatestConfiguration`
   - **Publish**: `appconfig:CreateHostedConfigurationVersion`, `appconfig:StartDeployment`
4. Run `npm run dev` and open **`/admin/feature-flags`**.
5. Optionally set **`APPCONFIG_ADMIN_SECRET`** in `.env.local`; then the UI must send the same value in the **Admin secret** field (sent as header `x-admin-secret` on publish).

Publishing uploads the full JSON document as a new hosted configuration version and starts a deployment to the configured environment. The in-memory read cache is invalidated after a successful publish; allow a few seconds for the deployment to complete before all clients see the new config.

## API

- `GET /api/appconfig/config` — current validated configuration (same shape as AppConfig JSON).
- `PUT /api/appconfig/config` — body: full `{ "featureFlags": { ... } }` document; validates, publishes, deploys.

## Configuration JSON shape

Hosted JSON uses snake_case fields aligned with AppConfig storage, for example:

```json
{
  "featureFlags": {
    "limit_order": {
      "enabled": true,
      "created_at": 1743868800,
      "updated_at": 1743868800,
      "valid_until": 1743868800,
      "environment": "production",
      "meta_data": {
        "version": "1",
        "description": "Enable limit order"
      },
      "attributes": {
        "allowedAccoutsOwnerIds": ["1234567890"]
      }
    }
  }
}
```

Legacy `metaData` (camelCase) in old documents is accepted on read and normalized to `meta_data`.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The home page includes a link to the admin screen.

## Learn more

- [Next.js documentation](https://nextjs.org/docs)
- [AWS AppConfig](https://docs.aws.amazon.com/appconfig/)
