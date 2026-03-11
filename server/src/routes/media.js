const express = require('express');
const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client, WASABI_BUCKET, WASABI_REGION } = require('../s3');

const router = express.Router();

// Endpoint for generating pre-signed URL for upload
router.post('/presigned-url', async (req, res) => {
    const { fileName, fileType } = req.body;
    const key = `media/${Date.now()}_${fileName}`;

    try {
        const command = new PutObjectCommand({
            Bucket: WASABI_BUCKET,
            Key: key,
            ContentType: fileType,
        });

        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        res.json({ signedUrl, key, publicUrl: `https://s3.${WASABI_REGION}.wasabisys.com/${WASABI_BUCKET}/${key}` });
    } catch (err) {
        console.error('Error generating pre-signed URL:', err);
        res.status(500).json({ error: 'Failed to generate pre-signed URL' });
    }
});

// Endpoint for deleting S3 objects
router.delete('/delete-object', async (req, res) => {
    const { key } = req.body;

    if (!key) {
        return res.status(400).json({ error: 'Key is required' });
    }

    try {
        const command = new DeleteObjectCommand({
            Bucket: WASABI_BUCKET,
            Key: key,
        });

        await s3Client.send(command);
        res.json({ success: true, message: 'Object deleted successfully' });
    } catch (err) {
        console.error('Error deleting S3 object:', err);
        res.status(500).json({ error: 'Failed to delete S3 object' });
    }
});

module.exports = router;
