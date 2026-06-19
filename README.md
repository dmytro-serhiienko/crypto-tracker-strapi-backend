# Crypto Tracker Backend

Strapi backend for the Crypto Tracker test task.

The API stores a list of cryptocurrencies, exposes public REST endpoints, and provides a custom sync endpoint that updates prices from the DIA API.

---

## Tech Stack

- Strapi 5
- TypeScript
- SQLite
- DIA API

---

## Content Type: Coin

Collection type: `Coin`

### Fields

| Field            | Type        | Description                            |
| ---------------- | ----------- | -------------------------------------- |
| `name`           | Text        | Coin name (e.g. `Bitcoin`)             |
| `symbol`         | Text        | Coin symbol (e.g. `BTC`)               |
| `currentPrice`   | Decimal     | Current price in USD                   |
| `priceChange24h` | Decimal     | 24h price change in percent            |
| `logo`           | Media       | Coin logo                              |
| `description`    | Rich Text   | Coin description                       |
| `sparkline`      | JSON        | Mocked 7-day price data                |
| `category`       | Enumeration | `DeFi`, `Layer1`, `Meme`, `Stablecoin` |

---

## Getting Started

### Install dependencies

```bash
npm install
```

### Start development server

```bash
npm run develop
```

### Strapi Admin Panel

```text
http://localhost:1337/admin
```

### API Base URL

```text
http://localhost:1337/api
```

---

## Seed Data

The project automatically seeds **20 cryptocurrencies** on startup if the database is empty.

Seed logic is located in:

```text
src/index.ts
```

Coin logos are uploaded through the **Strapi Media Library** and attached to entries from the admin panel.

---

## Public Permissions

The `Coin` collection has public access enabled for:

- `find`
- `findOne`

This allows frontend applications to fetch coin data without authentication.

---

## API Endpoints

### Get Coins

```bash
curl -g "http://localhost:1337/api/coins?pagination[pageSize]=30"
```

### Get Coins With Logos

```bash
curl -g "http://localhost:1337/api/coins?populate=logo&pagination[pageSize]=30"
```

### Get One Coin

```bash
curl "http://localhost:1337/api/coins/<documentId>?populate=logo"
```

Example:

```bash
curl "http://localhost:1337/api/coins/sr04mi14oywpssf1culguuo8?populate=logo"
```

### Filter By Category

```bash
curl -g "http://localhost:1337/api/coins?filters[category][$eq]=Layer1&populate=logo"
```

### Sort By Price

```bash
curl "http://localhost:1337/api/coins?sort=currentPrice:desc"
```

### Sync Prices

```bash
curl -X POST "http://localhost:1337/api/coins/sync"
```

The sync endpoint fetches fresh market data from DIA:

```text
https://api.diadata.org/v1/quotation/BTC
```

Updated fields:

- `currentPrice`
- `priceChange24h`

Example response:

```json
{
  "message": "Sync completed",
  "updated": 19,
  "skipped": 1,
  "results": [
    {
      "symbol": "BTC",
      "status": "updated",
      "price": 63178.837744282064
    },
    {
      "symbol": "BONK",
      "status": "not_found_on_dia"
    }
  ]
}
```

> `BONK` may be skipped because DIA does not always provide quotation data for this symbol. The endpoint handles this case gracefully.

---

## Notes

When using `curl` with Strapi query parameters containing square brackets (`[]`), use the `-g` flag:

```bash
curl -g "http://localhost:1337/api/coins?filters[category][$eq]=Layer1"
```

Without `-g`, curl may return:

```text
curl: (3) bad range in URL
```

---

## Project Structure

```text
src/
├── api/
│   └── coin/
│       ├── content-types/
│       │   └── coin/
│       │       └── schema.json
│       ├── controllers/
│       │   └── coin.ts
│       ├── routes/
│       │   ├── coin.ts
│       │   └── sync.ts
│       └── services/
│           └── coin.ts
└── index.ts
```

---

## Status

### Completed Features

- ✅ Coin content type
- ✅ Seed data with 20 cryptocurrencies
- ✅ Public `find` and `findOne` permissions
- ✅ Coin logos via Strapi Media Library
- ✅ Custom `/api/coins/sync` endpoint
- ✅ Pagination support
- ✅ Sorting support
- ✅ Filtering support
- ✅ DIA API integration
