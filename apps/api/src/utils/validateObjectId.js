import mongoose from "mongoose";

export const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value));

export const toObjectId = (value) => new mongoose.Types.ObjectId(String(value));
