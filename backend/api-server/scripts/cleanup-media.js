
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function cleanupMediaPortal() {
    console.log('🧹 Starting Media Portal Cleanup...');

    try {
        // 1. Get all file records from database
        const files = await prisma.mediaFile.findMany();
        console.log(`📂 Found ${files.length} files to delete.`);

        // 2. Delete physical files from 'uploads' directory
        // Note: This script assumes local storage usage as per storage.js logic
        const uploadsDir = path.join(process.cwd(), 'uploads');

        if (fs.existsSync(uploadsDir)) {
            console.log('🗑️ Cleaning up uploads directory...');
            // Function to recursively delete files
            const deleteFolderRecursive = (directoryPath) => {
                if (fs.existsSync(directoryPath)) {
                    fs.readdirSync(directoryPath).forEach((file, index) => {
                        const curPath = path.join(directoryPath, file);
                        if (fs.lstatSync(curPath).isDirectory()) { // recurse
                            deleteFolderRecursive(curPath);
                        } else { // delete file
                            fs.unlinkSync(curPath);
                        }
                    });
                    fs.rmdirSync(directoryPath);
                }
            };

            // We don't want to delete the 'uploads' folder itself, just contents
            const items = fs.readdirSync(uploadsDir);
            for (const item of items) {
                const itemPath = path.join(uploadsDir, item);
                if (fs.lstatSync(itemPath).isDirectory()) {
                    deleteFolderRecursive(itemPath);
                } else {
                    fs.unlinkSync(itemPath);
                }
            }
            console.log('✅ Physical files deleted.');
        } else {
            console.log('⚠️ Uploads directory not found, skipping physical deletion.');
        }

        // 3. Delete records from database
        const deletedFiles = await prisma.mediaFile.deleteMany({});
        console.log(`✅ Deleted ${deletedFiles.count} file records from database.`);

        console.log('\n✨ Media Portal Cleanup Complete!');

    } catch (error) {
        console.error('❌ Error cleaning up Media Portal:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanupMediaPortal();
