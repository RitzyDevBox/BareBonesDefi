
import { ethers } from "ethers";
import GLOBAL_ORGANIZATION_REGISTRY_ABI from "../abis/diamond/GlobalOrganizationRegistry.abi.json";
import ORGANIZATION_BEACON_FACET_ABI from "../abis/diamond/facets/OrganizationBeaconFacet.abi.json";
import { getBareBonesConfiguration } from "../constants/misc";
import { RawTx } from "./basicWalletUtils";

export const DEMO_FALLBACK_BEACONS = {
  STATE_MANIPULATOR_DEMO_V1: "0xD677D7B99F9528A706572ca69eB393B573f4Bf67",
  LOGGER_FALLBACK_DEMO_V1: "0x22259AD9f1e830B3604766889E5d0236088C8C09",
} as const;


export function createOrganizationRawTx(
  organizationId: string,
  fallbackBeaconAddress: string,
  chainId: number
): RawTx {
  if (chainId == null) {
    throw new Error("chainId is required");
  }
  assertValidDemoFallbackBeacon(fallbackBeaconAddress);
  const config = getBareBonesConfiguration(chainId);

  const iface = new ethers.utils.Interface(
    GLOBAL_ORGANIZATION_REGISTRY_ABI
  );

  const orgId = toOrgId(organizationId);

  return {
    to: config.globalOrganizationRegistry,
    value: 0,
    data: iface.encodeFunctionData("createOrganization", [
      orgId,
      fallbackBeaconAddress,
    ]),
  };
}

export function updateOrganizationFallbackBeaconRawTx(
  organizationId: string,
  fallbackBeaconAddress: string,
  chainId: number
): RawTx {
  if (chainId == null) {
    throw new Error("chainId is required");
  }
  assertValidDemoFallbackBeacon(fallbackBeaconAddress);
  const config = getBareBonesConfiguration(chainId);

  const iface = new ethers.utils.Interface(
    GLOBAL_ORGANIZATION_REGISTRY_ABI
  );

  const orgId = toOrgId(organizationId);

  return {
    to: config.globalOrganizationRegistry,
    value: 0,
    data: iface.encodeFunctionData("updateBeacon", [
      orgId,
      fallbackBeaconAddress,
    ]),
  };
}

export function enrollOrganizationRawTx(
  walletAddress: string,
  organizationId: string,
  chainId: number
): RawTx {
  if (chainId == null) {
    throw new Error("chainId is required");
  }

  const iface = new ethers.utils.Interface(
    ORGANIZATION_BEACON_FACET_ABI
  );

  const orgId = toOrgId(organizationId);

  return {
    to: walletAddress,
    value: 0,
    data: iface.encodeFunctionData("enrollOrganization", [
      orgId,
    ]),
  };
}

export function unenrollOrganizationRawTx(
  walletAddress: string,
  chainId: number
): RawTx {
  if (chainId == null) {
    throw new Error("chainId is required");
  }

  const iface = new ethers.utils.Interface(
    ORGANIZATION_BEACON_FACET_ABI
  );

  return {
    to: walletAddress,
    value: 0,
    data: iface.encodeFunctionData("unenrollOrganization"),
  };
}

function toOrgId(organizationId: string): string {
  return ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes(organizationId)
  );
}

export function assertValidDemoFallbackBeacon(
  beaconAddress: string
): void {
  if (!ethers.utils.isAddress(beaconAddress)) {
    throw new Error("Invalid beacon address");
  }

  const normalized = beaconAddress.toLowerCase();

  const allowed = Object.values(DEMO_FALLBACK_BEACONS)
    .map((a) => a.toLowerCase());

  if (!allowed.includes(normalized)) {
    throw new Error(
      "Beacon address is not an allowed demo fallback"
    );
  }
}