const AWS = require('aws-sdk');

const getDynamoDbClient = () => {
    const dynamoDbClientParams = {};
    if (process.env.IS_OFFLINE) {
        dynamoDbClientParams.region = process.env.LOCAL_DYNAMODB_REGION;
        dynamoDbClientParams.endpoint = process.env.LOCAL_DYNAMODB_ENDPOINT;
        dynamoDbClientParams.accessKeyId = process.env.LOCAL_DYNAMODB_ACCESS_KEY_ID;
        dynamoDbClientParams.secretAccessKey = process.env.LOCAL_DYNAMODB_SECRET_ACCESS_KEY;
    }
    return new AWS.DynamoDB.DocumentClient(dynamoDbClientParams);
}

module.exports = {
    getDynamoDbClient
}
