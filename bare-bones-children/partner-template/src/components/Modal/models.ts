
/**
 * UXMode
 *
 * Default:
 * - Modal expands based on content
 * - Modal body scrolls if content exceeds maxHeight
 *
 * FixedBody:
 * - Modal height is constrained by maxHeight
 * - Modal body does NOT scroll
 * - Child components must manage their own scrolling
 */

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;

  width?: number | string;
  maxWidth?: number | string;

  height?: number | string;
  maxHeight?: number | string;

  uxMode?: UXMode;
}

export enum UXMode {
  Default = "default",
  FixedBody = "fixed-body",
}