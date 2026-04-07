import { isValidElement, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Table } from "../Table";
import type { TableColumn } from "../Table";
import { Stack, Row } from "../Primitives";
import { Text } from "../Primitives/Text";
import { Input } from "../BasicComponents";
import { ButtonPrimary } from "../Button/ButtonPrimary";
import { IconButton } from "../Button/IconButton";
import { AddressInput } from "../Inputs/AddressInput";
import { shortAddress } from "../../utils/formatUtils";
import { CopyButton } from "../Button/Actions/CopyButton";
import { TrashBinIcon } from "../../assets/icons/TrashBinIcon";

interface Payee {
	payeeId: ethers.BigNumber;
	organizationSlug: string;
	role: string;
	paymentAddress: string;
	params: string;
	status: number;
}

interface DraftPayeeRow {
	id: string;
	name: string;
	address: string;
	staged: boolean;
}

export interface PayeesTableProps {
	payees: Payee[];
	searchEnabled?: boolean;
	renderExpandedRow?: (payee: Payee, rowData: any) => React.ReactNode;
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

	const [draftRows, setDraftRows] = useState<DraftPayeeRow[]>([
		{ id: "row-1", name: "", address: "", staged: false },
	]);
	const [isSubmitting, setIsSubmitting] = useState(false);

	function isValidAddress(value: string) {
		return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
	}

	function removeDraftRow(id: string) {
		setDraftRows((prev) => {
			const next = prev.filter((row) => row.id !== id);
			if (next.some((row) => !row.staged)) {
				return next;
			}
			return [...next, { id: `row-${Date.now()}`, name: "", address: "", staged: false }];
		});
	}

	function updateDraftRow(id: string, patch: Partial<{ name: string; address: string }>) {
		setDraftRows((prev) =>
			prev.map((row) => (row.id === id && !row.staged ? { ...row, ...patch } : row))
		);
	}

	function stageDraftRow(id: string) {
		setDraftRows((prev) => {
			let didStage = false;
			const next = prev.map((row) => {
				if (row.id !== id || row.staged) return row;
				const normalizedName = row.name.trim();
				const normalizedAddress = row.address.trim();
				const canStage = Boolean(normalizedName) && isValidAddress(normalizedAddress);
				if (!canStage) return row;
				didStage = true;
				return {
					...row,
					name: normalizedName,
					address: normalizedAddress,
					staged: true,
				};
			});

			if (!didStage) return prev;
			if (next.some((row) => !row.staged)) return next;

			return [...next, { id: `row-${Date.now()}-${Math.random()}`, name: "", address: "", staged: false }];
		});
	}

	const hasActionsColumn = useMemo(
		() => extraColumns.some((column) => column.key === "actions"),
		[extraColumns]
	);

	async function handleSaveAllPayees() {
		if (!onAddPayee) {
			return;
		}

		const stagedRows = draftRows.filter((row) => row.staged);
		const normalizedRows = stagedRows.map((row) => ({
			name: row.name.trim(),
			address: row.address.trim(),
		}));

		if (normalizedRows.length === 0) return;

		const hasInvalidRows = normalizedRows.some((row) => !row.name || !isValidAddress(row.address));
		if (hasInvalidRows) {
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
				setDraftRows([{ id: `row-${Date.now()}`, name: "", address: "", staged: false }]);
			}
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<Stack>
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
					data={[
						...filteredPayees.map((payee) => ({
							id: payee.payeeId.toString(),
							cells: {
								id: payee.payeeId.toNumber(),
								name: safeParseName(payee.role),
								address: payee.paymentAddress,
								...(getExtraCells ? getExtraCells(payee) : {}),
							},
							expandedContent: renderExpandedRow
								? (rowData: any) => renderExpandedRow(payee, rowData)
								: undefined,
							rowStyle: getRowStyle?.(payee),
						})),
						...(onAddPayee
							? draftRows.map((row) => {
								const isStaged = row.staged;
								const canStage = Boolean(row.name.trim()) && isValidAddress(row.address);
								const actionCell = hasActionsColumn ? (
									isStaged ? (
										<IconButton
											size="xl"
											iconFontSize="xl"
											shape="square"
											aria-label="Delete staged row"
											title="Delete staged row"
											style={{
												borderColor: "var(--colors-borderHover)",
												color: "var(--colors-error)",
											}}
											onClick={() => removeDraftRow(row.id)}
											disabled={draftRows.length <= 1 || isSubmitting || onAddPayee.loading}
										>
											<span style={{ display: "flex", transform: "translateX(1px)" }}>
												<TrashBinIcon size={24} />
											</span>
										</IconButton>
									) : (
										<IconButton
											size="xl"
											iconFontSize="xl"
											shape="square"
											aria-label="Stage new row"
											title="Stage new row"
											style={{
												borderColor: "var(--colors-borderHover)",
												color: canStage ? "var(--colors-success)" : "var(--colors-text-muted)",
											}}
											onClick={() => stageDraftRow(row.id)}
											disabled={!canStage || isSubmitting || onAddPayee.loading}
										>
											<span style={{ fontSize: 22, lineHeight: 1, fontWeight: 600 }}>+</span>
										</IconButton>
									)
								) : null;

								return {
									id: `draft-${row.id}`,
									cells: {
										id: isStaged ? "NEW" : "",
										name: isStaged ? (
											row.name
										) : (
											<Input
												value={row.name}
												onChange={(e) => updateDraftRow(row.id, { name: e.target.value })}
												placeholder="Name (e.g., DEV)"
												style={{ minWidth: 160 }}
											/>
										),
										address: isStaged ? (
											row.address
										) : (
											<AddressInput
												value={row.address}
												onChange={(e) =>
													updateDraftRow(row.id, { address: (e.target as HTMLInputElement).value })
												}
												placeholder="0x..."
												style={{ minWidth: 240 }}
											/>
										),
										status: "Active",
										...(hasActionsColumn ? { actions: actionCell } : {}),
									},
									rowStyle: {
										background: isStaged ? "rgba(25,135,84,0.10)" : "transparent",
									},
								};
							})
							: []),
					]}
					showSearch={false}
				/>

				{onAddPayee && (
					<Row justify="end" style={{ marginTop: "var(--spacing-sm)", width: "100%" }}>
						<ButtonPrimary
							style={{ flex: 0 }}
							onClick={handleSaveAllPayees}
							disabled={
								isSubmitting ||
								onAddPayee.loading ||
								draftRows.filter((row) => row.staged).length === 0
							}
						>
							{isSubmitting || onAddPayee.loading ? "Saving..." : "Save All"}
						</ButtonPrimary>
					</Row>
				)}
			</Stack>
		</Stack>
	);
}
