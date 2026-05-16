/**
 * Copyright (c) 2026 Vladimir Kapustin
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * AASLRoleProvisioner — Idempotent AI role assignment.
 * Scope: x_aasl
 */
var AASLRoleProvisioner = Class.create();
AASLRoleProvisioner.prototype = {
    initialize: function() {
        this.ROLES = [
            "ai_agent_admin",
            "ai_agent_developer",
            "ai_control_tower_admin",
            "now_assist_admin",
            "workflow_studio_admin"
        ];
    },

    /**
     * Grant a role to a user idempotently.
     * @param {string} userSysId — sys_id of sys_user
     * @param {string} roleName — name of sys_user_role
     * @return {Object} { success: boolean, message: string, alreadyHad: boolean }
     */
    grantRole: function(userSysId, roleName) {
        var roleGR = new GlideRecord("sys_user_role");
        roleGR.addQuery("name", roleName);
        roleGR.query();
        if (!roleGR.next()) {
            return { success: false, message: "Role '" + roleName + "' does not exist.", alreadyHad: false };
        }
        var roleSysId = roleGR.getUniqueValue();
        var uh = new GlideRecord("sys_user_has_role");
        uh.addQuery("user", userSysId);
        uh.addQuery("role", roleSysId);
        uh.query();
        if (uh.next()) {
            return { success: true, message: "User already has role '" + roleName + "'.", alreadyHad: true };
        }
        var insertGR = new GlideRecord("sys_user_has_role");
        insertGR.initialize();
        insertGR.setValue("user", userSysId);
        insertGR.setValue("role", roleSysId);
        var inserted = insertGR.insert();
        return {
            success: !!inserted,
            message: inserted ? "Granted role '" + roleName + "'." : "Insert failed.",
            alreadyHad: false
        };
    },

    /**
     * Grant all AI roles to a user.
     * @param {string} userSysId
     * @return {Array} results per role
     */
    grantAllAIRoles: function(userSysId) {
        var results = [];
        for (var i = 0; i < this.ROLES.length; i++) {
            results.push(this.grantRole(userSysId, this.ROLES[i]));
        }
        return results;
    },

    /**
     * Revoke a role from a user.
     * @param {string} userSysId
     * @param {string} roleName
     * @return {Object}
     */
    revokeRole: function(userSysId, roleName) {
        var roleGR = new GlideRecord("sys_user_role");
        roleGR.addQuery("name", roleName);
        roleGR.query();
        if (!roleGR.next()) {
            return { success: false, message: "Role not found." };
        }
        var uh = new GlideRecord("sys_user_has_role");
        uh.addQuery("user", userSysId);
        uh.addQuery("role", roleGR.getUniqueValue());
        uh.query();
        if (uh.next()) {
            uh.deleteRecord();
            return { success: true, message: "Revoked role '" + roleName + "'." };
        }
        return { success: false, message: "User did not have role '" + roleName + "'." };
    },

    type: "AASLRoleProvisioner"
};
