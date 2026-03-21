# Payroll Manager Solidity Contract - Issues & Fixes

## Overview
This document outlines required fixes and improvements to the PayrollManager contract to support proper frontend integration, prevent edge cases, and improve overall usability.

---

## Issue 1: Earnings Array Not Queryable

### Problem
`EmployeePayrollState.earnings` is a dynamic array, which Solidity omits from automatic public getter generation. This means the frontend **cannot fetch existing earnings codes** when loading employee payroll configuration.

**Current Impact:**
- Frontend cannot prepopulate the `base rate` field from on-chain state
- Frontend cannot verify which rule is currently active for an employee
- No way to audit or display employee's current earnings configuration

### Solution
Add a public getter function to retrieve earnings codes for an employee:

```solidity
/// @notice Get all active earnings codes for an employee
/// @param slug Organization identifier
/// @param employeeId Employee ID
/// @return Array of EarningsCode structs
function getEmployeeEarnings(bytes32 slug, uint256 employeeId) 
    external 
    view 
    returns (SimplePayrollEngine.EarningsCode[] memory) 
{
    return payrollState[slug][employeeId].earnings;
}
```

**Frontend Use Case:** After fetching `payrollState(slug, employeeId)`, frontend calls `getEmployeeEarnings(slug, employeeId)` to populate rate and rule type.

---

## Issue 2: Commission Rule Lacks Dynamic Value Resolution

### Problem
Commission rule currently requires a static `rate` to be configured, but commissions often depend on:
- Real-time contract state (e.g., treasury balance, accumulated fees)
- External oracle data (e.g., performance metrics)
- Percentage of another contract's value

A static rate cannot handle these dynamic scenarios.

**Current Impact:**
- Commission can only be a fixed amount, not a percentage or dynamic calculation
- No integration with other contracts or oracles for commission amounts

### Solution
Modify commission rule to support two modes:

**Option A: Oracle/Contract Address Mode**
```solidity
struct CommissionEarningsCode {
    address rule;
    uint256 rate;
    bytes config;  // Could contain oracle address or contract to query
}
```

**Option B: Separate Commission Resolver Contract**
Create a `CommissionResolver` interface that PayrollManager queries at payroll time:
```solidity
interface ICommissionResolver {
    function resolveCommission(bytes32 slug, uint256 employeeId, uint256 timestamp)
        external
        view
        returns (uint256 amount);
}
```

PayrollManager stores the resolver address in config and queries it during payroll processing.

**Recommendation:** Option B (separate resolver) is cleaner and follows separation of concerns.

---

## Issue 3: Hours Configuration Lacks Modulo/Weekly Scoping

### Problem
Hours are tracked cumulatively with `[start, end]` bounds, but this doesn't prevent **overtime being double-counted** if payroll runs are missed or delayed.

**Example Scenario:**
- Employee configured: 40 hours/week (Mon-Sun)
- Week 1 payroll runs successfully (40 hours paid)
- Week 2 payroll is delayed 3 days (but hours already tracked)
- When Week 2 payroll finally runs, it sees 40+ hours and may apply overtime incorrectly

### Solution
Extend hours configuration to include **weekly cycle tracking**:

```solidity
struct HoursRuleConfig {
    uint256 startHours;         // e.g., 0
    uint256 endHours;           // e.g., 40
    uint256 cycleLengthSeconds; // e.g., 7 days = 604800 seconds
    uint256 cycleStartTimestamp;// When the current weekly cycle began
}
```

Encoding in config bytes becomes 4 uint256s instead of 2:
```solidity
encodedConfig = abi.encode(startHours, endHours, cycleLengthSeconds, cycleStartTimestamp);
```

**Frontend Use Case:**
- User can now select "Weekly" or "Bi-weekly" cycle length
- Hours reset automatically based on cycle, preventing accidental double-counting
- Payroll engine can validate: `hoursWorked <= endHours` within the current cycle

---

## Issue 4: Hours Configuration Should Be Hours Per Week, Not Absolute Hours

### Problem
`defaultHoursPerPeriod` is ambiguous—it doesn't specify what "period" means:
- Is it per day? Per week? Per pay run?
- Different organizations have different payroll cycles (weekly, bi-weekly, monthly)
- Frontend has no context for validation or display

**Current Impact:**
- Ambiguous contract semantics
- Frontend cannot validate user input (is 40 too high? too low?)
- Payroll engine cannot normalize across different pay frequencies

### Solution
Rename and clarify to **`hoursPerWeek`**:

```solidity
struct EmployeePayrollState {
    bool exists;
    PayType payType;
    uint256 hoursPerWeek;  // Much clearer intent: 40 = standard full-time
    SimplePayrollEngine.EarningsCode[] earnings;
}
```

Update function signature:
```solidity
function configureEmployeePayroll(
    bytes32 slug,
    uint256 employeeId,
    PayType payType,
    uint256 hoursPerWeek,  // Renamed parameter
    SimplePayrollEngine.EarningsCode[] memory earnings
)
    external
    onlyOrganizationOwner(slug)
{
    // ... validation ...
    EmployeePayrollState storage state = payrollState[slug][employeeId];
    state.exists = true;
    state.payType = payType;
    state.hoursPerWeek = hoursPerWeek;  // Store with clear semantics
    // ...
}
```

