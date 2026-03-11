const { S3Client } = require('@aws-sdk/client-s3');

const WASABI_REGION = process.env.WASABI_REGION || 'eu-central-2';
const WASABI_BUCKET = process.env.WASABI_BUCKET || 'catlover-media-123';

const s3Client = new S3Client({
    region: WASABI_REGION,
    endpoint: `https://s3.${WASABI_REGION}.wasabisys.com`,
    credentials: {
        accessKeyId: process.env.WASABI_ACCESS_KEY,
        secretAccessKey: process.env.WASABI_SECRET_KEY
    }
});

module.exports = {
    s3Client,
    WASABI_BUCKET,
    WASABI_REGION
};
