import { connectMongo, disconnectMongo } from "#db/connection/mongoose.js";
import { config } from "#api/config/env.js";
import { Role } from "#db/models/index.js";

import dotenv from 'dotenv';
import { DEFAULT_ROLES } from './role.js';

dotenv.config();

async function seedRoles() {
  try {
    await connectMongo({ uri: config.mongo.uri });

    for (const role of DEFAULT_ROLES) {
      await Role.updateOne(
        { name: role.name },
        {
          $set: {
            description: role.description,
            isPlatformRole: role.isPlatformRole,
            permissions: [...new Set(role.permissions)].sort(),
          },
        },
        { upsert: true }
      );
    }

    console.log(`Seeded ${DEFAULT_ROLES.length} roles successfully.`);
    process.exit(0);
  } catch (error) {
    console.error('Role seeding failed:', error);
    process.exit(1);
  }
}

seedRoles();

