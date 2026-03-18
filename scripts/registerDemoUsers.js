import bcrypt from "bcryptjs";
import { User } from "#db/models/index.js";
import { connectMongo, disconnectMongo } from "#db/connection/mongoose.js";
import { dbConfig } from "#api/config/db.config.js";
import { logger } from "#api/utils/logger.js";

const DEMO_ACCOUNTS = [
    { label: 'Tenant Admin', email: 'admin@company.com', name: 'Admin User' },
    { label: 'Manager', email: 'manager@company.com', name: 'Manager User' },
    { label: 'Team Lead', email: 'teamlead@company.com', name: 'Team Lead User' },
    { label: 'Employee', email: 'worker@company.com', name: 'Worker User' },
    { label: 'HR Manager', email: 'hr@company.com', name: 'HR Manager User' },
    { label: 'Operations', email: 'ops@company.com', name: 'Operations User' },
    { label: 'Finance', email: 'finance@company.com', name: 'Finance User' },
    { label: 'Dispatcher', email: 'dispatcher@company.com', name: 'Dispatcher User' },
    { label: 'Support', email: 'support@company.com', name: 'Support User' },
    { label: 'Customer', email: 'customer@company.com', name: 'Customer User' },
];

const BCRYPT_ROUNDS = 12;

async function registerDemoUsers() {
    try {
        logger.info("Connecting to MongoDB...");
        await connectMongo(dbConfig);

        for (const acc of DEMO_ACCOUNTS) {
            const email = acc.email.toLowerCase().trim();
            const name = acc.name;
            const password = email; // Password matches email as requested

            logger.info(`Processing user: ${email}`);

            const existingUser = await User.findOne({ email });
            const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

            if (existingUser) {
                await User.updateOne(
                    { _id: existingUser._id },
                    {
                        $set: {
                            name,
                            "auth.passwordHash": passwordHash,
                            "auth.passwordAlgo": "bcrypt",
                            status: "active",
                            emailVerified: true
                        }
                    }
                );
                logger.info(`Updated user: ${email}`);
            } else {
                await User.create({
                    email,
                    name,
                    auth: {
                        passwordHash,
                        passwordAlgo: "bcrypt"
                    },
                    status: "active",
                    emailVerified: true
                });
                logger.info(`Created user: ${email}`);
            }
        }

        logger.info("Demo user registration completed successfully.");
    } catch (error) {
        logger.error({ err: error }, "Error registering demo users");
    } finally {
        await disconnectMongo();
        logger.info("MongoDB connection closed.");
    }
}

registerDemoUsers();
