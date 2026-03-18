/**
 * PendingTenantInvite model. Platform-level invite for a tenant owner.
 * When accepted, Tenant + User (owner) + TenantMembership are created.
 * No tenantId until accepted.
 */

import mongoose from "mongoose";
import { toJSONPlugin } from "../plugins/toJSON.plugin.js";

const schema = new mongoose.Schema(
  {
    ownerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    ownerName: {
      type: String,
      trim: true,
      default: "",
    },
    tenantName: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlanCatalog",
      default: null,
      index: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      trim: true,
      select: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "expired", "revoked"],
      default: "pending",
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { strict: true, minimize: false, timestamps: true, optimisticConcurrency: true }
);

schema.plugin(toJSONPlugin);

schema.index({ slug: 1 }, { unique: true, partialFilterExpression: { status: "pending" } });
schema.index({ status: 1, expiresAt: 1 });

export default mongoose.model("PendingTenantInvite", schema);
