import { config } from "#api/config/env.js";

export const dbConfig = Object.freeze({
  uri: config.mongo.uri,
  options: {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 20
  }
});
