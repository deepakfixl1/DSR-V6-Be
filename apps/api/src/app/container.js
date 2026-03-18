import { HealthController } from "#api/modules/health/health.controller.js";
import * as authController from "#api/modules/auth/auth.controller.js";
import * as userController from "#api/modules/user/user.controller.js";
import * as adminController from "#api/modules/admin/admin.controller.js";
import * as auditController from "#api/modules/audit/audit.controller.js";
import * as notificationController from "#api/modules/notification/notification.controller.js";
import * as billingController from "#api/modules/billing/billing.controller.js";
import * as tenantController from "#api/modules/tenant/tenant.controller.js";
import * as membershipController from "#api/modules/membership/membership.controller.js";
import * as departmentController from "#api/modules/department/department.controller.js";
import * as taskController from "#api/modules/task/task.controller.js";
import * as taskTimeLogController from "#api/modules/taskTimeLog/taskTimeLog.controller.js";
import * as mfacontroller from "#api/modules/auth/mfa.controller.js";

export const createContainer = () => {
  const healthController = new HealthController();

  return {
    controllers: {
      healthController,
      authController,
      userController,
      adminController,
      auditController,
      notificationController,
      billingController,
      tenantController,
      membershipController,
      departmentController,
      taskController,
      taskTimeLogController,
      mfacontroller
    },
  };
};
