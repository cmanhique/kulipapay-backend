const EnterpriseModel = require('./models/enterprise.model');
const DepartmentModel = require('./models/department.model');
const TransactionExtensionModel = require('./models/transactionExtension.model');
const enterpriseConfig = require('./enterprise.config');

const policyEngine = require('./policy/policy.engine');
const policyTypes = require('./policy/policy.types');
const policyRules = require('./policy/policy.rules');

const auditEngine = require('./audit/audit.engine');
const auditLogger = require('./audit/audit.logger');
const auditTypes = require('./audit/audit.types');

const enterpriseService = require('./core/enterprise.service');
const departmentService = require('./core/department.service');
const shadowLedgerService = require('./core/ledger.shadow.service');
const enterpriseContext = require('./core/enterprise.context');
const enterpriseBootstrap = require('./integration/enterprise.bootstrap');
const enterpriseBus = require('./integration/enterprise.bus');

module.exports = {
  config: enterpriseConfig,
  models: {
    EnterpriseModel,
    DepartmentModel,
    TransactionExtensionModel,
  },
  policy: {
    engine: policyEngine,
    types: policyTypes,
    rules: policyRules,
  },
  audit: {
    engine: auditEngine,
    logger: auditLogger,
    types: auditTypes,
  },
  core: {
    enterprise: enterpriseService,
    department: departmentService,
    shadowLedger: shadowLedgerService,
    context: enterpriseContext,
  },
  integration: {
    bootstrap: enterpriseBootstrap,
    bus: enterpriseBus,
  },
};