**Frontend Use Case:**
- Validation: `if (hoursPerWeek > 168) revert("Max 168 hours/week")`
- Display: Show "40 hours/week" instead of ambiguous "40 hours per period"
- Payroll engine can now normalize: actual_hours_per_week = hoursPerWeek * (payrollCycleDays / 7)

---

## Issue 5: PayType Should Be Removed or Derived from Rule

### Problem
`PayType` is redundant with the `earnings.rule` address. The contract already knows:
- If rule is `hoursRuleAddress` → it's hourly
- If rule is `flatRuleAddress` → it's salary
- If rule is `salaryPerSecondRuleAddress` → it's also salary (but time-based)

Frontend is already deriving `PayType` from the rule address; the contract should do the same or remove it entirely.

**Current Impact:**
- Two sources of truth (PayType enum + rule address)
- Frontend must translate rule → PayType
- Adds parameter to `configureEmployeePayroll` that should be automatic
- Risk of mismatch (PayType = Hourly but rule = flatRuleAddress)

### Solution

**Option A: Remove PayType Entirely**
```solidity
struct EmployeePayrollState {
    bool exists;
    // PayType removed - derive from earnings[0].rule
    uint256 hoursPerWeek;
    SimplePayrollEngine.EarningsCode[] earnings;
}

function configureEmployeePayroll(
    bytes32 slug,
    uint256 employeeId,
    // PayType parameter removed
    uint256 hoursPerWeek,
    SimplePayrollEngine.EarningsCode[] memory earnings
)
    external
    onlyOrganizationOwner(slug)
{
    // Validate that earnings rule is one of the known rule types
    address ruleAddr = earnings[0].rule;
    require(
        ruleAddr == hoursRuleAddress || 
        ruleAddr == flatRuleAddress || 
        ruleAddr == salaryPerSecondRuleAddress,
        "Invalid earnings rule"
    );
    // ...
}
```

**Option B: Keep PayType but Derive It**
```solidity
function configureEmployeePayroll(
    bytes32 slug,
    uint256 employeeId,
    // PayType parameter removed from input
    uint256 hoursPerWeek,
    SimplePayrollEngine.EarningsCode[] memory earnings
)
    external
    onlyOrganizationOwner(slug)
{
    // Derive PayType from rule
    PayType derivedPayType = _derivePayType(earnings[0].rule);
    
    EmployeePayrollState storage state = payrollState[slug][employeeId];
    state.exists = true;
    state.payType = derivedPayType;  // Auto-set
    state.hoursPerWeek = hoursPerWeek;
    // ...
}

function _derivePayType(address ruleAddr) internal view returns (PayType) {
    if (ruleAddr == hoursRuleAddress) return PayType.Hourly;
    if (ruleAddr == flatRuleAddress) return PayType.Salary;
    if (ruleAddr == salaryPerSecondRuleAddress) return PayType.Salary;
    revert("Unknown rule address");
}
```

**Recommendation:** Option A (remove entirely) is cleaner. PayType adds no value if it's always derivable.

**Frontend Use Case:**
- Simpler frontend logic: no need to compute PayType separately
- Single source of truth: the rule address
- Automatic validation: contract ensures rule is valid

---

## Issue 6: Payroll-Specific Earnings Overrides

### Problem
Employee earnings codes are configured once and apply to all payroll runs. But real-world scenarios require per-payroll customization:
- Holiday pay for specific dates (Thanksgiving, Christmas, etc.)
- Bonus pay for a particular payroll period
- Temporary rate adjustments due to promotions or leave
- Sick day pay or bereavement override

**Current Impact:**
- Organizations must reconfigure all earnings codes for a payroll run with different parameters
- No audit trail of when/why earnings changed for a specific period
- Cannot mix default earnings with period-specific overrides

### Solution
Add a payroll period override system:

