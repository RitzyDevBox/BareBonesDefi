import { VerticalFlowItem } from "../components/Landing/types";
import { Text } from "../components/Primitives/Text";
import { Stack } from "../components/Primitives";

export const LANDING_FLOW: VerticalFlowItem[] = [
  {
    id: "what-it-is",
    content: (
      <Stack gap="sm">
        <Text.Title>What This Is</Text.Title>
        <Text.Body>
          A minimal account abstraction wallet framework built on Diamonds.
          Owner-authorized by default. No custody.
        </Text.Body>
      </Stack>
    ),
  },
  {
    id: "capabilities",
    content: (
      <Stack gap="sm">
        <Text.Title>What It Does Today</Text.Title>
        <ul>
          <li>Deploy smart-contract wallets</li>
          <li>Send and receive ETH and ERC-20 tokens</li>
          <li>Wrap and unwrap native assets</li>
          <li>Batch execution</li>
        </ul>
      </Stack>
    ),
  },
  {
    id: "security",
    content: (
      <Stack gap="sm">
        <Text.Title>Security Model</Text.Title>
        <ul>
          <li>Owner authorization required</li>
          <li>Validation enforced by default</li>
          <li>No relayers or automatic execution</li>
        </ul>
      </Stack>
    ),
  },
  {
    id: "future",
    content: (
      <Stack gap="sm">
        <Text.Title>What Comes Next</Text.Title>
        <ul>
          <li>Optional execution modules</li>
          <li>Custom authorization strategies</li>
          <li>Intent-based interactions</li>
        </ul>
      </Stack>
    ),
  },
];
