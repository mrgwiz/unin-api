# unin-api

API for Universal Inventory

This is an API written with express and deployed to AWS using the <a href="https://www.serverless.com/">Serverless</a> framework.

## Install Node Modules

```
npm install
```

## Testing Locally

### Configuration

Place `.env` file at root

```ini
WEB3_PROVIDER="https://"
CONTRACT="0x0"
POSTGRES_HOST="localhost"
POSTGRES_PORT="5432"
POSTGRES_DATABASE="postgres"
POSTGRES_USERNAME="postgres"
POSTGRES_PASSWORD="postgres"
```

### Serverless Offline

`npm run offline` will run Serverless Offline on port 8080.

## Deploying to AWS

```shell
serverless deploy --region $yourFavoriteRegion
```

## APIs

### GET `/items/owner/:owner`

Returns items linked to wallet address (`:owner`).

```json
[
  {
    "owner": "0xbeedf3d1645bb6468b660754bf33298c0d88c566",
    "type": 1,
    "attrs": [15,0,0,15,0,70,0],
    "name": "RedGreenPurple Item",
    "description": "It's red, green, and purple."
  }
]
```

### GET `/items/:id`

Return information for item.

```json
{
  "owner": "0xbeedf3d1645bb6468b660754bf33298c0d88c566",
  "type": 1,
  "attrs": [15,15,15,15,15,15,10],
  "name": "Frank",
  "description": "This is Frank."
}
```

### POST `/items/claim/:id`

Assigns item to new wallet address given caller is the owner of the item.

Request

`:id` is the ID of the item being claimed.

```json
{
    message,
    signature
}
```

### POST `/items/:id`

Registers an item, giving it a name and description.  Also links item to callers wallet address.

Request

`:id` is the ID of the item being registered.

```json
{
    name,
    description,
    message,
    signature
}
```

## Additional

General information regarding AWS and Postgres are outside scope of this document.
