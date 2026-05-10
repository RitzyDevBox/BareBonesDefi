import { ethers } from "ethers";

/**
 * Mirror of `IPayrollManager.OrgConfigOpKind` in the payroll contract.
 * Order MUST match the contract enum so the on-chain dispatcher routes correctly.
 *
 * Member onboarding / update / name-slug change moved to MTA — call those
 * selectors directly via `useMtaActions` (`onboardExternalMembers`,
 * `setMemberStatus`, `setMemberNameSlug`, `rotateWallet`). The dispatcher
 * here only handles payroll-specific ops now.
 */
export enum OrgConfigOpKind {
  EarningsCodeRegister = 0,
  PayBatchCreate = 1,
  PayBatchConfigure = 2,
  PayBatchRemovePayee = 3,
  PayrollCreate = 4,
  PayrollConfigure = 5,
  PayrollCancel = 6,
}

export type OrgConfigOp = { kind: OrgConfigOpKind; data: string };

export type PayBatchAssignment = {
  earningsCodeId: ethers.BigNumberish;
  rate: ethers.BigNumberish;
  runData: string; // bytes
};

export type PayBatchConfigAction = {
  action: 0 | 1; // 0 = Upsert, 1 = Remove
  payeeId: ethers.BigNumberish;
  assignments: PayBatchAssignment[];
  earningsCodeIds: ethers.BigNumberish[];
};

export type PayrollConfigAction = {
  action: 0 | 1; // 0 = Upsert, 1 = Remove
  payeeId: ethers.BigNumberish;
  earningsCodeIds: ethers.BigNumberish[];
  rates: ethers.BigNumberish[];
  runData: string[]; // bytes[]
};

export type OrgConfigOpInput =
  | {
      kind: OrgConfigOpKind.EarningsCodeRegister;
      name: string; // bytes32
      rule: string; // address
      config: string; // bytes
    }
  | {
      kind: OrgConfigOpKind.PayBatchCreate;
      payBatchCode: string; // bytes32
    }
  | {
      // For PayBatchConfigure the dispatcher does an internal self-call into
      // configurePayBatch(slug, code, actions) to skip the calldata→memory copy.
      // op.data MUST be the FULL calldata of that public function (selector + args).
      kind: OrgConfigOpKind.PayBatchConfigure;
      slug: string;          // org slug bytes32
      payBatchCode: string;  // bytes32
      actions: PayBatchConfigAction[];
      iface: ethers.utils.Interface;
    }
  | {
      kind: OrgConfigOpKind.PayBatchRemovePayee;
      payBatchCode: string;
      payeeId: ethers.BigNumberish;
    }
  | {
      kind: OrgConfigOpKind.PayrollCreate;
      templateCode: string; // bytes32
      startTime: ethers.BigNumberish;
      endTime: ethers.BigNumberish;
    }
  | {
      // Same self-call shape as PayBatchConfigure.
      kind: OrgConfigOpKind.PayrollConfigure;
      slug: string;
      payrollId: ethers.BigNumberish;
      actions: PayrollConfigAction[];
      iface: ethers.utils.Interface;
    }
  | {
      kind: OrgConfigOpKind.PayrollCancel;
      payrollId: ethers.BigNumberish;
    };

const PAY_BATCH_ACTION_TUPLE =
  "tuple(uint8 action, uint256 payeeId, tuple(uint256 earningsCodeId, uint256 rate, bytes runData)[] assignments, uint256[] earningsCodeIds)";

const PAYROLL_ACTION_TUPLE =
  "tuple(uint8 action, uint256 payeeId, uint256[] earningsCodeIds, uint256[] rates, bytes[] runData)";

/**
 * Encode an `OrgConfigOp` for `PayrollManager.configure(slug, ops)`.
 *
 * - Simple ops use plain `defaultAbiCoder.encode(...)` so the dispatcher's
 *   `abi.decode` reads the right shape.
 * - Nested-array ops (PayBatchConfigure / PayrollConfigure) are wrapped as
 *   FULL calldata for the public function — the dispatcher self-calls.
 */
export function encodeOrgConfigOp(input: OrgConfigOpInput): OrgConfigOp {
  const coder = ethers.utils.defaultAbiCoder;

  switch (input.kind) {
    case OrgConfigOpKind.EarningsCodeRegister:
      return {
        kind: input.kind,
        data: coder.encode(
          ["bytes32", "address", "bytes"],
          [input.name, input.rule, input.config]
        ),
      };

    case OrgConfigOpKind.PayBatchCreate:
      return {
        kind: input.kind,
        data: coder.encode(["bytes32"], [input.payBatchCode]),
      };

    case OrgConfigOpKind.PayBatchConfigure: {
      // Full calldata for configurePayBatch(slug, code, actions).
      const data = input.iface.encodeFunctionData("configurePayBatch", [
        input.slug,
        input.payBatchCode,
        input.actions,
      ]);
      return { kind: input.kind, data };
    }

    case OrgConfigOpKind.PayBatchRemovePayee:
      return {
        kind: input.kind,
        data: coder.encode(["bytes32", "uint256"], [input.payBatchCode, input.payeeId]),
      };

    case OrgConfigOpKind.PayrollCreate:
      return {
        kind: input.kind,
        data: coder.encode(
          ["bytes32", "uint256", "uint256"],
          [input.templateCode, input.startTime, input.endTime]
        ),
      };

    case OrgConfigOpKind.PayrollConfigure: {
      const data = input.iface.encodeFunctionData("configurePayroll", [
        input.slug,
        input.payrollId,
        input.actions,
      ]);
      return { kind: input.kind, data };
    }

    case OrgConfigOpKind.PayrollCancel:
      return {
        kind: input.kind,
        data: coder.encode(["uint256"], [input.payrollId]),
      };
  }
}

// Used internally by callers building action arrays manually if they need the tuple ABI.
export const ABI_TUPLES = {
  PayBatchAction: PAY_BATCH_ACTION_TUPLE,
  PayrollAction: PAYROLL_ACTION_TUPLE,
};
