const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');

class DatabaseBackup {
    constructor() {
        this.s3 = new AWS.S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        });
        
        this.backupConfig = {
            mongodump: '/usr/bin/mongodump',
            backupDir: path.join(__dirname, '../../backups'),
            s3Bucket: process.env.BACKUP_BUCKET,
            retention: 30 // days
        };

        // Create backup directory if it doesn't exist
        if (!fs.existsSync(this.backupConfig.backupDir)) {
            fs.mkdirSync(this.backupConfig.backupDir, { recursive: true });
        }
    }

    async performBackup() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(this.backupConfig.backupDir, `backup-${timestamp}`);

            // Create MongoDB dump
            await this.createMongoDBDump(backupPath);

            // Compress backup
            const archivePath = await this.compressBackup(backupPath);

            // Upload to S3
            await this.uploadToS3(archivePath, timestamp);

            // Cleanup local files
            await this.cleanupLocalBackups();

            console.log(`Backup completed successfully: backup-${timestamp}`);
            return true;
        } catch (error) {
            console.error('Backup failed:', error);
            throw error;
        }
    }

    createMongoDBDump(backupPath) {
        return new Promise((resolve, reject) => {
            exec(`${this.backupConfig.mongodump} --uri="${process.env.MONGODB_URI}" --out="${backupPath}"`,
                (error, stdout, stderr) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve(stdout);
                }
            );
        });
    }

    compressBackup(backupPath) {
        return new Promise((resolve, reject) => {
            const archivePath = `${backupPath}.tar.gz`;
            exec(`tar -czf "${archivePath}" -C "${path.dirname(backupPath)}" "${path.basename(backupPath)}"`,
                (error) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    // Remove uncompressed backup
                    exec(`rm -rf "${backupPath}"`);
                    resolve(archivePath);
                }
            );
        });
    }

    async uploadToS3(filePath, timestamp) {
        const fileStream = fs.createReadStream(filePath);
        const uploadParams = {
            Bucket: this.backupConfig.s3Bucket,
            Key: `backups/mongodb-${timestamp}.tar.gz`,
            Body: fileStream
        };

        try {
            await this.s3.upload(uploadParams).promise();
            // Remove local archive after upload
            fs.unlinkSync(filePath);
        } catch (error) {
            console.error('S3 upload failed:', error);
            throw error;
        }
    }

    async cleanupLocalBackups() {
        const files = fs.readdirSync(this.backupConfig.backupDir);
        const now = Date.now();

        for (const file of files) {
            const filePath = path.join(this.backupConfig.backupDir, file);
            const stats = fs.statSync(filePath);
            const age = (now - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

            if (age > this.backupConfig.retention) {
                fs.unlinkSync(filePath);
            }
        }
    }

    async restoreFromBackup(backupId) {
        try {
            // Download from S3
            const downloadPath = path.join(this.backupConfig.backupDir, `restore-${backupId}.tar.gz`);
            await this.downloadFromS3(backupId, downloadPath);

            // Extract backup
            const extractPath = downloadPath.replace('.tar.gz', '');
            await this.extractBackup(downloadPath, extractPath);

            // Restore to MongoDB
            await this.restoreToMongoDB(extractPath);

            // Cleanup
            fs.unlinkSync(downloadPath);
            fs.rmdirSync(extractPath, { recursive: true });

            console.log(`Restore completed successfully: ${backupId}`);
            return true;
        } catch (error) {
            console.error('Restore failed:', error);
            throw error;
        }
    }

    async downloadFromS3(backupId, downloadPath) {
        const downloadParams = {
            Bucket: this.backupConfig.s3Bucket,
            Key: `backups/${backupId}.tar.gz`
        };

        const writeStream = fs.createWriteStream(downloadPath);
        const s3Stream = this.s3.getObject(downloadParams).createReadStream();

        return new Promise((resolve, reject) => {
            s3Stream.pipe(writeStream)
                .on('error', reject)
                .on('finish', resolve);
        });
    }

    extractBackup(archivePath, extractPath) {
        return new Promise((resolve, reject) => {
            exec(`tar -xzf "${archivePath}" -C "${path.dirname(extractPath)}"`,
                (error) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve();
                }
            );
        });
    }

    restoreToMongoDB(extractPath) {
        return new Promise((resolve, reject) => {
            exec(`mongorestore --uri="${process.env.MONGODB_URI}" "${extractPath}"`,
                (error, stdout, stderr) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve(stdout);
                }
            );
        });
    }
}

module.exports = new DatabaseBackup(); 