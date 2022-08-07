# unin-api

API for Universal Inventory

This is an API written with express and deployed to AWS using the <a href="https://www.serverless.com/">Serverless</a> framework.

## Install Node Modules

```
npm install
```

## Testing Locally

### Running DynamoDB Locally

```shell
docker run -p 8000:8000 amazon/dynamodb-local -jar DynamoDBLocal.jar -inMemory -sharedDb
```

### Creating the DynamoDB Table

```shell
aws dynamodb create-table --table-name items-table-dev --attribute-definitions AttributeName=id,AttributeType=S AttributeName=wallet,AttributeType=S --key-schema AttributeName=id,KeyType=HASH --global-secondary-indexes '[{ "IndexName": "wallet-index", "KeySchema": [{ "AttributeName": "wallet", "KeyType": "HASH" }], "Projection": { "ProjectionType": "ALL" }, "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5 }}]' --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 --endpoint-url http://localhost:8000
```

### Configuration

Place `.env` file at root

```ini
WEB3_PROVIDER="https://"
CONTRACT="0x0"
LOCAL_DYNAMODB_REGION='localhost'
LOCAL_DYNAMODB_ENDPOINT='http://localhost:8000'
LOCAL_DYNAMODB_ACCESS_KEY_ID='ACCESS_KEY_ID'
LOCAL_DYNAMODB_SECRET_ACCESS_KEY='SECRET_ACCESS_KEY'
ITEMS_TABLE='items-table-dev'
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