```solidity
struct PayrollOverride {
    bytes32 slug;
    uint256 employeeId;
    uint256 payrollPeriodId;  // Identifier for the payroll period
    SimplePayrollEngine.EarningsCode[] overrideEarnings;  // Replaces default earnings
    bool isActive;
}

// Store overrides in a nested mapping
mapping(bytes32 slug => mapping(uint256 employeeId => mapping(uint256 payrollPeriodId => PayrollOverride))) 
    public payrollOverrides;

/// @notice Set earnings override for a specific payroll period
/// @param slug Organization identifier
/// @param employeeId Employee ID
/// @param payrollPeriodId Unique ID for the payroll period
/// @param overrideEarnings Earnings codes to use for this period only
function setPayrollOverride(
    bytes32 slug,
    uint256 employeeId,
    uint256 payrollPeriodId,
    SimplePayrollEngine.EarningsCode[] memory overrideEarnings
)
    external
    onlyOrganizationOwner(slug)
{
    require(overrideEarnings.length > 0, "Override must have at least one earnings code");
    
    payrollOverrides[slug][employeeId][payrollPeriodId] = PayrollOverride({
        slug: slug,
        employeeId: employeeId,
        payrollPeriodId: payrollPeriodId,
        overrideEarnings: overrideEarnings,
        isActive: true
    });
    
    emit PayrollOverrideSet(slug, employeeId, payrollPeriodId);
}

/// @notice Get effective earnings for an employee in a payroll period
/// @param slug Organization identifier
/// @param employeeId Employee ID
/// @param payrollPeriodId The payroll period to check
/// @return Earnings codes: override if exists, otherwise default
function getEffectiveEarnings(
    bytes32 slug,
    uint256 employeeId,
    uint256 payrollPeriodId
)
    external
    view
    returns (SimplePayrollEngine.EarningsCode[] memory)
{
    // Check if override exists for this period
    if (payrollOverrides[slug][employeeId][payrollPeriodId].isActive) {
        return payrollOverrides[slug][employeeId][payrollPeriodId].overrideEarnings;
    }
    
    // Fall back to default employee earnings
    return payrollState[slug][employeeId].earnings;
}

/// @notice Clear an override for a payroll period
function clearPayrollOverride(
    bytes32 slug,
    uint256 employeeId,
    uint256 payrollPeriodId
)
    external
    onlyOrganizationOwner(slug)
{
    delete payrollOverrides[slug][employeeId][payrollPeriodId];
    emit PayrollOverrideCleared(slug, employeeId, payrollPeriodId);
}

event PayrollOverrideSet(bytes32 indexed slug, uint256 indexed employeeId, uint256 indexed payrollPeriodId);
event PayrollOverrideCleared(bytes32 indexed slug, uint256 indexed employeeId, uint256 indexed payrollPeriodId);
```

### Key Design Decisions

**Payroll Period ID:**
- Could be a timestamp (e.g., Unix timestamp of start of pay period)
- Could be an incrementing counter (1st payroll = 1, 2nd = 2, etc.)
- Recommendation: **Use timestamp of period start** for clarity and auditability

**Example Usage:**
```solidity
// Set up default earnings for employee (base hourly $50/hr)
configureEmployeePayroll(
    "acme-corp",
    42,
    PayType.Hourly,
    40,
    [EarningsCode(hoursRule, toWei("50"), "...")],
);

// Later, for Thanksgiving week (payroll period starting Nov 25, 2026)
uint256 holidayPeriodId = 1768041600; // Nov 25, 2026 00:00 UTC
setPayrollOverride(
    "acme-corp",
    42,
    holidayPeriodId,
    [EarningsCode(hoursRule, toWei("75"), "...")]  // Holiday rate 1.5x
);

// When running payroll for that period:
EarningsCode[] memory earnings = getEffectiveEarnings("acme-corp", 42, holidayPeriodId);
// Returns holiday rate, not base rate
```

**Frontend Use Case:**
- When setting up a payroll run, show a modal to configure per-employee overrides
- Users can:
  - Keep defaults (no action needed)
  - Add holiday rates
  - Add one-time bonuses
  - Adjust hours or rate for specific reasons
- Audit trail: see which periods had overrides and when they were set

---

## Summary of Changes

| Issue | Severity | Fix | Impact |
|-------|----------|-----|--------|
| Earnings not queryable | High | Add `getEmployeeEarnings()` getter | Frontend can prepopulate rate field |
| Commission lacks dynamic values | Medium | Add `CommissionResolver` interface | Support dynamic commission calculations |
| Hours config lacks weekly scoping | Medium | Add `cycleLengthSeconds` & `cycleStartTimestamp` to config | Prevent double-counting on delayed payrolls |
| Hours ambiguous (per what?) | Low | Rename `defaultHoursPerPeriod` → `hoursPerWeek` | Clearer semantics, better validation |
| PayType is redundant | Low | Remove PayType or auto-derive from rule | Single source of truth, simpler contract |
| Payroll-specific overrides | High | Add `setPayrollOverride()` & `getEffectiveEarnings()` | Holiday pay, bonuses, period-specific adjustments |

---

## Recommended Implementation Order

1. **Issue 1 (High):** Add `getEmployeeEarnings()` - unblocks frontend immediately
2. **Issue 4 (Low):** Rename to `hoursPerWeek` - documentation/clarity improvement
3. **Issue 5 (Low):** Remove/auto-derive PayType - simplifies contract & frontend
4. **Issue 3 (Medium):** Add weekly cycle scoping - improves payroll robustness
5. **Issue 2 (Medium):** Commission resolver - enables advanced use cases

---

## Testing Checklist

- [ ] `getEmployeeEarnings()` returns correct earnings after `configureEmployeePayroll()`
- [ ] Modulo cycle prevents hours carryover across weeks
- [ ] PayType always matches rule type (if kept)
- [ ] Payroll runs correctly with all rule types (Hours, Flat, Salary/Second, Commission)
- [ ] Frontend can prepopulate all fields from on-chain state
