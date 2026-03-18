import mongoose from "mongoose";
import { logger } from "#api/utils/logger.js";

let eventsBound = false;

const bindConnectionEvents = () => {
  if (eventsBound) return;
  eventsBound = true;

  mongoose.connection.on("connected", () => {
    logger.info("MongoDB connected");
  });

  mongoose.connection.on("error", (error) => {
    logger.error({ err: error }, "MongoDB connection error");
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
  });
};

export const connectMongo = async ({ uri, options = {} }) => {
  bindConnectionEvents();
  await mongoose.connect(uri, options);
};

export const disconnectMongo = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
};

export const getMongoReadyState = () => mongoose.connection.readyState;
