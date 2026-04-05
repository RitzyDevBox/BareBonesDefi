import { isValidElement, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Table } from "../Table";
import type { TableColumn } from "../Table";
import { Stack, Row } from "../Primitives";
import { Text } from "../Primitives/Text";
import { Card, CardContent, Input } from "../BasicComponents";
import { ButtonPrimary } from "../Button/ButtonPrimary";
import { IconButton } from "../Button/IconButton";
import { AddressInput } from "../Inputs/AddressInput";
import { shortAddress } from "../../utils/formatUtils";
import { CopyButton } from "../Button/Actions/CopyButton";
import { TrashBinIcon } from "../../assets/icons/TrashBinIcon";
import { EarningsDividerButton } from "../PayrollEarningsManager/EarningsDividerButton";

interface Payee {
	payeeId: ethers.BigNumber;
	organizationSlug: string;
	role: string;
	paymentAddress: string;
	params: string;
	status: number;
}

export interface PayeesTableProps {
	payees: Payee[];
	searchEnabled?: boolean;
	renderExpandedRow: (payee: Payee, rowData: any) => React.ReactNode;
	extraColumns?: TableColumn[];
	getExtraCells?: (payee: Payee) => Record<string, any>;
	getRowStyle?: (payee: Payee) => React.CSSProperties;
	onAddPayee?: {
		onSubmit: (name: string, address: string) => Promise<any>;
		onSubmitBatch?: (rows: Array<{ name: string; address: string }>) => Promise<any>;
		loading?: boolean;
	};
}

function safeParseName(value: string) {
	try {
		return ethers.utils.parseBytes32String(value);
	} catch {
		return value;
	}
}

