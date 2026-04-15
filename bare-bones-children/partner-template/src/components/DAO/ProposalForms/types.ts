import type { ProposalCall } from "../types";

/**
 * Interface that all proposal form components must implement.
 * This ensures consistent behavior across different action types.
 */
export interface ProposalForm {
  /**
   * Build and return the encoded proposal call
   */
  buildCall(): ProposalCall;

  /**
   * Reset form to initial state
   */
  reset(): void;

  /**
   * Check if form is valid and ready to submit
   */
  isValid(): boolean;
}

/**
 * Props passed to all form components
 */
export interface ProposalFormProps {
  /**
   * The target contract address
   */
  target: string;

  /**
   * Callback when form state changes validity
   */
  onValidityChange?: (isValid: boolean) => void;
}

/**
 * Props for forms that need to open address pickers
 */
export interface ProposalFormPropsWithAddressBook extends ProposalFormProps {
  /**
   * Open the address book modal for config address selection
   */
  onOpenConfigAddressBook?: (field: string) => void;

  /**
   * Config addresses available from address book
   */
  configAddresses?: Array<{ address: string; label: string }>;
}
