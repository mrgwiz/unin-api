const express = require("express");
const serverless = require("serverless-http");
const validator = require("validator");

const { getPgClient } = require("./pgClient");
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
            itemId: item.item_id,
            owner: item.owner,
            type,
            attrs,
            name: item.name,
            description: item.desc
        }
    };

    return (Array.isArray(rawData))
        ? rawData.map(processItem)
        : processItem(rawData);
}

app.get('/items/owner/:owner', async function (req, res) {
    const { owner } = req.params;

    const pgClient = getPgClient();

    try {
        if (!validator.isAlphanumeric(owner))
            throw new ApiError("Invalid owner", 400);

        await pgClient.connect();

        const query = `SELECT owner, name, "desc", uri FROM items WHERE owner = $1`;
        const { rows } = await pgClient.query(query, [owner]);
        const processed = rows.map(processRawItemData);
        res.status(200).json(processed);
    } catch (error) {
        handleApiError(error, res);
    }

    pgClient.end();
});

app.get('/items/:id', async function (req, res) {
    const pgClient = getPgClient();

    try {
        if (!validator.isNumeric(req.params.id))
            throw new ApiError("Invalid id", 400);

        await pgClient.connect();

        const query = `SELECT owner, name, "desc", uri FROM items WHERE item_id = $1`;
        const result = await pgClient.query(query, [req.params.id]);

        if (result.rows.length === 0)
            throw new ApiError("Item not found", 404);

        const item = processRawItemData(result.rows[0]);
        res.status(200).json(item);
    } catch (error) {
        handleApiError(error, res);
    }
    
    pgClient.end();
});

app.post('/items/claim/:id', async function (req, res) {
    const itemId = req.params.id;
    const {
        message,
        signature
    } = req.body;

    const pgClient = getPgClient();

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

        await pgClient.connect();

        const query = `UPDATE items SET owner = $1 WHERE item_id = $2`;
        const result = await pgClient.query(query, [caller, itemId]);

        if (!result.rowCount)
            throw new ApiError("Item not found", 404);

        res.status(200).json({
            message: 'Item claimed successfully',
            owner: caller
        });    
    } catch (error) {
        handleApiError(error, res);
    }

    pgClient.end();
});

app.post('/items/:id', async function (req, res) {
    const itemId = req.params.id;
    const {
        name,
        description,
        message,
        signature
    } = req.body;

    const pgClient = getPgClient();

    try {
        if (!validator.isNumeric(itemId))
            throw new ApiError("Invalid id", 400);

        if (!validator.isLength(name, { min: 1, max: 64 }))
            throw new ApiError("Invalid name", 400); 

        if (!validator.isLength(description, { min: 1, max: 256 }))
            throw new ApiError("Invalid description", 400);

        if (!message || !signature)
            throw new ApiError("Missing message or signature", 400);

        await pgClient.connect();

        const result = await pgClient.query(`SELECT item_id FROM items WHERE item_id=$1`, [itemId]);
        if (result.rows.length > 0)
            throw new ApiError("Item already registered", 409);
                
        const web3Client = new Web3Client();

        const caller = web3Client.verifySignature(message, signature);

        const owner = await web3Client.getItemOwner(itemId);
        if (owner.toLowerCase() != caller)
            throw new ApiError("Caller is not the owner of the item", 403);

        const tokenUri = await web3Client.getItemUri(itemId);
        const uri = tokenUri.split(',');
    
        const query = `INSERT INTO items
            (item_id, owner, name, "desc", uri)
            VALUES ($1, $2, $3, $4, $5)`;

        await pgClient.query(query, [itemId, caller, name, description, uri]);

        res.status(201).json({ message: 'Item registered' });
    } catch (error) {
        handleApiError(error, res);
    }

    pgClient.end();
});

app.use((req, res, next) => {
    return res.status(404).json({
        error: "Not Found",
    });
});

module.exports.handler = serverless(app);