export function PayeesTable({
	payees,
	searchEnabled = false,
	renderExpandedRow,
	extraColumns = [],
	getExtraCells,
	getRowStyle,
	onAddPayee,
}: PayeesTableProps) {
	const [searchQuery, setSearchQuery] = useState("");

	const filteredPayees = useMemo(() => {
		if (!searchEnabled || !searchQuery.trim()) {
			return payees;
		}

		const query = searchQuery.toLowerCase();
		return payees.filter((payee) => {
			const name = safeParseName(payee.role).toLowerCase();
			const address = payee.paymentAddress.toLowerCase();
			const id = payee.payeeId.toString();

			return name.includes(query) || address.includes(query) || id.includes(query);
		});
	}, [payees, searchQuery, searchEnabled]);

	const [draftRows, setDraftRows] = useState<Array<{ id: string; name: string; address: string }>>([
		{ id: "row-1", name: "", address: "" },
	]);
	const [isSubmitting, setIsSubmitting] = useState(false);

	function addDraftRow() {
		setDraftRows((prev) => [
			...prev,
			{ id: `row-${Date.now()}-${Math.random()}`, name: "", address: "" },
		]);
	}

	function removeDraftRow(id: string) {
		setDraftRows((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.id !== id)));
	}

	function updateDraftRow(id: string, patch: Partial<{ name: string; address: string }>) {
		setDraftRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
	}

	async function handleSaveAllPayees() {
		if (!onAddPayee) {
			return;
		}

		const normalizedRows = draftRows.map((row) => ({
			name: row.name.trim(),
			address: row.address.trim(),
		}));

		if (normalizedRows.length === 0) return;

		const hasBlankRows = normalizedRows.some((row) => !row.name || !row.address);
		if (hasBlankRows) {
			return;
		}

		setIsSubmitting(true);
		try {
			let didSucceed = false;

			if (onAddPayee.onSubmitBatch) {
				const result = await onAddPayee.onSubmitBatch(normalizedRows);
				didSucceed = Boolean(result);
			} else {
				didSucceed = true;
				for (const row of normalizedRows) {
					const result = await onAddPayee.onSubmit(row.name, row.address);
					if (!result) {
						didSucceed = false;
						break;
					}
				}
			}

			if (didSucceed) {
				setDraftRows([{ id: `row-${Date.now()}`, name: "", address: "" }]);
			}
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<Stack>
			{onAddPayee && (
				<Card style={{ marginBottom: "var(--spacing-md)" }}>
					<CardContent>
						<Stack>
							<Text.Label>Add Payees (Bulk)</Text.Label>
							{draftRows.some((row) => !row.name.trim() || !row.address.trim()) && (
								<Text.Body color="warn" size="sm">
									Remove or complete empty rows before saving.
								</Text.Body>
							)}
							{draftRows.map((row, index) => (
								<Stack key={row.id}>
									{index > 0 && <div style={{ height: 1, background: "var(--colors-border)", width: "100%" }} />}
									<Row gap="sm" wrap>
										<Input
											value={row.name}
											onChange={(e) => updateDraftRow(row.id, { name: e.target.value })}
											placeholder="Name (e.g., DEV)"
											style={{ flex: 1, minWidth: 160 }}
										/>
										<AddressInput
											value={row.address}
											onChange={(e) => updateDraftRow(row.id, { address: (e.target as HTMLInputElement).value })}
											placeholder="0x…"
											style={{ flex: 2, minWidth: 240 }}
										/>
										<IconButton
											size="xl"
											iconFontSize="xl"
											shape="square"
											aria-label="Delete row"
											title="Delete row"
											style={{
												borderColor: "var(--colors-borderHover)",
												color: "var(--colors-error)",
											}}
											onClick={() => removeDraftRow(row.id)}
											disabled={draftRows.length <= 1 || isSubmitting || onAddPayee.loading}
										>
											<span style={{ display: "flex", transform: "translateX(1px)" }}>
												<TrashBinIcon size={26} />
											</span>
										</IconButton>
									</Row>
								</Stack>
							))}
							<EarningsDividerButton
								label="Add Row"
								onClick={addDraftRow}
								disabled={isSubmitting || onAddPayee.loading}
								minWidth={140}
							/>
							<Row gap="sm" justify="end" wrap>
								<ButtonPrimary
									style={{ flex: 0 }}
									onClick={handleSaveAllPayees}
									disabled={
										isSubmitting ||
										onAddPayee.loading ||
										draftRows.some((row) => !row.name.trim() || !row.address.trim())
									}
								>
									{isSubmitting || onAddPayee.loading ? "Saving..." : "Save All"}
								</ButtonPrimary>
							</Row>
						</Stack>
					</CardContent>
				</Card>
			)}

			<Stack>
				{searchEnabled ? (
					<Row justify="between" align="center" wrap style={{ marginBottom: "var(--spacing-sm)" }}>
						<Text.Label>Payees ({filteredPayees.length})</Text.Label>
						<div style={{ width: "100%", maxWidth: 380, marginLeft: "auto" }}>
							<Input
								type="text"
								placeholder="Search by name, address, or ID..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
						</div>
					</Row>
				) : (
					<Text.Label>Payees ({filteredPayees.length})</Text.Label>
				)}

				<Table
					columns={[
						{
							key: "id",
							header: "ID",
						},
						{
							key: "name",
							header: "Name",
						},
						{
							key: "address",
							header: "Address",
							render: (value: any) => {
								if (isValidElement(value)) return value;
								if (typeof value !== "string") return String(value ?? "");
								return (
									<Row gap="sm" align="center" style={{ minWidth: 0 }}>
										<span>{shortAddress(value)}</span>
										<CopyButton value={value} ariaLabel="Copy address" />
									</Row>
								);
							},
						},
						...extraColumns,
					]}
					data={filteredPayees.map((payee) => ({
						id: payee.payeeId.toString(),
						cells: {
							id: payee.payeeId.toNumber(),
							name: safeParseName(payee.role),
							address: payee.paymentAddress,
							...(getExtraCells ? getExtraCells(payee) : {}),
						},
						expandedContent: (rowData) => renderExpandedRow(payee, rowData),
						rowStyle: getRowStyle?.(payee),
					}))}
					showSearch={false}
				/>
			</Stack>
		</Stack>
	);
}
