/**
 * LDAP Group to Role Mapping Configuration
 * 
 * Maps Active Directory groups to PMS roles and departments
 * This enables automatic role assignment based on AD group membership
 * 
 * Configure these mappings in your environment or update this file
 * Example AD groups: CN=PMS_Finance_Managers,OU=Groups,DC=bsj,DC=local
 */

export interface GroupRoleMapping {
    adGroupName: string; // AD group name (or CN=... format)
    roles: string[]; // Roles to assign
    department?: string; // Optional: Department code (e.g., 'FIN', 'ICT')
    departmentName?: string; // Optional: Full department name
}

/**
 * Default group mappings
 * 
 * Customize these based on your Active Directory structure
 * You can override via environment variable: LDAP_GROUP_MAPPINGS (JSON)
 */
export const DEFAULT_GROUP_MAPPINGS: GroupRoleMapping[] = [
    // Finance Department
    {
        adGroupName: 'PMS_Finance_Managers',
        roles: ['DEPT_MANAGER', 'FINANCE'],
        department: 'FIN',
        departmentName: 'Finance Department',
    },
    {
        adGroupName: 'PMS_Finance_Staff',
        roles: ['REQUESTER', 'FINANCE'],
        department: 'FIN',
        departmentName: 'Finance Department',
    },
    {
        adGroupName: 'PMS_Finance_HOD',
        roles: ['HEAD_OF_DIVISION', 'FINANCE'],
        department: 'FIN',
        departmentName: 'Finance Department',
    },

    // IT Department
    {
        adGroupName: 'PMS_IT_Managers',
        roles: ['DEPT_MANAGER'],
        department: 'ICT',
        departmentName: 'Information & Communication Technology',
    },
    {
        adGroupName: 'PMS_IT_Staff',
        roles: ['REQUESTER'],
        department: 'ICT',
        departmentName: 'Information & Communication Technology',
    },
    {
        adGroupName: 'PMS_IT_HOD',
        roles: ['HEAD_OF_DIVISION'],
        department: 'ICT',
        departmentName: 'Information & Communication Technology',
    },

    // Procurement
    {
        adGroupName: 'PMS_Procurement_Managers',
        roles: ['PROCUREMENT_MANAGER'],
        department: 'PROC',
        departmentName: 'Procurement & Supply Chain',
    },
    {
        adGroupName: 'PMS_Procurement_Officers',
        roles: ['PROCUREMENT_OFFICER', 'PROCUREMENT'],
        department: 'PROC',
        departmentName: 'Procurement & Supply Chain',
    },

    // HR Department
    {
        adGroupName: 'PMS_HR_Managers',
        roles: ['DEPT_MANAGER'],
        department: 'HR',
        departmentName: 'Human Resources',
    },
    {
        adGroupName: 'PMS_HR_Staff',
        roles: ['REQUESTER'],
        department: 'HR',
        departmentName: 'Human Resources',
    },

    // Innovation & Evaluation
    {
        adGroupName: 'PMS_Innovation_Committee',
        roles: ['INNOVATION_COMMITTEE'],
    },
    {
        adGroupName: 'PMS_Evaluation_Committee',
        roles: ['EVALUATION_COMMITTEE'],
    },

    // Admins
    {
        adGroupName: 'PMS_Admins',
        roles: ['ADMIN', 'REQUESTER'],
    },
];

/**
 * Load group mappings from environment or use defaults
 */
export function getGroupMappings(): GroupRoleMapping[] {
    const envMappings = process.env.LDAP_GROUP_MAPPINGS;
    if (envMappings) {
        try {
            return JSON.parse(envMappings);
        } catch (e) {
            console.warn('Failed to parse LDAP_GROUP_MAPPINGS environment variable, using defaults:', e);
        }
    }
    return DEFAULT_GROUP_MAPPINGS;
}

/**
 * Find matching mappings for user's AD groups
 */
export function findMappingsForGroups(userGroups: string[], mappings: GroupRoleMapping[]): GroupRoleMapping[] {
    return mappings.filter((mapping) =>
        userGroups.some((group) => {
            // Support both simple group names and CN= format
            const groupName = group.split(',')[0].replace('CN=', '').trim();
            const mappingName = mapping.adGroupName.split(',')[0].replace('CN=', '').trim();
            return groupName.toLowerCase() === mappingName.toLowerCase();
        })
    );
}

/**
 * Merge multiple role assignments (handles duplicates)
 */
export function mergeRoles(...roleLists: string[][]): string[] {
    return Array.from(new Set(roleLists.flat()));
}

/**
 * Get first matching department from mappings
 */
export function getFirstDepartment(mappings: GroupRoleMapping[]): { code: string; name: string } | null {
    for (const mapping of mappings) {
        if (mapping.department && mapping.departmentName) {
            return { code: mapping.department, name: mapping.departmentName };
        }
    }
    return null;
}
