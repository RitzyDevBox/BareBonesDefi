import { useMemo, useState } from "react";
import { ethers } from "ethers";
import { Card, CardContent, Input } from "../BasicComponents";
import { ButtonPrimary, ButtonSecondary } from "../Button/ButtonPrimary";
import { FormField } from "../FormField/FormField";
import { AddressInput } from "../Inputs/AddressInput";
import { Bytes32Input } from "../Inputs/Bytes32Input";
import { NumberInput } from "../Inputs/NumberInput";
import { Uint256Input } from "../Inputs/Uint256Input";
import { Row, Stack } from "../Primitives";
import { Text } from "../Primitives/Text";
import type { ProposalBuildPayload, ProposalCall } from "./types";

const ERC20_MINIMAL_ABI_OBJECT = [
  {
    type: "function",
    name: "transfer",
    inputs: [
      { name: "to", type: "address", internalType: "address" },
      { name: "amount", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address", internalType: "address" },
      { name: "amount", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

const ERC20_MINIMAL_ABI_TEXT = JSON.stringify(ERC20_MINIMAL_ABI_OBJECT, null, 2);
const ERC20_INTERFACE = new ethers.utils.Interface(ERC20_MINIMAL_ABI_OBJECT as any);

type ProposalActionPreset = "custom" | "send-native" | "send-token" | "approve";

type Props = {
  disabled?: boolean;
  loading?: boolean;
  onSubmit: (payload: ProposalBuildPayload) => Promise<void> | void;
};

function normalizeAbiCandidate(input: unknown): any[] {
  if (Array.isArray(input)) return input as any[];
  if (input && typeof input === "object" && Array.isArray((input as any).abi)) {
    return (input as any).abi as any[];
  }
  throw new Error("ABI must be a JSON array or an object with an abi array.");
}

function parseParam(type: string, value: string) {
  if (type.endsWith("[]") || type.includes("tuple")) {
    throw new Error(`Type ${type} is not yet supported in this builder.`);
  }

  if (type === "address") {
    return ethers.utils.getAddress(value.trim());
  }

  if (type === "bool") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes"].includes(normalized)) return true;
    if (["false", "0", "no"].includes(normalized)) return false;
    throw new Error("Boolean values must be true/false.");
  }

  if (type.startsWith("uint") || type.startsWith("int")) {
    return ethers.BigNumber.from(value.trim() || "0");
  }

  if (type === "bytes32") {
    const normalized = value.trim();
    if (!normalized) return ethers.constants.HashZero;
    if (ethers.utils.isHexString(normalized)) {
      return ethers.utils.hexZeroPad(normalized, 32);
    }
    return ethers.utils.formatBytes32String(normalized);
  }

  if (type.startsWith("bytes") && type !== "bytes") {
    if (!ethers.utils.isHexString(value.trim())) {
      throw new Error(`Value for ${type} must be a valid hex string.`);
    }
    return value.trim();
  }

  if (type === "bytes") {
    if (ethers.utils.isHexString(value.trim())) return value.trim();
    return ethers.utils.toUtf8Bytes(value);
  }

  return value;
}

export function ProposalBuilder({ disabled = false, loading = false, onSubmit }: Props) {
  const [target, setTarget] = useState("");
  const [description, setDescription] = useState("");
  const [actionPreset, setActionPreset] = useState<ProposalActionPreset>("custom");
  const [nativeValueWei, setNativeValueWei] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [approveSpender, setApproveSpender] = useState("");
  const [approveAmount, setApproveAmount] = useState("");
  const [abiText, setAbiText] = useState("[]");
  const [selectedFunctionSignature, setSelectedFunctionSignature] = useState("");
  const [valuesByParam, setValuesByParam] = useState<Record<string, string>>({});
  const [stagedCalls, setStagedCalls] = useState<ProposalCall[]>([]);
  const [error, setError] = useState<string | null>(null);

  function presetButtonStyle(preset: ProposalActionPreset) {
    if (actionPreset !== preset) return undefined;
    return {
      borderColor: "var(--colors-primary)",
      color: "var(--colors-primary)",
      boxShadow: "inset 0 0 0 1px var(--colors-primary)",
    };
  }

  function applyPreset(preset: ProposalActionPreset) {
    setActionPreset(preset);
    setValuesByParam({});
    setError(null);

    if (preset === "send-native") {
      setAbiText("[]");
      setSelectedFunctionSignature("");
      if (!description.trim()) setDescription("Send native token");
      return;
    }

    if (preset === "send-token") {
      setAbiText(ERC20_MINIMAL_ABI_TEXT);
      setSelectedFunctionSignature("");
      if (!description.trim()) setDescription("Send ERC20 token");
      return;
    }

    if (preset === "approve") {
      setAbiText(ERC20_MINIMAL_ABI_TEXT);
      setSelectedFunctionSignature("");
      if (!description.trim()) setDescription("Approve ERC20 spender");
      return;
    }

    setAbiText("[]");
    setSelectedFunctionSignature("");
  }

  const { iface, functions } = useMemo(() => {
    try {
      const parsed = normalizeAbiCandidate(JSON.parse(abiText));
      const nextIface = new ethers.utils.Interface(parsed as any);
      const nextFunctions = Object.keys(nextIface.functions)
        .map((signature) => nextIface.getFunction(signature))
        .filter((fragment) => fragment.constant !== true && fragment.stateMutability !== "view" && fragment.stateMutability !== "pure");

      return { iface: nextIface, functions: nextFunctions };
    } catch {
      return { iface: null as ethers.utils.Interface | null, functions: [] as ethers.utils.FunctionFragment[] };
    }
  }, [abiText]);

  const selectedFunction = useMemo(() => {
    if (!iface || !selectedFunctionSignature) return null;
    try {
      return iface.getFunction(selectedFunctionSignature);
    } catch {
      return null;
    }
  }, [iface, selectedFunctionSignature]);

  function buildCallFromForm(): ProposalCall {
    if (!target.trim()) throw new Error("Target contract address is required.");

    const encodedTarget = ethers.utils.getAddress(target.trim());

    if (actionPreset === "send-native") {
      if (!nativeValueWei.trim()) throw new Error("Native value (wei) is required.");
      if (!/^\d+$/.test(nativeValueWei.trim())) throw new Error("Native value must be a whole number.");

      return {
        target: encodedTarget,
        calldata: "0x",
        functionSignature: "native transfer",
        valueWei: nativeValueWei.trim(),
      };
    }

    if (actionPreset === "send-token") {
      if (!transferTo.trim()) throw new Error("Recipient address is required.");
      if (!transferAmount.trim()) throw new Error("Amount is required.");

      const calldata = ERC20_INTERFACE.encodeFunctionData("transfer", [
        ethers.utils.getAddress(transferTo.trim()),
        ethers.BigNumber.from(transferAmount.trim()),
      ]);

      return {
        target: encodedTarget,
        calldata,
        functionSignature: "transfer(address,uint256)",
        valueWei: "0",
      };
    }

    if (actionPreset === "approve") {
      if (!approveSpender.trim()) throw new Error("Spender address is required.");
      if (!approveAmount.trim()) throw new Error("Amount is required.");

      const calldata = ERC20_INTERFACE.encodeFunctionData("approve", [
        ethers.utils.getAddress(approveSpender.trim()),
        ethers.BigNumber.from(approveAmount.trim()),
      ]);

      return {
        target: encodedTarget,
        calldata,
        functionSignature: "approve(address,uint256)",
        valueWei: "0",
      };
    }

    if (!iface) throw new Error("Invalid ABI JSON.");
    if (!selectedFunction) throw new Error("Select a function from the ABI.");

    const argValues = selectedFunction.inputs.map((input, index) => {
      const key = `${input.name || `arg${index}`}-${index}`;
      return parseParam(input.type, valuesByParam[key] ?? "");
    });

    const calldata = iface.encodeFunctionData(selectedFunction, argValues);

    return {
      target: encodedTarget,
      calldata,
      functionSignature: selectedFunction.format(),
      valueWei: "0",
    };
  }

  function handleStageCall() {
    setError(null);

    try {
      const nextCall = buildCallFromForm();
      setStagedCalls((current) => [...current, nextCall]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stage call.");
    }
  }

  async function handleSubmitProposal() {
    setError(null);

    try {
      if (!description.trim()) throw new Error("Proposal description is required.");
      if (stagedCalls.length === 0) throw new Error("Stage at least one call before submitting.");

      await onSubmit({
        description: description.trim(),
        calls: stagedCalls,
      });

      setStagedCalls([]);
      setValuesByParam({});
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit proposal.");
    }
  }

  return (
    <Card>
      <CardContent>
        <Stack gap="md">
          <Text.Title align="left" size="sm">Create Proposal</Text.Title>
          <Text.Body size="sm" color="muted">
            Stage one or more calls, preview them, then submit one proposal containing all staged calls.
          </Text.Body>

          <FormField label="Quick Actions" style={{ marginBottom: 0 }}>
            <Stack gap="sm" style={{ flexDirection: "row", flexWrap: "wrap" }}>
              <ButtonSecondary fullWidth={false} disabled={loading} onClick={() => applyPreset("send-native")} style={presetButtonStyle("send-native")}>Send native</ButtonSecondary>
              <ButtonSecondary fullWidth={false} disabled={loading} onClick={() => applyPreset("send-token")} style={presetButtonStyle("send-token")}>Send token</ButtonSecondary>
              <ButtonSecondary fullWidth={false} disabled={loading} onClick={() => applyPreset("approve")} style={presetButtonStyle("approve")}>Approve</ButtonSecondary>
              <ButtonSecondary fullWidth={false} disabled={loading} onClick={() => applyPreset("custom")} style={presetButtonStyle("custom")}>Custom ABI</ButtonSecondary>
            </Stack>
          </FormField>

          <FormField label="Target Contract" style={{ marginBottom: 0 }}>
            <AddressInput value={target} onChange={(event) => setTarget((event.target as HTMLInputElement).value)} />
          </FormField>

          <FormField label="Proposal Description" style={{ marginBottom: 0 }}>
            <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe this proposal" />
          </FormField>

          {actionPreset === "send-native" ? (
            <FormField label="Native Value (wei)" style={{ marginBottom: 0 }}>
              <Uint256Input
                value={nativeValueWei}
                onChange={(event) => setNativeValueWei(event.target.value)}
              />
            </FormField>
          ) : null}

          {actionPreset === "send-token" ? (
            <>
              <FormField label="Recipient" style={{ marginBottom: 0 }}>
                <AddressInput
                  value={transferTo}
                  onChange={(event) => setTransferTo((event.target as HTMLInputElement).value)}
                />
              </FormField>
              <FormField label="Amount (raw token units)" style={{ marginBottom: 0 }}>
                <Uint256Input
                  value={transferAmount}
                  onChange={(event) => setTransferAmount(event.target.value)}
                />
              </FormField>
            </>
          ) : null}

          {actionPreset === "approve" ? (
            <>
              <FormField label="Spender" style={{ marginBottom: 0 }}>
                <AddressInput
                  value={approveSpender}
                  onChange={(event) => setApproveSpender((event.target as HTMLInputElement).value)}
                />
              </FormField>
              <FormField label="Amount (raw token units)" style={{ marginBottom: 0 }}>
                <Uint256Input
                  value={approveAmount}
                  onChange={(event) => setApproveAmount(event.target.value)}
                />
              </FormField>
            </>
          ) : null}

          {actionPreset === "custom" ? (
            <Stack gap="sm">
              <FormField label="ABI JSON / ABI Section" style={{ marginBottom: 0 }}>
                <textarea
                  value={abiText}
                  onChange={(event) => {
                    setAbiText(event.target.value);
                    setSelectedFunctionSignature("");
                    setValuesByParam({});
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                  }}
                  rows={8}
                  style={{
                    width: "100%",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--colors-border)",
                    padding: "var(--spacing-md)",
                    background: "var(--colors-background)",
                    color: "var(--colors-text-main)",
                  }}
                />
              </FormField>

              <FormField label="Function" style={{ marginBottom: 0 }}>
                <select
                  value={selectedFunctionSignature}
                  onChange={(event) => {
                    setSelectedFunctionSignature(event.target.value);
                    setValuesByParam({});
                  }}
                  style={{
                    width: "100%",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--colors-border)",
                    padding: "var(--spacing-md)",
                    background: "var(--colors-background)",
                    color: "var(--colors-text-main)",
                  }}
                >
                  <option value="">Select function</option>
                  {functions.map((fragment) => (
                    <option key={fragment.format()} value={fragment.format()}>
                      {fragment.format()}
                    </option>
                  ))}
                </select>
              </FormField>

              {selectedFunction ? (
                <Stack gap="sm">
                  <Text.Label>Function Inputs</Text.Label>
                  {selectedFunction.inputs.length === 0 ? (
                    <Text.Body size="sm" color="muted">No inputs for this function.</Text.Body>
                  ) : (
                    selectedFunction.inputs.map((input, index) => {
                      const key = `${input.name || `arg${index}`}-${index}`;
                      const label = `${input.name || `arg${index}`} (${input.type})`;
                      const value = valuesByParam[key] ?? "";

                      if (input.type.startsWith("uint") || input.type.startsWith("int")) {
                        if (input.type.startsWith("uint")) {
                          return (
                            <FormField key={key} label={label} style={{ marginBottom: 0 }}>
                              <Uint256Input
                                value={value}
                                onChange={(event) =>
                                  setValuesByParam((current) => ({ ...current, [key]: event.target.value }))
                                }
                              />
                            </FormField>
                          );
                        }

                        return (
                          <FormField key={key} label={label} style={{ marginBottom: 0 }}>
                            <NumberInput
                              value={value}
                              allowDecimal={false}
                              allowNegative={input.type.startsWith("int")}
                              onChange={(event) =>
                                setValuesByParam((current) => ({ ...current, [key]: event.target.value }))
                              }
                            />
                          </FormField>
                        );
                      }

                      if (input.type === "bytes32") {
                        return (
                          <FormField key={key} label={label} style={{ marginBottom: 0 }}>
                            <Bytes32Input
                              value={value}
                              onChange={(event) =>
                                setValuesByParam((current) => ({ ...current, [key]: event.target.value }))
                              }
                            />
                          </FormField>
                        );
                      }

                      if (input.type === "address") {
                        return (
                          <FormField key={key} label={label} style={{ marginBottom: 0 }}>
                            <AddressInput
                              value={value}
                              onChange={(event) =>
                                setValuesByParam((current) => ({
                                  ...current,
                                  [key]: (event.target as HTMLInputElement).value,
                                }))
                              }
                            />
                          </FormField>
                        );
                      }

                      return (
                        <FormField key={key} label={label} style={{ marginBottom: 0 }}>
                          <Input
                            value={value}
                            onChange={(event) =>
                              setValuesByParam((current) => ({ ...current, [key]: event.target.value }))
                            }
                            placeholder={input.type === "bool" ? "true or false" : "Value"}
                          />
                        </FormField>
                      );
                    })
                  )}
                </Stack>
              ) : null}
            </Stack>
          ) : null}

          {error ? <Text.Body color="warn">{error}</Text.Body> : null}

          <Card style={{ background: "var(--colors-background)" }}>
            <CardContent>
              <Stack gap="sm">
                <Text.Title align="left" size="sm">Staged Calls Preview</Text.Title>
                {stagedCalls.length === 0 ? (
                  <Text.Body size="sm" color="muted">No staged calls yet.</Text.Body>
                ) : (
                  <Stack gap="sm">
                    {stagedCalls.map((call, index) => (
                      <Card key={`${call.target}-${call.functionSignature}-${index}`} style={{ background: "var(--colors-surface)" }}>
                        <CardContent>
                          <Stack gap="xs">
                            <Text.Body size="sm" weight={600}>Call {index + 1}</Text.Body>
                            <Text.Body size="sm">Target: {call.target}</Text.Body>
                            <Text.Body size="sm">Function: {call.functionSignature}</Text.Body>
                            <Text.Body size="sm">Value (wei): {call.valueWei}</Text.Body>
                            <Text.Body size="sm">Calldata: {call.calldata}</Text.Body>
                            <Row justify="end">
                              <ButtonSecondary
                                fullWidth={false}
                                onClick={() =>
                                  setStagedCalls((current) => current.filter((_, currentIndex) => currentIndex !== index))
                                }
                              >
                                Remove
                              </ButtonSecondary>
                            </Row>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>

          <Stack gap="sm" style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
            <ButtonSecondary fullWidth={false} disabled={disabled || loading} onClick={handleStageCall}>
              Add Call to Proposal
            </ButtonSecondary>
            <ButtonPrimary fullWidth={false} disabled={disabled || loading} onClick={() => void handleSubmitProposal()}>
              {loading ? "Submitting..." : `Submit Proposal (${stagedCalls.length})`}
            </ButtonPrimary>
            <ButtonSecondary
              fullWidth={false}
              disabled={loading}
              onClick={() => {
                setDescription("");
                setNativeValueWei("");
                setTransferTo("");
                setTransferAmount("");
                setApproveSpender("");
                setApproveAmount("");
                setValuesByParam({});
                setStagedCalls([]);
                setError(null);
              }}
            >
              Reset Builder
            </ButtonSecondary>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
