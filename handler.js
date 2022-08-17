const express = require("express");
const serverless = require("serverless-http");
const validator = require("validator");

const { getDynamoDbClient } = require("./dynamoDbClient");
const { Web3Client } = require("./web3Client");

if (process.env.IS_OFFLINE) {
    const dotenv = require("dotenv");
    dotenv.config();
}

const app = express();

app.use(express.json());

class ApiError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}

// cors
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

const handleApiError = (err, res) => {
    if (err instanceof ApiError)
        return res.status(err.statusCode).json({ message: err.message });
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
}

function processRawItemData(rawData) {
    const processItem = (item) => {
        const [type, ...attrs] = item.uri;

        return {
            itemId: item.id,
            owner: item.wallet,
            type,
            attrs: attrs.map(attr => +attr),
            name: item.name,
            description: item.description
        }
    };

    return (Array.isArray(rawData))
        ? rawData.map(processItem)
        : processItem(rawData);
}

app.get('/items/owner/:owner', async function (req, res) {
    const { owner } = req.params;

    try {
        if (!validator.isAlphanumeric(owner))
            throw new ApiError("Invalid owner", 400);

        const dynamoDbClient = getDynamoDbClient();

        const params = {
            TableName: process.env.ITEMS_TABLE,
            IndexName : "wallet-index",
            KeyConditionExpression: 'wallet = :wallet',
            ExpressionAttributeValues: { ':wallet': owner }
        };

        const { Items, Count } = await dynamoDbClient.query(params).promise();
        const processed = Items.map(processRawItemData);
        res.status(200).json(processed);
    } catch (error) {
        handleApiError(error, res);
    }
});

app.get('/items/:id', async function (req, res) {
    try {
        if (!validator.isNumeric(req.params.id))
            throw new ApiError("Invalid id", 400);

        const dynamoDbClient = getDynamoDbClient();

        const { Item } = await dynamoDbClient.get({
            TableName: process.env.ITEMS_TABLE,
            Key: { id: req.params.id }
        }).promise();

        if (!Item)
            throw new ApiError("Item not found", 404);

        const item = processRawItemData(Item);
        res.status(200).json(item);
    } catch (error) {
        handleApiError(error, res);
    }
});

app.post('/items/claim/:id', async function (req, res) {
    const itemId = req.params.id;
    const {
        message,
        signature
    } = req.body;

    try {
        if (!validator.isNumeric(itemId))
            throw new ApiError("Invalid id", 400);

        if (!message || !signature)
            throw new ApiError("Missing message or signature", 400);

        const web3Client = new Web3Client();

        const caller = web3Client.verifySignature(message, signature);

        const owner = await web3Client.getItemOwner(itemId);
        if (owner.toLowerCase() != caller)
            throw new ApiError("Caller is not the owner of the item", 403);

        const dynamoDbClient = getDynamoDbClient();

        const params = {
            TableName: process.env.ITEMS_TABLE,
            Key: { id: itemId },
            UpdateExpression: 'set wallet = :wallet, modifiedAt = :modifiedAt',
            ExpressionAttributeValues: {
                ':wallet': owner.toLowerCase(),
                ':modifiedAt': new Date().toISOString()
            },
            ReturnValues: 'ALL_NEW'
        };

        const { Attributes } = await dynamoDbClient.update(params).promise();
        if (Attributes?.wallet.toLowerCase() != owner.toLowerCase()) {
            throw new ApiError("Item not claimed", 500);
        }

        res.status(200).json({
            message: 'Item claimed successfully',
            owner: caller
        });    
    } catch (error) {
        handleApiError(error, res);
    }
});

app.post('/items/:id', async function (req, res) {
    const itemId = req.params.id;
    const {
        name,
        description,
        message,
        signature
    } = req.body;

    try {
        if (!validator.isNumeric(itemId))
            throw new ApiError("Invalid id", 400);

        if (!validator.isLength(name, { min: 1, max: 64 }))
            throw new ApiError("Invalid name", 400); 

        if (!validator.isLength(description, { min: 1, max: 256 }))
            throw new ApiError("Invalid description", 400);

        if (!message || !signature)
            throw new ApiError("Missing message or signature", 400);

        const dynamoDbClient = getDynamoDbClient();

        const { Item } = await dynamoDbClient.get({
            TableName: process.env.ITEMS_TABLE,
            Key: { id: itemId }
        }).promise();

        if (Item)
            throw new ApiError("Item already registered", 409);
                
        const web3Client = new Web3Client();

        const caller = web3Client.verifySignature(message, signature);

        const owner = await web3Client.getItemOwner(itemId);
        if (owner.toLowerCase() != caller)
            throw new ApiError("Caller is not the owner of the item", 403);

        const tokenUri = await web3Client.getItemUri(itemId);
        const uri = tokenUri.split(',');
    
        const params = {
            TableName: process.env.ITEMS_TABLE,
            Item: {
                id: itemId,
                wallet: owner.toLowerCase(),
                name,
                description,
                uri,
                modifiedAt: new Date().toISOString()
            }
        };

        await dynamoDbClient.put(params).promise();

        res.status(201).json({ message: 'Item registered' });
    } catch (error) {
        handleApiError(error, res);
    }
});

app.use((req, res, next) => {
    return res.status(404).json({
        error: "Not Found",
    });
});

module.exports.handler = serverless(app);
